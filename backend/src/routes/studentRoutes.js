// backend/src/routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const multer = require('multer');

// Configuración de Multer para la carga de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

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

// POST /api/students/import -> Importa alumnos desde archivo CSV o Excel
router.post('/import', upload.single('file'), studentController.importStudentsFromFile);

// router.post('/unassign-all', studentController.unassignAllStudentsFromTables);

module.exports = router;