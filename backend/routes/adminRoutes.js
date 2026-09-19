const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireRole, requireClinicaAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');

// Todo el panel de administración exige ser admin de la clínica activa (Fase B).
router.use(requireRole('profesional'), requireClinicaAdmin);

router.get('/miembros', adminController.listarMiembros);
router.patch('/miembros/:id', validate(schemas.admin.actualizarMiembro), adminController.actualizarMiembro);

module.exports = router;
