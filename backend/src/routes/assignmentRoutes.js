// backend/src/routes/assignmentRoutes.js
const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');

// POST /api/assignments/auto-assign
router.post('/auto-assign', assignmentController.autoAssignStudents);

module.exports = router;