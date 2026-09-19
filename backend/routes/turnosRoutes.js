// Rutas de turnos del lado paciente (Fase 3). Se montan en /api/turnos.
//
// OJO: el prefijo es /api/turnos (no /turnos) a propósito: '/turnos' es una ruta del
// SPA (React), y usarla como prefijo de API rompería el fallback de navegación.

const express = require('express');
const router = express.Router();
const turnosController = require('../controllers/turnosController');
const { requireRole } = require('../middleware/auth');

// --- Paciente logueado (rol paciente) ---
router.get('/mios', requireRole('paciente'), turnosController.misTurnos);
router.get('/proximo', requireRole('paciente'), turnosController.proximoTurno);
router.post('/:id/cancelar', requireRole('paciente'), turnosController.cancelarPropio);

// --- Invitado (gestión por token, público) ---
router.get('/gestionar', turnosController.gestionarPorToken);
router.post('/gestionar/cancelar', turnosController.cancelarPorToken);

module.exports = router;
