const express = require('express');
const router = express.Router();
const horarioController = require('../controllers/horarioController');

router.post('/save-hours', horarioController.saveHours);
router.post('/insert-hours', horarioController.insertHours);
router.post('/delete-hours', horarioController.deleteHours);
router.get('/get-horarios', horarioController.getHours);
//router.get('/get-hours-prof', horarioController.getHoursByProfessional);

module.exports = router;
