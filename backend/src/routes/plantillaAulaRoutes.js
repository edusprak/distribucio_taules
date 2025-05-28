// backend/src/routes/plantillaAulaRoutes.js
const express = require('express');
const router = express.Router();
const plantillaAulaController = require('../controllers/plantillaAulaController');

// POST /api/plantilles_aula -> Crear una nova plantilla d'aula
router.post('/', plantillaAulaController.createPlantillaAula);

// GET /api/plantilles_aula -> Obtenir totes les plantilles d'aula
router.get('/', plantillaAulaController.getAllPlantillesAula);

// GET /api/plantilles_aula/:id_plantilla -> Obtenir una plantilla d'aula per ID
router.get('/:id_plantilla', plantillaAulaController.getPlantillaAulaById);

// DELETE /api/plantilles_aula/:id_plantilla -> Esborrar una plantilla d'aula
router.delete('/:id_plantilla', plantillaAulaController.deletePlantillaAula);

module.exports = router;