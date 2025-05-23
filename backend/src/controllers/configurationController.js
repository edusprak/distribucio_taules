// backend/src/controllers/configurationController.js
const db = require('../db');

// POST /api/configurations - Desar una nova configuració
const saveConfiguration = async (req, res) => {
  const { name, description, assignments } = req.body; // assignments = [{ studentId, tableId }, ...]

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: "El nom de la configuració és obligatori." });
  }
  if (!assignments || !Array.isArray(assignments)) {
    return res.status(400).json({ success: false, message: "S'ha de proporcionar un array d'assignacions." });
  }

  try {
    await db.pool.query('BEGIN');

    // 1. Crear la nova configuració a classroom_configurations
    const configRes = await db.query(
      'INSERT INTO classroom_configurations (name, description) VALUES ($1, $2) RETURNING id, name, description, created_at',
      [name.trim(), description || null]
    );
    const newConfiguration = configRes.rows[0];

    // 2. Desar cada assignació a configuration_student_placements
    if (assignments.length > 0) {
      // Construïm una única consulta per inserir múltiples files per eficiència
      const placementValues = [];
      const queryParams = [];
      let paramCounter = 1;

      assignments.forEach(assign => {
        placementValues.push(`($${paramCounter++}, $${paramCounter++}, $${paramCounter++})`);
        queryParams.push(newConfiguration.id);
        queryParams.push(assign.studentId);
        queryParams.push(assign.tableId === undefined ? null : assign.tableId); // Permetre tableId null
      });

      if (placementValues.length > 0) {
          const placementsQuery = `
            INSERT INTO configuration_student_placements (configuration_id, student_id, table_id) 
            VALUES ${placementValues.join(', ')}
            ON CONFLICT (configuration_id, student_id) DO UPDATE SET table_id = EXCLUDED.table_id
            RETURNING student_id, table_id`; 
          // ON CONFLICT és per si es desen assignacions per a un alumne que ja existia en aquesta configuració (poc probable si es crea nova config)
          // però és més segur. Per a una nova config, no hi hauria conflictes.
          // Si només creem, podem ometre ON CONFLICT. Per a 'update' d'una config, seria útil.
          // Com és una nova config, podem simplificar-ho sense ON CONFLICT.

          const simplePlacementsQuery = `
            INSERT INTO configuration_student_placements (configuration_id, student_id, table_id) 
            VALUES ${placementValues.join(', ')}
            RETURNING student_id, table_id`;

          const placementsRes = await db.query(simplePlacementsQuery, queryParams);
          newConfiguration.assignments = placementsRes.rows; // Afegim les assignacions desades a la resposta
      }
    } else {
        newConfiguration.assignments = [];
    }


    await db.pool.query('COMMIT');
    res.status(201).json({ success: true, configuration: newConfiguration });

  } catch (error) {
    await db.pool.query('ROLLBACK');
    console.error('Error desant la configuració:', error);
    // Comprovar errors específics de FK o altres
    if (error.code === '23503') { // Foreign key violation
         return res.status(400).json({ success: false, message: 'Error de dades: algun alumne o taula no existeix.', error: error.message });
    }
    res.status(500).json({ success: false, message: 'Error intern del servidor desant la configuració.', error: error.message });
  }
};

// GET /api/configurations - Llistar totes les configuracions
const getAllConfigurations = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, description, created_at FROM classroom_configurations ORDER BY created_at DESC'
    );
    res.json({ success: true, configurations: result.rows });
  } catch (error) {
    console.error('Error obtenint totes les configuracions:', error);
    res.status(500).json({ success: false, message: 'Error intern del servidor obtenint configuracions.', error: error.message });
  }
};

// GET /api/configurations/:configId - Carregar una configuració específica
const getConfigurationById = async (req, res) => {
    const { configId } = req.params;
    try {
        // 1. Obtenir detalls de la configuració
        const configRes = await db.query(
            'SELECT id, name, description, created_at FROM classroom_configurations WHERE id = $1',
            [configId]
        );
        if (configRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Configuració no trobada.' });
        }
        const configuration = configRes.rows[0];

        // 2. Obtenir les assignacions d'aquesta configuració
        const placementsRes = await db.query(
            'SELECT student_id, table_id FROM configuration_student_placements WHERE configuration_id = $1',
            [configId]
        );

        configuration.assignments = placementsRes.rows.map(p => ({
            studentId: p.student_id,
            tableId: p.table_id
        }));

        res.json({ success: true, configuration });
    } catch (error) {
        console.error(`Error obtenint la configuració ${configId}:`, error);
        res.status(500).json({ success: false, message: 'Error intern del servidor obtenint la configuració.', error: error.message });
    }
};

// DELETE /api/configurations/:configId - Esborrar una configuració
const deleteConfiguration = async (req, res) => {
    const { configId } = req.params;
    try {
        // ON DELETE CASCADE s'encarregarà d'esborrar els placements associats
        const result = await db.query(
            'DELETE FROM classroom_configurations WHERE id = $1 RETURNING id', 
            [configId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Configuració no trobada per esborrar.' });
        }
        res.json({ success: true, message: `Configuració ${configId} esborrada correctament.` });
    } catch (error) {
        console.error(`Error esborrant la configuració ${configId}:`, error);
        res.status(500).json({ success: false, message: 'Error intern del servidor esborrant la configuració.', error: error.message });
    }
};


module.exports = {
  saveConfiguration,
  getAllConfigurations,
  getConfigurationById,
  deleteConfiguration,
};