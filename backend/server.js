// backend/server.js

// Importar els mòduls necessaris
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./src/db');

// Importar les rutes
const studentRoutes = require('./src/routes/studentRoutes');
const tableRoutes = require('./src/routes/tableRoutes');
const assignmentRoutes = require('./src/routes/assignmentRoutes');
const configurationRoutes = require('./src/routes/configurationRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Muntar les rutes
app.use('/api/students', studentRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/configurations', configurationRoutes);

app.get('/', (req, res) => {
  res.json({ message: "Benvingut/da a l'API de gestió de classe!" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend escoltant al port ${PORT}`);
});