// backend/src/controllers/assignmentController.js
const db = require('../db'); // El necessitarem per obtenir les taules de la plantilla

const autoAssignStudents = async (req, res) => {
    const { students: studentsFromFrontend, plantilla_id, balanceByGender, usePreferences = true, gradeAssignmentCriteria = 'academic' } = req.body;

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
        }));        // 2. Preparar alumnes: filtrar els ja assignats i ordenar
        const allStudents = studentsFromFrontend.map(s => {
            const academicGrade = parseFloat(s.academic_grade);
            const attitudeGrade = parseFloat(s.attitude_grade);
            
            // Calcular nota efectiva segons el criteri seleccionat
            let effectiveGrade = null;
            if (gradeAssignmentCriteria === 'academic' && !isNaN(academicGrade)) {
                effectiveGrade = academicGrade;
            } else if (gradeAssignmentCriteria === 'attitude' && !isNaN(attitudeGrade)) {
                effectiveGrade = attitudeGrade;
            } else if (gradeAssignmentCriteria === 'average' && !isNaN(academicGrade) && !isNaN(attitudeGrade)) {
                effectiveGrade = (academicGrade + attitudeGrade) / 2;
            }
            
            return {
                id: s.id,
                name: s.name,
                academic_grade: academicGrade,
                attitude_grade: attitudeGrade,
                effective_grade: effectiveGrade, // Nova propietat per la nota efectiva
                gender: s.gender || 'unknown',
                restrictions: Array.isArray(s.restrictions) ? s.restrictions : [],
                preferences: Array.isArray(s.preferences) ? s.preferences : [],
                current_table_id: s.table_id || s.id_taula_plantilla || null 
            };
        });        // Alumnes que ja estan assignats a una taula d'aquesta plantilla
        allStudents.forEach(student => {
            if (student.current_table_id) {
                const table = tablesFromPlantilla.find(t => t.id === student.current_table_id);
                if (table) {
                    table.students_assigned.push(student);
                    table.current_occupancy++;
                    if (!isNaN(student.effective_grade)) {
                        table.current_sum_of_grades += student.effective_grade;
                    }
                    if (student.gender === 'male') table.current_male_count++;
                    else if (student.gender === 'female') table.current_female_count++;
                }
            }
        });
        
        // Recalcular mitjanes inicials
        tablesFromPlantilla.forEach(table => {
             const validGradesCount = table.students_assigned.filter(s => !isNaN(s.effective_grade)).length;
             table.current_avg_grade = validGradesCount > 0 ? table.current_sum_of_grades / validGradesCount : null;
        });

        // 3. Obtenir totes les assignacions guardades per la plantilla per verificar que no generem duplicats
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
        const distribucionsGuardades = Object.values(distribucionsMap);        // Funció per comparar assignacions (exacte)
        function isSameAssignment(proposed, saved) {
            if (proposed.length !== Object.keys(saved).length) return false;
            for (const pa of proposed) {
                if (saved[pa.studentId] !== pa.tableId) return false;
            }
            return true;
        }

        // Funció per comparar assignacions (amb tolerància)
        function isSimilarAssignment(proposed, saved, toleranceRate = 0.8) {
            const totalAssignments = proposed.length;
            if (totalAssignments === 0) return true;
            
            let matches = 0;
            for (const pa of proposed) {
                if (saved[pa.studentId] === pa.tableId) {
                    matches++;
                }
            }
            
            const similarityRate = matches / totalAssignments;
            return similarityRate >= toleranceRate;
        }let foundUnique = false;
        let proposedAssignments = [];
        let warnings = [];
        const MAX_ATTEMPTS = 25; // Augmentem intents per al nou algorisme
        let attempt = 0;
        
        while (!foundUnique && attempt < MAX_ATTEMPTS) {
            attempt++;
            const startTime = Date.now();
            
            // Cada nou intent reseteja les assignacions i warnings
            proposedAssignments = [];
            warnings = [];
            
            // ========== ESTRATÈGIA HÍBRIDA PROGRESSIVA ==========
            // Intent 1-3: Algorisme determinista (màxima qualitat)
            // Intent 4-10: Introducció progressiva d'aleatorietat
            // Intent 11+: Relaxació gradual de criteris secundaris
            
            const strategyPhase = attempt <= 3 ? 'deterministic' : 
                                attempt <= 10 ? 'progressive' : 'relaxed';
            
            const variabilityConfig = {
                phase: strategyPhase,
                randomnessLevel: strategyPhase === 'deterministic' ? 0 : 
                               strategyPhase === 'progressive' ? (attempt - 3) * 0.1 : 0.3,
                toleranceGradeBalance: strategyPhase === 'deterministic' ? 1.0 : 
                                     strategyPhase === 'progressive' ? 0.8 : 0.6,
                toleranceGenderBalance: strategyPhase === 'deterministic' ? 1.0 : 
                                      strategyPhase === 'progressive' ? 0.8 : 0.6,
                minPreferenceSatisfaction: 0.8, // Sempre mantenim preferències altes
                allowSimilar: strategyPhase !== 'deterministic'
            };
            
            console.log(`\n🎯 Intent ${attempt} - Estratègia: ${strategyPhase} (aleatorietat: ${variabilityConfig.randomnessLevel})`);
            
            // Per cada intent, fem una còpia neta de les taules i els alumnes
            const tablesForThisAttempt = tablesFromPlantilla.map(table => ({
                ...table,
                students_assigned: [...table.students_assigned],
            }));
            
            let studentsToAssign = allStudents
                .filter(s => s.current_table_id == null)
                .map(s => ({...s}));

            // Introduir aleatorietat en l'ordre dels alumnes segons la fase
            if (variabilityConfig.randomnessLevel > 0) {
                console.log(`🎲 Aplicant aleatorietat (nivell: ${variabilityConfig.randomnessLevel})`);
                studentsToAssign = shuffleArray(studentsToAssign);
            }            // Calculem estadístiques globals
            const studentsWithValidGrades = allStudents.filter(s => !isNaN(s.effective_grade));
            const overallAverageGrade = studentsWithValidGrades.length > 0
                ? studentsWithValidGrades.reduce((sum, s) => sum + s.effective_grade, 0) / studentsWithValidGrades.length
                : null;

            const totalMaleStudents = studentsToAssign.filter(s => s.gender === 'male').length;
            const totalFemaleStudents = studentsToAssign.filter(s => s.gender === 'female').length;

            // ========== ALGORISME MILLORAT AMB VARIABILITAT ==========
            
            try {
                let result;
                if (usePreferences) {
                    result = await assignWithPreferences(studentsToAssign, tablesForThisAttempt, {
                        overallAverageGrade,
                        balanceByGender,
                        totalMaleStudents,
                        totalFemaleStudents,
                        variabilityConfig // AFEGIT: Configuració de variabilitat
                    });
                } else {
                    result = await assignWithoutPreferences(studentsToAssign, tablesForThisAttempt, {
                        overallAverageGrade,
                        balanceByGender,
                        totalMaleStudents,
                        totalFemaleStudents,
                        variabilityConfig // AFEGIT: Configuració de variabilitat
                    });
                }
                
                proposedAssignments = result.assignments;
                warnings = result.warnings;
                
                const executionTime = Date.now() - startTime;
                console.log(`Intent ${attempt}: ${proposedAssignments.length} assignacions en ${executionTime}ms`);
                
            } catch (error) {
                console.error(`Error en intent ${attempt}:`, error.message);
                warnings.push(`Error en intent ${attempt}: ${error.message}`);
                continue;
            }
            
            // Verificació de unicitat més flexible segons la fase
            if (variabilityConfig.allowSimilar) {
                foundUnique = !distribucionsGuardades.some(saved => isSimilarAssignment(proposedAssignments, saved, 0.8));
                if (foundUnique) {
                    console.log(`✅ Distribució suficientment diferent trobada (similaritat < 80%)`);
                }
            } else {
                foundUnique = !distribucionsGuardades.some(saved => isSameAssignment(proposedAssignments, saved));
            }
        }

        if (!foundUnique) {
            return res.status(409).json({ success: false, message: 'No s\'ha pogut generar una distribució diferent de les ja existents per aquesta plantilla.' });
        }
        
        // Generar mètriques de satisfacció per als nous objectius
        const metrics = {
            totalStudentsAssigned: proposedAssignments.length,
            totalStudentsWithPreferences: 0,
            studentsWithSatisfiedPreferences: 0,
            preferencesSatisfactionRate: 0,
            averageGradeBalance: 0,
            genderBalance: null
        };
          if (usePreferences) {
            // Calcular mètriques de preferències
            const allStudents = studentsFromFrontend;
            const studentsWithPrefs = allStudents.filter(s => s.preferences && s.preferences.length > 0);
            metrics.totalStudentsWithPreferences = studentsWithPrefs.length;
            
            console.log(`\n📊 CÀLCUL DE MÈTRIQUES:`);
            console.log(`Total alumnes amb preferències: ${studentsWithPrefs.length}`);
            
            let satisfiedCount = 0;
            for (const student of studentsWithPrefs) {
                const assignment = proposedAssignments.find(a => a.studentId === student.id);
                console.log(`\n🔍 Analitzant ${student.name} (ID: ${student.id})`);
                console.log(`   Preferències: [${student.preferences?.join(', ') || 'cap'}]`);
                
                if (assignment) {
                    console.log(`   Assignat a taula: ${assignment.tableName} (ID: ${assignment.tableId})`);
                    
                    // Trobar companys de taula
                    const tablemates = proposedAssignments
                        .filter(a => a.tableId === assignment.tableId && a.studentId !== student.id)
                        .map(a => a.studentId);
                    
                    console.log(`   Companys de taula: [${tablemates.join(', ')}]`);
                    
                    // Verificar si té almenys un preferit com a company
                    const hasPreferredTablemate = student.preferences.some(prefId => 
                        tablemates.includes(prefId)
                    );
                    
                    console.log(`   Té preferit a la taula: ${hasPreferredTablemate ? '✅ SÍ' : '❌ NO'}`);
                    
                    if (hasPreferredTablemate) {
                        satisfiedCount++;
                        const satisfiedPrefs = student.preferences.filter(prefId => tablemates.includes(prefId));
                        console.log(`   Preferències satisfetes: [${satisfiedPrefs.join(', ')}]`);
                    }
                } else {
                    console.log(`   ❌ NO ASSIGNAT`);
                }
            }
            
            console.log(`\n📈 RESULTAT FINAL:`);
            console.log(`   Alumnes satisfets: ${satisfiedCount}/${studentsWithPrefs.length}`);
            
            metrics.studentsWithSatisfiedPreferences = satisfiedCount;
            metrics.preferencesSatisfactionRate = studentsWithPrefs.length > 0 
                ? Math.round((satisfiedCount / studentsWithPrefs.length) * 100) 
                : 100;
        }// Calcular mètriques d'equilibri de notes
        // Reconstruir l'estat final de les taules basant-se en les assignacions
        const finalTables = tablesFromPlantilla.map(table => ({
            ...table,
            students_assigned: [...table.students_assigned],
            current_occupancy: table.current_occupancy,
            current_sum_of_grades: table.current_sum_of_grades,
            current_avg_grade: table.current_avg_grade,
            current_male_count: table.current_male_count,
            current_female_count: table.current_female_count
        }));

        // Aplicar les assignacions proposades per calcular l'estat final
        for (const assignment of proposedAssignments) {
            const table = finalTables.find(t => t.id === assignment.tableId);
            const student = allStudents.find(s => s.id === assignment.studentId);
              if (table && student && !student.current_table_id) {
                table.students_assigned.push(student);
                table.current_occupancy++;
                
                if (!isNaN(student.effective_grade)) {
                    table.current_sum_of_grades += student.effective_grade;
                    const validGradesCount = table.students_assigned.filter(s => !isNaN(s.effective_grade)).length;
                    table.current_avg_grade = validGradesCount > 0 
                        ? table.current_sum_of_grades / validGradesCount 
                        : null;
                }
                
                if (student.gender === 'male') table.current_male_count++;
                else if (student.gender === 'female') table.current_female_count++;
            }
        }

        const tableAverages = finalTables
            .filter(t => t.current_occupancy > 0)
            .map(t => t.current_avg_grade)
            .filter(avg => avg !== null);
        
        if (tableAverages.length > 1) {
            const avgOfAverages = tableAverages.reduce((sum, avg) => sum + avg, 0) / tableAverages.length;
            const variance = tableAverages.reduce((sum, avg) => sum + Math.pow(avg - avgOfAverages, 2), 0) / tableAverages.length;
            metrics.averageGradeBalance = Math.round((1 / (1 + variance)) * 100); // 100% = perfecte equilibri
        }

        // Calcular mètriques d'equilibri de gènere si està activat
        if (balanceByGender) {
            const genderRatios = finalTables
                .filter(t => t.current_occupancy > 0)
                .map(t => {
                    const total = t.current_male_count + t.current_female_count;
                    return total > 0 ? Math.abs(t.current_male_count - t.current_female_count) / total : 0;
                });
            
            if (genderRatios.length > 0) {
                const avgGenderImbalance = genderRatios.reduce((sum, ratio) => sum + ratio, 0) / genderRatios.length;
                metrics.genderBalance = Math.round((1 - avgGenderImbalance) * 100); // 100% = perfecte equilibri
            }
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

// ========== NOVES FUNCIONS D'ALGORISME MILLORAT ==========

/**
 * Funció de barreja per introduir aleatorietat
 */
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Verifica si un alumne pot ser assignat a una taula (restriccions)
 */
function canAssignToTable(student, table) {
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
}

/**
 * Actualitza l'estat de la taula després d'assignar un alumne
 */
function assignStudentToTable(student, table, assignments) {
    // Registrem l'assignació
    assignments.push({
        studentId: student.id,
        tableId: table.id,
        studentName: student.name,
        tableName: table.table_number
    });
    
    // Actualitzem l'estat de la taula
    table.students_assigned.push(student);
    table.current_occupancy++;
      if (!isNaN(student.effective_grade)) {
        table.current_sum_of_grades += student.effective_grade;
        
        const validGradesCount = table.students_assigned.filter(s => !isNaN(s.effective_grade)).length;
        table.current_avg_grade = validGradesCount > 0 
            ? table.current_sum_of_grades / validGradesCount 
            : null;
    }
    
    if (student.gender === 'male') table.current_male_count++;
    else if (student.gender === 'female') table.current_female_count++;
    
    // Marquem l'alumne com assignat
    student.assigned = true;
}

/**
 * Calcula el score d'un alumne per una taula específica amb variabilitat opcional
 */
function calculateTableScore(student, table, options) {
    const { overallAverageGrade, balanceByGender, usePreferences, variabilityConfig } = options;
    let score = 0;
    
    // PRIORITAT 1: Preferències (sempre mantenim aquesta prioritat alta)
    if (usePreferences && student.preferences && student.preferences.length > 0) {
        const hasPreferredByStudentInTable = table.students_assigned.some(
            assigned => student.preferences.includes(assigned.id)
        );
        
        // Bonus MOLT gran per tenir un preferit
        if (hasPreferredByStudentInTable) {
            score += 1000;
        }
        
        // Bonus si algú a la taula prefereix aquest alumne
        const studentsInTablePreferringThis = table.students_assigned.filter(
            assigned => assigned.preferences && assigned.preferences.includes(student.id)
        ).length;
        
        if (studentsInTablePreferringThis > 0) {
            score += 200;
        }
    }    // PRIORITAT 2: Equilibri acadèmic (amb tolerància configurable)
    const studentGrade = student.effective_grade;
    if (overallAverageGrade !== null && !isNaN(studentGrade)) {
        const studentsWithGrades = table.students_assigned.filter(s => !isNaN(s.effective_grade));
        const newGradeSum = studentsWithGrades.reduce((sum, s) => sum + s.effective_grade, 0) + studentGrade;
        const newCount = studentsWithGrades.length + 1;
        const newAvg = newCount > 0 ? newGradeSum / newCount : overallAverageGrade;
        
        // Aplicar tolerància configurable
        const toleranceGrade = variabilityConfig?.toleranceGradeBalance || 1.0;
        const gradeDiff = Math.abs(newAvg - overallAverageGrade);
        const gradeWeight = toleranceGrade * 10;
        score -= gradeDiff * gradeWeight;
    }

    // PRIORITAT 3: Equilibri de gènere (amb tolerància configurable)
    if (balanceByGender && student.gender && (student.gender === 'male' || student.gender === 'female')) {
        let maleCount = table.current_male_count;
        let femaleCount = table.current_female_count;
        
        if (student.gender === 'male') maleCount++;
        else if (student.gender === 'female') femaleCount++;
        
        const totalStudents = table.current_occupancy + 1;
        if (totalStudents > 1) {
            const toleranceGender = variabilityConfig?.toleranceGenderBalance || 1.0;
            const genderDiff = Math.abs(maleCount - femaleCount);
            const genderWeight = toleranceGender * 5;
            score -= genderDiff * genderWeight;
            
            // Bonus per equilibri perfecte (només si tolerància és alta)
            if (genderDiff <= 1 && toleranceGender >= 0.8) {
                score += 5;
            }
        }
    }

    // PRIORITAT 4: Distribució equilibrada de capacitat
    const remainingAfter = table.capacity - (table.current_occupancy + 1);
    score += remainingAfter * 1;

    // AFEGIR VARIABILITAT: Component aleatori segons configuració
    if (variabilityConfig?.randomnessLevel > 0) {
        const randomComponent = (Math.random() - 0.5) * 2 * variabilityConfig.randomnessLevel * Math.abs(score) * 0.1;
        score += randomComponent;
        
        // Log ocasional per debuggar
        if (Math.random() < 0.1) {
            console.log(`🎲 Score amb variabilitat: ${score.toFixed(2)} (component aleatori: ${randomComponent.toFixed(2)})`);
        }
    }

    return score;
}

/**
 * Algorisme d'assignació amb preferències
 */
async function assignWithPreferences(studentsToAssign, tables, options) {
    const assignments = [];
    const warnings = [];
    
    // FASE 1: Identificar i assignar parells amb preferències mútues
    const mutualPairs = [];
    
    for (let i = 0; i < studentsToAssign.length; i++) {
        const studentA = studentsToAssign[i];
        if (!studentA.preferences || studentA.preferences.length === 0) continue;
        
        for (let j = i + 1; j < studentsToAssign.length; j++) {
            const studentB = studentsToAssign[j];
            if (!studentB.preferences || studentB.preferences.length === 0) continue;
            
            // Preferència mútua sense restriccions
            if (studentA.preferences.includes(studentB.id) && 
                studentB.preferences.includes(studentA.id) &&
                !studentA.restrictions?.includes(studentB.id) &&
                !studentB.restrictions?.includes(studentA.id)) {
                      mutualPairs.push({
                    studentA,
                    studentB,
                    avgGrade: ((studentA.effective_grade || 0) + (studentB.effective_grade || 0)) / 2
                });
            }
        }
    }
    
    // Ordenem parells per equilibri (nota mitjana més propera a la global)
    mutualPairs.sort((a, b) => {
        const diffA = Math.abs(a.avgGrade - options.overallAverageGrade);
        const diffB = Math.abs(b.avgGrade - options.overallAverageGrade);
        return diffA - diffB;
    });
    
    // Assignem parells mútues
    for (const pair of mutualPairs) {
        const { studentA, studentB } = pair;
        
        if (studentA.assigned || studentB.assigned) continue;
        
        let bestTable = null;
        let bestScore = -Infinity;
        
        for (const table of tables) {
            if (table.current_occupancy + 2 > table.capacity) continue;
            
            if (!canAssignToTable(studentA, table) || !canAssignToTable(studentB, table)) {
                continue;
            }
            
            const scoreA = calculateTableScore(studentA, table, { ...options, usePreferences: true });
            const scoreB = calculateTableScore(studentB, table, { ...options, usePreferences: true });
            const combinedScore = scoreA + scoreB + 200; // Bonus per preferència mútua
            
            if (combinedScore > bestScore) {
                bestScore = combinedScore;
                bestTable = table;
            }
        }
        
        if (bestTable) {
            assignStudentToTable(studentA, bestTable, assignments);
            assignStudentToTable(studentB, bestTable, assignments);
        }
    }
      // FASE 2: Assignació individual optimitzada amb prioritat per alumnes preferits
    const remainingStudents = studentsToAssign.filter(s => !s.assigned);
    
    // Identificar alumnes que són preferits per altres
    const allPreferences = studentsToAssign
        .filter(s => s.preferences && s.preferences.length > 0)
        .flatMap(s => s.preferences);
    
    const studentsPreferredByOthers = new Set(allPreferences);
    
    console.log(`\n🎯 Alumnes preferits per altres: [${Array.from(studentsPreferredByOthers).join(', ')}]`);
      // Ordenem per prioritat avançada amb variabilitat opcional
    remainingStudents.sort((a, b) => {
        const validTablesA = tables.filter(t => canAssignToTable(a, t)).length;
        const validTablesB = tables.filter(t => canAssignToTable(b, t)).length;
        
        const hasPrefsA = a.preferences && a.preferences.length > 0;
        const hasPrefsB = b.preferences && b.preferences.length > 0;
        
        const isPreferredA = studentsPreferredByOthers.has(a.id);
        const isPreferredB = studentsPreferredByOthers.has(b.id);
        
        // PRIORITAT 1: Alumnes amb preferències van absolutament primer (sempre)
        if (hasPrefsA && !hasPrefsB) return -1;
        if (!hasPrefsA && hasPrefsB) return 1;
        
        // PRIORITAT 2: Entre alumnes amb preferències, menys opcions primer
        if (hasPrefsA && hasPrefsB) {
            if (validTablesA !== validTablesB) return validTablesA - validTablesB;
            
            // Introduir aleatorietat en empats si estem en mode variable
            if (a.preferences.length === b.preferences.length && 
                options.variabilityConfig?.randomnessLevel > 0) {
                return Math.random() - 0.5;
            }
            return a.preferences.length - b.preferences.length;
        }
        
        // PRIORITAT 3: Alumnes preferits per altres van després dels que tenen preferències
        if (isPreferredA && !isPreferredB) return -1;
        if (!isPreferredA && isPreferredB) return 1;
        
        // PRIORITAT 4: Entre alumnes preferits, menys opcions primer
        if (isPreferredA && isPreferredB) {
            if (validTablesA !== validTablesB) return validTablesA - validTablesB;
            
            // Introduir aleatorietat en empats
            if (validTablesA === validTablesB && 
                options.variabilityConfig?.randomnessLevel > 0) {
                return Math.random() - 0.5;
            }
        }
        
        // PRIORITAT 5: Per la resta, menys opcions primer
        if (validTablesA !== validTablesB) return validTablesA - validTablesB;
        
        // Introduir aleatorietat en empats finals
        if (options.variabilityConfig?.randomnessLevel > 0) {
            return Math.random() - 0.5;
        }
        
        return 0;
    });
    
    // Algorisme amb estratègia de proximitat per alumnes preferits
    for (const student of remainingStudents) {
        if (student.assigned) continue;
        
        const isPreferred = studentsPreferredByOthers.has(student.id);
                
        let bestTable = null;
        let bestScore = -Infinity;
        let foundTableWithSomeoneWhoPrefersThem = false;
        
        // Estratègia especial per alumnes preferits
        if (isPreferred && !student.preferences?.length) {
            console.log(`🔍 Buscant taules amb alumnes que prefereixen ${student.name}...`);
            
            // Buscar taules on hi hagi algú que el prefereix
            for (const table of tables) {
                if (!canAssignToTable(student, table)) continue;
                
                const someonePrefersThem = table.students_assigned.some(assigned => 
                    assigned.preferences && assigned.preferences.includes(student.id)
                );
                
                if (someonePrefersThem) {
                    foundTableWithSomeonePrefersThem = true;
                    console.log(`✨ Taula ${table.table_number}: Algú el prefereix!`);
                    
                    // Bonus màxim per reunir preferències
                    const score = calculateTableScore(student, table, options) + 2000;
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestTable = table;
                    }
                }
            }
            
            // Si no troba ningú que el prefereixi, usa estratègia normal
            if (!foundTableWithSomeonePrefersThem) {
                console.log(`❌ No hi ha ningú que el prefereixi a cap taula disponible`);
            }
        }
          // Si no té estratègia especial o no ha trobat ningú, usa estratègia normal/variable
        if (!bestTable) {
            const tableScores = [];
            
            // Calcular scores per totes les taules vàlides
            for (const table of tables) {
                if (!canAssignToTable(student, table)) continue;
                
                const score = calculateTableScore(student, table, options);
                tableScores.push({ table, score });
            }
            
            // Ordenar per score descendent
            tableScores.sort((a, b) => b.score - a.score);
            
            // Selecció segons configuració de variabilitat
            if (options.variabilityConfig?.randomnessLevel > 0 && tableScores.length > 1) {
                // MODE PROBABILÍSTIC: Escollir entre les millors opcions amb probabilitat
                const threshold = options.variabilityConfig.randomnessLevel * 0.3; // 0-0.09 rang típic
                const topScore = tableScores[0].score;
                
                // Filtrar taules amb scores dins del rang acceptable
                const acceptableTables = tableScores.filter(ts => 
                    Math.abs(ts.score - topScore) <= Math.abs(topScore) * threshold || 
                    ts.score >= topScore - 50 // Tolerància absoluta
                );
                
                if (acceptableTables.length > 1) {
                    // Selecció probabilística entre bones opcions
                    const randomIndex = Math.floor(Math.random() * acceptableTables.length);
                    bestTable = acceptableTables[randomIndex].table;
                    bestScore = acceptableTables[randomIndex].score;
                    
                    console.log(`🎲 Selecció probabilística: ${acceptableTables.length} opcions, escollida ${bestTable.table_number} (score: ${bestScore.toFixed(2)})`);
                } else {
                    // Si només hi ha una bona opció, usar-la
                    bestTable = tableScores[0].table;
                    bestScore = tableScores[0].score;
                }
            } else {
                // MODE DETERMINISTA: Escollir sempre la millor
                if (tableScores.length > 0) {
                    bestTable = tableScores[0].table;
                    bestScore = tableScores[0].score;
                }
            }
        }
          if (bestTable) {
            console.log(`✅ Assignant ${student.name} a taula ${bestTable.table_number} (score: ${bestScore})`);
            if (foundTableWithSomeoneWhoPrefersThem) {
                console.log(`🎉 PREFERÈNCIA SATISFETA: Algú a la taula prefereix ${student.name}`);
            }
            assignStudentToTable(student, bestTable, assignments);
        } else {
            console.log(`❌ ERROR: No s'ha pogut assignar ${student.name} a cap taula`);
            warnings.push(`No s'ha pogut assignar l'alumne ${student.name} (ID ${student.id}) a cap taula vàlida.`);
        }    }
    
    return { assignments, warnings };
}

/**
 * Algorisme d'assignació sense preferències (amb variabilitat opcional)
 */
async function assignWithoutPreferences(studentsToAssign, tables, options) {
    const assignments = [];
    const warnings = [];
    
    // Ordenem alumnes amb aleatorietat opcional
    studentsToAssign.sort((a, b) => {
        // Primer, alumnes amb menys opcions vàlides
        const validTablesA = tables.filter(t => canAssignToTable(a, t)).length;
        const validTablesB = tables.filter(t => canAssignToTable(b, t)).length;
        
        if (validTablesA !== validTablesB) return validTablesA - validTablesB;
        
        // Introduir aleatorietat en empats si estem en mode variable
        if (options.variabilityConfig?.randomnessLevel > 0) {
            return Math.random() - 0.5;
        }
          // Després, per equilibri de notes (determinista)
        return (b.effective_grade || 0) - (a.effective_grade || 0);
    });
    
    // Assignació amb selecció probabilística opcional
    for (const student of studentsToAssign) {
        if (student.assigned) continue;
        
        const tableScores = [];
        
        // Calcular scores per totes les taules vàlides
        for (const table of tables) {
            if (!canAssignToTable(student, table)) continue;
            
            const score = calculateTableScore(student, table, { ...options, usePreferences: false });
            tableScores.push({ table, score });
        }
        
        // Ordenar per score descendent
        tableScores.sort((a, b) => b.score - a.score);
        
        let bestTable = null;
        let bestScore = -Infinity;
        
        if (tableScores.length > 0) {
            // Selecció segons configuració de variabilitat
            if (options.variabilityConfig?.randomnessLevel > 0 && tableScores.length > 1) {
                // MODE PROBABILÍSTIC
                const threshold = options.variabilityConfig.randomnessLevel * 0.2;
                const topScore = tableScores[0].score;
                
                const acceptableTables = tableScores.filter(ts => 
                    Math.abs(ts.score - topScore) <= Math.abs(topScore) * threshold ||
                    ts.score >= topScore - 30
                );
                
                if (acceptableTables.length > 1) {
                    const randomIndex = Math.floor(Math.random() * acceptableTables.length);
                    bestTable = acceptableTables[randomIndex].table;
                    bestScore = acceptableTables[randomIndex].score;
                } else {
                    bestTable = tableScores[0].table;
                    bestScore = tableScores[0].score;
                }
            } else {
                // MODE DETERMINISTA
                bestTable = tableScores[0].table;
                bestScore = tableScores[0].score;
            }
        }
        
        if (bestTable) {
            assignStudentToTable(student, bestTable, assignments);
        } else {
            warnings.push(`No s'ha pogut assignar l'alumne ${student.name} (ID ${student.id}) a cap taula vàlida.`);
        }
    }
    
    return { assignments, warnings };
}

/**
 * Algorisme optimitzat per assignar estudiants restants maximitzant preferències
 */
function assignRemainingStudentsOptimal(students, tables, options) {
    const assignments = [];
    const warnings = [];
    const studentsWithPrefs = students.filter(s => s.preferences && s.preferences.length > 0);
    const studentsWithoutPrefs = students.filter(s => !s.preferences || s.preferences.length === 0);    // Primer assignem estudiants amb preferències amb estratègia agressiva
    for (const student of studentsWithPrefs) {
        if (student.assigned) continue;
        
        console.log(`\n=== Processant alumne amb preferències: ${student.name} (ID: ${student.id}) ===`);
        console.log(`Preferències: [${student.preferences.join(', ')}]`);
        console.log(`Restriccions: [${student.restrictions.join(', ')}]`);
        
        let bestTable = null;
        let bestScore = -Infinity;
        let foundTableWithPreference = false;
        let tablesWithPreferences = [];
        
        // Primer pas: trobar totes les taules amb preferències
        for (const table of tables) {
            if (!canAssignToTable(student, table)) {
                console.log(`❌ Taula ${table.table_number}: No pot assignar (capacitat: ${table.current_occupancy}/${table.capacity})`);
                continue;
            }
            
            const hasPreferredInTable = table.students_assigned.some(assigned => 
                student.preferences.includes(assigned.id)
            );
            
            const studentsInTable = table.students_assigned.map(s => `${s.name}(${s.id})`).join(', ');
            console.log(`🔍 Taula ${table.table_number}: [${studentsInTable}] - Té preferit: ${hasPreferredInTable}`);
            
            if (hasPreferredInTable) {
                tablesWithPreferences.push(table);
                foundTableWithPreference = true;
            }
        }
        
        console.log(`📋 Taules amb preferències trobades: ${tablesWithPreferences.length}`);
        
        // Si hi ha taules amb preferències, prioritzar-les absolutament
        const tablesToConsider = tablesWithPreferences.length > 0 ? tablesWithPreferences : tables;
        
        for (const table of tablesToConsider) {
            if (!canAssignToTable(student, table)) continue;
            
            const score = calculateTableScore(student, table, options);
            console.log(`📊 Taula ${table.table_number}: Score = ${score}`);
            
            if (score > bestScore) {
                bestScore = score;
                bestTable = table;
            }
        }
        
        if (bestTable) {
            console.log(`✅ Assignant ${student.name} a taula ${bestTable.table_number} (score: ${bestScore})`);
            assignStudentToTable(student, bestTable, assignments);
            
            if (!foundTableWithPreference) {
                console.log(`⚠️ AVÍS: ${student.name} assignat però sense preferits`);
                warnings.push(`L'alumne ${student.name} (ID ${student.id}) no ha pogut ser assignat amb cap dels seus preferits.`);
            } else {
                console.log(`🎉 ${student.name} assignat amb preferits!`);
            }
        } else {
            console.log(`❌ ERROR: No s'ha pogut assignar ${student.name} a cap taula`);
            warnings.push(`No s'ha pogut assignar l'alumne ${student.name} (ID ${student.id}) a cap taula vàlida.`);
        }
    }
    
    // Després assignem la resta
    for (const student of studentsWithoutPrefs) {
        if (student.assigned) continue;
        
        let bestTable = null;
        let bestScore = -Infinity;
        
        for (const table of tables) {
            if (!canAssignToTable(student, table)) continue;
            
            const score = calculateTableScore(student, table, options);
            
            if (score > bestScore) {
                bestScore = score;
                bestTable = table;
            }
        }
        
        if (bestTable) {
            assignStudentToTable(student, bestTable, assignments);
        } else {
            warnings.push(`No s'ha pogut assignar l'alumne ${student.name} (ID ${student.id}) a cap taula vàlida.`);
        }
    }
    
    return { assignments, warnings };
}

module.exports = {
  autoAssignStudents,
};