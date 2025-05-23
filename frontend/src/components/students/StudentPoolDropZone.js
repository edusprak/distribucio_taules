// frontend/src/components/students/StudentPoolDropZone.js
import React from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../utils/dndItemTypes'; //

const poolDropZoneBaseStyle = {
  width: '100%', 
  flexGrow: 1, 
  padding: '10px',
  border: '2px dashed #ccc', // Vora per defecte
  borderRadius: '4px',
  display: 'flex',
  flexDirection: 'column',
  transition: 'background-color 0.2s ease, border-color 0.2s ease',
};

const poolDropZoneActiveStyle = (isOver, canDrop) => ({
  ...poolDropZoneBaseStyle,
  borderColor: isOver && canDrop ? 'green' : (isOver && !canDrop ? 'red' : '#ccc'),
  backgroundColor: isOver && canDrop ? '#e6ffe6' : (isOver && !canDrop ? '#ffebeb' : 'transparent'),
});

const poolHeaderStyle = {
    textAlign: 'center',
    marginTop: 0,
    marginBottom: '15px',
    borderBottom: '1px solid #ddd',
    paddingBottom: '10px'
};

const dropInfoStyle = {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#777',
    marginTop: 'auto', // Per empènyer cap avall si la zona està buida de fills
    paddingTop: '10px',
};

function StudentPoolDropZone({ onDropToPool, children, unassignedStudentsCount }) {
  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.STUDENT, //
    canDrop: (item) => {
      // Només es pot deixar anar si l'alumne prové d'una taula
      // (item.originalTableId no és null o undefined)
      return item.originalTableId != null; // Compara amb null o undefined
    },
    drop: (item) => {
      // Si l'alumne prové d'una taula, crida a la funció per desassignar-lo.
      // 'item' conté { id, name, ..., originalTableId } que vam definir a DraggableStudentCard
      if (item.originalTableId != null) { // Compara amb null o undefined
        onDropToPool(item.id, item.originalTableId);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [onDropToPool]); // Dependència per si la funció onDropToPool canvia

  return (
    <div ref={drop} style={poolDropZoneActiveStyle(isOver, canDrop)}>
      <h3 style={poolHeaderStyle}>
        Alumnes no assignats ({unassignedStudentsCount})
      </h3>
      {children} {/* Aquí es renderitzaran els DraggableStudentCard del pool */}
      {isOver && canDrop && <p style={dropInfoStyle}>Deixa anar aquí per desassignar</p>}
      {isOver && !canDrop && <p style={{...dropInfoStyle, color: 'red'}}>Només alumnes de taules</p>}
    </div>
  );
}

export default StudentPoolDropZone;