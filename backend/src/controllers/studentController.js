// backend/src/controllers/studentController.js
const db = require('../db');

// Funció per obtenir tots els alumnes
const getAllStudents = async (req, res) => {
  try {
    const query = `
      SELECT
        s.id, s.name, s.academic_grade, s.gender,
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
    const studentsWithRestrictions = rows.map(student => ({
        ...student,
        restrictions: student.restrictions || []
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
    const studentResult = await db.query('SELECT id, name, academic_grade, gender FROM students WHERE id = $1', [id]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Alumne no trobat' });
    }
    const student = studentResult.rows[0];

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

// Funció per crear un nou alumne (sense table_id)
const createStudent = async (req, res) => {
    const { name, academic_grade, gender, restrictions } = req.body;
    if (!name || academic_grade === undefined) {
        return res.status(400).json({ message: 'El nom i la nota acadèmica són obligatoris.' });
    }
    try {
        await db.pool.query('BEGIN');
        const newStudentResult = await db.query(
            'INSERT INTO students (name, academic_grade, gender) VALUES ($1, $2, $3) RETURNING id, name, academic_grade, gender',
            [name, parseFloat(academic_grade), gender]
        );
        const newStudent = newStudentResult.rows[0];
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
                    createdRestrictionsIds.push(restrictedStudentId); // Retornem els IDs originals que es van intentar restringir
                } catch (restrictionError) {
                    if (restrictionError.code !== '23505') { // Ignorar unique_violation
                        throw restrictionError;
                    }
                }
            }
        }
        await db.pool.query('COMMIT');
        newStudent.restrictions = createdRestrictionsIds;
        res.status(201).json(newStudent);
    } catch (error) {
        await db.pool.query('ROLLBACK');
        console.error('Error creating student:', error);
        if (error.code === '23503') {
            return res.status(400).json({ message: 'Error de restricció: un dels ID d\'alumne restringit no existeix.', error: error.message });
        }
        if (error.code === '23514') {
            return res.status(400).json({ message: 'Error de validació: la nota acadèmica ha d\'estar entre 0 i 10.', error: error.message });
        }
        res.status(500).json({ message: 'Error intern del servidor', error: error.message });
    }
};

// Funció per actualitzar un alumne (sense table_id, la validació de restriccions es farà al desar distribució)
const updateStudent = async (req, res) => {
    const { id } = req.params;
    const { name, academic_grade, gender, restrictions } = req.body;

    if (name === undefined && academic_grade === undefined && gender === undefined && restrictions === undefined) {
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

        let updatedStudent;
        if (fieldsToUpdate.length > 0) {
            values.push(id);
            const updateQuery = `UPDATE students SET ${fieldsToUpdate.join(', ')} WHERE id = $${queryIndex} RETURNING id, name, academic_grade, gender`;
            const studentResult = await db.query(updateQuery, values);
            if (studentResult.rows.length === 0) {
                await db.pool.query('ROLLBACK');
                return res.status(404).json({ message: 'Alumne no trobat per actualitzar' });
            }
            updatedStudent = studentResult.rows[0];
        } else {
            const studentResult = await db.query('SELECT id, name, academic_grade, gender FROM students WHERE id = $1', [id]);
            if (studentResult.rows.length === 0) {
                await db.pool.query('ROLLBACK');
                return res.status(404).json({ message: 'Alumne no trobat' });
            }
            updatedStudent = studentResult.rows[0];
        }

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
                        if (restrictionError.code !== '23505') {
                            throw restrictionError;
                        }
                    }
                }
            }
            updatedStudent.restrictions = updatedStudentRestrictionsIds;
        } else {
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
        if (error.code === '23503') {
             return res.status(400).json({ message: 'Error de restricció: un dels ID d\'alumne restringit no existeix.', error: error.message });
        }
        if (error.code === '23514') {
             return res.status(400).json({ message: 'Error de validació: la nota acadèmica ha d\'estar entre 0 i 10.', error: error.message });
        }
        res.status(500).json({ message: 'Error intern del servidor', error: error.message });
    }
};

// La funció deleteStudent ja és correcta perquè ON DELETE CASCADE s'ocupa de les restriccions.
const deleteStudent = async (req, res) => {
    const { id } = req.params;
    try {
        const deleteResult = await db.query('DELETE FROM students WHERE id = $1 RETURNING id', [id]);
        if (deleteResult.rows.length === 0) {
        return res.status(404).json({ message: 'Alumne no trobat per esborrar' });
        }
        res.status(200).json({ message: `Alumne amb ID ${id} esborrat correctament` });
    } catch (error) {
        console.error(`Error deleting student ${id}:`, error);
        res.status(500).json({ message: 'Error intern del servidor', error: error.message });
    }
};

// La funció unassignAllStudentsFromTables ja no té sentit amb el nou model,
// ja que els alumnes no estan directament assignats a taules a la taula 'students'.
// La desassignació es faria modificant o esborrant una 'distribució'.
// Per tant, podem eliminar aquesta funció del controlador i la seva ruta.

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  // unassignAllStudentsFromTables, // ELIMINAR
};