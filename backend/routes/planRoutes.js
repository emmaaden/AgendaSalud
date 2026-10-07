const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { requireAuth } = require('../middleware/auth');

// Staff de una clínica (profesional, recepción o auditoría). No se usa requireRole
// porque un médico que es auditor en la clínica activa también debe ver el plan.
function requireStaff(req, res, next) {
    if (['profesional', 'recepcion', 'auditor'].includes(req.session.user.role)) return next();
    return res.status(403).json({ error: 'No autorizado para esta acción' });
}

// Público: lo usa la página /planes.
router.get('/catalogo', planController.catalogo);

// Plan, estado y uso de la clínica activa.
router.get('/mi-clinica', requireAuth, requireStaff, planController.miClinica);

module.exports = router;
