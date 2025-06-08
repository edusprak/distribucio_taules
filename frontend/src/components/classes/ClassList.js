// frontend/src/components/classes/ClassList.js
import React from 'react';

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '10px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  border: '1px solid #ddd',
};

const thStyle = {
  backgroundColor: '#f2f2f2',
  padding: '12px 15px',
  textAlign: 'left',
  borderBottom: '2px solid #ddd',
  fontWeight: 'bold',
  position: 'sticky',
  top: 0,
};

const tdStyle = {
  padding: '10px 15px',
  borderBottom: '1px solid #ddd',
  verticalAlign: 'middle',
};

const trStyle = {
  ':hover': {
    backgroundColor: '#f5f5f5',
  }
};

const buttonStyle = {
  margin: '0 5px',
  padding: '6px 10px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

const editButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#ffc107',
  color: 'black',
};

const deleteButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#dc3545',
  color: 'white',
};

function ClassList({ classes, onEditClass, onDeleteClass }) {  if (!classes || classes.length === 0) {
    return <p style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>No hi ha classes per mostrar.</p>;
  }

  return (
    <div style={{ overflowX: 'auto', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Nom de la classe</th>
            <th style={thStyle}>Descripció</th>
            <th style={{...thStyle, width: '140px'}}>Accions</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((classe) => {
            return (
              <tr key={classe.id_classe} style={trStyle}>
                <td style={tdStyle}>{classe.nom_classe}</td>
                <td style={tdStyle}>{classe.descripcio_classe || 'No hi ha descripció'}</td>
                <td style={tdStyle}>
                  <button 
                    style={editButtonStyle} 
                    onClick={() => onEditClass(classe)}
                  >
                    Editar
                  </button>
                  <button 
                    style={deleteButtonStyle} 
                    onClick={() => onDeleteClass(classe)}
                  >
                    Esborrar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ClassList;
