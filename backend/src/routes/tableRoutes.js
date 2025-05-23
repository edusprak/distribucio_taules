// backend/src/routes/tableRoutes.js
const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');

// POST /api/tables -> Crea una nova taula
router.post('/', tableController.createTable);

// GET /api/tables -> Obté totes les taules
router.get('/', tableController.getAllTables);

// GET /api/tables/:id -> Obté una taula per ID
router.get('/:id', tableController.getTableById);

// PUT /api/tables/:id -> Actualitza una taula per ID
router.put('/:id', tableController.updateTable);

// DELETE /api/tables/:id -> Esborra una taula per ID
router.delete('/:id', tableController.deleteTable);

module.exports = router;