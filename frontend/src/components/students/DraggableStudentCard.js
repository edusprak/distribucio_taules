// frontend/src/components/students/DraggableStudentCard.js
import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../utils/dndItemTypes'; //
import { useDragState } from '../../contexts/DragContext'; // Assegura't que el context existeix

// Funció per obtenir el color de fons basat en la nota segons el criteri seleccionat
const getGradeBackgroundColor = (student, gradeAssignmentCriteria) => {
  let effectiveGrade = null;
  
  if (gradeAssignmentCriteria === 'academic') {
    effectiveGrade = parseFloat(student.academic_grade);
  } else if (gradeAssignmentCriteria === 'attitude') {
    effectiveGrade = parseFloat(student.attitude_grade);
  } else if (gradeAssignmentCriteria === 'average') {
    const academicGrade = parseFloat(student.academic_grade);
    const attitudeGrade = parseFloat(student.attitude_grade);
    if (!isNaN(academicGrade) && !isNaN(attitudeGrade)) {
      effectiveGrade = (academicGrade + attitudeGrade) / 2;
    }
  }
  
  if (effectiveGrade === null || effectiveGrade === undefined || isNaN(effectiveGrade)) {
    return 'white'; // Color per defecte si no hi ha nota
  }
  
  if (effectiveGrade >= 0 && effectiveGrade < 4) {
    return '#ffe6e6'; // Vermell suau per notes baixes
  } else if (effectiveGrade >= 4 && effectiveGrade < 8) {
    return '#fff9e6'; // Groc suau per notes mitjanes
  } else if (effectiveGrade >= 8 && effectiveGrade <= 10) {
    return '#e8f5e8'; // Verd suau per notes altes
  }
  
  return 'white'; // Color per defecte per notes fora del rang
};

const getCardStyle = (isDragging, isRestricted, isBeingDraggedItself, student, hasUnsatisfiedPreferences, gradeAssignmentCriteria) => {
  let backgroundColor;
  
  if (isRestricted) {
    backgroundColor = '#ffe0e0'; // Manté el color de restricció
  } else if (isBeingDraggedItself) {
    backgroundColor = '#d0e0ff'; // Manté el color quan s'està arrossegant
  } else {
    backgroundColor = getGradeBackgroundColor(student, gradeAssignmentCriteria); // Usar color basat en el criteri seleccionat
  }
  // Determinar color i gruix de la vora
  let borderColor, borderWidth;
  if (isRestricted) {
    borderColor = 'red';
    borderWidth = '1px';
  } else if (isBeingDraggedItself) {
    borderColor = 'blue';
    borderWidth = '1px';
  } else {
    borderColor = '#ddd';
    borderWidth = '1px';
  }

  // Si té preferències no satisfetes, fer la vora més gruixuda i més fosca
  if (hasUnsatisfiedPreferences) {
    borderWidth = '3px';
    // Mantenir el color específic si és restricció o drag, sinó posar gris fosc
    if (!isRestricted && !isBeingDraggedItself) {
      borderColor = '#666';
    }
  }

    return {
    padding: '6px 8px',
    margin: '0',
    backgroundColor,
    border: `${borderWidth} solid ${borderColor}`,
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
    hyphens: 'auto',  };
};

// Estils per al modal
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10000,
  backdropFilter: 'blur(3px)'
};

const modalContentStyle = {
  backgroundColor: 'white',
  borderRadius: '16px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)',
  maxWidth: '550px',
  width: '90%',
  maxHeight: '85vh',
  overflow: 'hidden',
  animation: 'modalSlideIn 0.3s ease-out',

  border: '1px solid #e0e7ff',
  display: 'flex',
  flexDirection: 'column'
};

const modalHeaderStyle = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: 'none',
  flexShrink: 0
};

const closeButtonStyle = {
  background: 'rgba(255, 255, 255, 0.2)',
  border: 'none',
  borderRadius: '50%',
  fontSize: '20px',
  cursor: 'pointer',
  color: 'white',
  padding: '0',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s ease',
  ':hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.3)'
  }
};

const modalBodyStyle = {
  padding: '24px',
  background: '#fafbff',
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden'
};

const sectionStyle = {
  marginBottom: '20px',
  lineHeight: '1.5',
  backgroundColor: 'white',
  padding: '16px',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  border: '1px solid #f0f4f8'
};

const sectionTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '8px',
  fontSize: '14px'
};

const listStyle = {
  margin: '8px 0',
  paddingLeft: '0',
  listStyle: 'none'
};

const listItemStyle = {
  padding: '6px 12px',
  margin: '4px 0',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '13px',
  color: '#475569'
};

const emptyStateStyle = {
  fontStyle: 'italic',
  color: '#9ca3af',
  fontSize: '13px',
  padding: '8px 12px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  border: '1px dashed #d1d5db'
};

const gradeStyle = {
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: '20px',
  fontWeight: '600',
  fontSize: '13px'
};

// Funció per obtenir estil de la nota
const getGradeStyle = (grade) => {
  const baseStyle = { ...gradeStyle };
  if (grade >= 8) {
    return { ...baseStyle, backgroundColor: '#fee2e2', color: '#dc2626' };
  } else if (grade >= 4) {
    return { ...baseStyle, backgroundColor: '#fef3c7', color: '#d97706' };
  } else if (grade >= 0) {
    return { ...baseStyle, backgroundColor: '#dcfce7', color: '#16a34a' };
  }
  return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#6b7280' };
};


function DraggableStudentCard({ student, studentsInSameTable, allStudents, gradeAssignmentCriteria = 'academic' }) { 
    // student ara té { id, name, academic_grade, attitude_grade, gender, restrictions, preferences, taula_plantilla_id (si està assignat), originalTableId (per al pool) }
    const { draggedStudentInfo, startDraggingStudent, stopDraggingStudent } = useDragState();
    const [showModal, setShowModal] = useState(false);

    // Determinar si l'alumne té preferències no satisfetes
    const hasUnsatisfiedPreferences = () => {
        // Només per alumnes assignats a una taula
        if (!student.taula_plantilla_id) return false;
        
        // Només si l'alumne té preferències
        if (!student.preferences || student.preferences.length === 0) return false;
        
        // Comprovar si cap de les seves preferències està a la mateixa taula
        const teammateIds = (studentsInSameTable || []).map(s => s.id);
        const hasSatisfiedPreference = student.preferences.some(prefId => teammateIds.includes(prefId));
          return !hasSatisfiedPreference;
    };

    // Gestionar el clic per mostrar informació
    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowModal(true);
    };

    // Tancar modal
    const closeModal = () => {
        setShowModal(false);
    };    // Obtenir noms dels alumnes des dels IDs
    const getStudentNames = (studentIds) => {
        if (!studentIds || !allStudents) return [];
        return studentIds.map(id => {
            const student = allStudents.find(s => s.id === id);
            return student ? student.name : `ID: ${id}`;
        });
    };    // Determinar quines preferències estan satisfetes (companys de taula)
    const getSatisfiedPreferences = () => {
        if (!student.preferences || !studentsInSameTable) return [];
        const teammateIds = studentsInSameTable.map(s => s.id);
        return student.preferences.filter(prefId => teammateIds.includes(prefId));
    };    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.STUDENT,
        item: () => {
            startDraggingStudent(student.id, student.restrictions || []);            return { 
                id: student.id, 
                name: student.name, 
                academic_grade: student.academic_grade,
                attitude_grade: student.attitude_grade,
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
        <>
            {/* Estils CSS per a l'animació */}            <style>
                {`
                    @keyframes modalSlideIn {
                        from {
                            opacity: 0;
                            transform: scale(0.9) translateY(-20px);
                        }
                        to {
                            opacity: 1;
                            transform: scale(1) translateY(0);
                        }
                    }
                    
                    /* Estils personalitzats per la barra de scroll */
                    .modal-body-scroll::-webkit-scrollbar {
                        width: 8px;
                    }
                    
                    .modal-body-scroll::-webkit-scrollbar-track {
                        background: #f1f1f1;
                        border-radius: 4px;
                    }
                    
                    .modal-body-scroll::-webkit-scrollbar-thumb {
                        background: #667eea;
                        border-radius: 4px;
                    }
                    
                    .modal-body-scroll::-webkit-scrollbar-thumb:hover {
                        background: #5a6fd8;
                    }
                `}
            </style>
              <div 
                ref={drag} 
                style={getCardStyle(isDragging, isRestrictedWithDragged, isThisCardActuallyBeingDragged, student, hasUnsatisfiedPreferences(), gradeAssignmentCriteria)}
                onClick={handleClick}
            >
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{student.name}</div>
                <div style={{ fontSize: '0.65em', opacity: 0.8, lineHeight: '1.1' }}>
                    <div>A: {student.academic_grade !== null && student.academic_grade !== undefined ? parseFloat(student.academic_grade).toFixed(1) : 'N/A'}</div>
                    <div>Act: {student.attitude_grade !== null && student.attitude_grade !== undefined ? parseFloat(student.attitude_grade).toFixed(1) : 'N/A'}</div>
                </div>
            </div>{/* Modal d'informació */}
            {showModal && (
                <div style={modalOverlayStyle} onClick={closeModal}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={modalHeaderStyle}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>{student.name}</h3>
                                <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
                                    Informació de l'alumne
                                </div>
                            </div>
                            <button 
                                style={closeButtonStyle} 
                                onClick={closeModal}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                            >
                                ×
                            </button>
                        </div>                        <div style={modalBodyStyle} className="modal-body-scroll">
                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>
                                    <span style={{ fontSize: '16px' }}>📊</span>
                                    <span>Nota acadèmica</span>
                                </div>
                                <div style={getGradeStyle(student.academic_grade)}>
                                    {student.academic_grade !== null && student.academic_grade !== undefined ? parseFloat(student.academic_grade).toFixed(1) : 'N/A'}
                                </div>
                            </div>

                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>
                                    <span style={{ fontSize: '16px' }}>🎭</span>
                                    <span>Nota d'actitud</span>
                                </div>
                                <div style={getGradeStyle(student.attitude_grade)}>
                                    {student.attitude_grade !== null && student.attitude_grade !== undefined ? parseFloat(student.attitude_grade).toFixed(1) : 'N/A'}
                                </div>
                            </div><div style={sectionStyle}>
                                <div style={sectionTitleStyle}>
                                    <span style={{ fontSize: '16px' }}>✅</span>
                                    <span>Preferències</span>
                                </div>
                                {student.preferences && student.preferences.length > 0 ? (
                                    <ul style={listStyle}>
                                        {student.preferences.map((prefId, index) => {
                                            const name = getStudentNames([prefId])[0];
                                            const isSatisfied = getSatisfiedPreferences().includes(prefId);
                                            
                                            return (
                                                <li key={index} style={{
                                                    ...listItemStyle,
                                                    ...(isSatisfied && {
                                                        borderColor: '#16a34a',
                                                        borderWidth: '2px'
                                                    })
                                                }}>
                                                    {name}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <div style={emptyStateStyle}>No té preferències</div>
                                )}
                            </div>
                            
                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>
                                    <span style={{ fontSize: '16px' }}>⭐</span>
                                    <span>Escollit per</span>
                                </div>
                                {student.preferred_by && student.preferred_by.length > 0 ? (
                                    <ul style={listStyle}>
                                        {getStudentNames(student.preferred_by).map((name, index) => (
                                            <li key={index} style={listItemStyle}>{name}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div style={emptyStateStyle}>Ningú l'ha escollit com a preferència</div>
                                )}
                            </div>
                            
                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>
                                    <span style={{ fontSize: '16px' }}>🚫</span>
                                    <span>Restriccions</span>
                                </div>
                                {student.restrictions && student.restrictions.length > 0 ? (
                                    <ul style={listStyle}>
                                        {getStudentNames(student.restrictions).map((name, index) => (
                                            <li key={index} style={{...listItemStyle, backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#dc2626'}}>{name}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div style={emptyStateStyle}>No té restriccions</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default DraggableStudentCard;