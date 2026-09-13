const express = require('express');
const router = express.Router();
const ortPacienteController = require('../controllers/ortPacienteController');
const { requireRole } = require('../middleware/auth');

// Consultar el valor de ortodoncia de un paciente es una acción clínica: solo profesionales.
router.use(requireRole('profesional'));

router.post('/get-data', ortPacienteController.data);

module.exports = router;
