// frontend/src/components/students/StudentListItem.js
import React from 'react';

// Estils bàsics (pots moure'ls a un fitxer CSS si prefereixes)
const itemStyle = {
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '15px',
  marginBottom: '10px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const studentInfoStyle = {
  flexGrow: 1,
};

const actionsStyle = {
  display: 'flex',
  gap: '10px',
};

const buttonStyle = {
  padding: '8px 12px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

const editButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#ffc107', // Groc
  color: 'black',
};

const deleteButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#dc3545', // Vermell
  color: 'white',
};

function StudentListItem({ student, onEdit, onDelete }) {
  const displayGrade = student.academic_grade !== null && student.academic_grade !== undefined 
                       ? parseFloat(student.academic_grade).toFixed(2) 
                       : 'N/A';

  // Funció per convertir el valor de gènere a la seva etiqueta en català
  const getGenderLabel = (genderValue) => {
    switch (genderValue) {
      case 'male':
        return 'Masculí';
      case 'female':
        return 'Femení';
      case 'other':
        return 'Altre';
      case 'prefer_not_to_say':
        return 'Prefereixo no dir-ho';
      default:
        return 'No especificat';
    }
  };

  return (
    <div style={itemStyle}>
      <div style={studentInfoStyle}>
        <h4>{student.name}</h4>
        <p>Nota: {displayGrade}</p>
        <p>Gènere: {getGenderLabel(student.gender)}</p>
        {student.table_id && <p>Assignat a Taula ID: {student.table_id}</p>}
        {student.restrictions && student.restrictions.length > 0 && (
          <p>Restriccions amb IDs: {student.restrictions.join(', ')}</p>
        )}
      </div>
      <div style={actionsStyle}>
        <button 
          style={editButtonStyle} 
          onClick={() => onEdit(student)}
        >
          Editar
        </button>
        <button 
          style={deleteButtonStyle} 
          onClick={() => onDelete(student.id)}
        >
          Esborrar
        </button>
      </div>
    </div>
  );
}

export default StudentListItem;