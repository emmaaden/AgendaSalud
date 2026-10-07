const express = require('express');
const router = express.Router();
const ortPacienteController = require('../controllers/ortPacienteController');
const { requireRole } = require('../middleware/auth');
const { requireFeature } = require('../middleware/plan');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');

// Consultar el valor de ortodoncia de un paciente es una acción clínica: solo profesionales.
router.use(requireRole('profesional'), requireFeature('odontologia'));

router.post('/get-data', validate(schemas.ortodoncia.getData), ortPacienteController.data);

module.exports = router;
