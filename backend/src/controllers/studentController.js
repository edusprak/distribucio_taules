// backend/src/controllers/studentController.js
const db = require('../db');

// Funció per obtenir tots els alumnes
const getAllStudents = async (req, res) => {
  try {
    const query = `
      SELECT
        s.id, 
        s.name, 
        s.academic_grade, 
        s.gender, 
        s.id_classe_alumne,
        c.nom_classe, 
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
        ) AS restrictions,
        (
          SELECT COALESCE(json_agg(DISTINCT p.preferred_student_id), '[]'::json) -- NOU PER PREFERÈNCIES
          FROM (
            SELECT sp.student_id_1 AS preferred_student_id
            FROM student_preferences sp
            WHERE sp.student_id_2 = s.id
            UNION
            SELECT sp.student_id_2 AS preferred_student_id
            FROM student_preferences sp
            WHERE sp.student_id_1 = s.id
          ) AS p
        ) AS preferences -- NOU PER PREFERÈNCIES
      FROM students s
      LEFT JOIN classes c ON s.id_classe_alumne = c.id_classe
      GROUP BY s.id, s.name, s.academic_grade, s.gender, s.id_classe_alumne, c.nom_classe
      ORDER BY s.name ASC;
    `;
    const { rows } = await db.query(query);
    const studentsWithDetails = rows.map(student => ({
        ...student,
        class_name: student.nom_classe, 
        restrictions: student.restrictions || [],
        preferences: student.preferences || [] // NOU PER PREFERÈNCIES
    }));
    res.json(studentsWithDetails);
  } catch (error) {
    console.error('Error fetching all students with details:', error);
    res.status(500).json({ message: 'Error intern del servidor a getAllStudents', error: error.message });
  }
};

// Funció per obtenir un alumne per ID
const getStudentById = async (req, res) => {
  const { id } = req.params;
  try {
    const studentResult = await db.query(
        `SELECT s.id, s.name, s.academic_grade, s.gender, s.id_classe_alumne, c.nom_classe 
         FROM students s
         LEFT JOIN classes c ON s.id_classe_alumne = c.id_classe
         WHERE s.id = $1`, [id]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Alumne no trobat' });
    }
    const studentData = studentResult.rows[0];
    const student = {
        id: studentData.id,
        name: studentData.name,
        academic_grade: studentData.academic_grade,
        gender: studentData.gender,
        id_classe_alumne: studentData.id_classe_alumne,
        class_name: studentData.nom_classe 
    };

    const restrictionsResult = await db.query(
      `SELECT CASE WHEN student_id_1 = $1 THEN student_id_2 ELSE student_id_1 END as restricted_with_student_id
       FROM student_restrictions
       WHERE student_id_1 = $1 OR student_id_2 = $1`,
      [id]
    );
    student.restrictions = restrictionsResult.rows.map(r => r.restricted_with_student_id);

    // NOU: Obtenir preferències
    const preferencesResult = await db.query(
      `SELECT CASE WHEN student_id_1 = $1 THEN student_id_2 ELSE student_id_1 END as preferred_student_id
       FROM student_preferences
       WHERE student_id_1 = $1 OR student_id_2 = $1`,
      [id]
    );
    student.preferences = preferencesResult.rows.map(r => r.preferred_student_id);

    res.json(student);
  } catch (error) {
    console.error(`Error fetching student ${id}:`, error);
    res.status(500).json({ message: 'Error intern del servidor a getStudentById', error: error.message });
  }
};

// Funció per crear un nou alumne
const createStudent = async (req, res) => {
    // AFEGIT 'preferences' al destructuring
    const { name, academic_grade, gender, restrictions, id_classe_alumne, preferences } = req.body; 
    if (!name || academic_grade === undefined) {
        return res.status(400).json({ message: 'El nom i la nota acadèmica són obligatoris.' });
    }
    try {
        await db.pool.query('BEGIN');
        const newStudentResult = await db.query(
            'INSERT INTO students (name, academic_grade, gender, id_classe_alumne) VALUES ($1, $2, $3, $4) RETURNING id, name, academic_grade, gender, id_classe_alumne',
            [name, parseFloat(academic_grade), gender, id_classe_alumne ? parseInt(id_classe_alumne) : null]
        );
        let newStudent = newStudentResult.rows[0];
        
        if (newStudent.id_classe_alumne) {
            const classeRes = await db.query('SELECT nom_classe FROM classes WHERE id_classe = $1', [newStudent.id_classe_alumne]);
            newStudent.class_name = classeRes.rows.length > 0 ? classeRes.rows[0].nom_classe : null;
        } else {
            newStudent.class_name = null;
        }

        let createdRestrictionsIds = [];
        if (restrictions && restrictions.length > 0) {
            for (const restrictedStudentId of restrictions) {
                const id1 = Math.min(newStudent.id, parseInt(restrictedStudentId));
                const id2 = Math.max(newStudent.id, parseInt(restrictedStudentId));
                if (id1 === id2) continue;
                try {
                    await db.query(
                        'INSERT INTO student_restrictions (student_id_1, student_id_2) VALUES ($1, $2)',
                        [id1, id2]
                    );
                    createdRestrictionsIds.push(restrictedStudentId);
                } catch (restrictionError) {
                    if (restrictionError.code !== '23505') { 
                        throw restrictionError;
                    }
                }
            }
        }
        newStudent.restrictions = createdRestrictionsIds;

        // NOU: Desar preferències
        let createdPreferencesIds = [];
        if (preferences && preferences.length > 0) {
            for (const preferredStudentId of preferences) {
                const id1 = Math.min(newStudent.id, parseInt(preferredStudentId));
                const id2 = Math.max(newStudent.id, parseInt(preferredStudentId));
                if (id1 === id2) continue; // No es pot tenir preferència amb si mateix
                try {
                    await db.query(
                        'INSERT INTO student_preferences (student_id_1, student_id_2) VALUES ($1, $2)',
                        [id1, id2]
                    );
                    createdPreferencesIds.push(preferredStudentId);
                } catch (preferenceError) {
                    // Ignorar error si la preferència ja existeix (unique_violation)
                    // o si un dels IDs no existeix a la taula students (foreign key violation)
                    if (preferenceError.code !== '23505' && preferenceError.code !== '23503') {
                        throw preferenceError;
                    } else if (preferenceError.code === '23503') {
                        console.warn(`Preferència no creada: alumne ID ${preferredStudentId} no existeix o alumne ID ${newStudent.id} no existeix.`);
                    }
                }
            }
        }
        newStudent.preferences = createdPreferencesIds;


        await db.pool.query('COMMIT');
        res.status(201).json(newStudent);
    } catch (error) {
        await db.pool.query('ROLLBACK');
        console.error('Error creating student:', error);
        if (error.code === '23503') { 
             if (error.constraint === 'fk_student_classe') {
                return res.status(400).json({ message: 'Error de restricció: L\'ID de la classe proporcionat no existeix.', error: error.message });
            }
            // S'hauria de diferenciar si és per restriccions o preferències si fos necessari un missatge més específic.
            return res.status(400).json({ message: 'Error de restricció: un dels ID d\'alumne (restringit o preferit) no existeix.', error: error.detail || error.message });
        }
        if (error.code === '23514') { 
            return res.status(400).json({ message: 'Error de validació: la nota acadèmica ha d\'estar entre 0 i 10.', error: error.message });
        }
        res.status(500).json({ message: 'Error intern del servidor a createStudent', error: error.message });
    }
};

// Funció per actualitzar un alumne
const updateStudent = async (req, res) => {
    const { id } = req.params;
    // AFEGIT 'preferences' al destructuring
    const { name, academic_grade, gender, restrictions, id_classe_alumne, preferences } = req.body;

    if (name === undefined && academic_grade === undefined && gender === undefined && restrictions === undefined && id_classe_alumne === undefined && preferences === undefined) {
        return res.status(400).json({ message: 'S\'ha de proporcionar almenys un camp per actualitzar.' });
    }

    try {
        await db.pool.query('BEGIN');
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
        if (id_classe_alumne !== undefined) { 
            fieldsToUpdate.push(`id_classe_alumne = $${queryIndex++}`);
            values.push(id_classe_alumne === null || id_classe_alumne === '' ? null : parseInt(id_classe_alumne));
        }

        let updatedStudentData;
        if (fieldsToUpdate.length > 0) {
            values.push(id);
            const updateQuery = `UPDATE students SET ${fieldsToUpdate.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${queryIndex} RETURNING id, name, academic_grade, gender, id_classe_alumne`;
            const studentResult = await db.query(updateQuery, values);
            if (studentResult.rows.length === 0) {
                await db.pool.query('ROLLBACK');
                return res.status(404).json({ message: 'Alumne no trobat per actualitzar' });
            }
            updatedStudentData = studentResult.rows[0];
        } else { // Si només s'actualitzen restriccions o preferències
            const studentResult = await db.query('SELECT id, name, academic_grade, gender, id_classe_alumne FROM students WHERE id = $1', [id]);
            if (studentResult.rows.length === 0) {
                await db.pool.query('ROLLBACK');
                return res.status(404).json({ message: 'Alumne no trobat' });
            }
            updatedStudentData = studentResult.rows[0];
        }

        if (updatedStudentData.id_classe_alumne) {
            const classeRes = await db.query('SELECT nom_classe FROM classes WHERE id_classe = $1', [updatedStudentData.id_classe_alumne]);
            updatedStudentData.class_name = classeRes.rows.length > 0 ? classeRes.rows[0].nom_classe : null;
        } else {
            updatedStudentData.class_name = null;
        }

        // Gestió de restriccions (es manté igual)
        if (restrictions !== undefined) {
            await db.query('DELETE FROM student_restrictions WHERE student_id_1 = $1 OR student_id_2 = $1', [id]);
            let updatedStudentRestrictionsIds = [];
            if (restrictions.length > 0) {
                for (const restrictedStudentId of restrictions) {
                    const id1 = Math.min(parseInt(id), parseInt(restrictedStudentId));
                    const id2 = Math.max(parseInt(id), parseInt(restrictedStudentId));
                    if (id1 === id2) continue;
                    try {
                        await db.query(
                            'INSERT INTO student_restrictions (student_id_1, student_id_2) VALUES ($1, $2)',
                            [id1, id2]
                        );
                        updatedStudentRestrictionsIds.push(restrictedStudentId);
                    } catch (restrictionError) {
                        if (restrictionError.code !== '23505') { // Ignorar unique_violation
                            throw restrictionError;
                        }
                    }
                }
            }
            updatedStudentData.restrictions = updatedStudentRestrictionsIds;
        } else { // Si no s'envien restriccions, no les modifiquem, les recuperem
             const currentRestrictionsResult = await db.query(
                `SELECT CASE WHEN student_id_1 = $1 THEN student_id_2 ELSE student_id_1 END as restricted_with_student_id
                 FROM student_restrictions
                 WHERE student_id_1 = $1 OR student_id_2 = $1`,
                [id]
            );
            updatedStudentData.restrictions = currentRestrictionsResult.rows.map(r => r.restricted_with_student_id);
        }

        // NOU: Gestió de preferències
        if (preferences !== undefined) {
            await db.query('DELETE FROM student_preferences WHERE student_id_1 = $1 OR student_id_2 = $1', [id]);
            let updatedStudentPreferencesIds = [];
            if (preferences.length > 0) {
                for (const preferredStudentId of preferences) {
                    const id1 = Math.min(parseInt(id), parseInt(preferredStudentId));
                    const id2 = Math.max(parseInt(id), parseInt(preferredStudentId));
                    if (id1 === id2) continue;
                    try {
                        await db.query(
                            'INSERT INTO student_preferences (student_id_1, student_id_2) VALUES ($1, $2)',
                            [id1, id2]
                        );
                        updatedStudentPreferencesIds.push(preferredStudentId);
                    } catch (preferenceError) {
                         // Ignorar unique_violation, però llançar error si és FK
                        if (preferenceError.code === '23503') {
                            console.warn(`Error de FK creant preferència entre ${id1} i ${id2}: un dels alumnes no existeix.`);
                            // Opcionalment, podries decidir si continuar o fer rollback/retornar error
                        } else if (preferenceError.code !== '23505') {
                            throw preferenceError;
                        }
                    }
                }
            }
            updatedStudentData.preferences = updatedStudentPreferencesIds;
        } else { // Si no s'envien preferències, les recuperem
            const currentPreferencesResult = await db.query(
               `SELECT CASE WHEN student_id_1 = $1 THEN student_id_2 ELSE student_id_1 END as preferred_student_id
                FROM student_preferences
                WHERE student_id_1 = $1 OR student_id_2 = $1`,
               [id]
           );
           updatedStudentData.preferences = currentPreferencesResult.rows.map(r => r.preferred_student_id);
        }

        await db.pool.query('COMMIT');
        res.json(updatedStudentData);
    } catch (error) {
        await db.pool.query('ROLLBACK');
        console.error(`Error updating student ${id}:`, error);
        if (error.code === '23503') { // Foreign key violation
             if (error.constraint === 'fk_student_classe') {
                return res.status(400).json({ message: 'Error de restricció: L\'ID de la classe proporcionat no existeix.', error: error.message });
            }
            // Diferenciar si és per restriccions o preferències si cal
            return res.status(400).json({ message: 'Error de restricció: Un dels ID d\'alumne (restringit o preferit) no existeix.', error: error.detail || error.message });
        }
        if (error.code === '23514') { // check_violation (nota acadèmica)
             return res.status(400).json({ message: 'Error de validació: La nota acadèmica ha d\'estar entre 0 i 10.', error: error.message });
        }
        res.status(500).json({ message: 'Error intern del servidor a updateStudent', error: error.message });
    }
};

// deleteStudent no necessita canvis, ja que ON DELETE CASCADE s'encarrega de les preferències.
const deleteStudent = async (req, res) => {
    const { id } = req.params;
    try {
        // ON DELETE CASCADE en student_restrictions i student_preferences s'encarregarà d'esborrar les entrades associades.
        const deleteResult = await db.query('DELETE FROM students WHERE id = $1 RETURNING id', [id]);
        if (deleteResult.rows.length === 0) {
        return res.status(404).json({ message: 'Alumne no trobat per esborrar' });
        }
        // Les restriccions i preferències s'esborren automàticament per la BD
        res.status(200).json({ message: `Alumne amb ID ${id} esborrat correctament. Les seves restriccions i preferències també han estat eliminades.` });
    } catch (error) {
        console.error(`Error deleting student ${id}:`, error);
        res.status(500).json({ message: 'Error intern del servidor a deleteStudent', error: error.message });
    }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
};