// frontend/src/pages/TableManagementPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // <-- IMPORTA toast

import tableService from '../services/tableService';
import TableList from '../components/tables/TableList';
import TableForm from '../components/tables/TableForm'; // Importació del formulari de taules

// Estils (pots moure'ls a un fitxer CSS comú si es repeteixen)
const pageStyle = {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
};

const buttonStyle = {
    padding: '10px 15px',
    fontSize: '1em',
    backgroundColor: '#28a745', 
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '20px',
};

const loadingErrorStyle = {
    textAlign: 'center',
    padding: '20px',
    fontSize: '1.1em',
};

function TableManagementPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingTable, setEditingTable] = useState(null); // Emmagatzema la taula que s'està editant

  // Funció per carregar (o refrescar) la llista de taules
  const fetchTables = async () => {
    try {
      setLoading(true);
      const data = await tableService.getAllTables();
      setTables(data);
      setError(null);
    } catch (err) {
      const errorMessage = err.message || (err.response?.data?.message) || 'Error en carregar les taules.';
      setError(errorMessage);
      console.error("Error fetching tables:", err.response || err);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  // useEffect per carregar les taules inicialment
  useEffect(() => {
    fetchTables();
  }, []); // Array de dependències buit = executar un cop en muntar

  // Handler per obrir el formulari en mode "crear nova taula"
  const handleCreateNewTable = () => {
    setEditingTable(null); // Assegura que no hi ha cap taula en edició
    setIsFormVisible(true); // Mostra el formulari
    setError(null); // Neteja errors previs
  };

  // Handler per obrir el formulari en mode "editar taula"
  const handleEditTable = (table) => {
    setEditingTable(table); // Estableix la taula actual per a edició
    setIsFormVisible(true); // Mostra el formulari
    setError(null); // Neteja errors previs
  };

  // Handler per esborrar una taula
  const handleDeleteTable = async (tableId) => {
    if (window.confirm(`Segur que vols esborrar la taula amb ID ${tableId}? Els alumnes assignats quedaran desassignats.`)) {
      try {
        setLoading(true);
        await tableService.deleteTable(tableId);
        await fetchTables(); // Refresca la llista de taules
        toast.success(`Taula amb ID ${tableId} esborrada correctament.`);
      } catch (err) {
        const errorMessage = err.message || (err.response?.data?.message) || `Error en esborrar la taula ${tableId}.`;
        setError(errorMessage);
        console.error("Error deleting table:", err.response || err);
        toast.error(`Error en esborrar la taula: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Handler per tancar el formulari (cridat des de TableForm)
  const handleCloseForm = () => {
    setIsFormVisible(false);
    setEditingTable(null);
    setError(null); 
  };

  // Handler per guardar (crear o actualitzar) una taula (cridat des de TableForm)
  const handleSaveTable = async (tableData) => {
    setLoading(true);
    try {
      if (editingTable) { // Mode edició
        await tableService.updateTable(editingTable.id, tableData);
      } else { // Mode creació
        await tableService.createTable(tableData);
      }
      await fetchTables(); // Refresca la llista
      setIsFormVisible(false); // Tanca el formulari
      setEditingTable(null); // Reseteja la taula en edició
      setError(null);
    } catch (error) {
      const errorMessage = error.message || (error.response?.data?.message) || (error.error ? `${error.error}: ${error.details || ''}` : JSON.stringify(error));
      console.error("Error guardant la taula:", error.response || error);
      setError(`Error guardant la taula: ${errorMessage}`);
      // Manté el formulari obert si hi ha un error de guardat per a correcció
    } finally {
      setLoading(false);
    }
  };

  // Renderitzat condicional
  if (loading && tables.length === 0) {
    return <div style={loadingErrorStyle}>Carregant taules...</div>;
  }

  if (error && tables.length === 0 && !isFormVisible) {
    return <div style={{ ...loadingErrorStyle, color: 'red' }}>Error: {error} <button onClick={fetchTables}>Reintentar</button></div>;
  }

  return (
    <div style={pageStyle}>
      <h2>Gestió de Taules</h2>
      
      {/* Mostra errors si no està el formulari visible o si és un error de guardat (es mostrarà a sota del formulari) */}
      {error && !isFormVisible && <p style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '10px' }}>Error: {error}</p>}

      {!isFormVisible && (
        <button style={buttonStyle} onClick={handleCreateNewTable}>
          + Crear Nova Taula
        </button>
      )}

      {isFormVisible && (
        <>
          {/* Mostra l'error dins o a sobre de la secció del formulari si està relacionat amb el guardat */}
          {error && <p style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '10px' }}>Error: {error}</p>}
          
          <TableForm
            tableToEdit={editingTable}
            onSave={handleSaveTable}
            onClose={handleCloseForm}
          />
        </>
      )}

      {!isFormVisible && (
        tables.length > 0 ? (
          <TableList 
            tables={tables} 
            onEditTable={handleEditTable} 
            onDeleteTable={handleDeleteTable} 
          />
        ) : (
          !loading && <div style={loadingErrorStyle}>No hi ha taules per mostrar. Pots començar creant-ne alguna!</div>
        )
      )}
      
      {loading && tables.length > 0 && <div style={{ ...loadingErrorStyle, fontSize: '0.9em', color: '#555' }}>Actualitzant dades...</div>}
    </div>
  );
}

export default TableManagementPage;