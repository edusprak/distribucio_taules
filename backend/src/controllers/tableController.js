// backend/src/controllers/tableController.js
const db = require('../db'); // El nostre mòdul de connexió a la BD

// Funció per crear una nova taula
const createTable = async (req, res) => {
  const { capacity, table_number } = req.body;

  if (!capacity || !table_number) {
    return res.status(400).json({ message: 'La capacitat i el número de taula són obligatoris.' });
  }
  if (isNaN(parseInt(capacity)) || parseInt(capacity) <= 0) {
    return res.status(400).json({ message: 'La capacitat ha de ser un número positiu.' });
  }

  try {
    const newTableResult = await db.query(
      'INSERT INTO tables (capacity, table_number) VALUES ($1, $2) RETURNING id, capacity, table_number, created_at, updated_at',
      [parseInt(capacity), table_number]
    );
    res.status(201).json(newTableResult.rows[0]);
  } catch (error) {
    console.error('Error creating table:', error);
    if (error.code === '23505') { // unique_violation (per table_number)
      return res.status(409).json({ message: `El número de taula '${table_number}' ja existeix.`, error: error.message });
    }
    res.status(500).json({ message: 'Error intern del servidor', error: error.message });
  }
};

// Funció per obtenir totes les taules
const getAllTables = async (req, res) => {
  try {
    // També obtenim els alumnes assignats a cada taula
    const query = `
      SELECT 
        t.id, t.capacity, t.table_number, t.created_at, t.updated_at,
        COALESCE(
          (SELECT json_agg(
            json_build_object('id', s.id, 'name', s.name, 'academic_grade', s.academic_grade, 'gender', s.gender)
           ORDER BY s.name) 
           FROM students s WHERE s.table_id = t.id), 
          '[]'::json
        ) as students
      FROM tables t
      ORDER BY t.table_number ASC;
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching all tables:', error);
    res.status(500).json({ message: 'Error intern del servidor', error: error.message });
  }
};

// Funció per obtenir una taula per ID
const getTableById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        t.id, t.capacity, t.table_number, t.created_at, t.updated_at,
        COALESCE(
          (SELECT json_agg(
            json_build_object('id', s.id, 'name', s.name, 'academic_grade', s.academic_grade, 'gender', s.gender)
           ORDER BY s.name) 
           FROM students s WHERE s.table_id = t.id), 
          '[]'::json
        ) as students
      FROM tables t
      WHERE t.id = $1;
    `;
    const { rows } = await db.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Taula no trobada' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(`Error fetching table ${id}:`, error);
    res.status(500).json({ message: 'Error intern del servidor', error: error.message });
  }
};

// Funció per actualitzar una taula
const updateTable = async (req, res) => {
  const { id } = req.params;
  const { capacity, table_number } = req.body;

  if (capacity === undefined && table_number === undefined) {
    return res.status(400).json({ message: 'S\'ha de proporcionar almenys un camp (capacity o table_number) per actualitzar.' });
  }
  if (capacity !== undefined && (isNaN(parseInt(capacity)) || parseInt(capacity) <= 0)) {
    return res.status(400).json({ message: 'La capacitat ha de ser un número positiu.' });
  }

  try {
    const fieldsToUpdate = [];
    const values = [];
    let queryIndex = 1;

    if (capacity !== undefined) {
        fieldsToUpdate.push(`capacity = $${queryIndex++}`);
        values.push(parseInt(capacity));
    }
    if (table_number !== undefined) {
        fieldsToUpdate.push(`table_number = $${queryIndex++}`);
        values.push(table_number);
    }

    // updated_at s'actualitzarà automàticament pel trigger si existeix
    // Si no, afegeix: fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: 'No s\'han proporcionat camps vàlids per actualitzar.' });
    }

    values.push(id); // Per al WHERE id = $N
    const updateQuery = `UPDATE tables SET ${fieldsToUpdate.join(', ')} WHERE id = $${queryIndex} RETURNING id, capacity, table_number, created_at, updated_at`;

    const updatedTableResult = await db.query(updateQuery, values);

    if (updatedTableResult.rows.length === 0) {
      return res.status(404).json({ message: 'Taula no trobada per actualitzar' });
    }
    res.json(updatedTableResult.rows[0]);
  } catch (error) {
    console.error(`Error updating table ${id}:`, error);
    if (error.code === '23505') { // unique_violation (per table_number)
      return res.status(409).json({ message: `El número de taula '${table_number}' ja existeix.`, error: error.message });
    }
    res.status(500).json({ message: 'Error intern del servidor', error: error.message });
  }
};

// Funció per esborrar una taula
const deleteTable = async (req, res) => {
  const { id } = req.params;
  try {
    // Recorda que a la taula 'students', la FK 'table_id' té ON DELETE SET NULL.
    // Això significa que si s'esborra una taula, els alumnes que hi estaven assignats
    // tindran el seu 'table_id' a NULL automàticament.
    const deleteResult = await db.query('DELETE FROM tables WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Taula no trobada per esborrar' });
    }
    res.status(200).json({ message: `Taula amb ID ${id} esborrada correctament` });
  } catch (error) {
    console.error(`Error deleting table ${id}:`, error);
    res.status(500).json({ message: 'Error intern del servidor', error: error.message });
  }
};

module.exports = {
  createTable,
  getAllTables,
  getTableById,
  updateTable,
  deleteTable,
};