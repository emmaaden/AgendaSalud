const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

const path = require('path');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const horariosRoutes = require('./routes/horarios');
/* const pacienteRoutes = require('./routes/pacienteRoutes'); */
const especialidadesRoutes = require('./routes/especialidadesRoutes');
const profesionalRoutes = require('./routes/profesionalRoutes');
const avatarsRoutes = require('./routes/avatarsRoutes');
const ortPacienteRoutes = require('./routes/ortPacienteRoutes');

require('dotenv').config();

const PORT = process.env.PORT || 3000;

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 horas
        secure: false,
        httpOnly: true
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/auth', authRoutes);
app.use('/hour', horariosRoutes);
/* app.use('/pacient', pacienteRoutes); */
app.use('/especialidades', especialidadesRoutes);
app.use('/profesional', profesionalRoutes);
app.use('/avatars', avatarsRoutes);
app.use('/ortodoncia', ortPacienteRoutes);

app.get('/api/user', (req, res) => {
    /* console.log('Sesión api:', req.session); */
    if (req.session.isAuthenticated) {
        res.json({ user: req.session.user.email, idRole: req.session.user.idRole , id: req.session.user.id, role: req.session.user.role });
    } else {
        res.status(401).json({ error: 'No autenticado' });
    }
});

const email_autorizado = process.env.EMAIL_AUTORIZADO;

app.get('/dashboard', (req, res) => {
    if (req.session.isAuthenticated) {
        app.use(express.static(path.join(__dirname, 'dashboard')));
        res.sendFile(path.join(__dirname, 'dashboard', 'dashboard.html'));

        if (req.session.user.email === email_autorizado) {
            // Si admin es true, redirige a dashboard2.html
            console.log("es admin")
            res.sendFile(path.join(__dirname, 'dashboard', 'dashboard-autorizado.html'));
        }
    } else {
        res.redirect('/login.html');
    }
});

app.get('/dashboardAutorizado', (req, res) => {
    if (req.session.isAuthenticated && req.session.user.email === email_autorizado) {
        console.log("es admin")
        res.sendFile(path.join(__dirname, 'dashboard', 'dashboard-autorizado.html'));
    } else {
        res.redirect('/login.html');
    }
});

app.get('/dashboardRegistroClinico', (req, res) => {
    if (req.session.isAuthenticated && req.session.area === 'Dentista') {
        res.sendFile(path.join(__dirname, 'dashboard', 'dashboardRegistroClinicoOdonto.html'));
    } else if (req.session.isAuthenticated && req.session.area != 'Dentista') {
        res.sendFile(path.join(__dirname, 'dashboard', 'dashboardRegistroClinico.html'));
    } else {
        res.redirect('/login.html');
    }
});

app.get('/dashboardConfig', (req, res) => {
    if (req.session.isAuthenticated) {
        res.sendFile(path.join(__dirname, 'dashboard', 'dashboardConfig.html'));
    } else {
        res.redirect('/login.html');
    }

});

//const twilio = require('twilio');
//const { format } = require('date-fns');

// Configuración de Twilio
//const accountSid = process.env.TWILIO_ACCOUNT_SID;
//const authToken = process.env.TWILIO_AUTH_TOKEN;
//const client = new twilio(accountSid, authToken);


// Función para enviar el mensaje de WhatsApp
const sendWhatsApp = (event, number, numberCode) => {
    const formattedDate = format(new Date(event.start.dateTime), 'dd/MM/yyyy HH:mm');
    const fullNumber = `${numberCode}9${number}`;

    client.messages.create({
        body: `Hola, tu turno ha sido agendado con éxito.
        Detalles del turno:
        - Resumen: ${event.summary}
        - Descripción: ${event.description}
        - Inicio: ${formattedDate}hs`,
        from: 'whatsapp:+14155238886', // Número de WhatsApp de Twilio
        to: `whatsapp:${fullNumber}` // Número de WhatsApp del cliente
    })
        .then(message => console.log('Mensaje enviado:', message.sid, fullNumber))
        .catch(error => console.log('Error al enviar el mensaje:', error));
};


const jsonData = {
    type: process.env.TYPE,
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY,
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: process.env.AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
    universe_domain: process.env.UNIVERSE_DOMAIN,
};

const jsonContent = JSON.stringify(jsonData, null, 2);

fs.writeFileSync('calenderregistroclinico-8aedace47e68.json', jsonContent, 'utf8');
console.log("Archivo JSON creado con éxito: calenderregistroclinico-8aedace47e68.json");

const SERVICE_ACCOUNT_KEY_FILE = path.join(__dirname, 'calenderregistroclinico-8aedace47e68.json');

let CALENDAR_ID = '';

async function authenticate() {
    const auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const client = await auth.getClient();
    return google.calendar({ version: 'v3', auth: client });
}

// Ruta para agregar un área y un profesional
app.post('/add-professional', async (req, res) => {
    const { area, professional } = req.body;

    try {
        let existingArea = await Professional.findOne({ area });

        if (existingArea) {
            // Si el área ya existe, agregar el profesional a la lista
            existingArea.professionals.push(professional);
            await existingArea.save();
        } else {
            // Si el área no existe, crearla con el profesional
            const newArea = new Professional({ area, professionals: [professional] });
            await newArea.save();
        };

        res.status(200).send('Área y profesional agregados exitosamente');
    } catch (error) {
        console.error('Error al guardar en la base de datos:', error);
        res.status(500).send('Error al agregar el área y profesional');
    }
});

// Ruta para obtener todas las áreas y profesionales
app.get('/professionals', async (req, res) => {
    try {
        const professionals = await Professional.find({});
        res.status(200).json(professionals);
    } catch (error) {
        console.error('Error al obtener los datos:', error);
        res.status(500).send('Error al obtener los datos');
    }
});


// Endpoint para obtener franjas horarias disponibles
app.get('/available-slots', async (req, res) => {
    const date = req.query.date;

    if (!date) {
        return res.status(400).json({ error: 'Fecha no proporcionada' });
    }

    try {
        const calendar = await authenticate();
        const timeMin = new Date(date);
        timeMin.setUTCHours(0, 0, 0, 0);
        const timeMax = new Date(date);
        timeMax.setUTCHours(23, 59, 59, 999);

        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            showDeleted: false,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items;

        const slots = [];
        const startHour = 0o0; // Hora de inicio de la jornada
        const endHour = 23; // Hora de fin de la jornada
        const interval = 30; // Intervalo de tiempo en minutos

        const startOfDay = new Date(date);
        startOfDay.setUTCHours(startHour, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(endHour, 0, 0, 0);

        let currentSlot = startOfDay;

        while (currentSlot < endOfDay) {
            let slotEnd = new Date(currentSlot.getTime() + interval * 60000);

            // Verifica si el slot está ocupado
            let isAvailable = true;
            for (const event of events) {
                const eventStart = new Date(event.start.dateTime);
                const eventEnd = new Date(event.end.dateTime);

                if ((eventStart < slotEnd && eventEnd > currentSlot)) {
                    isAvailable = false;
                    break;
                }
            }

            if (isAvailable) {
                slots.push(currentSlot.toISOString());
            }

            currentSlot = slotEnd;
        }

        res.json(slots);
    } catch (error) {
        console.error('Error obteniendo eventos:', error.message);
        res.status(500).json({ error: 'Error al obtener eventos', details: error.message });
    }
});

// Endpoint para crear un evento
app.post('/create-event', async (req, res) => {
    const { summary, description, start, end, email, number, numberCode } = req.body;

    console.log('Start:', start);
    console.log('End:', end);


    if (!summary || !start || !end || !email || !number) {
        return res.status(400).json({ error: 'Datos de evento incompletos' });
    }

    try {
        const calendar = await authenticate();

        const event = {
            summary,
            description,
            start: {
                dateTime: start.dateTime,
                timeZone: 'America/Argentina/Buenos_Aires',
            },
            end: {
                dateTime: end.dateTime,
                timeZone: 'America/Argentina/Buenos_Aires',
            }
        };

        const response = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            resource: event,
        });

        // Enviar mensaje de WhatsApp con los datos del evento
        //sendWhatsApp(event, number, numberCode);

        res.json({ success: true, event: response.data });
    } catch (error) {
        console.error('Error creando evento:', error.message);
        res.status(500).json({ error: 'Error al crear evento', details: error.message });
    }
});

// Cambia el ID del calendario en función del profesional seleccionado
app.post('/set-calendar', (req, res) => {
    const calendarId = req.body.calendarId;
    if (calendarId) {
        CALENDAR_ID = calendarId;
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'ID de calendario no proporcionado' });
    }
});

// Endpoint para buscar turnos solo por correo
app.get('/search-appointment', async (req, res) => {
    const { email } = req.query;

    // Verificar que el correo esté presente
    if (!email) {
        return res.status(400).json({ error: 'El correo es obligatorio para la búsqueda' });
    }

    try {
        const calendar = await authenticate();

        const params = {
            calendarId: CALENDAR_ID,
            showDeleted: false,
            singleEvents: true,
            orderBy: 'startTime',
        };

        const response = await calendar.events.list(params);
        const events = response.data.items;

        // Filtrar eventos por correo electrónico (si está presente en la descripción)
        const filteredEvents = events.filter(event =>
            event.description.includes(email)
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


// Endpoint para eliminar un turno por ID de evento
app.delete('/delete-appointment/:eventId', async (req, res) => {
    const { eventId } = req.params;

    try {
        const calendar = await authenticate();
        await calendar.events.delete({
            calendarId: CALENDAR_ID,
            eventId: eventId,
        });
        res.json({ message: 'Turno eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando el turno:', error.message);
        res.status(500).json({ error: 'Error al eliminar el turno', details: error.message });
    }
});

authenticate()
    .then(calendar => {
        console.log('Conectado a Google Calendar');
    })
    .catch(error => {
        console.error('Error al conectar a Google Calendar:', error.message);
    });

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
