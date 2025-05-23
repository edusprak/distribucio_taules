// frontend/src/components/tables/DroppableTable.js
import React from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../utils/dndItemTypes';
import DraggableStudentCard from '../students/DraggableStudentCard';

const tableStyle = (isOver, canDrop) => ({
  width: '220px',
  minHeight: '150px', // Una mica més d'alçada per fer lloc
  border: `2px dashed ${isOver && canDrop ? 'green' : (isOver && !canDrop ? 'red' : '#b0c4de')}`, // Canvia la vora si s'arrossega per sobre
  padding: '15px',
  backgroundColor: canDrop && isOver ? '#e6ffe6' : (isOver && !canDrop ? '#ffe6e6' : 'white'), // Canvia el fons
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  transition: 'background-color 0.2s ease, border-color 0.2s ease', // Transició suau
});

const tableHeaderStyle = {
  borderBottom: '1px solid #eee',
  paddingBottom: '8px',
  marginBottom: '10px',
  fontSize: '1.1em',
  fontWeight: 'bold',
  color: '#333',
  textAlign: 'center',
};

const studentInTableStyle = {
  fontSize: '0.9em',
  padding: '5px 8px',
  backgroundColor: '#f0f8ff',
  margin: '4px 0',
  borderRadius: '4px',
  border: '1px solid #dde',
};

const dropZoneInfoStyle = {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#777',
    marginTop: 'auto', // Per empènyer cap avall si la taula està buida
    paddingTop: '10px',
};


function DroppableTable({ table, onDropStudent, studentsInTable, onDragEndStudent}) { 
    
  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.STUDENT,
    canDrop: (draggedItem) => { // 'draggedItem' és l'objecte que definim a useDrag de DraggableStudentCard
      // draggedItem conté: { id, name, ..., restrictions: [...], originalTableId }

      // Condició 1: No moure dins de la mateixa taula (si originalTableId es refereix a la taula actual)
      // Aquesta lògica pot ser més complexa si l'alumne ja és a la taula i només es "reordena" (no implementat)
      if (draggedItem.originalTableId === table.id && draggedItem.id) { // Comprovem draggedItem.id per si de cas
          // Si l'alumne ja és a la taula (originalTableId és aquesta taula),
          // i l'arrosseguem i el deixem anar a la mateixa taula, no és un "drop" vàlid per a canvi d'assignació.
          // Això evita que onDropStudent es cridi innecessàriament.
          const isStudentCurrentlyInThisTable = studentsInTable?.some(s => s.id === draggedItem.id);
          if (isStudentCurrentlyInThisTable) return false; 
      }

      // Condició 2: Capacitat de la taula
      const isStudentAlreadyAccountedForInOccupancy = studentsInTable?.some(s => s.id === draggedItem.id);
      const currentOccupancy = studentsInTable?.length || 0;
      if (!isStudentAlreadyAccountedForInOccupancy && currentOccupancy >= table.capacity) {
        return false; // Taula plena i l'alumne no hi és
      }

      // Condició 3: Restriccions de l'alumne arrossegat amb els alumnes ja a la taula
      if (draggedItem.restrictions && draggedItem.restrictions.length > 0) {
        for (const studentInTable of (studentsInTable || [])) {
          if (studentInTable.id === draggedItem.id) continue; // No comparar amb si mateix si ja és a la taula
          if (draggedItem.restrictions.includes(studentInTable.id)) {
            return false; // Hi ha una restricció
          }
        }
      }

      // Condició 4: Restriccions dels alumnes de la taula amb l'alumne arrossegat
      // (Les restriccions són mútues, així que la Condició 3 hauria de ser suficient si tots els alumnes tenen les seves restriccions carregades)
      // Però per ser exhaustius o si les dades de restriccions no fossin perfectament simètriques:
      // for (const studentInTable of (studentsInTable || [])) {
      //   if (studentInTable.id === draggedItem.id) continue;
      //   if (studentInTable.restrictions && studentInTable.restrictions.includes(draggedItem.id)) {
      //     console.log(`[DroppableTable ${table.table_number}] CANNOT DROP: Student ${studentInTable.name} in table has restriction with ${draggedItem.name}`);
      //     return false;
      //   }
      // }

      return true; // Si passa totes les comprovacions
    },
    drop: (item) => {
      // Només crida a onDropStudent si l'alumne no està ja en aquesta taula
      // O si es mou des del pool (item.originalTableId és null)
      // O si es mou des d'una taula diferent (item.originalTableId !== table.id)
      if (item.originalTableId !== table.id) {
         onDropStudent(item.id, table.id, item.originalTableId); 
         // Passem originalTableId per saber d'on ve
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [table, studentsInTable, onDropStudent]); // Afegeix studentsInTable i onDropStudent a les dependències

  return (
    <div ref={drop} style={tableStyle(isOver, canDrop)}>
      <div style={tableHeaderStyle}>
        {table.table_number} ({studentsInTable?.length || 0}/{table.capacity})
      </div>
      {studentsInTable && studentsInTable.length > 0 ? (
        studentsInTable.map(student => (
        <DraggableStudentCard 
            key={student.id} 
            student={{...student, originalTableId: table.id }} 
            onDragEnd={onDragEndStudent}
        />
        ))
      ) : (
         !isOver && <p style={dropZoneInfoStyle}>Taula buida</p>
      )}
      {isOver && canDrop && <p style={dropZoneInfoStyle}>Deixa anar aquí per assignar</p>}
      {isOver && !canDrop && <p style={{...dropZoneInfoStyle, color: 'red'}}>Acció no permesa!</p>}
    </div>
  );
}

export default DroppableTable;
