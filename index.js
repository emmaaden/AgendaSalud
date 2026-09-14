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

// Franjas horarias disponibles para un calendario y fecha dados.
app.get('/available-slots', async (req, res) => {
    const { date, calendarId } = req.query;

    if (!date) return res.status(400).json({ error: 'Fecha no proporcionada' });
    if (!calendarId) return res.status(400).json({ error: 'calendarId no proporcionado' });

    try {
        const calendar = await authenticate();
        const timeMin = new Date(date);
        timeMin.setUTCHours(0, 0, 0, 0);
        const timeMax = new Date(date);
        timeMax.setUTCHours(23, 59, 59, 999);

        const response = await calendar.events.list({
            calendarId,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            showDeleted: false,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items;
        const slots = [];
        // TODO (Fase 1): respetar horario_profesional en vez de 8-20 fijo.
        const startHour = 8;
        const endHour = 20;
        const interval = 30; // minutos

        const startOfDay = new Date(date);
        startOfDay.setUTCHours(startHour, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(endHour, 0, 0, 0);

        let currentSlot = startOfDay;
        while (currentSlot < endOfDay) {
            const slotEnd = new Date(currentSlot.getTime() + interval * 60000);
            let isAvailable = true;
            for (const event of events) {
                const eventStart = new Date(event.start.dateTime);
                const eventEnd = new Date(event.end.dateTime);
                if (eventStart < slotEnd && eventEnd > currentSlot) {
                    isAvailable = false;
                    break;
                }
            }
            if (isAvailable) slots.push(currentSlot.toISOString());
            currentSlot = slotEnd;
        }

        res.json(slots);
    } catch (error) {
        console.error('Error obteniendo eventos:', error.message);
        res.status(500).json({ error: 'Error al obtener eventos', details: error.message });
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
