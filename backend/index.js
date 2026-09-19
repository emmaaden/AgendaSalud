require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const session = require('express-session');

const authRoutes = require('./routes/authRoutes');
const horariosRoutes = require('./routes/horarios');
const pacienteRoutes = require('./routes/pacienteRoutes'); // Fase 1: historia clínica en Supabase
const especialidadesRoutes = require('./routes/especialidadesRoutes');
const profesionalRoutes = require('./routes/profesionalRoutes');
const avatarsRoutes = require('./routes/avatarsRoutes');
const ortPacienteRoutes = require('./routes/ortPacienteRoutes');
const publicRoutes = require('./routes/publicRoutes'); // Fase 1: /professionals, /api/get-hours
const clinicaRoutes = require('./routes/clinicaRoutes'); // Fase 2: gestión de clínica
const adminRoutes = require('./routes/adminRoutes'); // Fase B: administración (miembros)
const turnosRoutes = require('./routes/turnosRoutes'); // Fase 3: turnos del paciente (/api/turnos)
const miCuentaRoutes = require('./routes/miCuentaRoutes'); // Fase 3: autogestión del paciente (/api/mi-cuenta)
const certificadoRoutes = require('./routes/certificadoRoutes'); // Fase C: certificados médicos
// (requireAuth/requireAdmin ya no se usan en index.js: el dashboard pasó al SPA)
const { supabase } = require('./config/supabaseClient');
const { getCalendar, isCalendarConfigured } = require('./utils/googleCalendar');
const { getMembresiasActivas } = require('./utils/membresias');
const { generarTokenGestion } = require('./utils/turnoToken');
const { sendMail, isMailerConfigured } = require('./utils/mailer');
const { validate } = require('./middleware/validate');
const schemas = require('./validators/schemas');

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
// SPA (React): en producción servimos el build de /frontend/dist desde la raíz.
// Se registra ANTES del static legacy para que "/" sea el index.html del SPA.
const spaDist = path.join(__dirname, '..', 'frontend', 'dist');
if (isProd) {
    app.use(express.static(spaDist));
}

// Estáticos legacy (imágenes, css/js del dashboard, y páginas .html aún no migradas).
app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', authRoutes);
app.use('/hour', horariosRoutes);
app.use('/pacient', pacienteRoutes); // Fase 1: historia clínica (rol profesional)
app.use('/especialidades', especialidadesRoutes); // público: usado en el registro
app.use('/profesional', profesionalRoutes);
app.use('/avatars', avatarsRoutes);
app.use('/ortodoncia', ortPacienteRoutes);
app.use('/clinica', clinicaRoutes); // Fase 2: gestión de clínica (rol profesional)
app.use('/admin', adminRoutes); // Fase B: administración de la clínica (solo admin)
app.use('/certificados', certificadoRoutes); // Fase C: certificados médicos
app.use('/api/turnos', turnosRoutes); // Fase 3: turnos del paciente (mis turnos / gestión por token)
app.use('/api/mi-cuenta', miCuentaRoutes); // Fase 3: autogestión del paciente (perfil / historia)
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

    // Fase A (multi-clínica): clínicas del profesional + estado de selección.
    let clinicas = [];
    if (u.role === 'profesional' && u.personaId) {
        try {
            const membresias = await getMembresiasActivas(supabase, u.personaId);
            clinicas = membresias.map((m) => ({ clinicaId: m.clinicaId, nombre: m.nombre, rol: m.rol }));
        } catch (err) {
            console.error('Error obteniendo clínicas en /api/user:', err.message);
        }
    }
    // Necesita elegir clínica si tiene varias y todavía no fijó ninguna.
    const needsClinicSelection = u.role === 'profesional' && !u.clinicaId && clinicas.length > 1;

    res.json({
        user: u.email,
        email: u.email,
        fullName,
        idRole: u.idRole,
        id: u.id,
        role: u.role,
        // Clínica activa y rol dentro de ella (admin | profesional | recepcion).
        clinicaId: u.clinicaId || null,
        rol: u.rol || null,
        esAdmin: !!u.esAdmin,
        clinicas,
        needsClinicSelection,
    });
});

// El dashboard es ahora parte del SPA (React, rutas /dashboard*). Ya no se
// sirven los HTML legacy de /dashboard: el SPA controla esas rutas y protege
// el acceso en el cliente (los datos siguen protegidos por sesión en la API).
// Los .html legacy de backend/dashboard/ se conservan como referencia.

// ---------------------------------------------------------------------------
// Google Calendar
// La autenticación vive en utils/googleCalendar.js (compartida con turnosController).
// `authenticate()` se mantiene como alias local para no tocar los call-sites de abajo.
// ---------------------------------------------------------------------------
const authenticate = getCalendar;

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
app.get('/available-slots', validate(schemas.calendar.availableSlots, 'query'), async (req, res) => {
    const { date, profId } = req.query;

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

// Crear un turno (evento) en el calendario del profesional elegido.
// El calendario se DERIVA del profesional en el server (no se confía en un calendarId
// del cliente, que permitiría inyectar eventos en cualquier calendario). Si la reserva
// viene de la página de una clínica (?clinica=<slug>), el profesional debe pertenecer a
// ella (aislamiento por tenant, Fase 2).
app.post('/create-event', validate(schemas.calendar.createEvent), async (req, res) => {
    const { summary, description, start, end, email, number, profId, clinica, name } = req.body;

    try {
        // 1. Profesional -> calendario + clínica + snapshot (nombre/especialidad) desde
        //    la base, no desde el body.
        const { data: prof, error: profError } = await supabase
            .from('profesional')
            .select(`
                id_calendario,
                persona:id_persona ( clinica_id, nombre, apellido ),
                especialidad_profesional ( especialidad:id_especialidad ( nombre ) )
            `)
            .eq('id', profId)
            .maybeSingle();
        if (profError) throw profError;
        if (!prof) return res.status(404).json({ error: 'Profesional no encontrado' });
        if (!prof.id_calendario) {
            return res.status(400).json({ error: 'El profesional no tiene un calendario configurado.' });
        }

        // clinica_id del turno: se deriva SIEMPRE del profesional (para que aparezca
        // en el panel de su clínica). El slug, si viene, solo valida pertenencia.
        const clinicaProf = (prof.persona && prof.persona.clinica_id) || null;

        // 2. Si la reserva es sobre una clínica, el profesional debe ser de esa clínica.
        if (clinica) {
            const { data: cli, error: cliError } = await supabase
                .from('clinica')
                .select('id')
                .eq('slug', String(clinica).trim())
                .eq('activa', true)
                .maybeSingle();
            if (cliError) throw cliError;
            if (!cli) return res.status(404).json({ error: 'Clínica no encontrada.' });
            if (clinicaProf !== cli.id) {
                return res.status(403).json({ error: 'El profesional no pertenece a esta clínica.' });
            }
        }

        const calendarId = prof.id_calendario;

        const calendar = await authenticate();
        const event = {
            summary,
            description,
            start: { dateTime: start.dateTime, timeZone: 'America/Argentina/Buenos_Aires' },
            end: { dateTime: end.dateTime, timeZone: 'America/Argentina/Buenos_Aires' }
        };

        const response = await calendar.events.insert({ calendarId, resource: event });

        // 3. Registrar el turno en la base (fuente de verdad del vínculo con la persona).
        //    - Paciente logueado -> se ata a su paciente.id (id_paciente).
        //    - Invitado          -> id_paciente NULL + manage_token para gestionarlo.
        //    Best-effort: si falla (p. ej. la migración fase3 aún no se corrió), la
        //    reserva del calendario NO se pierde; solo se loguea el problema.
        const esPaciente = req.session?.isAuthenticated && req.session.user?.role === 'paciente';
        const idPaciente = esPaciente ? (req.session.user.idRole || null) : null;

        const profNombre = [prof.persona?.nombre, prof.persona?.apellido].filter(Boolean).join(' ') || null;
        const especialidad = prof.especialidad_profesional?.[0]?.especialidad?.nombre || null;

        let manageToken = null;
        const turnoRow = {
            id_profesional: profId,
            id_paciente: idPaciente,
            clinica_id: clinicaProf,
            google_event_id: response.data.id || null,
            google_calendar_id: calendarId,
            profesional_nombre: profNombre,
            especialidad,
            paciente_nombre: name || null,
            paciente_email: email || null,
            paciente_telefono: number ? String(number) : null,
            inicio: start.dateTime,
            fin: end.dateTime,
        };
        if (!idPaciente) {
            const { token, hash } = generarTokenGestion();
            manageToken = token;
            turnoRow.manage_token_hash = hash;
        }

        try {
            await supabase.from('turno').insert(turnoRow);
        } catch (dbErr) {
            console.error('Error registrando el turno en la base (la reserva del calendario sí se creó):', dbErr.message);
        }

        // 4. Email de confirmación (best-effort: no bloquea la reserva).
        const fechaLocal = new Date(start.dateTime).toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            dateStyle: 'full',
            timeStyle: 'short',
        });
        const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
        // Enlace de gestión: los invitados reciben su token; los logueados van a "Mis turnos".
        const gestionHtml = manageToken
            ? `<p>Para ver o cancelar este turno, entrá a <a href="${baseUrl}/gestionar-turno?token=${manageToken}">este enlace</a>. Guardalo: es personal.</p>`
            : `<p>Podés ver o cancelar tus turnos desde <a href="${baseUrl}/mis-turnos">Mis turnos</a>.</p>`;
        const gestionText = manageToken
            ? `Para ver o cancelar este turno: ${baseUrl}/gestionar-turno?token=${manageToken}`
            : `Ver o cancelar tus turnos: ${baseUrl}/mis-turnos`;
        sendMail({
            to: email,
            subject: 'Confirmación de tu turno - Agenda Salud',
            text: `Hola,\n\nTu turno fue agendado para el ${fechaLocal} hs.\n${summary || ''}\n\n${gestionText}\n\nGracias por usar Agenda Salud.`,
            html: `<p>Hola,</p><p>Tu turno fue <strong>agendado</strong> para el <strong>${fechaLocal} hs</strong>.</p><p>${summary || ''}</p>${gestionHtml}<p>Gracias por usar Agenda Salud.</p>`,
        }).catch(err => console.error('Error enviando email de confirmación:', err.message));

        res.json({ success: true, event: response.data });
    } catch (error) {
        console.error('Error creando evento:', error.message);
        res.status(500).json({ error: 'Error al crear evento', details: error.message });
    }
});

// El buscador público de turnos por email (/search-appointment) y el borrado directo
// por eventId (/delete-appointment) se ELIMINARON en la Fase 3: permitían enumerar y
// cancelar turnos ajenos sin autenticación. Su reemplazo seguro son los endpoints de
// /api/turnos (mis turnos con sesión; gestión por token para invitados).

// ---------------------------------------------------------------------------
// Recordatorios de turnos (~24 h antes)
// Recorre los calendarios de los profesionales, busca los turnos que empiezan en
// ~24 h y envía un email de recordatorio al paciente (email tomado de la
// descripción del evento). Marca el evento (extendedProperties) para no repetir.
// ---------------------------------------------------------------------------
const REMINDER_MIN_H = 23; // ventana: entre 23 y 25 h a futuro
const REMINDER_MAX_H = 25;

function extraerEmail(desc) {
    if (!desc) return null;
    const m = String(desc).match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    return m ? m[0] : null;
}

async function sendUpcomingReminders() {
    if (!isMailerConfigured()) {
        console.warn('Recordatorios: mailer no configurado, se omite.');
        return { sent: 0, reason: 'mailer-no-configurado' };
    }

    const { data: profs, error } = await supabase
        .from('profesional')
        .select('id_calendario')
        .not('id_calendario', 'is', null);
    if (error) throw error;

    const calendar = await authenticate();
    const now = new Date();
    const timeMin = new Date(now.getTime() + REMINDER_MIN_H * 3600 * 1000);
    const timeMax = new Date(now.getTime() + REMINDER_MAX_H * 3600 * 1000);

    let sent = 0;
    for (const p of profs || []) {
        if (!p.id_calendario) continue;
        let items = [];
        try {
            const resp = await calendar.events.list({
                calendarId: p.id_calendario,
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                showDeleted: false,
            });
            items = resp.data.items || [];
        } catch (e) {
            console.error('Recordatorios: error listando calendario', p.id_calendario, e.message);
            continue;
        }

        for (const ev of items) {
            if (!ev.start || !ev.start.dateTime) continue;
            const yaAvisado = ev.extendedProperties && ev.extendedProperties.private
                && ev.extendedProperties.private.reminded === 'true';
            if (yaAvisado) continue;

            const email = extraerEmail(ev.description);
            if (!email) continue;

            const fechaLocal = new Date(ev.start.dateTime).toLocaleString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires',
                dateStyle: 'full',
                timeStyle: 'short',
            });

            try {
                await sendMail({
                    to: email,
                    subject: 'Recordatorio de tu turno - Agenda Salud',
                    text: `Hola,\n\nTe recordamos tu turno para el ${fechaLocal} hs.\n${ev.summary || ''}\n\nAgenda Salud.`,
                    html: `<p>Hola,</p><p>Te recordamos tu turno para el <strong>${fechaLocal} hs</strong>.</p><p>${ev.summary || ''}</p><p>Agenda Salud.</p>`,
                });
                await calendar.events.patch({
                    calendarId: p.id_calendario,
                    eventId: ev.id,
                    resource: {
                        extendedProperties: {
                            private: { ...((ev.extendedProperties && ev.extendedProperties.private) || {}), reminded: 'true' },
                        },
                    },
                });
                sent++;
            } catch (e) {
                console.error('Recordatorios: fallo enviando a', email, e.message);
            }
        }
    }

    console.log(`Recordatorios enviados: ${sent}`);
    return { sent };
}

// Endpoint protegido para disparar los recordatorios desde un cron EXTERNO
// (útil en hostings que duermen, ej. onrender free). Requiere REMINDERS_TOKEN.
app.post('/internal/send-reminders', async (req, res) => {
    const token = req.get('x-reminders-token');
    if (!process.env.REMINDERS_TOKEN || token !== process.env.REMINDERS_TOKEN) {
        return res.status(403).json({ error: 'No autorizado' });
    }
    try {
        const result = await sendUpcomingReminders();
        res.json({ ok: true, ...result });
    } catch (error) {
        console.error('Error en send-reminders:', error.message);
        res.status(500).json({ error: 'Error al enviar recordatorios', details: error.message });
    }
});

// Scheduler in-process: corre cada hora (solo si el mailer está configurado).
// En hostings que duermen puede no dispararse; usar además el endpoint + cron externo.
if (isMailerConfigured()) {
    setInterval(() => {
        sendUpcomingReminders().catch(e => console.error('Recordatorios (scheduler):', e.message));
    }, 60 * 60 * 1000);
    console.log('Scheduler de recordatorios activo (cada 60 min).');
}

// ---------------------------------------------------------------------------
// Fallback del SPA (solo producción)
// Cualquier GET de navegación que no sea una ruta de API ni un archivo estático
// devuelve el index.html del build, para que el routing client-side y el 404
// personalizado de React funcionen también al refrescar o entrar por deep-link.
// ---------------------------------------------------------------------------
if (isProd) {
    const API_PREFIXES = [
        '/auth', '/hour', '/pacient', '/especialidades', '/profesional',
        '/avatars', '/ortodoncia', '/clinica', '/clinica-publica',
        '/professionals', '/available-slots', '/create-event',
        '/api', '/internal',
    ];
    const isApiPath = (p) =>
        API_PREFIXES.some((pre) => p === pre || p.startsWith(pre + '/'));

    app.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        if (isApiPath(req.path)) return next();
        if (!req.accepts('html')) return next();
        return res.sendFile(path.join(spaDist, 'index.html'));
    });
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
if (isCalendarConfigured()) {
    authenticate()
        .then(() => console.log('Conectado a Google Calendar'))
        .catch(error => console.error('Error al conectar a Google Calendar:', error.message));
} else {
    console.warn('⚠️  Credenciales de Google no configuradas: los turnos por calendario no funcionarán.');
}

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
