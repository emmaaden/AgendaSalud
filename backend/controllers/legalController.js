// Cumplimiento legal del sitio público:
//   - Botón de arrepentimiento y botón de baja de servicio (Disp. SSDCyLC 954/2025):
//     el consumidor lo pide SIN registrarse y recibe un código de identificación.
//   - robots.txt y sitemap.xml (generados con APP_URL para no hardcodear el dominio).

const crypto = require('crypto');
const { sendMail } = require('../utils/mailer');

function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function baseUrl(req) {
    return (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
}

// Código legible e irrepetible en la práctica: ARR-20261006-7K3QXZ / BAJ-...
function generarCodigo(tipo) {
    const prefijo = tipo === 'baja' ? 'BAJ' : 'ARR';
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const azar = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
    return `${prefijo}-${fecha}-${azar}`;
}

const TITULOS = {
    arrepentimiento: 'Solicitud de arrepentimiento (revocación)',
    baja: 'Solicitud de baja de servicio',
};

// POST /api/solicitudes-consumo
// Responde SIEMPRE con el código en pantalla. Además intenta avisar por email al titular
// del sitio y al consumidor; si el mailer no está configurado, `notificado` = false y el
// frontend ofrece enviar la solicitud por email (para que no se pierda).
exports.solicitudConsumo = async (req, res) => {
    const { tipo, nombre, email, servicio, detalle } = req.body;
    const codigo = generarCodigo(tipo);
    const titulo = TITULOS[tipo];
    const fecha = new Date().toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        dateStyle: 'full',
        timeStyle: 'short',
    });

    const resumenTxt = [
        `${titulo}`,
        `Código: ${codigo}`,
        `Fecha: ${fecha} hs`,
        `Nombre: ${nombre}`,
        `Email: ${email}`,
        `Servicio/plan: ${servicio || '—'}`,
        `Detalle: ${detalle || '—'}`,
    ].join('\n');
    const resumenHtml = `<ul>
        <li><strong>Código:</strong> ${codigo}</li>
        <li><strong>Fecha:</strong> ${escapeHtml(fecha)} hs</li>
        <li><strong>Nombre:</strong> ${escapeHtml(nombre)}</li>
        <li><strong>Email:</strong> ${escapeHtml(email)}</li>
        <li><strong>Servicio/plan:</strong> ${escapeHtml(servicio || '—')}</li>
        <li><strong>Detalle:</strong> ${escapeHtml(detalle || '—')}</li>
    </ul>`;

    const destinoTitular = process.env.LEGAL_NOTIFY_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER;
    let notificado = false;
    try {
        if (destinoTitular) {
            notificado = await sendMail({
                to: destinoTitular,
                subject: `[${codigo}] ${titulo}`,
                text: `${resumenTxt}\n\nPlazo: responder y efectivizar sin demoras (Disp. 954/2025).`,
                html: `<p>Nueva ${titulo.toLowerCase()} recibida desde el sitio.</p>${resumenHtml}`,
            });
        }
        if (notificado) {
            await sendMail({
                to: email,
                subject: `Recibimos tu solicitud (${codigo}) - AgendaSalud`,
                text: `Hola ${nombre},\n\nRecibimos tu ${titulo.toLowerCase()}.\nTu código de identificación es ${codigo}. Guardalo para cualquier consulta.\n\n${resumenTxt}\n\nAgendaSalud`,
                html: `<p>Hola ${escapeHtml(nombre)},</p><p>Recibimos tu ${titulo.toLowerCase()}. Tu código de identificación es <strong>${codigo}</strong>. Guardalo para cualquier consulta.</p>${resumenHtml}<p>AgendaSalud</p>`,
            });
        }
    } catch (err) {
        // El código ya se generó y se muestra en pantalla: un fallo de envío no debe
        // impedir que el consumidor deje constancia (el frontend ofrece el email manual).
        console.error('Solicitud de consumo: fallo enviando email:', err.message);
        notificado = false;
    }

    console.log(`Solicitud de consumo ${codigo} (${tipo}) registrada. Notificada: ${notificado}`);
    res.json({ codigo, notificado });
};

// Rutas públicas e indexables del SPA. Las privadas (panel, cuenta del paciente,
// gestión de turnos por token, reset de contraseña) quedan fuera y bloqueadas en robots.
const RUTAS_PUBLICAS = [
    { path: '/', changefreq: 'monthly', priority: '1.0' },
    { path: '/turnos', changefreq: 'weekly', priority: '0.9' },
    { path: '/planes', changefreq: 'monthly', priority: '0.8' },
    { path: '/register', changefreq: 'yearly', priority: '0.5' },
    { path: '/register/paciente', changefreq: 'yearly', priority: '0.5' },
    { path: '/register/profesional', changefreq: 'yearly', priority: '0.5' },
    { path: '/login', changefreq: 'yearly', priority: '0.3' },
    { path: '/valor-ortodoncia', changefreq: 'yearly', priority: '0.3' },
    { path: '/terminos', changefreq: 'yearly', priority: '0.3' },
    { path: '/privacidad', changefreq: 'yearly', priority: '0.3' },
    { path: '/cookies', changefreq: 'yearly', priority: '0.3' },
    { path: '/reembolsos', changefreq: 'yearly', priority: '0.3' },
    { path: '/arrepentimiento', changefreq: 'yearly', priority: '0.3' },
    { path: '/baja', changefreq: 'yearly', priority: '0.3' },
    { path: '/accesibilidad', changefreq: 'yearly', priority: '0.3' },
];

const RUTAS_PRIVADAS = [
    '/dashboard', '/mis-turnos', '/mi-perfil', '/mi-historia', '/mis-certificados',
    '/mis-estudios', '/gestionar-turno', '/reset-password', '/seleccionar-clinica',
    '/forgot-password', '/register/recepcion',
    // API (no son páginas)
    '/api/', '/auth/', '/hour/', '/pacient/', '/profesional/', '/avatars/', '/ortodoncia/',
    '/clinica/', '/admin/', '/certificados/', '/hc/', '/staff/', '/estudios/', '/dictado/',
    '/auditoria/', '/catalogos/', '/autorizaciones/', '/internal/', '/available-slots',
    '/create-event',
];

exports.robots = (req, res) => {
    const lineas = [
        'User-agent: *',
        'Allow: /',
        ...RUTAS_PRIVADAS.map((p) => `Disallow: ${p}`),
        '',
        `Sitemap: ${baseUrl(req)}/sitemap.xml`,
        '',
    ];
    res.type('text/plain').send(lineas.join('\n'));
};

exports.sitemap = (req, res) => {
    const base = baseUrl(req);
    const urls = RUTAS_PUBLICAS.map((r) => [
        '  <url>',
        `    <loc>${escapeHtml(base + r.path)}</loc>`,
        `    <changefreq>${r.changefreq}</changefreq>`,
        `    <priority>${r.priority}</priority>`,
        '  </url>',
    ].join('\n'));
    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>',
        '',
    ].join('\n');
    res.type('application/xml').send(xml);
};
