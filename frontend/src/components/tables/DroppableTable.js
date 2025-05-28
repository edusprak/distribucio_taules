// frontend/src/components/tables/DroppableTable.js
import React from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../utils/dndItemTypes'; //
import DraggableStudentCard from '../students/DraggableStudentCard'; //
import { useDragState } from '../../contexts/DragContext'; //

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

const dropZoneInfoStyle = {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#777',
    marginTop: 'auto', // Per empènyer cap avall si la taula està buida
    paddingTop: '10px',
};




function DroppableTable({ table, studentsInTable, onDropStudent }) { 
    // table ara és: { id (id_taula_plantilla), table_number (identificador_taula_dins_plantilla), capacity }
    const { draggedStudentInfo } = useDragState();

    const [{ canDrop, isOver }, drop] = useDrop(() => ({
        accept: ItemTypes.STUDENT,
        canDrop: (draggedItem) => { // draggedItem és l'item de DraggableStudentCard
            if (!draggedStudentInfo) return false; // Si no hi ha info del context, no es pot deixar anar

            // Condició 1: No moure dins de la mateixa taula
            if (draggedItem.originalTableId === table.id) { // originalTableId és taula_plantilla_id o null
                const isStudentCurrentlyInThisTable = studentsInTable?.some(s => s.id === draggedItem.id);
                if (isStudentCurrentlyInThisTable) return false;
            }

            // Condició 2: Capacitat de la taula
            const isStudentAlreadyInTable = studentsInTable?.some(s => s.id === draggedItem.id);
            const currentOccupancy = studentsInTable?.length || 0;
            if (!isStudentAlreadyInTable && currentOccupancy >= table.capacity) {
                return false;
            }

            // Condició 3: Restriccions de l'alumne arrossegat amb els alumnes ja a la taula
            // draggedStudentInfo.restrictions són els de l'alumne que s'arrossega
            if (draggedStudentInfo.restrictions && draggedStudentInfo.restrictions.length > 0) {
                for (const studentInThisTable of (studentsInTable || [])) {
                    if (studentInThisTable.id === draggedStudentInfo.id) continue; 
                    if (draggedStudentInfo.restrictions.includes(studentInThisTable.id)) {
                        return false; // Conflicte de restricció
                    }
                }
            }
            return true;
        },
        drop: (item) => { // item és l'objecte de DraggableStudentCard
            if (item.originalTableId !== table.id) { // originalTableId és l'anterior taula_plantilla_id
                onDropStudent(item.id, table.id, item.originalTableId);
            }
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    }), [table, studentsInTable, onDropStudent, draggedStudentInfo]);

    return (
        <div ref={drop} style={tableStyle(isOver, canDrop)}>
            <div style={tableHeaderStyle}>
                {table.table_number} ({studentsInTable?.length || 0}/{table.capacity})
            </div>
            {studentsInTable && studentsInTable.length > 0 ? (
                studentsInTable.map(student => (
                    <DraggableStudentCard 
                        key={student.id} 
                        student={{ ...student, originalTableId: table.id }} // Passem l'ID actual de la taula de plantilla
                        // onDragEnd es gestiona a ClassroomArrangementPage o StudentPoolDropZone
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