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

// Función per importar alumnes desde un fitxer CSV o Excel
const importStudentsFromFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha proporcionado ningún archivo' });
  }

  const filePath = req.file.path;
  const fileType = req.file.originalname.split('.').pop().toLowerCase();
  const idClasse = req.body.id_classe_alumne ? parseInt(req.body.id_classe_alumne) : null;
  let studentsData = [];
  
  try {
    // Verificar si existe la clase si se proporciona ID
    if (idClasse) {
      const classCheck = await db.query('SELECT id_classe FROM classes WHERE id_classe = $1', [idClasse]);
      if (classCheck.rows.length === 0) {
        return res.status(400).json({ message: 'La clase seleccionada no existe' });
      }
    }

    // Procesar CSV o Excel segons la extensió
    if (fileType === 'csv') {
      const { parse } = require('csv-parse');
      const fs = require('fs');
      
      // Llegir i parsejar el fitxer CSV
      const parser = parse({columns: true, delimiter: ',', trim: true});
      const records = [];
      
      fs.createReadStream(filePath)
        .pipe(parser)
        .on('data', (record) => records.push(record))
        .on('error', (err) => {
          throw new Error(`Error parsing CSV: ${err.message}`);
        })
        .on('end', async () => {
          try {
            studentsData = mapRecordsToStudentData(records, idClasse);
            const result = await processImportedStudents(studentsData);
            return res.status(200).json(result);
          } catch (error) {
            console.error('Error processing CSV records:', error);
            return res.status(500).json({ message: 'Error procesando los registros del CSV', error: error.message });
          } finally {
            // Eliminar el fitxer després de processar-lo
            fs.unlink(filePath, (err) => {
              if (err) console.error('Error deleting file:', err);
            });
          }
        });
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      const XLSX = require('xlsx');
      const fs = require('fs');
      
      // Llegir el fitxer Excel
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Assumim que volem la primera fulla
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir a JSON
      const records = XLSX.utils.sheet_to_json(worksheet);
      
      // Processar els registres
      studentsData = mapRecordsToStudentData(records, idClasse);
      const result = await processImportedStudents(studentsData);
      
      // Eliminar el fitxer després de processar-lo
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
      
      return res.status(200).json(result);
    } else {
      // Eliminar el fitxer si no és un format suportat
      require('fs').unlink(filePath, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
      
      return res.status(400).json({ message: 'Formato de archivo no soportado. Use CSV o Excel (xlsx/xls).' });
    }
  } catch (error) {
    console.error('Error importing students:', error);
    // Asegurarse de eliminar el archivo en caso de error
    require('fs').unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });
    
    return res.status(500).json({ message: 'Error interno del servidor al importar alumnes', error: error.message });
  }
};

// Funció auxiliar per mapear registres a dades d'estudiants
const mapRecordsToStudentData = (records, idClasse) => {
  return records.map(record => {
    // Mapea els camps del fitxer a l'estructura de dades d'Estudiant
    // Noms de camps esperats: nombre, nota, genero, restriccions, preferències
    return {
      name: record.nombre || record.name || '',
      academic_grade: parseFloat(record.nota || record.academic_grade || record.grade || '0'),
      gender: record.genero || record.gender || null,
      id_classe_alumne: idClasse,
      restrictionsNames: (record.restriccions || record.restrictions || '').toString().split(',').map(r => r.trim()).filter(r => r),
      preferencesNames: (record.preferències || record.preferences || '').toString().split(',').map(p => p.trim()).filter(p => p)
    };
  });
};

// Funció auxiliar per processar i guardar els estudiants importats
const processImportedStudents = async (studentsData) => {
  let created = 0;
  let errors = [];
  
  await db.pool.query('BEGIN');
  try {
    // Per a cada estudiant en les dades importades
    for (const studentData of studentsData) {
      if (!studentData.name) {
        errors.push({ data: studentData, error: 'El nom és obligatori' });
        continue;
      }
      
      try {
        // Inserir l'estudiant
        const grade = parseFloat(studentData.academic_grade);
        if (isNaN(grade) || grade < 0 || grade > 10) {
          errors.push({ data: studentData, error: 'La nota acadèmica ha de ser un número entre 0 i 10' });
          continue;
        }
        
        const newStudentResult = await db.query(
          'INSERT INTO students (name, academic_grade, gender, id_classe_alumne) VALUES ($1, $2, $3, $4) RETURNING id',
          [studentData.name, grade, studentData.gender, studentData.id_classe_alumne]
        );
        
        const newStudentId = newStudentResult.rows[0].id;
        
        // Processar restriccions per nom (si existeixen)
        if (studentData.restrictionsNames && studentData.restrictionsNames.length > 0) {
          for (const restrictionName of studentData.restrictionsNames) {
            if (!restrictionName) continue;
            
            // Buscar a l'estudiant per nom
            const restrictedStudent = await db.query('SELECT id FROM students WHERE name = $1', [restrictionName]);
            if (restrictedStudent.rows.length > 0) {
              const restrictedId = restrictedStudent.rows[0].id;
              const id1 = Math.min(newStudentId, restrictedId);
              const id2 = Math.max(newStudentId, restrictedId);
              
              if (id1 === id2) continue; // No es pot tenir restricció consigo mateix
              
              try {
                await db.query(
                  'INSERT INTO student_restrictions (student_id_1, student_id_2) VALUES ($1, $2)',
                  [id1, id2]
                );
              } catch (restrictionError) {
                if (restrictionError.code !== '23505') { // Ignorar errors de duplicats
                  throw restrictionError;
                }
              }
            }
          }
        }
        
        // Processar preferències per nom (si existeixen)
        if (studentData.preferencesNames && studentData.preferencesNames.length > 0) {
          for (const preferenceName of studentData.preferencesNames) {
            if (!preferenceName) continue;
            
            // Buscar a l'estudiant per nom
            const preferredStudent = await db.query('SELECT id FROM students WHERE name = $1', [preferenceName]);
            if (preferredStudent.rows.length > 0) {
              const preferredId = preferredStudent.rows[0].id;
              const id1 = Math.min(newStudentId, preferredId);
              const id2 = Math.max(newStudentId, preferredId);
              
              if (id1 === id2) continue; // No es pot tenir preferència consigo mateix
              
              try {
                await db.query(
                  'INSERT INTO student_preferences (student_id_1, student_id_2) VALUES ($1, $2)',
                  [id1, id2]
                );
              } catch (preferenceError) {
                if (preferenceError.code !== '23505') { // Ignorar errors de duplicats
                  throw preferenceError;
                }
              }
            }
          }
        }
        
        created++;
      } catch (err) {
        errors.push({ data: studentData, error: err.message });
      }
    }
    
    await db.pool.query('COMMIT');
    return { 
      success: true, 
      message: `S'han importat ${created} alumnes correctament.`,
      created,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    await db.pool.query('ROLLBACK');
    throw error;
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  importStudentsFromFile
};