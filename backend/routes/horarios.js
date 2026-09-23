const express = require('express');
const router = express.Router();
const horarioController = require('../controllers/horarioController');
const { requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');

// La gestión de horarios es exclusiva del profesional autenticado.
router.use(requireRole('profesional'));

router.post('/save-hours', validate(schemas.horario.save), horarioController.saveHours);
router.post('/insert-hours', validate(schemas.horario.insert), horarioController.insertHours);
router.post('/delete-hours', validate(schemas.horario.delete), horarioController.deleteHours);
router.get('/get-horarios', horarioController.getHours);

module.exports = router;
