// frontend/src/components/plantilles_aula/PlantillaAulaList.js
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

const deleteButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#dc3545',
  color: 'white',
};

function PlantillaAulaList({ plantilles, onDeletePlantilla }) {
  if (!plantilles || plantilles.length === 0) {
    return <p style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>No hi ha plantilles d'aula per mostrar.</p>;
  }
  
  return (
    <div style={{ overflowX: 'auto', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Nom</th>
            <th style={thStyle}>Descripció</th>
            <th style={{...thStyle, width: '100px'}}>Número de taules</th>
            <th style={{...thStyle, width: '100px'}}>Data creació</th>
            <th style={{...thStyle, width: '100px'}}>Accions</th>
          </tr>
        </thead>
        <tbody>
          {plantilles.map((plantilla) => (
            <tr key={plantilla.id_plantilla} style={trStyle}>
              <td style={tdStyle}>{plantilla.nom_plantilla}</td>
              <td style={tdStyle}>{plantilla.descripcio_plantilla || 'No especificada'}</td>
              <td style={tdStyle}>{plantilla.num_taules}</td>
              <td style={tdStyle}>{new Date(plantilla.created_at).toLocaleDateString()}</td>
              <td style={tdStyle}>
                <button 
                  style={deleteButtonStyle} 
                  onClick={() => onDeletePlantilla(plantilla)}
                >
                  Esborrar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default PlantillaAulaList;
