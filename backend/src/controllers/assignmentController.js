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
            // Important: el frontend haurà d'enviar table_id com a id_taula_plantilla si ja està assignat en la distribució actual
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


        let studentsToAssign = allStudents.filter(s => s.current_table_id == null);
        studentsToAssign.sort((a, b) => (b.academic_grade ?? -Infinity) - (a.academic_grade ?? -Infinity));

        const proposedAssignments = [];
        const studentsWithValidGrades = allStudents.filter(s => !isNaN(s.academic_grade));
        const overallAverageGrade = studentsWithValidGrades.length > 0
            ? studentsWithValidGrades.reduce((sum, s) => sum + s.academic_grade, 0) / studentsWithValidGrades.length
            : null;

        // 4. Algorisme Greedy (similar a l'anterior, però amb `tablesFromPlantilla`)
        for (const student of studentsToAssign) {
            let bestTableForStudent = null;
            let bestTableScore = -Infinity;

            for (const table of tablesFromPlantilla) {
                if (table.current_occupancy >= table.capacity) continue;

                let hasRestrictionConflict = false;
                if (student.restrictions.length > 0) {
                    for (const assignedStudent of table.students_assigned) {
                        if (student.restrictions.includes(assignedStudent.id)) {
                            hasRestrictionConflict = true;
                            break;
                        }
                    }
                }
                if (hasRestrictionConflict) continue;

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

            if (bestTableForStudent) {
                proposedAssignments.push({
                    studentId: student.id,
                    tableId: bestTableForStudent.id, // Aquest és id_taula_plantilla
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

        res.json({ success: true, proposedAssignments });

    } catch (error) {
        console.error('[AutoAssign] Error en auto-assignació:', error);
        res.status(500).json({ success: false, message: 'Error intern del servidor en l\'auto-assignació.', error: error.message });
    }
};

module.exports = {
  autoAssignStudents,
};