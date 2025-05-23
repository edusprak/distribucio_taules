// backend/src/controllers/studentController.js
const db = require('../db'); // El nostre mòdul de connexió a la BD

// Funció per obtenir tots els alumnes
const getAllStudents = async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id, s.name, s.academic_grade, s.gender, s.table_id,
        (
          SELECT COALESCE(json_agg(DISTINCT r.restricted_student_id), '[]'::json)
          FROM (
            SELECT sr.student_id_1 AS restricted_student_id
            FROM student_restrictions sr
            WHERE sr.student_id_2 = s.id
            UNION
            SELECT sr.student_id_2 AS restricted_student_id
            FROM student_restrictions sr
            WHERE sr.student_id_1 = s.id
          ) AS r
        ) AS restrictions
      FROM students s
      GROUP BY s.id
      ORDER BY s.name ASC; 
    `;
    const { rows } = await db.query(query);
    // El map que teníem per netejar restriccions individuals null ja no és tan necessari
    // si la subconsulta amb COALESCE ja retorna '[]'::json.
    // Però, per assegurar, podem mantenir un map si la consulta pogués retornar null dins de l'array
    const studentsWithRestrictions = rows.map(student => ({
        ...student,
        restrictions: student.restrictions || [] // Assegura que sempre sigui un array
    }));
    res.json(studentsWithRestrictions);
  } catch (error) {
    console.error('Error fetching all students with restrictions:', error);
    res.status(500).json({ message: 'Error intern del servidor', error: error.message });
  }
};

// Funció per obtenir un alumne per ID
const getStudentById = async (req, res) => {
  const { id } = req.params;
  try {
    // Obtenir dades bàsiques de l'alumne
    const studentResult = await db.query('SELECT id, name, academic_grade, gender, table_id FROM students WHERE id = $1', [id]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Alumne no trobat' });
    }
    const student = studentResult.rows[0];

    // Obtenir les restriccions de l'alumne
    // student_id_1 < student_id_2, per tant hem de buscar en ambdues columnes
    const restrictionsResult = await db.query(
      `SELECT 
         CASE 
           WHEN student_id_1 = $1 THEN student_id_2 
           ELSE student_id_1 
         END as restricted_with_student_id 
       FROM student_restrictions 
       WHERE student_id_1 = $1 OR student_id_2 = $1`,
      [id]
    );

    student.restrictions = restrictionsResult.rows.map(r => r.restricted_with_student_id);

    res.json(student);
  } catch (error) {
    console.error(`Error fetching student ${id}:`, error);
    res.status(500).json({ message: 'Error intern del servidor', error: error.message });
  }
};


// Funció per crear un nou alumne
const createStudent = async (req, res) => {
  const { name, academic_grade, gender, restrictions } = req.body; // restrictions serà un array d'IDs d'alumnes

  if (!name || academic_grade === undefined) {
    return res.status(400).json({ message: 'El nom i la nota acadèmica són obligatoris.' });
  }

  try {
    // Utilitzem una transacció perquè si falla la inserció de restriccions, es faci rollback de la creació de l'alumne
    await db.pool.query('BEGIN');

    const newStudentResult = await db.query(
      'INSERT INTO students (name, academic_grade, gender) VALUES ($1, $2, $3) RETURNING id, name, academic_grade, gender',
      [name, parseFloat(academic_grade), gender]
    );
    const newStudent = newStudentResult.rows[0];

    let createdRestrictions = [];
    if (restrictions && restrictions.length > 0) {
      for (const restrictedStudentId of restrictions) {
        // Assegurem l'ordre per a la clau primària (student_id_1 < student_id_2)
        const id1 = Math.min(newStudent.id, parseInt(restrictedStudentId));
        const id2 = Math.max(newStudent.id, parseInt(restrictedStudentId));

        // Ignorem si s'intenta restringir amb si mateix (tot i que la lògica d'UI ho hauria d'evitar)
        if (id1 === id2) continue; 

        try {
            const restrictionResult = await db.query(
            'INSERT INTO student_restrictions (student_id_1, student_id_2) VALUES ($1, $2) RETURNING student_id_1, student_id_2',
            [id1, id2]
            );
            createdRestrictions.push(restrictionResult.rows[0]);
        } catch (restrictionError) {
            // Podria ser un error de clau duplicada si la restricció ja existeix, el podem ignorar o gestionar
            if (restrictionError.code === '23505') { // Codi d'error per unique_violation
                console.warn(`La restricció entre ${id1} i ${id2} ja existia o era un duplicat.`);
            } else {
                throw restrictionError; // Rellença un altre tipus d'error
            }
        }
      }
    }

    await db.pool.query('COMMIT');

    newStudent.restrictions = restrictions || []; // Retornem els IDs de restricció enviats per consistència
    res.status(201).json(newStudent);

  } catch (error) {
    await db.pool.query('ROLLBACK');
    console.error('Error creating student:', error);
    if (error.code === '23503') { // Foreign key violation (e.g. restrictedStudentId no existeix)
         return res.status(400).json({ message: 'Error de restricció: un dels ID d\'alumne restringit no existeix.', error: error.message });
    }
    if (error.code === '23514') { // Check violation (e.g. nota acadèmica fora de rang)
        return res.status(400).json({ message: 'Error de validació: la nota acadèmica ha d\'estar entre 0 i 10.', error: error.message });
    }
    res.status(500).json({ message: 'Error intern del servidor', error: error.message });
  }
};

// Funció per actualitzar un alumne
const updateStudent = async (req, res) => {
    const { id } = req.params;
    const { name, academic_grade, gender, table_id, restrictions } = req.body;

    if (name === undefined && academic_grade === undefined && gender === undefined && table_id === undefined && restrictions === undefined) {
        return res.status(400).json({ message: 'S\'ha de proporcionar almenys un camp per actualitzar.' });
    }

    try {
        await db.pool.query('BEGIN');

        // ---> INICI NOVA LÒGICA DE VALIDACIÓ DE RESTRICCIONS ABANS D'ACTUALITZAR TABLE_ID <---
        if (table_id !== undefined) { // Només si s'està intentant modificar la taula
            const studentIdToAssign = parseInt(id);
            const targetTableId = table_id === null ? null : parseInt(table_id);

            if (targetTableId !== null) { // Si s'assigna a una taula (no si es desassigna)
                // 1. Obtenir les restriccions de l'alumne que s'assigna
                const studentRestrictionsRes = await db.query(
                    `SELECT 
                       (SELECT COALESCE(json_agg(r.restricted_student_id), '[]'::json)
                        FROM (
                            SELECT sr.student_id_1 AS restricted_student_id FROM student_restrictions sr WHERE sr.student_id_2 = $1
                            UNION
                            SELECT sr.student_id_2 AS restricted_student_id FROM student_restrictions sr WHERE sr.student_id_1 = $1
                        ) AS r
                       ) AS restrictions
                     FROM students s WHERE s.id = $1`, [studentIdToAssign]
                );
                const studentRestrictions = studentRestrictionsRes.rows[0]?.restrictions || [];

                // 2. Obtenir els alumnes ja presents a la taula de destinació
                const studentsInTargetTableRes = await db.query(
                    'SELECT id FROM students WHERE table_id = $1 AND id != $2', // Exclou l'alumne actual si ja hi era
                    [targetTableId, studentIdToAssign]
                );
                const studentsInTargetTableIds = studentsInTargetTableRes.rows.map(s => s.id);

                // 3. Comprovar si hi ha conflictes
                for (const restrictedStudentId of studentRestrictions) {
                    if (studentsInTargetTableIds.includes(restrictedStudentId)) {
                        await db.pool.query('ROLLBACK');
                        // Trobat un conflicte de restricció!
                        const conflictingStudentRes = await db.query('SELECT name FROM students WHERE id = $1', [restrictedStudentId]);
                        const conflictingStudentName = conflictingStudentRes.rows[0]?.name || 'un altre alumne';
                        return res.status(409).json({ // 409 Conflict
                            message: `Conflicte de restricció: L'alumne no es pot assignar a aquesta taula perquè té una restricció amb ${conflictingStudentName} que ja hi és.`,
                            error: 'restriction_violation'
                        });
                    }
                }

                // (Opcional) Comprovar capacitat de la taula aquí també, com a doble verificació
                const tableCapacityRes = await db.query('SELECT capacity FROM tables WHERE id = $1', [targetTableId]);
                const tableCapacity = tableCapacityRes.rows[0]?.capacity;
                if (tableCapacity !== undefined && studentsInTargetTableIds.length >= tableCapacity) {
                    await db.pool.query('ROLLBACK');
                    return res.status(409).json({
                        message: `La taula està plena. No es pot assignar l'alumne.`,
                        error: 'table_full'
                    });
                }
            }
        }

        // Construir la consulta d'actualització dinàmicament per actualitzar només els camps proporcionats
        const fieldsToUpdate = [];
        const values = [];
        let queryIndex = 1;

        if (name !== undefined) {
            fieldsToUpdate.push(`name = $${queryIndex++}`);
            values.push(name);
        }
        if (academic_grade !== undefined) {
            fieldsToUpdate.push(`academic_grade = $${queryIndex++}`);
            values.push(parseFloat(academic_grade));
        }
        if (gender !== undefined) {
            fieldsToUpdate.push(`gender = $${queryIndex++}`);
            values.push(gender);
        }
        // table_id pot ser null per desassignar
        if (table_id !== undefined) {
            fieldsToUpdate.push(`table_id = $${queryIndex++}`);
            values.push(table_id === null ? null : parseInt(table_id));
        }

        // Important: updated_at s'actualitzarà automàticament si has creat el trigger a la BD.
        // Si no, afegeix: fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);

        if (fieldsToUpdate.length === 0 && restrictions === undefined) {
             await db.pool.query('ROLLBACK'); // No hi ha res a actualitzar a la taula students
             return res.status(400).json({ message: 'No s\'han proporcionat camps vàlids per actualitzar a la taula d\'alumnes (només restriccions).' });
        }

        let updatedStudent;
        if (fieldsToUpdate.length > 0) {
            values.push(id); // Per al WHERE id = $N
            const updateQuery = `UPDATE students SET ${fieldsToUpdate.join(', ')} WHERE id = $${queryIndex} RETURNING id, name, academic_grade, gender, table_id`;

            const studentResult = await db.query(updateQuery, values);
            if (studentResult.rows.length === 0) {
                await db.pool.query('ROLLBACK');
                return res.status(404).json({ message: 'Alumne no trobat per actualitzar' });
            }
            updatedStudent = studentResult.rows[0];
        } else {
            // Si només s'actualitzen restriccions, obtenim l'alumne actual
            const studentResult = await db.query('SELECT id, name, academic_grade, gender, table_id FROM students WHERE id = $1', [id]);
            if (studentResult.rows.length === 0) {
                await db.pool.query('ROLLBACK');
                return res.status(404).json({ message: 'Alumne no trobat per actualitzar restriccions' });
            }
            updatedStudent = studentResult.rows[0];
        }


        // Gestionar actualització de restriccions:
        // 1. Esborrar totes les restriccions existents per a aquest alumne.
        // 2. Afegir les noves restriccions.
        if (restrictions !== undefined) { // Si s'envia l'array 'restrictions' (fins i tot buit)
            await db.query('DELETE FROM student_restrictions WHERE student_id_1 = $1 OR student_id_2 = $1', [id]);

            let updatedStudentRestrictions = [];
            if (restrictions.length > 0) {
                for (const restrictedStudentId of restrictions) {
                    const id1 = Math.min(parseInt(id), parseInt(restrictedStudentId));
                    const id2 = Math.max(parseInt(id), parseInt(restrictedStudentId));
                    if (id1 === id2) continue; // No restringir amb si mateix

                    try {
                        await db.query(
                        'INSERT INTO student_restrictions (student_id_1, student_id_2) VALUES ($1, $2)',
                        [id1, id2]
                        );
                        updatedStudentRestrictions.push(restrictedStudentId); // Guardem l'ID original de la restricció
                    } catch (restrictionError) {
                        if (restrictionError.code === '23505') { // Unique violation
                            console.warn(`La restricció entre ${id1} i ${id2} ja existia o era un duplicat durant l'actualització.`);
                        } else {
                            throw restrictionError;
                        }
                    }
                }
            }
            updatedStudent.restrictions = updatedStudentRestrictions;
        } else {
            // Si no s'envia 'restrictions', mantenim les existents (no les toquem)
            // o les carreguem per retornar l'estat complet. Per simplicitat, les carreguem:
            const currentRestrictionsResult = await db.query(
                `SELECT CASE WHEN student_id_1 = $1 THEN student_id_2 ELSE student_id_1 END as restricted_with_student_id 
                 FROM student_restrictions 
                 WHERE student_id_1 = $1 OR student_id_2 = $1`,
                [id]
            );
            updatedStudent.restrictions = currentRestrictionsResult.rows.map(r => r.restricted_with_student_id);
        }

        await db.pool.query('COMMIT');
        res.json(updatedStudent);

    } catch (error) {
        await db.pool.query('ROLLBACK');
        console.error(`Error updating student ${id}:`, error);
         if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({ message: 'Error de restricció: un dels ID d\'alumne restringit o ID de taula no existeix.', error: error.message });
        }
        if (error.code === '23514') { // Check violation
            return res.status(400).json({ message: 'Error de validació: la nota acadèmica ha d\'estar entre 0 i 10.', error: error.message });
        }
        res.status(500).json({ message: 'Error intern del servidor', error: error.message });
    }
};

// Funció per esborrar un alumne
const deleteStudent = async (req, res) => {
  const { id } = req.params;
  try {
    // La taula student_restrictions té ON DELETE CASCADE,
    // així que les restriccions associades s'esborraran automàticament.
    // Si un alumne està assignat a una taula, el table_id a students té ON DELETE SET NULL,
    // però aquí estem esborrant l'alumne, no la taula.
    const deleteResult = await db.query('DELETE FROM students WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Alumne no trobat per esborrar' });
    }
    res.status(200).json({ message: `Alumne amb ID ${id} esborrat correctament` }); // O 204 No Content si no retornes missatge
  } catch (error) {
    console.error(`Error deleting student ${id}:`, error);
    res.status(500).json({ message: 'Error intern del servidor', error: error.message });
  }
};

const unassignAllStudentsFromTables = async (req, res) => {
  try {
    // Podríem afegir una clàusula WHERE per classroom_id si tinguéssim multi-classe
    const result = await db.query(
      "UPDATE students SET table_id = NULL WHERE table_id IS NOT NULL RETURNING id"
    );

    const unassignedCount = result.rowCount;
    console.log(`[UnassignAll] ${unassignedCount} alumnes han estat desassignats de les seves taules.`);
    res.json({ 
      success: true, 
      message: `${unassignedCount} alumnes desassignats correctament.`,
      unassignedCount: unassignedCount 
    });

  } catch (error) {
    console.error('Error desassignant tots els alumnes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error intern del servidor en desassignar tots els alumnes.', 
      error: error.message 
    });
  }
};



module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  unassignAllStudentsFromTables,
};