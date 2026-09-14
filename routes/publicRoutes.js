const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Rutas públicas (sin autenticación) usadas por la página de turnos.
router.get('/professionals', publicController.listProfessionals);
router.get('/api/get-hours', publicController.getBookingHours);

module.exports = router;
