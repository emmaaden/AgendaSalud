const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/pacienteController');
const { requireRole } = require('../middleware/auth');

// La historia clínica es exclusiva de profesionales autenticados.
// La identidad del profesional se toma de la sesión (ver pacienteController).
router.use(requireRole('profesional'));

router.post('/regis-pacient', pacienteController.regisPacient);
router.post('/save-data-pacient', pacienteController.saveDataPacient);
router.post('/get-data-pacient', pacienteController.getDataPacient);

module.exports = router;
