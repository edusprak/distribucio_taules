// frontend/src/components/students/DraggableStudentCard.js
import React from 'react'; // No cal useEffect aquí si no fem preview personalitzat avançat
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../utils/dndItemTypes'; //
import { useDragState } from '../../contexts/DragContext'; // Assegura't que el context existeix

// Funció per obtenir el color de fons basat en la nota acadèmica
const getGradeBackgroundColor = (academicGrade) => {
  if (academicGrade === null || academicGrade === undefined || isNaN(academicGrade)) {
    return 'white'; // Color per defecte si no hi ha nota
  }
  
  const grade = parseFloat(academicGrade);
  
  if (grade >= 0 && grade <= 3) {
    return '#e8f5e8';
  } else if (grade >= 4 && grade <= 7) {
    return '#fff9e6';
  } else if (grade >= 8 && grade <= 10) {
    return '#ffe6e6';
  }
  
  return 'white'; // Color per defecte per notes fora del rang
};

const getCardStyle = (isDragging, isRestricted, isBeingDraggedItself, academicGrade) => {
  let backgroundColor;
  
  if (isRestricted) {
    backgroundColor = '#ffe0e0'; // Manté el color de restricció
  } else if (isBeingDraggedItself) {
    backgroundColor = '#d0e0ff'; // Manté el color quan s'està arrossegant
  } else {
    backgroundColor = getGradeBackgroundColor(academicGrade); // Usar color basat en la nota
  }
    return {
    padding: '6px 8px',
    margin: '0',
    backgroundColor,
    border: `1px solid ${isRestricted ? 'red' : (isBeingDraggedItself ? 'blue' : '#ddd')}`,
    borderRadius: '4px',
    cursor: 'move',
    opacity: isDragging ? 0.4 : (isRestricted && !isBeingDraggedItself ? 0.6 : 1),
    fontSize: '0.8em',
    lineHeight: '1.2',
    boxShadow: isDragging ? '0 4px 8px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.1)',
    transition: 'background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease',
    minWidth: '80px',
    maxWidth: '140px',
    flexGrow: 1,
    flexShrink: 0,
    textAlign: 'center',
    wordWrap: 'break-word',
    hyphens: 'auto',
  };
};


function DraggableStudentCard({ student }) { 
    // student ara té { id, name, academic_grade, gender, restrictions, taula_plantilla_id (si està assignat), originalTableId (per al pool) }
    const { draggedStudentInfo, startDraggingStudent, stopDraggingStudent } = useDragState();

    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.STUDENT,
        item: () => {
            startDraggingStudent(student.id, student.restrictions || []);
            return { 
                id: student.id, 
                name: student.name, 
                academic_grade: student.academic_grade,
                gender: student.gender,
                restrictions: student.restrictions || [],
                // originalTableId ara és la taula_plantilla_id actual de l'alumne, o null si ve del pool
                originalTableId: student.taula_plantilla_id !== undefined ? student.taula_plantilla_id : student.originalTableId
            };
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
        end: (draggedItem, monitor) => {
            stopDraggingStudent();
            // La lògica de 'end' (per exemple, per gestionar drops fora de zones vàlides)
            // es gestiona principalment a ClassroomArrangementPage a través de onDropToPool.
            // No cal un 'onDragEnd' prop aquí si StudentPoolDropZone i DroppableTable gestionen el drop.
        },
    }), [student, startDraggingStudent, stopDraggingStudent]);

    let isRestrictedWithDragged = false;
    let isThisCardActuallyBeingDragged = false;

    if (draggedStudentInfo && draggedStudentInfo.id === student.id) {
        isThisCardActuallyBeingDragged = true;
    } else if (draggedStudentInfo && draggedStudentInfo.id !== student.id) {
        if (draggedStudentInfo.restrictions.includes(student.id)) {
            isRestrictedWithDragged = true;
        }
    }    return (
        <div ref={drag} style={getCardStyle(isDragging, isRestrictedWithDragged, isThisCardActuallyBeingDragged, student.academic_grade)}> 
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{student.name}</div>
            <div style={{ fontSize: '0.7em', opacity: 0.8 }}>
                {student.academic_grade !== null && student.academic_grade !== undefined ? parseFloat(student.academic_grade).toFixed(1) : 'N/A'}
            </div>
        </div>
    );
}

export default DraggableStudentCard;