// frontend/src/components/tables/TableListItem.js
import React from 'react';

// Estils (similars als de StudentListItem, pots centralitzar-los si vols)
const itemStyle = {
  border: '1px solid #ddd',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '15px',
  backgroundColor: '#fff',
  boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #eee',
  paddingBottom: '10px',
  marginBottom: '10px',
};

const tableNameStyle = {
  fontSize: '1.4em',
  fontWeight: 'bold',
  color: '#333',
};

const actionsStyle = {
  display: 'flex',
  gap: '10px',
};

const buttonStyle = { // Estil base per als botons
    padding: '8px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9em',
};

const editButtonStyle = { ...buttonStyle, backgroundColor: '#ffc107', color: 'black' };
const deleteButtonStyle = { ...buttonStyle, backgroundColor: '#dc3545', color: 'white' };

const studentListStyle = {
    listStyleType: 'none',
    paddingLeft: '0',
    fontSize: '0.9em',
};

const studentListItemStyle = {
    padding: '4px 0',
    borderBottom : '1px dashed #eee',
};


function TableListItem({ table, onEdit, onDelete }) {
  return (
    <div style={itemStyle}>
      <div style={headerStyle}>
        <span style={tableNameStyle}>{table.table_number}</span>
        <div style={actionsStyle}>
          <button 
            style={editButtonStyle} 
            onClick={() => onEdit(table)}
          >
            Editar
          </button>
          <button 
            style={deleteButtonStyle} 
            onClick={() => onDelete(table.id)}
          >
            Esborrar
          </button>
        </div>
      </div>
      <p><strong>Capacitat:</strong> {table.capacity} places</p>
      <div>
        <strong>Alumnes Assignats ({table.students ? table.students.length : 0} / {table.capacity}):</strong>
        {table.students && table.students.length > 0 ? (
          <ul style={studentListStyle}>
            {table.students.map(student => (
              <li key={student.id} style={studentListItemStyle}>
                {student.name} (Nota: {parseFloat(student.academic_grade).toFixed(2)})
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontStyle: 'italic', fontSize: '0.9em' }}>No hi ha alumnes assignats.</p>
        )}
      </div>
    </div>
  );
}

export default TableListItem;