// backend/server.js

// Importar els mòduls necessaris
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const db = require('./src/db');

// Importar el middleware d'autenticació
const { authenticateToken } = require('./src/middleware/auth');

// Importar les rutes
const authRoutes = require('./src/routes/authRoutes');
const studentRoutes = require('./src/routes/studentRoutes');
const classRoutes = require('./src/routes/classRoutes');
const plantillaAulaRoutes = require('./src/routes/plantillaAulaRoutes');
const distribucioRoutes = require('./src/routes/distribucioRoutes');
const assignmentRoutes = require('./src/routes/assignmentRoutes');

const app = express();

// Crear directorio para uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Directorio de uploads creado:', uploadsDir);
}

// Configuració CORS per producció i desenvolupament
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://agrupam.com', 
        'https://www.agrupam.com',
        'https://d1dtggzp2rneqc.cloudfront.net',
        'http://agrupam-distribucio-frontend.s3-website.eu-west-3.amazonaws.com'
      ]
    : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutes d'autenticació (no protegides)
app.use('/api/auth', authRoutes);

// Aplicar autenticació a totes les altres rutes de l'API
app.use('/api/students', authenticateToken, studentRoutes);
app.use('/api/classes', authenticateToken, classRoutes);
app.use('/api/plantilles_aula', authenticateToken, plantillaAulaRoutes);
app.use('/api/distribucions', authenticateToken, distribucioRoutes);
app.use('/api/assignments', authenticateToken, assignmentRoutes);

app.get('/', (req, res) => {
  res.json({ message: "Benvingut/da a l'API de gestió de classe!" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend escoltant al port ${PORT}`);
});