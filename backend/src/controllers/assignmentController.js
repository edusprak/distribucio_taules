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
        const distribucionsGuardades = Object.values(distribucionsMap);

        // Funció per comparar assignacions
        function isSameAssignment(proposed, saved) {
            if (proposed.length !== Object.keys(saved).length) return false;
            for (const pa of proposed) {
                if (saved[pa.studentId] !== pa.tableId) return false;
            }
            return true;
        }

        let foundUnique = false;
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
            
            // Per cada intent, fem una còpia neta de les taules i els alumnes
            const tablesForThisAttempt = tablesFromPlantilla.map(table => ({
                ...table,
                students_assigned: [...table.students_assigned],
            }));
            
            const studentsToAssign = allStudents
                .filter(s => s.current_table_id == null)
                .map(s => ({...s}));

            // Calculem estadístiques globals
            const studentsWithValidGrades = allStudents.filter(s => !isNaN(s.academic_grade));
            const overallAverageGrade = studentsWithValidGrades.length > 0
                ? studentsWithValidGrades.reduce((sum, s) => sum + s.academic_grade, 0) / studentsWithValidGrades.length
                : null;

            const totalMaleStudents = studentsToAssign.filter(s => s.gender === 'male').length;
            const totalFemaleStudents = studentsToAssign.filter(s => s.gender === 'female').length;

            // ========== NOU ALGORISME MILLORAT ==========
            
            try {
                let result;
                if (usePreferences) {
                    result = await assignWithPreferences(studentsToAssign, tablesForThisAttempt, {
                        overallAverageGrade,
                        balanceByGender,
                        totalMaleStudents,
                        totalFemaleStudents
                    });
                } else {
                    result = await assignWithoutPreferences(studentsToAssign, tablesForThisAttempt, {
                        overallAverageGrade,
                        balanceByGender,
                        totalMaleStudents,
                        totalFemaleStudents
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
            
            // Comprova si la proposta és igual a alguna guardada
            foundUnique = !distribucionsGuardades.some(saved => isSameAssignment(proposedAssignments, saved));
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
 * Calcula el score d'un alumne per una taula específica
 */
function calculateTableScore(student, table, options) {
    const { overallAverageGrade, balanceByGender, usePreferences } = options;
    let score = 0;
      // PRIORITAT 1: Preferències (només si usePreferences està activat)
    if (usePreferences && student.preferences && student.preferences.length > 0) {
        const hasPreferredByStudentInTable = table.students_assigned.some(
            assigned => student.preferences.includes(assigned.id)
        );
        
        // Bonus MOLT gran per tenir un preferit - augmentem significativament
        if (hasPreferredByStudentInTable) {
            score += 1000; // Tornem a augmentar per donar més prioritat
        }
        
        // Bonus si algú a la taula prefereix aquest alumne
        const studentsInTablePreferringThis = table.students_assigned.filter(
            assigned => assigned.preferences && assigned.preferences.includes(student.id)
        ).length;
        
        if (studentsInTablePreferringThis > 0) {
            score += 200; // També augmentem aquest bonus
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
        const gradeDiff = Math.abs(newAvg - overallAverageGrade);
        score -= gradeDiff * 10; // Augmentem la importància de l'equilibri de notes
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
            score -= genderDiff * 5; // Augmentem la penalització per desequilibri de gènere
            
            // Bonus per equilibri perfecte
            if (genderDiff <= 1) {
                score += 5;
            }
        }
    }

    // PRIORITAT 4: Distribució equilibrada de capacitat
    const remainingAfter = table.capacity - (table.current_occupancy + 1);
    score += remainingAfter * 1; // Lleugerament més important

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
    
    // Ordenem per prioritat avançada
    remainingStudents.sort((a, b) => {
        const validTablesA = tables.filter(t => canAssignToTable(a, t)).length;
        const validTablesB = tables.filter(t => canAssignToTable(b, t)).length;
        
        const hasPrefsA = a.preferences && a.preferences.length > 0;
        const hasPrefsB = b.preferences && b.preferences.length > 0;
        
        const isPreferredA = studentsPreferredByOthers.has(a.id);
        const isPreferredB = studentsPreferredByOthers.has(b.id);
        
        // PRIORITAT 1: Alumnes amb preferències van absolutament primer
        if (hasPrefsA && !hasPrefsB) return -1;
        if (!hasPrefsA && hasPrefsB) return 1;
        
        // PRIORITAT 2: Entre alumnes amb preferències, menys opcions primer
        if (hasPrefsA && hasPrefsB) {
            if (validTablesA !== validTablesB) return validTablesA - validTablesB;
            return a.preferences.length - b.preferences.length;
        }
        
        // PRIORITAT 3: Alumnes preferits per altres van després dels que tenen preferències
        if (isPreferredA && !isPreferredB) return -1;
        if (!isPreferredA && isPreferredB) return 1;
        
        // PRIORITAT 4: Entre alumnes preferits, menys opcions primer
        if (isPreferredA && isPreferredB) {
            if (validTablesA !== validTablesB) return validTablesA - validTablesB;
        }
        
        // PRIORITAT 5: Per la resta, menys opcions primer
        if (validTablesA !== validTablesB) return validTablesA - validTablesB;
        
        return 0;
    });
    
    // Algorisme amb estratègia de proximitat per alumnes preferits
    for (const student of remainingStudents) {
        if (student.assigned) continue;
        
        const isPreferred = studentsPreferredByOthers.has(student.id);
        
        console.log(`\n=== Processant ${student.name} (ID: ${student.id}) ${isPreferred ? '⭐ (PREFERIT PER ALTRES)' : ''} ===`);
        
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
                    foundTableWithSomeoneWhoPrefersThem = true;
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
            if (!foundTableWithSomeoneWhoPrefersThem) {
                console.log(`❌ No hi ha ningú que el prefereixi a cap taula disponible`);
            }
        }
        
        // Si no té estratègia especial o no ha trobat ningú, usa estratègia normal
        if (!bestTable) {
            for (const table of tables) {
                if (!canAssignToTable(student, table)) continue;
                
                const score = calculateTableScore(student, table, options);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestTable = table;
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
        }
    }
    
    return { assignments, warnings };
    
    return { assignments, warnings };
}

/**
 * Algorisme d'assignació sense preferències (més simple)
 */
async function assignWithoutPreferences(studentsToAssign, tables, options) {
    const assignments = [];
    const warnings = [];
    
    // Ordenem alumnes per nota per equilibrar millor
    studentsToAssign.sort((a, b) => {
        // Primer, alumnes amb menys opcions vàlides
        const validTablesA = tables.filter(t => canAssignToTable(a, t)).length;
        const validTablesB = tables.filter(t => canAssignToTable(b, t)).length;
        
        if (validTablesA !== validTablesB) return validTablesA - validTablesB;
        
        // Després, per equilibri de notes
        return (b.academic_grade || 0) - (a.academic_grade || 0);
    });
    
    // Assignació simple pero efectiva
    for (const student of studentsToAssign) {
        if (student.assigned) continue;
        
        let bestTable = null;
        let bestScore = -Infinity;
        
        for (const table of tables) {
            if (!canAssignToTable(student, table)) continue;
            
            const score = calculateTableScore(student, table, { ...options, usePreferences: false });
            
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