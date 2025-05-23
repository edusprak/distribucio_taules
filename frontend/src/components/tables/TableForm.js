// frontend/src/components/tables/TableForm.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // <-- IMPORTA toast


// Estils (similars als de StudentForm, pots centralitzar-los)
const formStyle = {
  border: '1px solid #ccc',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '20px',
  backgroundColor: '#f9f9f9',
};
const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontWeight: 'bold',
};
const inputStyle = {
  width: 'calc(100% - 22px)', // Ajust per padding i border
  padding: '10px',
  marginBottom: '15px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  boxSizing: 'border-box',
};
const buttonContainerStyle = {
  marginTop: '20px',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
};
 const saveButtonStyle = {
    padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
};
const cancelButtonStyle = {
    padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
};

function TableForm({ tableToEdit, onSave, onClose }) {
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('');

  useEffect(() => {
    if (tableToEdit) {
      setTableNumber(tableToEdit.table_number || '');
      setCapacity(tableToEdit.capacity !== null ? String(tableToEdit.capacity) : '');
    } else {
      // Mode creació: reseteja els camps
      setTableNumber('');
      setCapacity('');
    }
  }, [tableToEdit]); // Es re-executa si tableToEdit canvia

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!tableNumber.trim() || capacity.trim() === '') {
      toast.warn('El número de taula i la capacitat són obligatoris.');
      return;
    }
    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap <= 0) {
      toast.warn('La capacitat ha de ser un número enter positiu.');
      return;
    }

    const tableData = {
      table_number: tableNumber,
      capacity: cap,
    };
    onSave(tableData);
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle} id="table-form"> {/* Donem un ID al form per si el botó submit està fora */}
      <h3>{tableToEdit ? `Editar Taula: ${tableToEdit.table_number}` : "Crear Nova Taula"}</h3>
      <div>
        <label htmlFor="tableNumber" style={labelStyle}>Número/Nom de Taula:</label>
        <input
          type="text"
          id="tableNumber"
          style={inputStyle}
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="capacity" style={labelStyle}>Capacitat:</label>
        <input
          type="number"
          id="capacity"
          style={inputStyle}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          min="1"
          required
        />
      </div>
      <div style={buttonContainerStyle}>
        <button type="button" onClick={onClose} style={cancelButtonStyle}>
          Cancel·lar
        </button>
        <button type="submit" style={saveButtonStyle}>
          {tableToEdit ? 'Actualitzar Taula' : 'Crear Taula'}
        </button>
      </div>
    </form>
  );
}

export default TableForm;