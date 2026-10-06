const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogoController');
const { requireRolClinica } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const schemas = require('../validators/schemas');

// Fase K: catálogos de obras sociales, CIE-10 y prácticas.
// Lectura: staff de la clínica activa y auditor. Escritura: solo el admin.
const leer = requireRolClinica('admin', 'profesional', 'recepcion', 'auditor');
const admin = requireRolClinica('admin');

// Público (registro del paciente, sin sesión): solo el catálogo global.
router.get('/obras-sociales/publicas', catalogoController.obrasSocialesPublicas);

router.get('/obras-sociales', leer, catalogoController.obrasSociales);
router.post('/obras-sociales', admin, validate(schemas.catalogo.obraSocial), catalogoController.crearObraSocial);
router.patch('/obras-sociales/:id', admin, validate(schemas.catalogo.obraSocialPatch), catalogoController.actualizarObraSocial);

router.get('/cie10', leer, catalogoController.cie10);

router.get('/practicas', leer, catalogoController.practicas);
router.post('/practicas', admin, validate(schemas.catalogo.practica), catalogoController.crearPractica);
router.post('/practicas/base', admin, catalogoController.cargarPracticasBase);
router.post('/practicas/importar', admin, validate(schemas.catalogo.importarPracticas), catalogoController.importarPracticas);
router.patch('/practicas/:id', admin, validate(schemas.catalogo.practicaPatch), catalogoController.actualizarPractica);

module.exports = router;
