// backend/server.js

// Importar els mòduls necessaris
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./src/db');

// Importar les rutes
const studentRoutes = require('./src/routes/studentRoutes');
const classRoutes = require('./src/routes/classRoutes');
const plantillaAulaRoutes = require('./src/routes/plantillaAulaRoutes');
const distribucioRoutes = require('./src/routes/distribucioRoutes');
const assignmentRoutes = require('./src/routes/assignmentRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Muntar les rutes
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/plantilles_aula', plantillaAulaRoutes); // AFEGIR AQUESTA
app.use('/api/distribucions', distribucioRoutes); // ADAPTAR (proper pas, antic 'configurations')
app.use('/api/assignments', assignmentRoutes);

app.get('/', (req, res) => {
  res.json({ message: "Benvingut/da a l'API de gestió de classe!" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend escoltant al port ${PORT}`);
});