// Certificados médicos (Fase C). Se monta en /certificados.
// El profesional gestiona la firma y emite certificados; la descarga la puede
// pedir tanto el profesional de la clínica como el paciente dueño (RLS decide).

const express = require('express');
const router = express.Router();
const multer = require('multer');
const certificadoController = require('../controllers/certificadoController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');

// Subida en memoria; hasta 5 MB; imágenes o PDF.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (/^image\/(png|jpe?g)$/.test(file.mimetype) || file.mimetype === 'application/pdf') {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes PNG/JPG o PDF'));
    },
});

const soloImagen = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (/^image\/(png|jpe?g)$/.test(file.mimetype)) return cb(null, true);
        cb(new Error('La firma debe ser una imagen PNG o JPG'));
    },
});

// Firma/sello del profesional.
router.get('/firma', requireRole('profesional'), certificadoController.estadoFirma);
router.post('/firma', requireRole('profesional'), soloImagen.single('firma'), certificadoController.subirFirma);

// Emisión (profesional).
router.post('/generar', requireRole('profesional'), validate(schemas.certificado.generar), certificadoController.generar);
router.post('/subir', requireRole('profesional'), upload.single('archivo'), certificadoController.subir);

// Listado por paciente (profesional). ?dni=...
router.get('/', requireRole('profesional'), certificadoController.listarPorPaciente);

// Descarga (profesional de la clínica o paciente dueño; la RLS lo valida).
router.get('/:id/descargar', requireAuth, certificadoController.descargar);

module.exports = router;
