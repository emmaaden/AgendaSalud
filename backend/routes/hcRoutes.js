// Exportación / Importación de Historias Clínicas (Fase D). Se monta en /hc.
// Requiere rol profesional; el alcance (admin = toda la clínica, profesional =
// sus pacientes) lo resuelve el controller a partir de la sesión.

const express = require('express');
const router = express.Router();
const hcController = require('../controllers/hcController');
const { requireRole } = require('../middleware/auth');
const { requireFeature } = require('../middleware/plan');

router.use(requireRole('profesional'));

router.get('/export', hcController.exportar);
router.get('/pacientes', hcController.pacientesEnAlcance);

// Import: parser JSON con límite alto (los archivos de HC pueden ser grandes).
// Fase L: exportar no se limita NUNCA (los datos son de la clínica); importar depende del plan.
router.post('/import', requireFeature('importar_hc'), express.json({ limit: '20mb' }), hcController.importar);

module.exports = router;
