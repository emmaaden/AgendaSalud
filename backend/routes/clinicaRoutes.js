const express = require('express');
const router = express.Router();
const clinicaController = require('../controllers/clinicaController');
const { requireRole, requireClinicaAdmin } = require('../middleware/auth');

// Todas requieren sesión de profesional.
router.use(requireRole('profesional'));

router.get('/info', clinicaController.info);

// Generar/listar/eliminar códigos: solo el admin de la clínica.
router.post('/generar-codigo', requireClinicaAdmin, clinicaController.generarCodigo);
router.get('/codigos', requireClinicaAdmin, clinicaController.listarCodigos);
router.delete('/codigos/:id', requireClinicaAdmin, clinicaController.eliminarCodigo);

module.exports = router;
