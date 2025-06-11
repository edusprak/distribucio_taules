// backend/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// Credencials per defecte (pots canviar-les via variables d'entorn)
const DEFAULT_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || 'distribucio2025';

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Cal proporcionar usuari i contrasenya'
      });
    }

    // Verificar credencials (sistema simple)
    if (username !== DEFAULT_USERNAME) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Usuari o contrasenya incorrectes'
      });
    }

    // Per simplicitat, comparem la contrasenya directament
    // En producció hauríem de tenir contrasenyes encriptades a la BD
    if (password !== DEFAULT_PASSWORD) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Usuari o contrasenya incorrectes'
      });
    }

    // Generar JWT token
    const token = jwt.sign(
      { 
        username: username,
        loginTime: new Date().toISOString()
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login exitós',
      token,
      user: {
        username: username
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error intern del servidor'
    });
  }
};

const verifyToken = (req, res) => {
  // Si arribem aquí, el token és vàlid (gràcies al middleware)
  res.json({
    message: 'Token vàlid',
    user: req.user
  });
};

module.exports = {
  login,
  verifyToken
};
