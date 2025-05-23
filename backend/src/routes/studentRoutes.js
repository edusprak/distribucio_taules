// backend/src/routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// GET /api/students -> Obté tots els alumnes
router.get('/', studentController.getAllStudents);

// POST /api/students -> Crea un nou alumne
router.post('/', studentController.createStudent);

// GET /api/students/:id -> Obté un alumne per ID
router.get('/:id', studentController.getStudentById);

// PUT /api/students/:id -> Actualitza un alumne per ID
router.put('/:id', studentController.updateStudent);

// DELETE /api/students/:id -> Esborra un alumne per ID
router.delete('/:id', studentController.deleteStudent);

router.post('/unassign-all', studentController.unassignAllStudentsFromTables);

module.exports = router;