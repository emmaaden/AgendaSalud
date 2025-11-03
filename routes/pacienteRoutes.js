const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/pacienteController');

router.post('/save-data-pacient', pacienteController.saveData);
router.post('/regis-pacient', pacienteController.regisPacient);
router.post('/get-data-pacient', pacienteController.data);

module.exports = router;