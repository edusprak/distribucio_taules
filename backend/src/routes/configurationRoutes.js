// backend/src/routes/configurationRoutes.js
const express = require('express');
const router = express.Router();
const configurationController = require('../controllers/configurationController');

// POST /api/configurations -> Desar una nova configuració
router.post('/', configurationController.saveConfiguration);

// GET /api/configurations -> Llistar totes les configuracions
router.get('/', configurationController.getAllConfigurations);

// GET /api/configurations/:configId -> Obtenir una configuració específica
router.get('/:configId', configurationController.getConfigurationById);

// DELETE /api/configurations/:configId -> Esborrar una configuració
router.delete('/:configId', configurationController.deleteConfiguration);

// TODO: (Opcional) PUT /api/configurations/:configId -> Actualitzar nom/descripció

module.exports = router;