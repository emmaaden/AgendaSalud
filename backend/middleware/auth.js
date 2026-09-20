// Middleware de autenticación y autorización.
// La identidad SIEMPRE se toma de la sesión del servidor, nunca del body del request.
// Esto evita IDOR: un usuario no puede operar sobre datos de otro pasando su user_id.
//
// La sesión guarda dos identificadores (ver authController.login):
//   - req.session.user.id     -> id de auth.users (Supabase Auth)   [= persona.id_auth]
//   - req.session.user.idRole -> profesional.id (o paciente.id)
// Cada controller usa el que corresponde a su consulta.

function requireAuth(req, res, next) {
    if (req.session && req.session.isAuthenticated && req.session.user) {
        return next();
    }
    return res.status(401).json({ error: 'No autenticado' });
}

// requireRole('profesional') o requireRole('profesional', 'admin')
function requireRole(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.session || !req.session.isAuthenticated || !req.session.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        if (!rolesPermitidos.includes(req.session.user.role)) {
            return res.status(403).json({ error: 'No autorizado para esta acción' });
        }
        return next();
    };
}

// Verifica que el email de la sesión coincide con el email autorizado (admin).
function requireAdmin(req, res, next) {
    if (
        req.session &&
        req.session.isAuthenticated &&
        req.session.user &&
        req.session.user.email === process.env.EMAIL_AUTORIZADO
    ) {
        return next();
    }
    return res.status(403).json({ error: 'Requiere permisos de administrador' });
}

// Fase E: staff de una clínica (profesional | recepcion | admin) con una clínica
// activa fijada en la sesión. Habilita el panel de gestión de turnos. El scoping por
// clínica lo hace cada controller usando req.session.user.clinicaId (service_role).
function requireStaffClinica(req, res, next) {
    const u = req.session && req.session.isAuthenticated && req.session.user;
    if (!u) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    if (u.role !== 'profesional' && u.role !== 'recepcion') {
        return res.status(403).json({ error: 'No autorizado para esta acción' });
    }
    if (!u.clinicaId) {
        return res.status(400).json({ error: 'No tenés una clínica activa seleccionada.' });
    }
    return next();
}

// Verifica que el profesional autenticado sea admin de su clínica (Fase 2).
function requireClinicaAdmin(req, res, next) {
    if (
        req.session &&
        req.session.isAuthenticated &&
        req.session.user &&
        req.session.user.role === 'profesional' &&
        req.session.user.esAdmin
    ) {
        return next();
    }
    return res.status(403).json({ error: 'Requiere ser administrador de la clínica' });
}

module.exports = { requireAuth, requireRole, requireAdmin, requireClinicaAdmin, requireStaffClinica };
