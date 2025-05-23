const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' }); // Assegura't que el camí a .env és correcte des d'aquí

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"), // El port ha de ser un número
});

// Provem la connexió
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error adquirint client de la pool', err.stack);
  }
  client.query('SELECT NOW()', (err, result) => {
    release(); // Allibera el client de nou a la pool
    if (err) {
      return console.error('Error executant la consulta de prova', err.stack);
    }
    console.log('Connexió a PostgreSQL reeixida! Data i hora del servidor:', result.rows[0].now);
  });
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Exportem el pool per si necessitem accés directe en casos avançats
};