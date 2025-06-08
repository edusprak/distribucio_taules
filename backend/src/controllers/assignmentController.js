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
            preferences: Array.isArray(s.preferences) ? s.preferences : [], // <-- Afegit
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
        });


        // 1b. Obtenir totes les assignacions guardades per la plantilla
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
                console.log('No match:', pa.studentId, pa.tableId, saved[pa.studentId]);

            }
            console.log('MATCH FOUND', proposed, saved);
            return true;
        }

        // Fisher-Yates shuffle util
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        let foundUnique = false;
        let proposedAssignments = [];
        let warnings = [];
        const MAX_ATTEMPTS = 15;
        let attempt = 0;
        while (!foundUnique && attempt < MAX_ATTEMPTS) {
            attempt++;
            let studentsToAssign = allStudents.filter(s => s.current_table_id == null);
            // Aleatoritza l'ordre dels alumnes
            shuffleArray(studentsToAssign);
            proposedAssignments = [];
            warnings = [];
            // Si vols mantenir la prioritat per nota, pots fer un sort després del shuffle, però aquí volem randomització total

            proposedAssignments = [];
            const studentsWithValidGrades = allStudents.filter(s => !isNaN(s.academic_grade));
            const overallAverageGrade = studentsWithValidGrades.length > 0
                ? studentsWithValidGrades.reduce((sum, s) => sum + s.academic_grade, 0) / studentsWithValidGrades.length
                : null;

            // 4. Algorisme Greedy (similar a l'anterior, però amb `tablesFromPlantilla`)
            for (const student of studentsToAssign) {
                let bestTableForStudent = null;
                let bestTableScore = -Infinity;
                let foundTableWithPreference = false;
                let foundRestrictionVsPreference = false;
                let preferenceTableCandidates = [];
                // Aleatoritza l'ordre de les taules per cada alumne
                const shuffledTables = shuffleArray([...tablesFromPlantilla]);
                for (const table of shuffledTables) {
                    if (table.current_occupancy >= table.capacity) continue;

                    let hasRestrictionConflict = false;
                    if (student.restrictions.length > 0) {
                        for (const assignedStudent of table.students_assigned) {
                            if (student.restrictions.includes(assignedStudent.id)) {
                                hasRestrictionConflict = true;
                                // Si també és preferit, marquem-ho per warning
                                if (student.preferences.includes(assignedStudent.id)) {
                                    foundRestrictionVsPreference = true;
                                }
                                break;
                            }
                        }
                    }
                    if (hasRestrictionConflict) continue;

                    // Comprova si hi ha algun preferit a la taula
                    let hasPreferred = false;
                    if (student.preferences.length > 0) {
                        for (const assignedStudent of table.students_assigned) {
                            if (student.preferences.includes(assignedStudent.id)) {
                                hasPreferred = true;
                                break;
                            }
                        }
                    }
                    // Si hi ha preferit, afegeix la taula a candidats
                    if (hasPreferred) {
                        preferenceTableCandidates.push(table);
                        foundTableWithPreference = true;
                    }

                    // Calcula score normal
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

                    if (currentScore > bestTableScore) {
                        bestTableScore = currentScore;
                        bestTableForStudent = table;
                    }
                }

                // Si hi ha taules amb preferit, escull la millor d'elles
                if (preferenceTableCandidates.length > 0) {
                    // Escull la taula amb millor score entre les candidates
                    let bestPrefTable = null;
                    let bestPrefScore = -Infinity;
                    for (const table of preferenceTableCandidates) {
                        let score = 0;
                        // Calcula score igual que abans
                        const studentGrade = student.academic_grade;
                        if (overallAverageGrade !== null && !isNaN(studentGrade)) {
                            const tempStudentsWithGradeInTable = table.students_assigned.filter(s => !isNaN(s.academic_grade));
                            const newSumGrades = tempStudentsWithGradeInTable.reduce((acc, s) => acc + s.academic_grade, 0) + studentGrade;
                            const newOccupancyWithGrade = tempStudentsWithGradeInTable.length + 1;
                            const newAvgGrade = newOccupancyWithGrade > 0 ? newSumGrades / newOccupancyWithGrade : overallAverageGrade;
                            score -= Math.abs(newAvgGrade - overallAverageGrade) * 1.0;
                        }
                        const remainingCapacityAfterAssign = (table.capacity - (table.current_occupancy + 1));
                        score += remainingCapacityAfterAssign * 0.2;
                        if (balanceByGender && student.gender && (student.gender === 'male' || student.gender === 'female')) {
                            let tempMaleCount = table.current_male_count;
                            let tempFemaleCount = table.current_female_count;
                            if (student.gender === 'male') tempMaleCount++;
                            else if (student.gender === 'female') tempFemaleCount++;
                            const newTotalStudents = table.current_occupancy + 1;
                            if (newTotalStudents > 0) {
                                const genderDifference = Math.abs(tempMaleCount - tempFemaleCount);
                                score -= genderDifference * 0.5;
                                if (genderDifference <= 1 && newTotalStudents > 1) score += 0.3;
                            }
                        }
                        if (score > bestPrefScore) {
                            bestPrefScore = score;
                            bestPrefTable = table;
                        }
                    }
                    bestTableForStudent = bestPrefTable;
                }
                // Si no s'ha pogut assignar a una taula amb preferit, afegeix warning
                if (student.preferences.length > 0 && !foundTableWithPreference) {
                    warnings.push(`No s'ha pogut assignar l'alumne ${student.name} (ID ${student.id}) amb cap dels seus preferits.`);
                }
                // Si hi ha conflicte preferit-restricció, avisa
                if (foundRestrictionVsPreference) {
                    warnings.push(`L'alumne ${student.name} (ID ${student.id}) té una restricció amb un dels seus preferits. La restricció té prioritat.`);
                }
                if (bestTableForStudent) {
                    proposedAssignments.push({
                        studentId: student.id,
                        tableId: bestTableForStudent.id,
                        studentName: student.name,
                        tableName: bestTableForStudent.table_number
                    });

                    // Actualitzem l'estat de la taula seleccionada EN MEMÒRIA per a la propera iteració
                    bestTableForStudent.students_assigned.push(student);
                    bestTableForStudent.current_occupancy++;
                    if (!isNaN(student.academic_grade)) {
                        bestTableForStudent.current_sum_of_grades += student.academic_grade;
                         const validGradesCount = bestTableForStudent.students_assigned.filter(s=> !isNaN(s.academic_grade)).length;
                        bestTableForStudent.current_avg_grade = validGradesCount > 0 ? bestTableForStudent.current_sum_of_grades / validGradesCount : null;
                    }
                    if (student.gender === 'male') bestTableForStudent.current_male_count++;
                    else if (student.gender === 'female') bestTableForStudent.current_female_count++;
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