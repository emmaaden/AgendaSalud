// Permisos por PLAN (Fase L). Se combinan con los de ROL (middleware/auth.js):
// primero el rol decide si la persona puede hacer algo; después el plan de la clínica
// activa decide si esa clínica lo tiene contratado.
//
// Respuestas con 402 (Payment Required) y un `code` para que el frontend distinga
// "te falta plan" de "no tenés permiso":
//   PLAN_FEATURE      → el plan no incluye la función (`feature`, `planMinimo`).
//   PLAN_SOLO_LECTURA → la suscripción no está vigente: solo se puede leer y exportar.
//   PLAN_LIMITE       → se llegó al tope de profesionales / recepción del plan.

const planes = require('../utils/planes');

// Roles de sesión que operan en nombre de una clínica (el paciente nunca paga).
const ROLES_STAFF = ['profesional', 'recepcion', 'auditor'];

async function planDeRequest(req) {
    if (req.plan !== undefined) return req.plan;
    const u = req.session && req.session.user;
    req.plan = u && u.clinicaId ? await planes.getPlanClinica(u.clinicaId) : null;
    return req.plan;
}

// Exige que el plan de la clínica activa incluya `feature`.
function requireFeature(feature) {
    return async (req, res, next) => {
        try {
            const u = req.session && req.session.isAuthenticated && req.session.user;
            if (!u) return res.status(401).json({ error: 'No autenticado' });
            if (!u.clinicaId) {
                return res.status(400).json({ error: 'No tenés una clínica activa seleccionada.' });
            }
            const pc = await planDeRequest(req);
            if (planes.tieneFeature(pc, feature)) return next();
            const minimo = await planes.planMinimoCon(feature);
            const e = planes.errorFeature(pc, feature, minimo);
            return res.status(e.status).json(e);
        } catch (err) {
            console.error('[plan] requireFeature:', err);
            return res.status(500).json({ error: 'No se pudo verificar el plan de la clínica.' });
        }
    };
}

// POST que solo LEEN (consultas heredadas con body). No se bloquean en solo lectura.
const POST_DE_LECTURA = new Set([
    '/pacient/get-data-pacient',
]);

// Solo lectura: con la suscripción vencida, el staff puede leer y exportar, pero no
// escribir. Se monta sobre los prefijos de datos de la clínica (ver index.js).
async function soloLectura(req, res, next) {
    try {
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
        const u = req.session && req.session.isAuthenticated && req.session.user;
        // Sin sesión, paciente o staff sin clínica elegida: decide cada ruta.
        if (!u || !ROLES_STAFF.includes(u.role) || !u.clinicaId) return next();
        if (POST_DE_LECTURA.has(req.originalUrl.split('?')[0])) return next();

        const pc = await planDeRequest(req);
        if (pc && !pc.soloLectura) return next();
        return res.status(402).json({
            code: 'PLAN_SOLO_LECTURA',
            error: pc && pc.estado === 'cancelada'
                ? 'La suscripción de la clínica está cancelada: podés ver y exportar los datos, pero no cargar nada nuevo.'
                : 'La suscripción de la clínica venció: podés ver y exportar los datos, pero no cargar nada nuevo. Renová el plan para seguir.',
        });
    } catch (err) {
        console.error('[plan] soloLectura:', err);
        return res.status(500).json({ error: 'No se pudo verificar el plan de la clínica.' });
    }
}

// Solo el equipo de la plataforma (PLATAFORMA_ADMIN_EMAILS): activa planes y edita precios.
function requirePlataforma(req, res, next) {
    const u = req.session && req.session.isAuthenticated && req.session.user;
    if (!u) return res.status(401).json({ error: 'No autenticado' });
    if (!planes.esAdminPlataforma(u.email)) {
        return res.status(403).json({ error: 'No autorizado para esta acción' });
    }
    return next();
}

module.exports = { requireFeature, soloLectura, requirePlataforma, planDeRequest };
