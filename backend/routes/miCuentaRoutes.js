// Autogestión del paciente logueado (Fase 3). Se monta en /api/mi-cuenta.
// Todas las rutas exigen rol paciente; la identidad se toma de la sesión.

const express = require('express');
const router = express.Router();
const miCuentaController = require('../controllers/miCuentaController');
const { requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.use(requireRole('paciente'));

router.get('/perfil', miCuentaController.getPerfil);
router.put('/perfil', validate(schemas.miCuenta.updatePerfil), miCuentaController.updatePerfil);
router.get('/historia', miCuentaController.getHistoria);

module.exports = router;
