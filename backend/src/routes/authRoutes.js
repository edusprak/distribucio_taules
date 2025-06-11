// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { login, verifyToken } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Ruta per fer login
router.post('/login', login);

// Ruta per verificar token
router.get('/verify', authenticateToken, verifyToken);

module.exports = router;
