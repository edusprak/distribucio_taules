// frontend/src/components/tables/DroppableTable.js
import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../utils/dndItemTypes'; //
import DraggableStudentCard from '../students/DraggableStudentCard'; //
import { useDragState } from '../../contexts/DragContext'; //

const tableStyle = (isOver, canDrop) => ({
  width: '420px',
  minWidth: '360px',
  maxWidth: '480px',
  minHeight: '150px',
  border: `2px dashed ${isOver && canDrop ? 'green' : (isOver && !canDrop ? 'red' : '#b0c4de')}`,
  padding: '15px',
  backgroundColor: canDrop && isOver ? '#e6ffe6' : (isOver && !canDrop ? '#ffe6e6' : 'white'),
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  transition: 'background-color 0.2s ease, border-color 0.2s ease',
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

const tableInfoStyle = {
  fontSize: '0.9em',
  color: '#555',
  textAlign: 'center',
  marginBottom: '8px',
};

const dropZoneInfoStyle = {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#777',
    marginTop: 'auto', // Per empènyer cap avall si la taula està buida
    paddingTop: '10px',
};

const sortButtonsContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '10px',
    borderBottom: '1px solid #eee',
    paddingBottom: '8px',
};

const sortButtonStyle = {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '0.8em',
    padding: '3px 6px',
    margin: '0 2px',
    borderRadius: '3px',
    transition: 'all 0.2s ease',
};

const activeSortButtonStyle = {
    ...sortButtonStyle,
    backgroundColor: '#e8f0fd',
    fontWeight: 'bold',
    border: '1px solid #b0c4de',
};

const studentsContainerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginTop: '8px',
    minHeight: '40px',
};

function DroppableTable({ table, studentsInTable, onDropStudent }) { 
    // table ara és: { id (id_taula_plantilla), table_number (identificador_taula_dins_plantilla), capacity }
    const { draggedStudentInfo } = useDragState();
    const [sortBy, setSortBy] = useState('name'); // Per defecte, ordenem per nom
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' o 'desc'

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
    }), [table, studentsInTable, onDropStudent, draggedStudentInfo]);    // Calcula la mitjana de les notes acadèmiques dels alumnes a aquesta taula
    const calculateAverageGrade = () => {
        if (!studentsInTable || studentsInTable.length === 0) return 'N/A';

        const validGrades = studentsInTable
            .map(student => parseFloat(student.academic_grade))
            .filter(grade => !isNaN(grade));
        
        if (validGrades.length === 0) return 'N/A';
        
        const average = validGrades.reduce((acc, grade) => acc + grade, 0) / validGrades.length;
        return average.toFixed(2);
    };

    // Calcula la distribució per gènere dels alumnes a aquesta taula
    const calculateGenderDistribution = () => {
        if (!studentsInTable || studentsInTable.length === 0) return 'Sense alumnes';

        const genderCounts = {
            male: 0,
            female: 0,
            other: 0,
            prefer_not_to_say: 0,
            null: 0 // Per casos on no hi ha gènere especificat
        };

        studentsInTable.forEach(student => {
            const gender = student.gender || null;
            if (genderCounts.hasOwnProperty(gender)) {
                genderCounts[gender]++;
            } else {
                genderCounts.null++;
            }
        });

        // Generar text compacte només amb els gèneres presents
        const genderTexts = [];
        if (genderCounts.male > 0) genderTexts.push(`♂${genderCounts.male}`);
        if (genderCounts.female > 0) genderTexts.push(`♀${genderCounts.female}`);
        if (genderCounts.other > 0) genderTexts.push(`⚬${genderCounts.other}`);
        if (genderCounts.prefer_not_to_say > 0) genderTexts.push(`-${genderCounts.prefer_not_to_say}`);
        if (genderCounts.null > 0) genderTexts.push(`?${genderCounts.null}`);

        return genderTexts.length > 0 ? genderTexts.join(' ') : 'Sense dades';
    };

    // Ordenar els estudiants
    const sortStudents = (students) => {
        if (!students || students.length === 0) return [];
        
        const sortedStudents = [...students].sort((a, b) => {
            if (sortBy === 'name') {
                return sortOrder === 'asc' 
                    ? a.name.localeCompare(b.name) 
                    : b.name.localeCompare(a.name);
            } else if (sortBy === 'academic_grade') {
                const gradeA = parseFloat(a.academic_grade) || 0;
                const gradeB = parseFloat(b.academic_grade) || 0;
                return sortOrder === 'asc' ? gradeA - gradeB : gradeB - gradeA;
            } else if (sortBy === 'gender') {
                return sortOrder === 'asc' 
                    ? (a.gender || '').localeCompare(b.gender || '') 
                    : (b.gender || '').localeCompare(a.gender || '');
            }
            return 0;
        });
        
        return sortedStudents;
    };

    // Canviar ordre de classificació
    const handleSortClick = (attribute) => {
        if (sortBy === attribute) {
            // Si ja estem ordenant per aquest atribut, canviem la direcció
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            // Si estem ordenant per un nou atribut, establim aquest i comencem per ordre ascendent
            setSortBy(attribute);
            setSortOrder('asc');
        }
    };    const averageGrade = calculateAverageGrade();
    const genderDistribution = calculateGenderDistribution();
    const sortedStudents = sortStudents(studentsInTable);

    // Estil per al botó seleccionat
    const getSortButtonStyle = (attribute) => {
        return attribute === sortBy ? activeSortButtonStyle : sortButtonStyle;
    };

    // Fletxa indicadora de la direcció de l'ordre
    const getSortArrow = (attribute) => {
        if (attribute === sortBy) {
            return sortOrder === 'asc' ? '↑' : '↓';
        }
        return '';
    };

    return (
        <div ref={drop} style={tableStyle(isOver, canDrop)}>            <div style={tableHeaderStyle}>
                {table.table_number} ({studentsInTable?.length || 0}/{table.capacity})
            </div>
            <div style={tableInfoStyle}>
                Nota mitjana: {averageGrade}
            </div>
            <div style={tableInfoStyle}>
                Gènere: {genderDistribution}
            </div>
            
            {/* Botons d'ordenació */}
            {studentsInTable && studentsInTable.length > 1 && (
                <div style={sortButtonsContainerStyle}>
                    <button 
                        style={getSortButtonStyle('name')} 
                        onClick={() => handleSortClick('name')}
                        title="Ordenar per nom"
                    >
                        Nom {getSortArrow('name')}
                    </button>
                    <button 
                        style={getSortButtonStyle('academic_grade')} 
                        onClick={() => handleSortClick('academic_grade')}
                        title="Ordenar per nota"
                    >
                        Nota {getSortArrow('academic_grade')}
                    </button>
                    <button 
                        style={getSortButtonStyle('gender')} 
                        onClick={() => handleSortClick('gender')}
                        title="Ordenar per gènere"
                    >
                        Gènere {getSortArrow('gender')}
                    </button>
                </div>            )}
            
            {sortedStudents && sortedStudents.length > 0 ? (
                <div style={studentsContainerStyle}>
                    {sortedStudents.map(student => (
                        <DraggableStudentCard 
                            key={student.id} 
                            student={{ ...student, originalTableId: table.id }}
                        />
                    ))}
                </div>            ) : (
                <div style={{ ...studentsContainerStyle, justifyContent: 'center', alignItems: 'center' }}>
                    {!isOver && <p style={dropZoneInfoStyle}>Taula buida</p>}
                </div>
            )}
            {isOver && canDrop && <p style={dropZoneInfoStyle}>Deixa anar aquí per assignar</p>}
            {isOver && !canDrop && <p style={{...dropZoneInfoStyle, color: 'red'}}>Acció no permesa!</p>}
        </div>
    );
}

export default DroppableTable;