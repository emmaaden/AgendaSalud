const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoriaController');
const { requireRolClinica } = require('../middleware/auth');
const { requireFeature } = require('../middleware/plan');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');

// Fase J: auditoría médica. Los permisos se deciden por el rol de la MEMBRESÍA en la
// clínica activa (requireRolClinica), no por el tipo de cuenta.
const verAuditoria = requireRolClinica('auditor', 'admin');

// Fase L: la auditoría médica es del plan Clínica.
router.use(requireFeature('auditoria'));

// Bandeja, detalle, filtros, bitácora y resumen: auditor y admin.
router.get('/registros', verAuditoria, validate(schemas.auditoria.listar, 'query'), auditoriaController.listarRegistros);
router.get('/registros/:id', verAuditoria, auditoriaController.detalleRegistro);
router.get('/filtros', verAuditoria, auditoriaController.filtros);
router.get('/bitacora', verAuditoria, validate(schemas.auditoria.bitacora, 'query'), auditoriaController.bitacora);
router.get('/resumen', verAuditoria, validate(schemas.auditoria.resumen, 'query'), auditoriaController.resumen);
// Fase K: cruce de asistencia (turnos vs. registros).
router.get('/cruce', verAuditoria, validate(schemas.auditoria.cruce, 'query'), auditoriaController.cruce);

// Revisar un registro: solo el auditor.
router.post('/registros/:id/revision', requireRolClinica('auditor'), validate(schemas.auditoria.revisar), auditoriaController.revisar);

// Observaciones sobre los registros propios y su respuesta: quien atiende (profesional/admin).
router.get('/observaciones', requireRolClinica('profesional', 'admin'), auditoriaController.observaciones);
router.post('/revisiones/:id/respuesta', requireRolClinica('profesional', 'admin'), validate(schemas.auditoria.responder), auditoriaController.responder);

module.exports = router;
