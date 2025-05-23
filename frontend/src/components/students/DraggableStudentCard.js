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

function DraggableStudentCard({ student, onDragEnd }) { 
  const { draggedStudentInfo, startDraggingStudent, stopDraggingStudent } = useDragState();

  const [{ isDragging }, drag] = useDrag(() => ({ // preview es pot ometre si no fas previsualització personalitzada
    type: ItemTypes.STUDENT, //
    // 'item' ara és una funció que s'executa quan comença l'arrossegament
    item: () => {
      // Lògica que abans estava a 'begin'
      console.log(`[DragContext] Start dragging (from item function): ${student.name}, Restrictions:`, student.restrictions);
      startDraggingStudent(student.id, student.restrictions || []);

      // Retorna l'objecte que representa l'element arrossegat
      return { 
          id: student.id, 
          name: student.name, 
          academic_grade: student.academic_grade,
          gender: student.gender,
          restrictions: student.restrictions || [],
          originalTableId: student.originalTableId || student.table_id || null 
      };
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    // La funció 'end' es manté igual, però rep l' 'item' retornat per la funció item()
    end: (draggedItem, monitor) => { // 'draggedItem' és l'objecte que has retornat a la funció item()
      console.log(`[DragContext] Stop dragging: ${draggedItem.name}`);
      stopDraggingStudent();

      const didDrop = monitor.didDrop();
      // Important: utilitza draggedItem.originalTableId i draggedItem.id
      if (!didDrop && draggedItem.originalTableId !== null) {
        console.log(`[DraggableStudentCard END] Attempting to UNASSIGN student ${draggedItem.id} from table ${draggedItem.originalTableId}`);
        if (onDragEnd) {
          onDragEnd(draggedItem.id, draggedItem.originalTableId);
        } else {
          console.warn('[DraggableStudentCard END] onDragEnd prop is NOT defined for student:', draggedItem.name);
        }
      } else if (didDrop) {
        console.log(`[DraggableStudentCard END] Student ${draggedItem.id} was dropped on a valid target.`);
      } else if (draggedItem.originalTableId === null) {
        console.log(`[DraggableStudentCard END] Student ${draggedItem.id} came from the pool and was not dropped on a valid target.`);
      }
    },
  }), [student, onDragEnd, startDraggingStudent, stopDraggingStudent]); // Manté les dependències

  let isRestrictedWithDragged = false;
  let isThisCardActuallyBeingDragged = false; // Per diferenciar de 'isDragging' del hook que afecta l'opacitat

  if (draggedStudentInfo && draggedStudentInfo.id === student.id) {
      isThisCardActuallyBeingDragged = true; // Aquesta és la targeta que s'està arrossegant
  } else if (draggedStudentInfo && draggedStudentInfo.id !== student.id) {
    // Un altre alumne s'està arrossegant, comprovem si aquesta targeta és una restricció
    if (draggedStudentInfo.restrictions.includes(student.id)) {
      isRestrictedWithDragged = true;
    }
  }

  return (
    <div ref={drag} style={getCardStyle(isDragging, isRestrictedWithDragged, isThisCardActuallyBeingDragged)}> 
      {student.name} (Nota: {parseFloat(student.academic_grade).toFixed(2)})
    </div>
  );
}

export default DraggableStudentCard;