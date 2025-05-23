// backend/src/controllers/assignmentController.js
const db = require('../db'); // Encara que no l'usem directament per a l'estat inicial en aquesta versió

const autoAssignStudents = async (req, res) => {
  // Rebem l'estat actual del frontend i l'opció d'equilibri de gènere
  const { students: studentsFromFrontend, tables: tablesFromFrontend, balanceByGender } = req.body;

  // Logs inicials per depuració
  console.log("[AutoAssign V3.2 DEBUG] Inici de l'auto-assignació.");
  console.log("[AutoAssign V3.2 DEBUG] Opció 'balanceByGender' rebuda:", balanceByGender);
  console.log("[AutoAssign V3.2 DEBUG] Nombre d'alumnes rebuts:", studentsFromFrontend?.length);
  console.log("[AutoAssign V3.2 DEBUG] Nombre de taules rebudes:", tablesFromFrontend?.length);

  if (!studentsFromFrontend || !Array.isArray(studentsFromFrontend) || 
      !tablesFromFrontend || !Array.isArray(tablesFromFrontend)) {
    console.error("[AutoAssign V3.2 ERROR] Dades d'entrada invàlides.");
    return res.status(400).json({
      success: false,
      message: "Les dades dels alumnes o les taules no s'han proporcionat correctament."
    });
  }

  try {
    // 1. Preparar les dades dels alumnes
    const allStudents = studentsFromFrontend.map((s, index) => {
      const grade = parseFloat(s.academic_grade);
      if (s.id === undefined || s.name === undefined) {
        console.warn(`[AutoAssign V3.2 WARN] Alumne a l'índex ${index} no té id o nom:`, s);
      }
      return {
        id: s.id,
        name: s.name || `Alumne Desconegut ${index}`,
        academic_grade: !isNaN(grade) ? grade : null,
        gender: s.gender || 'unknown', // Gènere per defecte si no es proporciona
        restrictions: Array.isArray(s.restrictions) ? s.restrictions : [],
        table_id: s.table_id === undefined ? null : s.table_id,
      };
    });

    // 2. Preparar les dades de les taules i calcular l'estat inicial
    let availableTables = tablesFromFrontend.map(t_fe => {
      const studentsCurrentlyAssigned = allStudents.filter(s => s.table_id === t_fe.id);
      let sumOfGrades = 0;
      let maleCount = 0;
      let femaleCount = 0;

      studentsCurrentlyAssigned.forEach(s => {
        if (s.academic_grade !== null) sumOfGrades += s.academic_grade;
        if (s.gender === 'male') maleCount++;
        else if (s.gender === 'female') femaleCount++;
      });
      
      const currentOccupancy = studentsCurrentlyAssigned.length;
      const validGradesCount = studentsCurrentlyAssigned.filter(s => s.academic_grade !== null).length;

      return {
        id: t_fe.id,
        capacity: parseInt(t_fe.capacity, 10) || 0,
        table_number: t_fe.table_number,
        students_assigned: studentsCurrentlyAssigned.map(s => ({ // Només la info rellevant
            id: s.id, name: s.name, academic_grade: s.academic_grade,
            gender: s.gender, restrictions: s.restrictions
        })),
        current_occupancy: currentOccupancy,
        current_sum_of_grades: sumOfGrades,
        current_avg_grade: validGradesCount > 0 ? sumOfGrades / validGradesCount : null,
        current_male_count: maleCount,
        current_female_count: femaleCount,
      };
    });

    // 3. Identificar alumnes a assignar
    let studentsToAssign = allStudents.filter(s => s.table_id == null);
    studentsToAssign.sort((a, b) => (b.academic_grade ?? -Infinity) - (a.academic_grade ?? -Infinity)); // Nota més alta primer, nulls al final
    
    console.log(`[AutoAssign V3.2] Alumnes per assignar (després de filtrar i ordenar): ${studentsToAssign.length}`);
    const proposedAssignments = [];

    // Calcular la nota mitjana general dels alumnes (amb nota vàlida)
    const studentsWithValidGrades = allStudents.filter(s => s.academic_grade !== null);
    const overallAverageGrade = studentsWithValidGrades.length > 0
        ? studentsWithValidGrades.reduce((sum, s) => sum + s.academic_grade, 0) / studentsWithValidGrades.length
        : null;
    console.log(`[AutoAssign V3.2] Nota mitjana general (alumnes amb nota): ${overallAverageGrade?.toFixed(2) ?? "N/A"}`);

    // 4. Algorisme Greedy d'Assignació
    for (const student of studentsToAssign) {
      if (student.id === undefined) {
        console.warn("[AutoAssign V3.2 WARN] S'està saltant un alumne sense ID:", student);
        continue;
      }

      let bestTableForStudent = null;
      let bestTableScore = -Infinity; // Volem maximitzar aquesta puntuació

      // No reordenem 'availableTables' dins del bucle d'alumnes, avaluem totes les opcions
      for (const table of availableTables) {
        // Comprovació de capacitat
        if (table.current_occupancy >= table.capacity) {
          continue; // Taula plena
        }

        // Comprovació de restriccions de l'alumne amb els ja assignats a la taula
        let hasRestrictionConflict = false;
        if (student.restrictions.length > 0) {
          for (const assignedStudent of table.students_assigned) {
            if (student.restrictions.includes(assignedStudent.id)) {
              hasRestrictionConflict = true;
              break;
            }
          }
        }
        if (hasRestrictionConflict) {
          console.log(`[AutoAssign V3.2 DEBUG] Restricció impedeix ${student.name} a taula ${table.table_number}`);
          continue; // Conflicte de restricció
        }

        // Si arriba aquí, l'alumne es pot posar a la taula. Calculem la puntuació.
        let currentScore = 0;
        const studentGrade = student.academic_grade;

        // a. Factor d'equilibri de notes
        if (overallAverageGrade !== null && studentGrade !== null) {
          const newSumGrades = table.current_sum_of_grades + studentGrade;
          const newOccupancyWithGrade = table.students_assigned.filter(s=>s.academic_grade !== null).length + 1;
          const newAvgGrade = newOccupancyWithGrade > 0 ? newSumGrades / newOccupancyWithGrade : overallAverageGrade; // Evita divisió per 0
          currentScore -= Math.abs(newAvgGrade - overallAverageGrade) * 1.0; // Penalització per desviació (pes 1.0)
        }

        // b. Factor per places lliures restants (afavoreix omplir però no saturar una sola taula ràpidament)
        // Un valor més alt de 'places lliures després d'assignar' és millor.
        const remainingCapacityAfterAssign = (table.capacity - (table.current_occupancy + 1));
        currentScore += remainingCapacityAfterAssign * 0.2; // Bonus per espai (pes 0.2)

        // c. Factor d'equilibri de gènere (si està actiu)
        if (balanceByGender && student.gender && (student.gender === 'male' || student.gender === 'female')) {
          let tempMaleCount = table.current_male_count;
          let tempFemaleCount = table.current_female_count;
          if (student.gender === 'male') tempMaleCount++;
          else if (student.gender === 'female') tempFemaleCount++;
          
          const newTotalStudents = table.current_occupancy + 1;
          if (newTotalStudents > 0) {
            // Penalitzar la diferència de proporcions respecte a 0.5, o la diferència absoluta
            const genderDifference = Math.abs(tempMaleCount - tempFemaleCount);
            currentScore -= genderDifference * 0.5; // Penalització per desequilibri (pes 0.5)
            if (genderDifference <= 1 && newTotalStudents > 1) currentScore += 0.3; // Bonus per bon equilibri
          }
        }
        
        console.log(`[AutoAssign V3.2 DEBUG] Alumne ${student.name} a Taula ${table.table_number}: Score = ${currentScore.toFixed(2)}`);

        if (currentScore > bestTableScore) {
          bestTableScore = currentScore;
          bestTableForStudent = table;
        }
      } // Fi del bucle de taules

      if (bestTableForStudent) {
        const studentDataForUpdate = {
            id: student.id, name: student.name, academic_grade: student.academic_grade,
            gender: student.gender, restrictions: student.restrictions
        };

        proposedAssignments.push({ 
          studentId: student.id, tableId: bestTableForStudent.id, 
          studentName: student.name, tableName: bestTableForStudent.table_number 
        });
        
        // Actualitzem l'estat de la taula seleccionada EN MEMÒRIA
        const tableIndex = availableTables.findIndex(t => t.id === bestTableForStudent.id);
        if (tableIndex !== -1) {
            availableTables[tableIndex].students_assigned.push(studentDataForUpdate);
            availableTables[tableIndex].current_occupancy++;
            if (student.academic_grade !== null) {
              availableTables[tableIndex].current_sum_of_grades += student.academic_grade;
            }
            const newValidGradesCount = availableTables[tableIndex].students_assigned.filter(s=>s.academic_grade !== null).length;
            availableTables[tableIndex].current_avg_grade = newValidGradesCount > 0 
                ? availableTables[tableIndex].current_sum_of_grades / newValidGradesCount 
                : null;

            if (student.gender === 'male') availableTables[tableIndex].current_male_count++;
            else if (student.gender === 'female') availableTables[tableIndex].current_female_count++;
            
            console.log(`[AutoAssign V3.2] Proposta: ${student.name} (Nota ${student.academic_grade?.toFixed(2) ?? "N/A"}, Gènere ${student.gender}) a Taula ${bestTableForStudent.table_number} (Nova mitjana aprox ${availableTables[tableIndex].current_avg_grade?.toFixed(2) ?? "N/A"}, Homes: ${availableTables[tableIndex].current_male_count}, Dones: ${availableTables[tableIndex].current_female_count})`);
        }
      } else {
        console.log(`[AutoAssign V3.2] No s'ha trobat taula adient per a ${student.name} (ID ${student.id})`);
      }
    } // Fi del bucle d'alumnes

    console.log('[AutoAssign V3.2] Assignacions proposades finals:', proposedAssignments);
    res.json({ success: true, proposedAssignments });

  } catch (error) {
    console.error('[AutoAssign V3.2] Error general en auto-assignació:', error);
    res.status(500).json({ success: false, message: 'Error intern del servidor en l\'auto-assignació.', error: error.message });
  }
};

module.exports = {
  autoAssignStudents,
};