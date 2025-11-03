const express = require('express');
const router = express.Router();
const multer = require('multer');
const avatarsController = require('../controllers/avatarsController');

// Configuración de multer (subida en memoria, no en disco local)
const upload = multer({ storage: multer.memoryStorage() });

// Ruta para subir avatar
router.post('/upload', upload.single('avatar'), avatarsController.uploadAvatar);
router.post('/get-img', avatarsController.getAvatar);

module.exports = router;
