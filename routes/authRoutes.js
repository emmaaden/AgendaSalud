const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Rate-limit estricto SOLO para las operaciones sensibles de credenciales.
// (get-area / get-calenID / save-area quedan bajo el limiter general de index.js.)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);

// Área del profesional autenticado (usa la sesión, no el body).
router.post('/get-area', requireAuth, authController.getArea);

// Asignar especialidad al profesional autenticado.
router.post('/save-area', requireRole('profesional'), authController.saveArea);

// id_calendario por id de profesional (público: página de turnos).
router.post('/get-calenID', authController.getCalenID);

module.exports = router;
