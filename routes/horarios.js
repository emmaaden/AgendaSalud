const express = require('express');
const router = express.Router();
const horarioController = require('../controllers/horarioController');
const { requireRole } = require('../middleware/auth');

// La gestión de horarios es exclusiva del profesional autenticado.
router.use(requireRole('profesional'));

router.post('/save-hours', horarioController.saveHours);
router.post('/insert-hours', horarioController.insertHours);
router.post('/delete-hours', horarioController.deleteHours);
router.get('/get-horarios', horarioController.getHours);

module.exports = router;
