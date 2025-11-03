const express = require('express');
const router = express.Router();
const profesionalController = require('../controllers/profesionalController');

router.post('/get-esp-prof', profesionalController.getEspProf);
router.post('/get-datos-prof', profesionalController.getDatosProf);

router.post('/save-direc', profesionalController.saveDirec);
router.post('/save-precio', profesionalController.savePrecio);
router.post('/save-desc', profesionalController.saveDesc);
router.post('/save-calenID', profesionalController.saveCalenID);
module.exports = router;