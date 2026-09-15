// Envío de emails con Nodemailer (best-effort).
// Se configura por variables de entorno; si faltan, sendMail no hace nada y avisa,
// para no romper el flujo (ej: la reserva de un turno igual se concreta).
//
// Variables:
//   EMAIL_HOST, EMAIL_PORT (default 587), EMAIL_USER, EMAIL_PASS
//   EMAIL_SECURE ("true" para SSL/465), EMAIL_FROM (default = EMAIL_USER)

const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;
let resolved = false;

function getTransporter() {
    if (resolved) return transporter;
    resolved = true;

    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
    if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
        transporter = null;
        return null;
    }

    const port = Number(EMAIL_PORT) || 587;
    transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port,
        secure: String(process.env.EMAIL_SECURE) === 'true' || port === 465,
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
    return transporter;
}

function isMailerConfigured() {
    return !!getTransporter();
}

// Envía un email. Devuelve true si se envió, false si el mailer no está configurado.
// Los errores de envío se propagan (el caller decide si los ignora).
async function sendMail({ to, subject, html, text }) {
    const t = getTransporter();
    if (!t) {
        console.warn('Mailer no configurado (faltan EMAIL_HOST/EMAIL_USER/EMAIL_PASS): no se envía email.');
        return false;
    }
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    await t.sendMail({ from, to, subject, html, text });
    return true;
}

module.exports = { isMailerConfigured, sendMail };
