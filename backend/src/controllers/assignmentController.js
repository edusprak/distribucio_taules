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

        // 2. Preparar alumnes: filtrar els ja assignats i ordenar
        const allStudents = studentsFromFrontend.map(s => ({
            id: s.id,
            name: s.name,
            academic_grade: parseFloat(s.academic_grade),
            gender: s.gender || 'unknown',
            restrictions: Array.isArray(s.restrictions) ? s.restrictions : [],
            preferences: Array.isArray(s.preferences) ? s.preferences : [],
            current_table_id: s.table_id || s.id_taula_plantilla || null 
        }));

        // Alumnes que ja estan assignats a una taula d'aquesta plantilla
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
        }        let foundUnique = false;
        let proposedAssignments = [];
        let warnings = [];
        const MAX_ATTEMPTS = 500; // Augmentat per donar més oportunitats a modes prioritaris
        let attempt = 0;
        
        while (!foundUnique && attempt < MAX_ATTEMPTS) {
            attempt++;
            const startTime = Date.now();
            
            // Cada nou intent reseteja les assignacions i warnings
            proposedAssignments = [];
            warnings = [];
              // ========== ESTRATÈGIA HÍBRIDA PROGRESSIVA OPTIMITZADA PER PREFERÈNCIES ==========
            // Intent 1-5: Prioritat absoluta per preferències (100% preferències)
            // Intent 6-10: Algorisme determinista amb prioritat alta per preferències (90%)
            // Intent 11-15: Introducció progressiva d'aleatorietat mantenint preferències altes
            // Intent 16+: Relaxació gradual de criteris secundaris
            
            const strategyPhase = attempt <= 200 ? 'preferences_ultra' : 
                                attempt <= 400 ? 'preferences_high' :
                                attempt <= 500 ? 'progressive' : 'relaxed';
              const variabilityConfig = {
                phase: strategyPhase,
                randomnessLevel: strategyPhase === 'preferences_ultra' ? 0 : 
                               strategyPhase === 'preferences_high' ? 0 :
                               strategyPhase === 'progressive' ? (attempt - 10) * 0.1 : 0.3,
                toleranceGradeBalance: strategyPhase === 'preferences_ultra' ? 0.3 : 
                                     strategyPhase === 'preferences_high' ? 0.6 :
                                     strategyPhase === 'progressive' ? 0.8 : 0.6,
                toleranceGenderBalance: strategyPhase === 'preferences_ultra' ? 0.3 : 
                                      strategyPhase === 'preferences_high' ? 0.6 :
                                      strategyPhase === 'progressive' ? 0.8 : 0.6,
                minPreferenceSatisfaction: strategyPhase === 'preferences_ultra' ? 1.0 : 
                                         strategyPhase === 'preferences_high' ? 0.95 :
                                         strategyPhase === 'progressive' ? 0.8 : 0.7,
                allowSimilar: strategyPhase === 'preferences_ultra' ? false : 
                             strategyPhase === 'preferences_high' ? false : true,
                prioritizePreferencesAbsolutely: strategyPhase === 'preferences_ultra' || strategyPhase === 'preferences_high',
                // NOVA: Estratègia de variabilitat controlada per mode ultra
                ultraVariabilityStrategy: strategyPhase === 'preferences_ultra' ? (attempt - 1) % 5 : null
            };
            
            console.log(`\n🎯 Intent ${attempt} - Estratègia: ${strategyPhase} (aleatorietat: ${variabilityConfig.randomnessLevel})`);
              if (strategyPhase === 'preferences_ultra') {
                const strategies = ['preferències mútues primer', 'alumnes populars primer', 'opcions limitades primer', 'equilibri acadèmic prioritari', 'barreja estratègica'];
                console.log(`💎 MODE ULTRA PRIORITARI: Buscant 100% de preferències satisfetes`);
                console.log(`   - Estratègia específica: ${strategies[variabilityConfig.ultraVariabilityStrategy]}`);
                console.log(`   - Bonus preferències: 10000 punts (vs 1000 normal)`);
                console.log(`   - Reducció altres criteris: 95%`);
                console.log(`   - Mínim acceptat: ${Math.round(variabilityConfig.minPreferenceSatisfaction * 100)}%`);
            } else if (strategyPhase === 'preferences_high') {
                console.log(`🔥 MODE ALTA PRIORITAT: Buscant 95% de preferències satisfetes`);
                console.log(`   - Bonus preferències: 1000 punts`);
                console.log(`   - Reducció altres criteris: 80%`);
                console.log(`   - Mínim acceptat: ${Math.round(variabilityConfig.minPreferenceSatisfaction * 100)}%`);
            }
            
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
            }

            // Calculem estadístiques globals
            const studentsWithValidGrades = allStudents.filter(s => !isNaN(s.academic_grade));
            const overallAverageGrade = studentsWithValidGrades.length > 0
                ? studentsWithValidGrades.reduce((sum, s) => sum + s.academic_grade, 0) / studentsWithValidGrades.length
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
                
                // Validació especial per modes ultra prioritaris: comprovar satisfacció de preferències
                if ((variabilityConfig.phase === 'preferences_ultra' || variabilityConfig.phase === 'preferences_high') && usePreferences) {
                    const studentsWithPrefs = studentsToAssign.filter(s => s.preferences && s.preferences.length > 0);
                    let satisfiedCount = 0;
                    
                    for (const student of studentsWithPrefs) {
                        const assignment = proposedAssignments.find(a => a.studentId === student.id);
                        if (assignment) {
                            const tablemates = proposedAssignments
                                .filter(a => a.tableId === assignment.tableId && a.studentId !== student.id)
                                .map(a => a.studentId);
                            
                            const hasPreferredTablemate = student.preferences.some(prefId => 
                                tablemates.includes(prefId)
                            );
                            
                            if (hasPreferredTablemate) {
                                satisfiedCount++;
                            }
                        }
                    }
                    
                    const satisfactionRate = studentsWithPrefs.length > 0 ? 
                        (satisfiedCount / studentsWithPrefs.length) : 1;
                    
                    console.log(`🎯 Validació mode ultra prioritari: ${satisfiedCount}/${studentsWithPrefs.length} preferències satisfetes (${Math.round(satisfactionRate * 100)}%)`);
                    
                    // En modes ultra prioritaris, només acceptem solucions que compleixin el mínim de satisfacció
                    if (satisfactionRate < variabilityConfig.minPreferenceSatisfaction) {
                        console.log(`❌ Solució rebutjada: satisfacció ${Math.round(satisfactionRate * 100)}% < mínim ${Math.round(variabilityConfig.minPreferenceSatisfaction * 100)}%`);
                        continue; // Intentar de nou
                    } else {
                        console.log(`✅ Solució acceptada: satisfacció ${Math.round(satisfactionRate * 100)}% >= mínim ${Math.round(variabilityConfig.minPreferenceSatisfaction * 100)}%`);
                    }
                }
                
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
                
                if (!isNaN(student.academic_grade)) {
                    table.current_sum_of_grades += student.academic_grade;
                    const validGradesCount = table.students_assigned.filter(s => !isNaN(s.academic_grade)).length;
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
}

/**
 * Calcula el score d'un alumne per una taula específica amb variabilitat opcional
 */
function calculateTableScore(student, table, options) {
    const { overallAverageGrade, balanceByGender, usePreferences, variabilityConfig } = options;
    let score = 0;
      // PRIORITAT 1: Preferències (amb bonus ultra-alts en modes prioritaris)
    if (usePreferences && student.preferences && student.preferences.length > 0) {
        const hasPreferredByStudentInTable = table.students_assigned.some(
            assigned => student.preferences.includes(assigned.id)
        );        // Bonus gran per tenir un preferit (adaptat segons el mode)
        if (hasPreferredByStudentInTable) {
            const basePreferenceBonus = variabilityConfig?.phase === 'preferences_ultra' ? 10000 : 1000;
            score += basePreferenceBonus;
            
            if (variabilityConfig?.phase === 'preferences_ultra') {
            } else if (variabilityConfig?.phase === 'preferences_high') {
            }
        }
        
        // Bonus si algú a la taula prefereix aquest alumne
        const studentsInTablePreferringThis = table.students_assigned.filter(
            assigned => assigned.preferences && assigned.preferences.includes(student.id)
        ).length;
          if (studentsInTablePreferringThis > 0) {
            const mutualPreferenceBonus = variabilityConfig?.phase === 'preferences_ultra' ? 5000 : 200;
            score += mutualPreferenceBonus;
        }
    }    // Aplicar factor de reducció per altres criteris en modes de prioritat absoluta de preferències
    const criteriaReductionFactor = variabilityConfig?.phase === 'preferences_ultra' ? 0.05 : 
                                   variabilityConfig?.phase === 'preferences_high' ? 0.2 : 1.0;// PRIORITAT 2: Equilibri acadèmic (amb tolerància configurable i reducció en modes prioritaris)
    const studentGrade = student.academic_grade;
    if (overallAverageGrade !== null && !isNaN(studentGrade)) {
        const studentsWithGrades = table.students_assigned.filter(s => !isNaN(s.academic_grade));
        const newGradeSum = studentsWithGrades.reduce((sum, s) => sum + s.academic_grade, 0) + studentGrade;
        const newCount = studentsWithGrades.length + 1;
        const newAvg = newCount > 0 ? newGradeSum / newCount : overallAverageGrade;
        
        // Aplicar tolerància configurable i factor de reducció
        const toleranceGrade = variabilityConfig?.toleranceGradeBalance || 1.0;
        const gradeDiff = Math.abs(newAvg - overallAverageGrade);
        const gradeWeight = toleranceGrade * 10 * criteriaReductionFactor;
        score -= gradeDiff * gradeWeight;
    }

    // PRIORITAT 3: Equilibri de gènere (amb tolerància configurable i reducció en modes prioritaris)
    if (balanceByGender && student.gender && (student.gender === 'male' || student.gender === 'female')) {
        let maleCount = table.current_male_count;
        let femaleCount = table.current_female_count;
        
        if (student.gender === 'male') maleCount++;
        else if (student.gender === 'female') femaleCount++;
        
        const totalStudents = table.current_occupancy + 1;
        if (totalStudents > 1) {
            const toleranceGender = variabilityConfig?.toleranceGenderBalance || 1.0;
            const genderDiff = Math.abs(maleCount - femaleCount);
            const genderWeight = toleranceGender * 5 * criteriaReductionFactor;
            score -= genderDiff * genderWeight;
            
            // Bonus per equilibri perfecte (només si tolerància és alta i no estem en mode ultra prioritari)
            if (genderDiff <= 1 && toleranceGender >= 0.8 && variabilityConfig?.phase !== 'preferences_ultra') {
                score += 5 * criteriaReductionFactor;
            }
        }
    }

    // PRIORITAT 4: Distribució equilibrada de capacitat (també amb reducció en modes prioritaris)
    const remainingAfter = table.capacity - (table.current_occupancy + 1);
    score += remainingAfter * 1 * criteriaReductionFactor;

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
                !studentA.restriccions?.includes(studentB.id) &&
                !studentB.restriccions?.includes(studentA.id)) {
                    
                mutualPairs.push({
                    studentA,
                    studentB,
                    avgGrade: ((studentA.academic_grade || 0) + (studentB.academic_grade || 0)) / 2
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
    
    // NOVA LÒGICA: Aplicar diferents estratègies d'ordenació en mode ultra per explorar variabilitat
    if (options.variabilityConfig?.ultraVariabilityStrategy !== null && options.variabilityConfig?.ultraVariabilityStrategy !== undefined) {
        const strategy = options.variabilityConfig.ultraVariabilityStrategy;
        console.log(`🧠 Aplicant estratègia ultra ${strategy}: ${['preferències mútues primer', 'alumnes populars primer', 'opcions limitades primer', 'equilibri acadèmic prioritari', 'barreja estratègica'][strategy]}`);
    }
      // Ordenem per prioritat avançada amb variabilitat controlada per mode ultra    // Ordenem per prioritat avançada amb variabilitat controlada per mode ultra
    remainingStudents.sort((a, b) => {
        const validTablesA = tables.filter(t => canAssignToTable(a, t)).length;
        const validTablesB = tables.filter(t => canAssignToTable(b, t)).length;
        
        const hasPrefsA = a.preferences && a.preferences.length > 0;
        const hasPrefsB = b.preferences && b.preferences.length > 0;
        
        const isPreferredA = studentsPreferredByOthers.has(a.id);
        const isPreferredB = studentsPreferredByOthers.has(b.id);
        
        // NOVA LÒGICA: Aplicar diferents criteris segons l'estratègia ultra
        const ultraStrategy = options.variabilityConfig?.ultraVariabilityStrategy;
        if (ultraStrategy !== null && ultraStrategy !== undefined) {
            return applySortingStrategy(a, b, ultraStrategy, { 
                validTablesA, validTablesB, hasPrefsA, hasPrefsB, isPreferredA, isPreferredB, studentsPreferredByOthers 
            });
        }
        
        // LÒGICA ORIGINAL: Quan no hi ha estratègia ultra específica
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
        return (b.academic_grade || 0) - (a.academic_grade || 0);
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

/**
 * Aplica diferents estratègies d'ordenació per explorar variabilitat en mode ultra
 */
function applySortingStrategy(a, b, strategy, context) {
    const { validTablesA, validTablesB, hasPrefsA, hasPrefsB, isPreferredA, isPreferredB, studentsPreferredByOthers } = context;
    
    // Sempre prioritzar alumnes amb preferències primer (invariant en totes les estratègies)
    if (hasPrefsA && !hasPrefsB) return -1;
    if (!hasPrefsA && hasPrefsB) return 1;
    
    switch (strategy) {
        case 0: // "preferències mútues primer"
            // Prioritza alumnes que tenen més preferències mútues
            if (hasPrefsA && hasPrefsB) {
                const mutualCountA = a.preferences.filter(id => studentsPreferredByOthers.has(a.id) && a.preferences.includes(id)).length;
                const mutualCountB = b.preferences.filter(id => studentsPreferredByOthers.has(b.id) && b.preferences.includes(id)).length;
                if (mutualCountA !== mutualCountB) return mutualCountB - mutualCountA; // Més mútues primer
                
                // Després per opcions limitades
                if (validTablesA !== validTablesB) return validTablesA - validTablesB;
                return a.preferences.length - b.preferences.length;
            }
            break;
            
        case 1: // "alumnes populars primer"
            // Prioritza alumnes que són preferits per molts altres
            if (hasPrefsA && hasPrefsB) {
                const popularityA = Array.from(studentsPreferredByOthers).filter(id => a.preferences.includes(id)).length;
                const popularityB = Array.from(studentsPreferredByOthers).filter(id => b.preferences.includes(id)).length;
                if (popularityA !== popularityB) return popularityB - popularityA; // Més populars primer
                
                // Després per opcions limitades
                if (validTablesA !== validTablesB) return validTablesA - validTablesB;
                return a.preferences.length - b.preferences.length;
            }
            break;
            
        case 2: // "opcions limitades primer" (estratègia original)
            if (hasPrefsA && hasPrefsB) {
                if (validTablesA !== validTablesB) return validTablesA - validTablesB;
                return a.preferences.length - b.preferences.length;
            }
            break;
            
        case 3: // "equilibri acadèmic prioritari"
            // Ordena per nota acadèmica per promoure equilibri diferents
            if (hasPrefsA && hasPrefsB) {
                const gradeA = parseFloat(a.academic_grade) || 5;
                const gradeB = parseFloat(b.academic_grade) || 5;
                if (Math.abs(gradeA - gradeB) > 0.1) return gradeB - gradeA; // Notes més altes primer
                
                // Després per opcions limitades
                if (validTablesA !== validTablesB) return validTablesA - validTablesB;
                return a.preferences.length - b.preferences.length;
            }
            break;
            
        case 4: // "barreja estratègica"
            // Combina múltiples criteris amb pesos diferents
            if (hasPrefsA && hasPrefsB) {
                const scoreA = validTablesA * 10 + a.preferences.length * 5 + (parseFloat(a.academic_grade) || 5);
                const scoreB = validTablesB * 10 + b.preferences.length * 5 + (parseFloat(b.academic_grade) || 5);
                if (Math.abs(scoreA - scoreB) > 0.1) return scoreA - scoreB; // Score més baix primer (menys opcions)
                return a.preferences.length - b.preferences.length;
            }
            break;
    }
    
    // Criteri per alumnes preferits (comú a totes les estratègies)
    if (isPreferredA && !isPreferredB) return -1;
    if (!isPreferredA && isPreferredB) return 1;
    
    // Criteri final: menys opcions primer
    if (validTablesA !== validTablesB) return validTablesA - validTablesB;
    
    return 0;
}

module.exports = {
  autoAssignStudents,
};