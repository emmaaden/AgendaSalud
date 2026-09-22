// Mis estudios (Fase I). Se monta en /estudios.
// - El paciente sube/gestiona/comparte sus estudios.
// - El profesional consulta su bandeja "Compartidos conmigo".
// - La descarga la puede pedir el dueño o el profesional destinatario (RLS decide).

const express = require('express');
const router = express.Router();
const multer = require('multer');
const estudioController = require('../controllers/estudioController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Subida en memoria; hasta 10 MB; imágenes (PNG/JPG) o PDF.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (/^image\/(png|jpe?g)$/.test(file.mimetype) || file.mimetype === 'application/pdf') {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes PNG/JPG o PDF'));
    },
});

// --- Rutas literales primero (para no colisionar con /:id) ---

// Bandeja del profesional.
router.get('/compartidos-conmigo', requireRole('profesional'), estudioController.compartidosConmigo);

// Buscador de profesionales para compartir (paciente).
router.get('/profesionales/buscar', requireRole('paciente'), estudioController.buscarProfesionales);

// --- Estudios del paciente ---
router.get('/', requireRole('paciente'), estudioController.listar);
router.post('/', requireRole('paciente'), upload.single('archivo'), estudioController.subir);
router.put('/:id', requireRole('paciente'), estudioController.actualizar);
router.delete('/:id', requireRole('paciente'), estudioController.eliminar);

// Compartir / revocar (paciente dueño).
router.post('/:id/compartir', requireRole('paciente'), estudioController.compartir);
router.delete('/:id/compartir/:idProfesional', requireRole('paciente'), estudioController.revocar);

// Descarga (dueño o profesional destinatario; la RLS lo valida).
router.get('/:id/descargar', requireAuth, estudioController.descargar);

module.exports = router;
