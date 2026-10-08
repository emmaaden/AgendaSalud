// Dictado por voz con motor propio (whisper.cpp local). Se monta en /dictado.
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const dictadoController = require('../controllers/dictadoController');
const { requireRole } = require('../middleware/auth');
const { requireFeature } = require('../middleware/plan');

// Un dictado manda un tramo cada pocos segundos: límite propio, más alto que el general
// (que excluye esta ruta) pero suficiente para frenar abusos.
const dictadoLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

// Tramos de hasta ~15 s de WAV 16 kHz mono (≈480 KB).
const audioWav = express.raw({ type: ['audio/wav', 'audio/x-wav'], limit: '2mb' });

router.post('/', requireRole('profesional'), requireFeature('dictado'), dictadoLimiter, audioWav, dictadoController.transcribir);

module.exports = router;
