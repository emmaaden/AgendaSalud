// Autogestión del paciente logueado (Fase 3). Se monta en /api/mi-cuenta.
// Todas las rutas exigen rol paciente; la identidad se toma de la sesión.

const express = require('express');
const router = express.Router();
const miCuentaController = require('../controllers/miCuentaController');
const certificadoController = require('../controllers/certificadoController');
const { requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.use(requireRole('paciente'));

router.get('/perfil', miCuentaController.getPerfil);
router.put('/perfil', validate(schemas.miCuenta.updatePerfil), miCuentaController.updatePerfil);
router.get('/historia', miCuentaController.getHistoria);
router.get('/historia/export', miCuentaController.exportHistoria);

// Fase C: certificados del propio paciente.
router.get('/certificados', certificadoController.misCertificados);

module.exports = router;
