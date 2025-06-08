// backend/src/controllers/assignmentController.js
const db = require('../db'); // El necessitarem per obtenir les taules de la plantilla

const autoAssignStudents = async (req, res) => {
    const { students: studentsFromFrontend, plantilla_id, balanceByGender } = req.body;

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
                : null;            // ========== FUNCIONS AUXILIARS ==========

            // Funció per calcular score d'un alumne en una taula
            const calculateTableScore = (student, table) => {
                let score = 0;
                  // Preferències: el més important (només per a taules amb preferits)
                // Student té preferència per seure amb algun alumne a la taula
                const hasPreferredByStudentInTable = table.students_assigned.some(
                    assigned => student.preferences && student.preferences.includes(assigned.id)
                );
                
                // Alumnes a la taula que tenen preferència per seure amb student
                const studentsInTablePreferringThis = table.students_assigned.filter(
                    assigned => assigned.preferences && assigned.preferences.includes(student.id)
                ).length;
                
                if (hasPreferredByStudentInTable) {
                    score += 10; // Bonus molt alt per tenir algú que l'alumne prefereix
                }
                
                // Bonus addicional si alumnes de la taula prefereixen aquest alumne
                if (studentsInTablePreferringThis > 0) {
                    score += studentsInTablePreferringThis * 5; // Bonus per cada alumne que prefereix a aquest
                }

                // Nota acadèmica: equilibri
                const studentGrade = student.academic_grade;
                if (overallAverageGrade !== null && !isNaN(studentGrade)) {
                    const studentsWithGrades = table.students_assigned.filter(s => !isNaN(s.academic_grade));
                    const newGradeSum = studentsWithGrades.reduce((sum, s) => sum + s.academic_grade, 0) + studentGrade;
                    const newCount = studentsWithGrades.length + 1;
                    const newAvg = newCount > 0 ? newGradeSum / newCount : overallAverageGrade;
                    
                    // Penalitzem diferències amb la mitjana global
                    score -= Math.abs(newAvg - overallAverageGrade) * 1.5;
                }

                // Capacitat: premiem taules amb més ocupants però sense omplir
                const remainingAfter = table.capacity - (table.current_occupancy + 1);
                score += remainingAfter * 0.3; // Volem una distribució més equilibrada
                
                // Gènere: equilibri
                if (balanceByGender && student.gender && (student.gender === 'male' || student.gender === 'female')) {
                    let maleCount = table.current_male_count;
                    let femaleCount = table.current_female_count;
                    
                    if (student.gender === 'male') maleCount++;
                    else if (student.gender === 'female') femaleCount++;
                    
                    const totalStudents = table.current_occupancy + 1;
                    if (totalStudents > 1) {
                        const genderDiff = Math.abs(maleCount - femaleCount);
                        score -= genderDiff * 0.8; // Penalitzem desequilibris de gènere
                        
                        // Bonus si aconseguim un equilibri perfecte o gairebé perfecte
                        if (genderDiff <= 1) {
                            score += 0.5;
                        }
                    }
                }

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
            };

            // ========== FASE 1: TRACTAMENT DE PREFERÈNCIES MÚTUES ==========
              // Identifiquem parells d'alumnes amb preferències mútues
            const mutualPairs = [];
            
            // Busquem totes les preferències recíproques
            for (let i = 0; i < studentsToAssign.length; i++) {
                const studentA = studentsToAssign[i];
                if (!studentA.preferences || studentA.preferences.length === 0) continue;
                
                for (let j = 0; j < studentsToAssign.length; j++) {
                    // Saltem la comparació amb el mateix alumne
                    if (i === j) continue;
                    
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
                
                // Saltarem si alguna dels alumnes ja està assignat (podria haver estat assignat en una iteració anterior)
                if (studentA.assigned || studentB.assigned) continue;
                
                // Busquem la millor taula per aquest parell
                let bestTable = null;
                let bestScore = -Infinity;
                
                for (const table of tablesForThisAttempt) {
                    // Necessitem espai per ambdós alumnes
                    if (table.current_occupancy + 2 > table.capacity) continue;
                    
                    // Comprovem restriccions d'ambdós alumnes amb els ja assignats a la taula
                    if (!canAssignToTable(studentA, table) || !canAssignToTable(studentB, table)) {
                        continue;
                    }
                    
                    // Calculem un score combinat
                    // Creem una còpia temporal per avaluar el score després d'afegir studentA
                    const tempTable = {...table};
                    tempTable.students_assigned = [...table.students_assigned, studentA];
                    tempTable.current_occupancy = table.current_occupancy + 1;
                    tempTable.current_male_count = table.current_male_count + (studentA.gender === 'male' ? 1 : 0);
                    tempTable.current_female_count = table.current_female_count + (studentA.gender === 'female' ? 1 : 0);
                    
                    // Ara calculem l'score per ambdós alumnes
                    const scoreA = calculateTableScore(studentA, table);
                    const scoreB = calculateTableScore(studentB, tempTable); // Amb studentA ja afegit
                    
                    // Afegim un bonus per preferència mútua
                    const combinedScore = scoreA + scoreB + 5.0; 
                    
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
              // ========== FASE 2: ALUMNES AMB POQUES PREFERÈNCIES ==========
            
            // Ordenem els alumnes per prioritat:
            // 1. Alumnes amb menys preferències primer (més difícils de satisfer)
            // 2. A igual nombre de preferències, millor nota primer
            const remainingStudents = studentsToAssign.filter(s => !s.assigned);
            remainingStudents.sort((a, b) => {
                const prefsA = a.preferences ? a.preferences.length : 0;
                const prefsB = b.preferences ? b.preferences.length : 0;
                
                if (prefsA !== prefsB) return prefsA - prefsB;
                return (b.academic_grade || 0) - (a.academic_grade || 0);
            });
            
            // Per cada alumne restant, intentem trobar una taula amb al menys un preferit
            for (const student of remainingStudents) {
                // Saltarem si ja està assignat (podria haver passat en una iteració anterior)
                if (student.assigned) continue;
                
                // Variables per trobar la millor taula
                let bestTableForStudent = null;
                let bestTableScore = -Infinity;
                let foundTableWithPreference = false;
                let foundRestrictionVsPreference = false;
                
                // Candidats amb preferits
                const preferenceTableCandidates = [];
                
                // Barregem les taules per més aleatorietat
                const shuffledTables = shuffleArray(tablesForThisAttempt);
                
                // Primer pas: busquem taules candidates
                for (const table of shuffledTables) {
                    if (table.current_occupancy >= table.capacity) continue;

                    // Comprovem restriccions (tenen prioritat sobre preferències)
                    let hasRestrictionConflict = false;
                    if (student.restrictions && student.restrictions.length > 0) {
                        for (const assignedStudent of table.students_assigned) {
                            if (student.restrictions.includes(assignedStudent.id)) {
                                hasRestrictionConflict = true;
                                // Si també és preferit, marquem-ho per warning
                                if (student.preferences && student.preferences.includes(assignedStudent.id)) {
                                    foundRestrictionVsPreference = true;
                                }
                                break;
                            }
                        }
                    }
                    if (hasRestrictionConflict) continue;                    // Comprova si hi ha algun preferit a la taula (alumne té preferència per seure amb algú)
                    let hasPreferredByStudent = false;
                    if (student.preferences && student.preferences.length > 0) {
                        for (const assignedStudent of table.students_assigned) {
                            if (student.preferences.includes(assignedStudent.id)) {
                                hasPreferredByStudent = true;
                                break;
                            }
                        }
                    }
                    
                    // Comprova si l'estudiant és preferit per algú a la taula
                    let studentPreferredByTable = false;
                    for (const assignedStudent of table.students_assigned) {
                        if (assignedStudent.preferences && assignedStudent.preferences.includes(student.id)) {
                            studentPreferredByTable = true;
                            break;
                        }
                    }
                    
                    // Si hi ha una preferència en qualsevol direcció, afegim la taula a candidats
                    if (hasPreferredByStudent || studentPreferredByTable) {
                        preferenceTableCandidates.push(table);
                        foundTableWithPreference = true;
                    }

                    // Calcula score normal per totes les taules vàlides
                    let currentScore = 0;
                    const studentGrade = student.academic_grade;

                    if (overallAverageGrade !== null && !isNaN(studentGrade)) {
                        const tempStudentsWithGradeInTable = table.students_assigned.filter(s => !isNaN(s.academic_grade));
                        const newSumGrades = tempStudentsWithGradeInTable.reduce((acc, s) => acc + s.academic_grade, 0) + studentGrade;
                        const newOccupancyWithGrade = tempStudentsWithGradeInTable.length + 1;
                        const newAvgGrade = newOccupancyWithGrade > 0 ? newSumGrades / newOccupancyWithGrade : overallAverageGrade;
                        currentScore -= Math.abs(newAvgGrade - overallAverageGrade) * 1.0;
                    }

                    const remainingCapacityAfterAssign = (table.capacity - (table.current_occupancy + 1));
                    currentScore += remainingCapacityAfterAssign * 0.2;

                    if (balanceByGender && student.gender && (student.gender === 'male' || student.gender === 'female')) {
                        let tempMaleCount = table.current_male_count;
                        let tempFemaleCount = table.current_female_count;
                        if (student.gender === 'male') tempMaleCount++;
                        else if (student.gender === 'female') tempFemaleCount++;

                        const newTotalStudents = table.current_occupancy + 1;
                        if (newTotalStudents > 0) {
                            const genderDifference = Math.abs(tempMaleCount - tempFemaleCount);
                            currentScore -= genderDifference * 0.5;
                            if (genderDifference <= 1 && newTotalStudents > 1) currentScore += 0.3;
                        }
                    }

                    // Si aquesta és millor que la que teníem, actualitzem
                    if (currentScore > bestTableScore) {
                        bestTableScore = currentScore;
                        bestTableForStudent = table;
                    }
                }

                // Si hi ha taules amb preferit, prioritzem la millor d'elles
                if (preferenceTableCandidates.length > 0) {
                    // Escull la taula amb millor score entre les candidates amb preferits
                    let bestPrefTable = null;
                    let bestPrefScore = -Infinity;
                    
                    for (const table of preferenceTableCandidates) {                        // El score base per les taules amb preferits és molt més alt
                        let score = 10.0; // Bonus base per tenir alguna preferència
                        const studentGrade = student.academic_grade;
                        
                        // Bonus si l'alumne té preferències a la taula
                        let preferredByStudentCount = 0;
                        if (student.preferences && student.preferences.length > 0) {
                            for (const assignedStudent of table.students_assigned) {
                                if (student.preferences.includes(assignedStudent.id)) {
                                    preferredByStudentCount++;
                                }
                            }
                        }
                        
                        // Bonus si l'alumne és preferit per estudiants a la taula
                        let preferringStudentCount = 0;
                        for (const assignedStudent of table.students_assigned) {
                            if (assignedStudent.preferences && assignedStudent.preferences.includes(student.id)) {
                                preferringStudentCount++;
                            }
                        }
                        
                        if (preferredByStudentCount > 0) {
                            score += preferredByStudentCount * 5.0; // Bonus per cada preferit
                        }
                        
                        if (preferringStudentCount > 0) {
                            score += preferringStudentCount * 2.5; // Bonus per cada estudiant que prefereix aquest
                        }
                        
                        // Factores acadèmics i de gènere tenen menys pes en aquest cas
                        if (overallAverageGrade !== null && !isNaN(studentGrade)) {
                            const tempStudentsWithGradeInTable = table.students_assigned.filter(s => !isNaN(s.academic_grade));
                            const newSumGrades = tempStudentsWithGradeInTable.reduce((acc, s) => acc + s.academic_grade, 0) + studentGrade;
                            const newOccupancyWithGrade = tempStudentsWithGradeInTable.length + 1;
                            const newAvgGrade = newOccupancyWithGrade > 0 ? newSumGrades / newOccupancyWithGrade : overallAverageGrade;
                            score -= Math.abs(newAvgGrade - overallAverageGrade) * 0.5; // Menys penalització
                        }
                        
                        const remainingCapacityAfterAssign = (table.capacity - (table.current_occupancy + 1));
                        score += remainingCapacityAfterAssign * 0.1;
                        
                        if (balanceByGender && student.gender && (student.gender === 'male' || student.gender === 'female')) {
                            let tempMaleCount = table.current_male_count;
                            let tempFemaleCount = table.current_female_count;
                            if (student.gender === 'male') tempMaleCount++;
                            else if (student.gender === 'female') tempFemaleCount++;
                            const newTotalStudents = table.current_occupancy + 1;
                            if (newTotalStudents > 0) {
                                const genderDifference = Math.abs(tempMaleCount - tempFemaleCount);
                                score -= genderDifference * 0.3;
                                if (genderDifference <= 1 && newTotalStudents > 1) score += 0.2;
                            }
                        }
                        
                        if (score > bestPrefScore) {
                            bestPrefScore = score;
                            bestPrefTable = table;
                        }
                    }
                    
                    // Si hem trobat una taula amb preferits bona, la usem
                    if (bestPrefTable) {
                        bestTableForStudent = bestPrefTable;
                    }
                }
                
                // Si no s'ha pogut assignar a una taula amb preferit, ho afegim als warnings
                if (student.preferences && student.preferences.length > 0 && !foundTableWithPreference) {
                    warnings.push(`No s'ha pogut assignar l'alumne ${student.name} (ID ${student.id}) amb cap dels seus preferits.`);
                }
                  // Si hi ha conflicte preferit-restricció, avisa
                if (foundRestrictionVsPreference) {
                    warnings.push(`L'alumne ${student.name} (ID ${student.id}) té una restricció amb un dels seus preferits. La restricció té prioritat.`);
                }
                
                // Finalment, si hem trobat una taula vàlida, assignem l'alumne
                if (bestTableForStudent) {
                    proposedAssignments.push({
                        studentId: student.id,
                        tableId: bestTableForStudent.id,
                        studentName: student.name,
                        tableName: bestTableForStudent.table_number
                    });

                    // Actualitzem l'estat de la taula seleccionada per a la propera iteració
                    bestTableForStudent.students_assigned.push(student);
                    bestTableForStudent.current_occupancy++;
                    
                    if (!isNaN(student.academic_grade)) {
                        bestTableForStudent.current_sum_of_grades += student.academic_grade;
                        const validGradesCount = bestTableForStudent.students_assigned.filter(s => !isNaN(s.academic_grade)).length;
                        bestTableForStudent.current_avg_grade = validGradesCount > 0 
                            ? bestTableForStudent.current_sum_of_grades / validGradesCount 
                            : null;
                    }
                    
                    if (student.gender === 'male') bestTableForStudent.current_male_count++;
                    else if (student.gender === 'female') bestTableForStudent.current_female_count++;
                    
                    // Marquem l'alumne com assignat
                    student.assigned = true;                } else if (student.preferences && student.preferences.length > 0) {
                    // Si no s'ha pogut assignar a cap taula però té preferències, afegim un warning especial
                    warnings.push(`No s'ha pogut trobar cap taula vàlida per l'alumne ${student.name} (ID ${student.id}) que respecti les seves restriccions.`);
                }
            }
            // Comprova si la proposta és igual a alguna guardada
            foundUnique = !distribucionsGuardades.some(saved => isSameAssignment(proposedAssignments, saved));
        }
        if (!foundUnique) {
            return res.status(409).json({ success: false, message: 'No s\'ha pogut generar una distribució diferent de les ja existents per aquesta plantilla.' });
        }
        res.json({ success: true, proposedAssignments, warnings });
    } catch (error) {
        console.error('[AutoAssign] Error en auto-assignació:', error);
        res.status(500).json({ success: false, message: 'Error intern del servidor en l\'auto-assignació.', error: error.message });
    }
};

module.exports = {
  autoAssignStudents,
};