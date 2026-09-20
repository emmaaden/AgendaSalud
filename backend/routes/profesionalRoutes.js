const express = require('express');
const router = express.Router();
const profesionalController = require('../controllers/profesionalController');
const { requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');

// Todas las rutas del profesional requieren sesión y rol 'profesional'.
router.use(requireRole('profesional'));

router.post('/get-esp-prof', profesionalController.getEspProf);
router.post('/get-datos-prof', profesionalController.getDatosProf);

router.post('/save-direc', validate(schemas.profesional.saveDirec), profesionalController.saveDirec);
router.post('/save-precio', validate(schemas.profesional.savePrecio), profesionalController.savePrecio);
router.post('/save-desc', validate(schemas.profesional.saveDesc), profesionalController.saveDesc);
module.exports = router;
