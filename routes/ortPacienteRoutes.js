const express = require('express');
const router = express.Router();
const ortPacienteController = require('../controllers/ortPacienteController');

router.post('/get-data', ortPacienteController.data);

module.exports = router;