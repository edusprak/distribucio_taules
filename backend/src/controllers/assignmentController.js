// backend/src/controllers/assignmentController.js
const db = require('../db'); // El necessitarem per obtenir les taules de la plantilla

const autoAssignStudents = async (req, res) => {
    const { students: studentsFromFrontend, plantilla_id, balanceByGender, usePreferences = true } = req.body;

    if (!studentsFromFrontend || !Array.isArray(studentsFromFrontend) || plantilla_id === undefined) {
        return res.status(400).json({
            success: false,
            message: "Les dades dels alumnes o l'ID de la plantilla no s'han proporcionat correctament."
        });
    }

    try {
        // 1. Obtenir les taules de la plantilla especificada des de la BD
        const taulesPlantillaRes = await db.query(
            'SELECT id_taula_plantilla, identificador_taula_dins_plantilla, capacitat FROM taules_plantilla WHERE plantilla_id = $1 ORDER BY identificador_taula_dins_plantilla ASC',
            [plantilla_id]
        );
        if (taulesPlantillaRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: `Plantilla d'aula amb ID ${plantilla_id} no trobada o no té taules.` });
        }
        const tablesFromPlantilla = taulesPlantillaRes.rows.map(t => ({
            id: t.id_taula_plantilla, // Important: utilitzem l'ID de la taula de la plantilla
            table_number: t.identificador_taula_dins_plantilla,
            capacity: t.capacitat,
            // Inicialitzem els camps per a l'algorisme
            students_assigned: [],
            current_occupancy: 0,
            current_sum_of_grades: 0,
            current_avg_grade: null,
            current_male_count: 0,
            current_female_count: 0,
        }));


        // 2. Preparar alumnes: filtrar els ja assignats (si es passés una distribució parcial) i ordenar
        // En aquest cas, com que es fa sobre una plantilla, assumim que tots els alumnes del frontend són candidats o ja tenen una assignació que es vol respectar/ignorar
        // L'algorisme només hauria d'intentar assignar alumnes que NO tenen table_id VÀLID en el context de la plantilla actual.
        // Per simplificar, el frontend hauria d'enviar només els alumnes que realment estan al "pool" i són candidats a ser assignats.
        // O bé, l'algorisme només considera els alumnes que en `studentsFromFrontend` no tenen un `taula_plantilla_id` vàlid.

        const allStudents = studentsFromFrontend.map(s => ({
            id: s.id,
            name: s.name,
            academic_grade: parseFloat(s.academic_grade),
            gender: s.gender || 'unknown',
            restrictions: Array.isArray(s.restrictions) ? s.restrictions : [],
            preferences: Array.isArray(s.preferences) ? s.preferences : [],
            current_table_id: s.table_id || s.id_taula_plantilla || null 
        }));

        // Alumnes que ja estan assignats a una taula d'aquesta plantilla (segons el frontend)
        // i actualitzem l'estat inicial de les taules.
        allStudents.forEach(student => {
            if (student.current_table_id) {
                const table = tablesFromPlantilla.find(t => t.id === student.current_table_id);
                if (table) {
                    table.students_assigned.push(student);
                    table.current_occupancy++;
                    if (!isNaN(student.academic_grade)) {
                        table.current_sum_of_grades += student.academic_grade;
                    }
                    if (student.gender === 'male') table.current_male_count++;
                    else if (student.gender === 'female') table.current_female_count++;
                }
            }
        });
        // Recalcular mitjanes inicials
        tablesFromPlantilla.forEach(table => {
             const validGradesCount = table.students_assigned.filter(s => !isNaN(s.academic_grade)).length;
             table.current_avg_grade = validGradesCount > 0 ? table.current_sum_of_grades / validGradesCount : null;
        });        // 3. Obtenir totes les assignacions guardades per la plantilla per verificar que no generem duplicats
        const distribucionsRes = await db.query(
            `SELECT d.id_distribucio, da.alumne_id, da.taula_plantilla_id
             FROM distribucions d
             JOIN distribucio_assignacions da ON d.id_distribucio = da.distribucio_id
             WHERE d.plantilla_id = $1`,
            [plantilla_id]
        );
        // Agrupa per distribució
        const distribucionsMap = {};
        for (const row of distribucionsRes.rows) {
            if (!distribucionsMap[row.id_distribucio]) distribucionsMap[row.id_distribucio] = {};
            distribucionsMap[row.id_distribucio][row.alumne_id] = row.taula_plantilla_id;
        }
        const distribucionsGuardades = Object.values(distribucionsMap);

        // Funció per comparar assignacions        // Funció per comparar assignacions
        function isSameAssignment(proposed, saved) {
            if (proposed.length !== Object.keys(saved).length) return false;
            for (const pa of proposed) {
                if (saved[pa.studentId] !== pa.tableId) return false;
            }
            return true;
        }

        // Funció de barreja per introduir aleatorietat
        function shuffleArray(array) {
            const newArray = [...array];
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
        }        let foundUnique = false;
        let proposedAssignments = [];
        let warnings = [];
        const MAX_ATTEMPTS = 15;
        let attempt = 0;
        
        while (!foundUnique && attempt < MAX_ATTEMPTS) {
            attempt++;
            // Cada nou intent reseteja les assignacions i warnings
            proposedAssignments = [];
            warnings = [];
            
            // Per cada intent, fem una còpia neta de les taules i els alumnes
            const tablesForThisAttempt = tablesFromPlantilla.map(table => ({
                ...table,
                students_assigned: [...table.students_assigned],
            }));
            
            const studentsToAssign = allStudents
                .filter(s => s.current_table_id == null)
                .map(s => ({...s}));

            // Calculem la mitjana global de notes per usar en el càlcul de scores
            const studentsWithValidGrades = allStudents.filter(s => !isNaN(s.academic_grade));
            const overallAverageGrade = studentsWithValidGrades.length > 0
                ? studentsWithValidGrades.reduce((sum, s) => sum + s.academic_grade, 0) / studentsWithValidGrades.length
                : null;            // ========== FUNCIONS AUXILIARS ==========            // Funció per calcular score d'un alumne en una taula
            const calculateTableScore = (student, table) => {
                let score = 0;
                
                // PRIORITAT 1: Preferències (només si usePreferences està activat)
                if (usePreferences && student.preferences && student.preferences.length > 0) {
                    const hasPreferredByStudentInTable = table.students_assigned.some(
                        assigned => student.preferences.includes(assigned.id)
                    );
                    
                    // Bonus MASSIU si té almenys un preferit (objectiu principal)
                    if (hasPreferredByStudentInTable) {
                        score += 1000; // Bonus enorme per complir "almenys un preferit"
                    }
                    
                    // També bonus si algú a la taula prefereix aquest alumne
                    const studentsInTablePreferringThis = table.students_assigned.filter(
                        assigned => assigned.preferences && assigned.preferences.includes(student.id)
                    ).length;
                    
                    if (studentsInTablePreferringThis > 0) {
                        score += 100; // Bonus secondary per ser preferit
                    }
                }

                // PRIORITAT 2: Equilibri acadèmic
                const studentGrade = student.academic_grade;
                if (overallAverageGrade !== null && !isNaN(studentGrade)) {
                    const studentsWithGrades = table.students_assigned.filter(s => !isNaN(s.academic_grade));
                    const newGradeSum = studentsWithGrades.reduce((sum, s) => sum + s.academic_grade, 0) + studentGrade;
                    const newCount = studentsWithGrades.length + 1;
                    const newAvg = newCount > 0 ? newGradeSum / newCount : overallAverageGrade;
                    
                    // Penalització per diferència amb la mitjana global
                    score -= Math.abs(newAvg - overallAverageGrade) * 5;
                }

                // PRIORITAT 3: Equilibri de gènere (si activat)
                if (balanceByGender && student.gender && (student.gender === 'male' || student.gender === 'female')) {
                    let maleCount = table.current_male_count;
                    let femaleCount = table.current_female_count;
                    
                    if (student.gender === 'male') maleCount++;
                    else if (student.gender === 'female') femaleCount++;
                    
                    const totalStudents = table.current_occupancy + 1;
                    if (totalStudents > 1) {
                        const genderDiff = Math.abs(maleCount - femaleCount);
                        score -= genderDiff * 3; // Penalització per desequilibri
                        
                        // Bonus per equilibri perfecte
                        if (genderDiff <= 1) {
                            score += 2;
                        }
                    }
                }

                // PRIORITAT 4: Distribució equilibrada de capacitat
                const remainingAfter = table.capacity - (table.current_occupancy + 1);
                score += remainingAfter * 0.5;

                return score;
            };

            // Funció per verificar si un alumne pot ser assignat a una taula (restriccions)
            const canAssignToTable = (student, table) => {
                if (table.current_occupancy >= table.capacity) return false;
                
                // Comprovem restriccions
                if (student.restrictions && student.restrictions.length > 0) {
                    for (const assignedStudent of table.students_assigned) {
                        if (student.restrictions.includes(assignedStudent.id)) {
                            return false;
                        }
                    }
                }
                
                return true;
            };

            // Funció per actualitzar l'estat de la taula i l'alumne després d'assignació
            const assignStudentToTable = (student, table) => {
                // Registrem l'assignació per al resultat final
                proposedAssignments.push({
                    studentId: student.id,
                    tableId: table.id,
                    studentName: student.name,
                    tableName: table.table_number
                });
                
                // Actualitzem l'estat de la taula
                table.students_assigned.push(student);
                table.current_occupancy++;
                
                if (!isNaN(student.academic_grade)) {
                    table.current_sum_of_grades += student.academic_grade;
                    
                    const validGradesCount = table.students_assigned.filter(s => !isNaN(s.academic_grade)).length;
                    table.current_avg_grade = validGradesCount > 0 
                        ? table.current_sum_of_grades / validGradesCount 
                        : null;
                }
                
                if (student.gender === 'male') table.current_male_count++;
                else if (student.gender === 'female') table.current_female_count++;
                
                // Marquem l'alumne com assignat
                student.assigned = true;
            };            // ========== ALGORITME SIMPLIFICAT AMB NOVES PRIORITATS ==========
            
            // FASE 1: Preferències mútues (només si usePreferences està activat)
            if (usePreferences) {
                // Identifiquem parells d'alumnes amb preferències mútues
                const mutualPairs = [];
                
                // Busquem totes les preferències recíproques
                for (let i = 0; i < studentsToAssign.length; i++) {
                    const studentA = studentsToAssign[i];
                    if (!studentA.preferences || studentA.preferences.length === 0) continue;
                    
                    for (let j = i + 1; j < studentsToAssign.length; j++) {
                        const studentB = studentsToAssign[j];
                        if (!studentB.preferences || studentB.preferences.length === 0) continue;
                        
                        // Si hi ha preferència recíproca i sense restriccions entre ells
                        if (studentA.preferences.includes(studentB.id) && 
                            studentB.preferences.includes(studentA.id) &&
                            !studentA.restrictions?.includes(studentB.id) &&
                            !studentB.restrictions?.includes(studentA.id)) {
                                
                            mutualPairs.push({
                                studentA,
                                studentB,
                                avgGrade: ((studentA.academic_grade || 0) + (studentB.academic_grade || 0)) / 2
                            });
                        }
                    }
                }
                
                // Ordenem per nota mitjana descendent
                mutualPairs.sort((a, b) => b.avgGrade - a.avgGrade);
                
                // Assignem els parells amb preferències mútues
                for (const pair of mutualPairs) {
                    const { studentA, studentB } = pair;
                    
                    // Saltarem si alguna dels alumnes ja està assignat
                    if (studentA.assigned || studentB.assigned) continue;
                    
                    // Busquem la millor taula per aquest parell
                    let bestTable = null;
                    let bestScore = -Infinity;
                    
                    for (const table of tablesForThisAttempt) {
                        // Necessitem espai per ambdós alumnes
                        if (table.current_occupancy + 2 > table.capacity) continue;
                        
                        // Comprovem restriccions d'ambdós alumnes
                        if (!canAssignToTable(studentA, table) || !canAssignToTable(studentB, table)) {
                            continue;
                        }
                        
                        // Calculem score combinat
                        const scoreA = calculateTableScore(studentA, table);
                        const scoreB = calculateTableScore(studentB, table);
                        const combinedScore = scoreA + scoreB + 500; // Bonus per preferència mútua
                        
                        if (combinedScore > bestScore) {
                            bestScore = combinedScore;
                            bestTable = table;
                        }
                    }
                    
                    if (bestTable) {
                        // Assignem ambdós alumnes junts
                        assignStudentToTable(studentA, bestTable);
                        assignStudentToTable(studentB, bestTable);
                    }
                }
            }            
            // FASE 2: Assignació individual optimitzada
            const remainingStudents = studentsToAssign.filter(s => !s.assigned);
            
            // Ordenem alumnes per prioritat de satisfacció
            if (usePreferences) {
                // Si usen preferències: alumnes amb menys preferències primer (més difícils)
                remainingStudents.sort((a, b) => {
                    const prefsA = a.preferences ? a.preferences.length : 0;
                    const prefsB = b.preferences ? b.preferences.length : 0;
                    
                    if (prefsA !== prefsB) return prefsA - prefsB;
                    return (b.academic_grade || 0) - (a.academic_grade || 0);
                });
            } else {
                // Si no usen preferències: ordenem per nota per equilibrar millor
                remainingStudents.sort((a, b) => (b.academic_grade || 0) - (a.academic_grade || 0));
            }
            
            // Assignem cada alumne a la millor taula possible
            for (const student of remainingStudents) {
                if (student.assigned) continue;
                
                let bestTable = null;
                let bestScore = -Infinity;
                let foundTableWithPreference = false;
                let foundRestrictionVsPreference = false;
                
                // Barregem taules per aleatorietat
                const shuffledTables = shuffleArray(tablesForThisAttempt);
                
                for (const table of shuffledTables) {
                    if (table.current_occupancy >= table.capacity) continue;
                    
                    // Verificar restriccions (prioritat absoluta)
                    if (!canAssignToTable(student, table)) {
                        // Comprovar si hi ha conflicte preferència-restricció
                        if (usePreferences && student.preferences && student.preferences.length > 0) {
                            for (const assignedStudent of table.students_assigned) {
                                if (student.restrictions?.includes(assignedStudent.id) && 
                                    student.preferences.includes(assignedStudent.id)) {
                                    foundRestrictionVsPreference = true;
                                }
                            }
                        }
                        continue;
                    }
                    
                    // Verificar si té preferències a aquesta taula (si les preferències estan activades)
                    if (usePreferences && student.preferences && student.preferences.length > 0) {
                        const hasPreferredInTable = table.students_assigned.some(assigned => 
                            student.preferences.includes(assigned.id)
                        );
                        if (hasPreferredInTable) {
                            foundTableWithPreference = true;
                        }
                    }
                    
                    // Calcular score per aquesta taula
                    const score = calculateTableScore(student, table);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestTable = table;
                    }
                }
                
                // Assignar a la millor taula troada
                if (bestTable) {
                    assignStudentToTable(student, bestTable);
                } else if (usePreferences && student.preferences && student.preferences.length > 0) {
                    warnings.push(`No s'ha pogut trobar cap taula vàlida per l'alumne ${student.name} (ID ${student.id}) que respecti les seves restriccions.`);
                }
                
                // Generar warnings per preferències no satisfetes
                if (usePreferences && student.preferences && student.preferences.length > 0 && !foundTableWithPreference && bestTable) {
                    warnings.push(`No s'ha pogut assignar l'alumne ${student.name} (ID ${student.id}) amb cap dels seus preferits.`);
                }
                
                if (foundRestrictionVsPreference) {
                    warnings.push(`L'alumne ${student.name} (ID ${student.id}) té una restricció amb un dels seus preferits. La restricció té prioritat.`);
                }
            }            
            // Comprova si la proposta és igual a alguna guardada
            foundUnique = !distribucionsGuardades.some(saved => isSameAssignment(proposedAssignments, saved));
        }        if (!foundUnique) {
            return res.status(409).json({ success: false, message: 'No s\'ha pogut generar una distribució diferent de les ja existents per aquesta plantilla.' });
        }
        
        // Generar mètriques de satisfacció per als nous objectius
        const metrics = {
            totalStudentsAssigned: proposedAssignments.length,
            totalStudentsWithPreferences: 0,
            studentsWithSatisfiedPreferences: 0,
            preferencesSatisfactionRate: 0
        };
        
        if (usePreferences) {
            // Calcular mètriques de preferències
            const allStudents = studentsFromFrontend;
            const studentsWithPrefs = allStudents.filter(s => s.preferences && s.preferences.length > 0);
            metrics.totalStudentsWithPreferences = studentsWithPrefs.length;
            
            let satisfiedCount = 0;
            for (const student of studentsWithPrefs) {
                const assignment = proposedAssignments.find(a => a.studentId === student.id);
                if (assignment) {
                    // Trobar companys de taula
                    const tablemates = proposedAssignments
                        .filter(a => a.tableId === assignment.tableId && a.studentId !== student.id)
                        .map(a => a.studentId);
                    
                    // Verificar si té almenys un preferit com a company
                    const hasPreferredTablemate = student.preferences.some(prefId => 
                        tablemates.includes(prefId)
                    );
                    
                    if (hasPreferredTablemate) {
                        satisfiedCount++;
                    }
                }
            }
            
            metrics.studentsWithSatisfiedPreferences = satisfiedCount;
            metrics.preferencesSatisfactionRate = studentsWithPrefs.length > 0 
                ? Math.round((satisfiedCount / studentsWithPrefs.length) * 100) 
                : 100;
        }
        
        res.json({ 
            success: true, 
            proposedAssignments, 
            warnings,
            metrics
        });
    } catch (error) {
        console.error('[AutoAssign] Error en auto-assignació:', error);
        res.status(500).json({ success: false, message: 'Error intern del servidor en l\'auto-assignació.', error: error.message });
    }
};

module.exports = {
  autoAssignStudents,
};