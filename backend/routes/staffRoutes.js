// Rutas de gestión de turnos por el staff de la clínica (Fase E). Se montan en /staff.
// Las usan recepción, profesionales y admin. Todas exigen una clínica activa
// (requireStaffClinica) y se acotan a esa clínica en el controller (service_role).

const express = require('express');
const router = express.Router();
const recepcionController = require('../controllers/recepcionController');
const { requireStaffClinica } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');

router.use(requireStaffClinica);

router.get('/turnos', recepcionController.listarTurnos);
router.get('/profesionales', recepcionController.listarProfesionales);
router.post('/turnos', validate(schemas.staff.crearTurno), recepcionController.crearTurno);
router.post('/turnos/:id/cancelar', recepcionController.cancelarTurno);
router.post('/turnos/:id/reprogramar', validate(schemas.staff.reprogramar), recepcionController.reprogramarTurno);
router.post('/turnos/:id/reenviar-confirmacion', recepcionController.reenviarConfirmacion);

// Bloqueos de horario (ausencias).
router.get('/bloqueos', recepcionController.listarBloqueos);
router.post('/bloqueos', validate(schemas.staff.crearBloqueo), recepcionController.crearBloqueo);
router.delete('/bloqueos/:id', recepcionController.eliminarBloqueo);

module.exports = router;
