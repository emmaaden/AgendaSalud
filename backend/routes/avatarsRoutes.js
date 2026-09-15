const express = require('express');
const router = express.Router();
const multer = require('multer');
const avatarsController = require('../controllers/avatarsController');
const { requireAuth } = require('../middleware/auth');

// Configuración de multer (subida en memoria, no en disco local).
// Límite de 2 MB y solo imágenes.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) return cb(null, true);
        cb(new Error('Solo se permiten imágenes'));
    }
});

// El avatar pertenece al usuario autenticado.
router.use(requireAuth);

router.post('/upload', upload.single('avatar'), avatarsController.uploadAvatar);
router.post('/get-img', avatarsController.getAvatar);

module.exports = router;
