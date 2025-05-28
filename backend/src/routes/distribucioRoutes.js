// backend/src/routes/distribucioRoutes.js
const express = require('express');
const router = express.Router();
const distribucioController = require('../controllers/distribucioController');

// POST /api/distribucions -> Desar una nova distribució
router.post('/', distribucioController.saveDistribucio);

// GET /api/distribucions -> Llistar totes les distribucions (pot filtrar per plantilla_id)
router.get('/', distribucioController.getAllDistribucions);

// GET /api/distribucions/:id_distribucio -> Obtenir una distribució específica
router.get('/:id_distribucio', distribucioController.getDistribucioById);

// DELETE /api/distribucions/:id_distribucio -> Esborrar una distribució
router.delete('/:id_distribucio', distribucioController.deleteDistribucio);

module.exports = router;