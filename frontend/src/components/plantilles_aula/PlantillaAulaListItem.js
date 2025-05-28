import React from 'react';

const itemStyle = { border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginBottom: '15px', backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' };
const nameStyle = { fontSize: '1.4em', fontWeight: 'bold', color: '#333' };
const actionsStyle = { display: 'flex', gap: '10px' };
const deleteButtonStyle = { padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', backgroundColor: '#dc3545', color: 'white' };

function PlantillaAulaListItem({ plantilla, onDelete }) {
  return (
    <div style={itemStyle}>
      <div style={headerStyle}>
        <span style={nameStyle}>{plantilla.nom_plantilla}</span>
        <div style={actionsStyle}>
          <button style={deleteButtonStyle} onClick={() => onDelete(plantilla)}>
            Esborrar
          </button>
        </div>
      </div>
      <p><strong>Descripció:</strong> {plantilla.descripcio_plantilla || '<em>No especificada</em>'}</p>
      <p><strong>Número de grups:</strong> {plantilla.num_taules}</p>
      <p style={{fontSize: '0.8em', color: '#777'}}>Creada: {new Date(plantilla.created_at).toLocaleDateString()}</p>
    </div>
  );
}
export default PlantillaAulaListItem;
