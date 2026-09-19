// Cliente de Google Calendar compartido.
//
// Antes la autenticación vivía inline en index.js; se extrajo acá para que también
// el turnosController pueda operar sobre el calendario (cancelar eventos) sin duplicar
// credenciales. Las credenciales se arman desde variables de entorno (no se escribe
// ningún archivo a disco). El calendarId viaja en cada llamada (no hay estado global).

const { google } = require('googleapis');
require('dotenv').config();

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

// ¿Hay credenciales suficientes para hablar con Google Calendar?
function isCalendarConfigured() {
    return !!googleCredentials.client_email;
}

// Devuelve un cliente autenticado de Google Calendar (v3).
async function getCalendar() {
    const auth = new google.auth.GoogleAuth({
        credentials: googleCredentials,
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    const client = await auth.getClient();
    return google.calendar({ version: 'v3', auth: client });
}

module.exports = { googleCredentials, isCalendarConfigured, getCalendar };
