const express = require('express');
const router = express.Router();
const especialidadController = require('../controllers/especialidadesController')

router.get('/get-especialidades', especialidadController.getEspecialidades);

module.exports = router;