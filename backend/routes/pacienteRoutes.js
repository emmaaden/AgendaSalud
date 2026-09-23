const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/pacienteController');
const { requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');

// La historia clínica es exclusiva de profesionales autenticados.
// La identidad del profesional se toma de la sesión (ver pacienteController).
router.use(requireRole('profesional'));

router.post('/regis-pacient', validate(schemas.pacient.regis), pacienteController.regisPacient);
router.post('/save-data-pacient', validate(schemas.pacient.saveData), pacienteController.saveDataPacient);
router.post('/get-data-pacient', validate(schemas.pacient.getData), pacienteController.getDataPacient);

module.exports = router;
