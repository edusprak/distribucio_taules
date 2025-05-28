// frontend/src/components/plantilles_aula/PlantillaAulaList.js
import React from 'react';
import PlantillaAulaListItem from './PlantillaAulaListItem';

function PlantillaAulaList({ plantilles, onDeletePlantilla }) {
  if (!plantilles || plantilles.length === 0) {
    return <p style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>No hi ha plantilles d'aula per mostrar.</p>;
  }
  return (
    <div>
      {plantilles.map(plantilla => (
        <PlantillaAulaListItem
          key={plantilla.id_plantilla}
          plantilla={plantilla}
          onDelete={onDeletePlantilla}
        />
      ))}
    </div>
  );
}
export default PlantillaAulaList;
