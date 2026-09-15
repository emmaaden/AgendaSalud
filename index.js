require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const session = require('express-session');
const { google } = require('googleapis');

const authRoutes = require('./routes/authRoutes');
const horariosRoutes = require('./routes/horarios');
const pacienteRoutes = require('./routes/pacienteRoutes'); // Fase 1: historia clínica en Supabase
const especialidadesRoutes = require('./routes/especialidadesRoutes');
const profesionalRoutes = require('./routes/profesionalRoutes');
const avatarsRoutes = require('./routes/avatarsRoutes');
const ortPacienteRoutes = require('./routes/ortPacienteRoutes');
const publicRoutes = require('./routes/publicRoutes'); // Fase 1: /professionals, /api/get-hours
const { requireAuth, requireAdmin } = require('./middleware/auth');
const { supabase } = require('./config/supabaseClient');
const { sendMail } = require('./utils/mailer');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// Seguridad base
// ---------------------------------------------------------------------------
if (isProd) {
    app.set('trust proxy', 1); // necesario para cookies 'secure' detrás de un proxy/https
}

// CSP se deja desactivada por ahora porque el frontend usa CDNs e inline scripts.
// TODO (Fase 3): definir una Content-Security-Policy explícita.
app.use(helmet({ contentSecurityPolicy: false }));

// CORS con lista blanca de orígenes (ALLOWED_ORIGINS separados por coma).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        // Sin origin = same-origin / herramientas locales.
        if (!origin) return cb(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return cb(null, true);
        }
        return cb(new Error('Origen no permitido por CORS'));
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting general. El limiter estricto de login/register vive en routes/authRoutes.js.
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use(generalLimiter);

// ---------------------------------------------------------------------------
// Sesiones
// ---------------------------------------------------------------------------
if (!process.env.SESSION_SECRET) {
    console.warn('⚠️  SESSION_SECRET no está definido en .env');
}

let sessionStore; // undefined => MemoryStore (solo desarrollo)
if (process.env.DATABASE_URL) {
    const pgSession = require('connect-pg-simple')(session);
    sessionStore = new pgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true
    });
} else {
    console.warn('⚠️  DATABASE_URL no configurada: usando MemoryStore (no apto para producción).');
}

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'cambia-esto-en-produccion',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 horas
        secure: isProd,              // solo por HTTPS en producción
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// ---------------------------------------------------------------------------
// Estáticos y rutas
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', authRoutes);
app.use('/hour', horariosRoutes);
app.use('/pacient', pacienteRoutes); // Fase 1: historia clínica (rol profesional)
app.use('/especialidades', especialidadesRoutes); // público: usado en el registro
app.use('/profesional', profesionalRoutes);
app.use('/avatars', avatarsRoutes);
app.use('/ortodoncia', ortPacienteRoutes);
app.use('/', publicRoutes); // público: /professionals, /api/get-hours (página de turnos)

// Config pública para el cliente (solo datos NO sensibles).
// La anon/public key de Supabase es segura de exponer; la service_role NUNCA se envía.
app.get('/api/public-config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || null,
        supabaseAnonKey: process.env.SUPABASE_KEY_PUBLIC || null,
    });
});

app.get('/api/user', async (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    const u = req.session.user;

    // Nombre completo desde persona (para dashboards). Best-effort: no bloquea si falla.
    let fullName = null;
    try {
        const { data } = await supabase
            .from('persona')
            .select('nombre, apellido')
            .eq('id_auth', u.id)
            .maybeSingle();
        if (data) fullName = [data.nombre, data.apellido].filter(Boolean).join(' ');
    } catch (err) {
        console.error('Error obteniendo nombre en /api/user:', err.message);
    }

    res.json({
        user: u.email,
        email: u.email,
        fullName,
        idRole: u.idRole,
        id: u.id,
        role: u.role
    });
});

const email_autorizado = process.env.EMAIL_AUTORIZADO;

app.get('/dashboard', requireAuth, (req, res) => {
    if (req.session.user.email === email_autorizado) {
        return res.sendFile(path.join(__dirname, 'dashboard', 'dashboard-autorizado.html'));
    }
    return res.sendFile(path.join(__dirname, 'dashboard', 'dashboard.html'));
});

app.get('/dashboardAutorizado', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard', 'dashboard-autorizado.html'));
});

app.get('/dashboardRegistroClinico', requireAuth, (req, res) => {
    if (req.session.area === 'Dentista') {
        res.sendFile(path.join(__dirname, 'dashboard', 'dashboardRegistroClinicoOdonto.html'));
    } else {
        res.sendFile(path.join(__dirname, 'dashboard', 'dashboardRegistroClinico.html'));
    }
});

app.get('/dashboardConfig', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard', 'dashboardConfig.html'));
});

// ---------------------------------------------------------------------------
// Google Calendar
// Credenciales cargadas desde memoria (no se escribe archivo en disco).
// El calendarId viaja EN CADA request (se eliminó la variable global mutable).
// ---------------------------------------------------------------------------
const googleCredentials = {
    type: process.env.TYPE,
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    // Las claves privadas en .env suelen venir con '\n' escapados.
    private_key: process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: process.env.AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
    universe_domain: process.env.UNIVERSE_DOMAIN,
};

async function authenticate() {
    const auth = new google.auth.GoogleAuth({
        credentials: googleCredentials,
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    const client = await auth.getClient();
    return google.calendar({ version: 'v3', auth: client });
}

// Normaliza un nombre de día (minúsculas, sin acentos) para comparar.
function normalizarDia(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// Argentina es UTC-3 (sin horario de verano): se usa el offset fijo -03:00.
const AR_OFFSET = '-03:00';
const SLOT_MINUTOS = 30;

// Franjas horarias disponibles de un profesional para una fecha dada.
// Respeta horario_profesional (por día de la semana) y excluye los eventos ya
// agendados en su Google Calendar. El calendario se deriva del profesional.
app.get('/available-slots', async (req, res) => {
    const { date, profId } = req.query;

    if (!date) return res.status(400).json({ error: 'Fecha no proporcionada' });
    if (!profId) return res.status(400).json({ error: 'profId no proporcionado' });

    try {
        // 1. Profesional -> calendario + horarios.
        const { data: prof, error: profError } = await supabase
            .from('profesional')
            .select('id_calendario, horario_profesional ( dia, horario_inicio, horario_fin )')
            .eq('id', profId)
            .maybeSingle();

        if (profError) throw profError;
        if (!prof) return res.status(404).json({ error: 'Profesional no encontrado' });
        if (!prof.id_calendario) return res.json([]); // sin calendario configurado

        // 2. Horarios del día de la semana pedido.
        const diaSemana = normalizarDia(
            new Date(`${date}T12:00:00${AR_OFFSET}`)
                .toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' })
        );
        const franjas = (prof.horario_profesional || []).filter(h => normalizarDia(h.dia) === diaSemana);
        if (franjas.length === 0) return res.json([]); // no atiende ese día

        // 3. Eventos ya agendados ese día.
        const calendar = await authenticate();
        const timeMin = new Date(`${date}T00:00:00${AR_OFFSET}`);
        const timeMax = new Date(`${date}T23:59:59${AR_OFFSET}`);
        const response = await calendar.events.list({
            calendarId: prof.id_calendario,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            showDeleted: false,
            singleEvents: true,
            orderBy: 'startTime',
        });
        const events = response.data.items || [];

        // 4. Generar slots de 30' dentro de cada franja, excluyendo ocupados y pasados.
        const ahora = new Date();
        const slots = [];
        for (const franja of franjas) {
            let actual = new Date(`${date}T${franja.horario_inicio}${AR_OFFSET}`);
            const fin = new Date(`${date}T${franja.horario_fin}${AR_OFFSET}`);
            while (actual < fin) {
                const slotFin = new Date(actual.getTime() + SLOT_MINUTOS * 60000);
                const ocupado = events.some(ev => {
                    const es = new Date(ev.start.dateTime || ev.start.date);
                    const ee = new Date(ev.end.dateTime || ev.end.date);
                    return es < slotFin && ee > actual;
                });
                if (!ocupado && actual > ahora) slots.push(actual.toISOString());
                actual = slotFin;
            }
        }

        res.json(slots);
    } catch (error) {
        console.error('Error obteniendo slots disponibles:', error.message);
        res.status(500).json({ error: 'Error al obtener los turnos disponibles', details: error.message });
    }
});

// Crear un turno (evento) en el calendario indicado.
app.post('/create-event', async (req, res) => {
    const { summary, description, start, end, email, number, calendarId } = req.body;

    if (!summary || !start || !end || !email || !number || !calendarId) {
        return res.status(400).json({ error: 'Datos de evento incompletos' });
    }

    try {
        const calendar = await authenticate();
        const event = {
            summary,
            description,
            start: { dateTime: start.dateTime, timeZone: 'America/Argentina/Buenos_Aires' },
            end: { dateTime: end.dateTime, timeZone: 'America/Argentina/Buenos_Aires' }
        };

        const response = await calendar.events.insert({ calendarId, resource: event });

        // Email de confirmación al paciente (best-effort: no bloquea la reserva).
        const fechaLocal = new Date(start.dateTime).toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            dateStyle: 'full',
            timeStyle: 'short',
        });
        sendMail({
            to: email,
            subject: 'Confirmación de tu turno - Agenda Salud',
            text: `Hola,\n\nTu turno fue agendado para el ${fechaLocal} hs.\n${summary || ''}\n\nGracias por usar Agenda Salud.`,
            html: `<p>Hola,</p><p>Tu turno fue <strong>agendado</strong> para el <strong>${fechaLocal} hs</strong>.</p><p>${summary || ''}</p><p>Gracias por usar Agenda Salud.</p>`,
        }).catch(err => console.error('Error enviando email de confirmación:', err.message));

        res.json({ success: true, event: response.data });
    } catch (error) {
        console.error('Error creando evento:', error.message);
        res.status(500).json({ error: 'Error al crear evento', details: error.message });
    }
});

// Buscar turnos por email en un calendario.
app.get('/search-appointment', async (req, res) => {
    const { email, calendarId } = req.query;

    if (!email) return res.status(400).json({ error: 'El correo es obligatorio para la búsqueda' });
    if (!calendarId) return res.status(400).json({ error: 'calendarId no proporcionado' });

    try {
        const calendar = await authenticate();
        const response = await calendar.events.list({
            calendarId,
            showDeleted: false,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items || [];
        const filteredEvents = events.filter(event =>
            event.description && event.description.includes(email)
        );

        if (filteredEvents.length > 0) {
            res.json(filteredEvents);
        } else {
            res.status(404).json({ message: 'No se encontraron turnos con los datos proporcionados' });
        }
    } catch (error) {
        console.error('Error buscando turnos:', error.message);
        res.status(500).json({ error: 'Error al buscar turnos', details: error.message });
    }
});

// Eliminar un turno por ID de evento.
app.delete('/delete-appointment/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const calendarId = req.query.calendarId || req.body.calendarId;

    if (!calendarId) return res.status(400).json({ error: 'calendarId no proporcionado' });

    try {
        const calendar = await authenticate();
        await calendar.events.delete({ calendarId, eventId });
        res.json({ message: 'Turno eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando el turno:', error.message);
        res.status(500).json({ error: 'Error al eliminar el turno', details: error.message });
    }
});

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
if (googleCredentials.client_email) {
    authenticate()
        .then(() => console.log('Conectado a Google Calendar'))
        .catch(error => console.error('Error al conectar a Google Calendar:', error.message));
} else {
    console.warn('⚠️  Credenciales de Google no configuradas: los turnos por calendario no funcionarán.');
}

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
