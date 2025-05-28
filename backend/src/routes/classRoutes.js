// backend/src/routes/classRoutes.js
const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');

// POST /api/classes -> Crear una nova classe
router.post('/', classController.createClass);

// GET /api/classes -> Obtenir totes les classes
router.get('/', classController.getAllClasses);

// GET /api/classes/:id_classe -> Obtenir una classe per ID
router.get('/:id_classe', classController.getClassById);

// PUT /api/classes/:id_classe -> Actualitzar una classe
router.put('/:id_classe', classController.updateClass);

// DELETE /api/classes/:id_classe -> Esborrar una classe
router.delete('/:id_classe', classController.deleteClass);

module.exports = router;