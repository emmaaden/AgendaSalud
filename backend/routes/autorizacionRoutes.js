const express = require('express');
const router = express.Router();
const multer = require('multer');
const autorizacionController = require('../controllers/autorizacionController');
const { requireRolClinica } = require('../middleware/auth');
const { requireFeature } = require('../middleware/plan');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');

// Fase K: autorizaciones previas. Permisos por el rol de la membresía activa.
const quienAtiende = requireRolClinica('profesional', 'admin');
const cualquiera = requireRolClinica('profesional', 'admin', 'auditor');

// Fase L: las autorizaciones previas (las resuelve un auditor) son del plan Clínica.
router.use(requireFeature('autorizaciones'));

// Adjuntos en memoria: hasta 5 archivos de 10 MB, imágenes PNG/JPG o PDF.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 5 },
    fileFilter: (req, file, cb) => {
        if (/^image\/(png|jpe?g)$/.test(file.mimetype) || file.mimetype === 'application/pdf') {
            return cb(null, true);
        }
        cb(new Error('Los adjuntos deben ser imágenes PNG/JPG o PDF'));
    },
});

// Errores de multer (tamaño, cantidad, tipo) como 400 legibles.
function subirAdjuntos(req, res, next) {
    upload.array('adjuntos', 5)(req, res, (err) => {
        if (!err) return next();
        const msg = err.code === 'LIMIT_FILE_SIZE'
            ? 'Cada adjunto puede pesar hasta 10 MB.'
            : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
                ? 'Podés adjuntar hasta 5 archivos.'
                : err.message;
        return res.status(400).json({ error: msg });
    });
}

router.post('/', quienAtiende, subirAdjuntos, validate(schemas.autorizacion.solicitar), autorizacionController.solicitar);
router.get('/', cualquiera, validate(schemas.autorizacion.listar, 'query'), autorizacionController.listar);
router.get('/vigentes', quienAtiende, autorizacionController.vigentes);
router.get('/:id', cualquiera, autorizacionController.detalle);
router.get('/:id/adjuntos/:adjuntoId', cualquiera, autorizacionController.adjunto);
router.post('/:id/resolver', requireRolClinica('auditor'), validate(schemas.autorizacion.resolver), autorizacionController.resolver);
router.post('/:id/cancelar', quienAtiende, autorizacionController.cancelar);

module.exports = router;
