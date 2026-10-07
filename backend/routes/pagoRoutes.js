const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pagoController');
const { requireRole, requireClinicaAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');

// Fase M: Mercado Pago llama acá (sin sesión; la firma la valida el controller).
router.post('/mp/webhook', pagoController.webhook);

// El plan de la clínica lo contrata y lo da de baja su admin.
const admin = [requireRole('profesional'), requireClinicaAdmin];
router.post('/suscripcion', admin, validate(schemas.pagos.contratar), pagoController.contratar);
router.post('/suscripcion/sincronizar', admin, pagoController.sincronizar);
router.post('/suscripcion/cancelar', admin, pagoController.cancelar);

module.exports = router;
