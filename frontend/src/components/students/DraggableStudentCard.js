// frontend/src/components/students/DraggableStudentCard.js
import React from 'react'; // No cal useEffect aquí si no fem preview personalitzat avançat
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../utils/dndItemTypes'; //
import { useDragState } from '../../contexts/DragContext'; // Assegura't que el context existeix

const getCardStyle = (isDragging, isRestricted, isBeingDraggedItself) => ({ // He canviat el nom del tercer paràmetre per claredat
  padding: '8px 12px',
  margin: '5px 0',
  backgroundColor: isRestricted ? '#ffe0e0' : (isBeingDraggedItself ? '#d0e0ff' :'white'),
  border: `1px solid ${isRestricted ? 'red' : (isBeingDraggedItself ? 'blue' : '#ddd')}`,
  borderRadius: '4px',
  cursor: 'move',
  opacity: isDragging ? 0.4 : (isRestricted && !isBeingDraggedItself ? 0.6 : 1),
  fontSize: '0.9em',
  boxShadow: isDragging ? '0 4px 8px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.1)',
  transition: 'background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease',
});


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
    }

    return (
        <div ref={drag} style={getCardStyle(isDragging, isRestrictedWithDragged, isThisCardActuallyBeingDragged)}> 
            {student.name} (Nota: {student.academic_grade !== null && student.academic_grade !== undefined ? parseFloat(student.academic_grade).toFixed(2) : 'N/A'})
        </div>
    );
}

export default DraggableStudentCard;