const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');

// Rate-limit estricto SOLO para las operaciones sensibles de credenciales.
// (get-area / get-calenID / save-area quedan bajo el limiter general de index.js.)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/register', authLimiter, validate(schemas.auth.register), authController.register);
router.post('/login', authLimiter, validate(schemas.auth.login), authController.login);
router.post('/logout', authController.logout);

// Recuperación de contraseña (envía el email de recuperación de Supabase).
router.post('/forgot-password', authLimiter, validate(schemas.auth.forgotPassword), authController.forgotPassword);

// Área del profesional autenticado (usa la sesión, no el body).
router.post('/get-area', requireAuth, authController.getArea);

// Asignar especialidad al profesional autenticado.
router.post('/save-area', requireRole('profesional'), validate(schemas.auth.saveArea), authController.saveArea);

// id_calendario por id de profesional (público: página de turnos).
router.post('/get-calenID', validate(schemas.auth.getCalenID), authController.getCalenID);

module.exports = router;
