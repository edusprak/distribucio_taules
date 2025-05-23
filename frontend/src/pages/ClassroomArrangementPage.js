// frontend/src/pages/ClassroomArrangementPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // <-- IMPORTA toast
import { DragProvider } from '../contexts/DragContext'; // <-- IMPORTA
import studentService from '../services/studentService'; //
import tableService from '../services/tableService'; //
import configurationService from '../services/configurationService'; // Servei per a les configuracions
import DraggableStudentCard from '../components/students/DraggableStudentCard'; //
import DroppableTable from '../components/tables/DroppableTable'; //
import StudentPoolDropZone from '../components/students/StudentPoolDropZone';
import axios from 'axios'; // Per a l'auto-assignació, si no s'ha mogut a un servei

// Estils (pots refinar-los o moure'ls a CSS)
const pageStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    alignItems: 'stretch',
};

const contentWrapperStyle = {
    display: 'flex',
    gap: '20px',
    flexGrow: 1,
};

const poolStyle = {
    width: '300px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '0px', // StudentPoolDropZone gestiona el seu propi padding
    backgroundColor: '#f9f9f9',
    maxHeight: 'calc(80vh - 40px)', // Ajusta segons la resta de la UI (ex: secció de configuracions)
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
};

const tablesAreaStyle = {
    flexGrow: 1,
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '15px',
    backgroundColor: '#e9e9e9',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    alignContent: 'flex-start',
    maxHeight: 'calc(80vh - 40px)', // Ajusta segons la resta de la UI
    overflowY: 'auto',
};

const loadingErrorStyle = {
    textAlign: 'center',
    padding: '20px',
    fontSize: '1.1em',
    width: '100%',
};

const controlSectionBaseStyle = {
    padding: '15px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    marginBottom: '20px',
};

const configSectionStyle = {
    ...controlSectionBaseStyle,
    borderColor: '#6f42c1', // Lila per a configuracions
    backgroundColor: '#f8f0ff',
};

const autoAssignSectionStyle = {
    ...controlSectionBaseStyle,
    borderColor: '#007bff', // Blau per a auto-assignació
    backgroundColor: '#f0f7ff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
};

const configInputStyle = {
    display: 'block',
    width: 'calc(100% - 22px)', // Considerant padding i border
    padding: '8px 10px',
    marginBottom: '10px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    boxSizing: 'border-box',
};

const configSelectStyle = { ...configInputStyle };

const configButtonStyle = {
    padding: '8px 15px',
    fontSize: '0.9em',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '10px',
    minWidth: '80px', // Amplada mínima per a botons
};

const autoAssignControlsStyle = {
    display: 'flex',
    flexDirection: 'column', // Posar el checkbox a sobre del botó
    alignItems: 'center',
    gap: '10px'
};

const autoAssignButtonStyle = {
    padding: '10px 20px', 
    fontSize: '1em', 
    backgroundColor: '#007bff',
    color: 'white', 
    border: 'none', 
    borderRadius: '4px',
    cursor: 'pointer',
};

const proposalSectionStyle = {
    border: '1px solid orange', 
    padding: '15px', 
    marginTop: '15px', // Espai respecte als controls d'auto-assignació
    backgroundColor: '#fff3e0',
    borderRadius: '8px',
    width: '100%', // Ocupa l'amplada de la secció d'auto-assignació
    boxSizing: 'border-box',
};

const proposalButtonStyle = {
    padding: '8px 12px',
    fontSize: '0.9em',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '10px',
};

const checkboxLabelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9em',
    color: '#333',
};

const unassignAllButtonStyle = {
    padding: '10px 20px',
    fontSize: '1em',
    backgroundColor: '#ffc107', // Un color d'advertència o acció secundària
    color: 'black',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    // Pots afegir margin si cal per separar-lo d'altres elements a la mateixa secció
};

function ClassroomArrangementPageContent() {
  const [students, setStudents] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Error general de càrrega de dades

  // Estats per a l'auto-assignació
  const [isProcessingAutoAssign, setIsProcessingAutoAssign] = useState(false);
  const [proposedAssignments, setProposedAssignments] = useState([]);
  const [isApplyingProposal, setIsApplyingProposal] = useState(false);
  const [balanceByGender, setBalanceByGender] = useState(false);
  const [autoAssignError, setAutoAssignError] = useState(null); // Error específic de l'auto-assignació

  // Estats per a la gestió de configuracions
  const [savedConfigurations, setSavedConfigurations] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const [newConfigName, setNewConfigName] = useState('');
  const [newConfigDescription, setNewConfigDescription] = useState('');
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState(null);

  const [isUnassignAllModalOpen, setIsUnassignAllModalOpen] = useState(false);
  const [isUnassigningAll, setIsUnassigningAll] = useState(false);


  // Carrega inicial de dades (alumnes, taules, i llista de configuracions)
  const initialDataLoad = async () => {
    setLoading(true);
    try {
      // Utilitzem Promise.all per carregar en paral·lel
      const [studentsDataRes, tablesDataRes, configsDataRes] = await Promise.all([
        studentService.getAllStudents(), //
        tableService.getAllTables(), //
        configurationService.getAllConfigurations() 
      ]);

      const studentsData = studentsDataRes; // Assumint que el servei retorna l'array directament
      const tablesData = tablesDataRes;     // Assumint que el servei retorna l'array directament

      setStudents(studentsData);
      setTables(tablesData.map(table => ({
          ...table,
          students: studentsData.filter(s => s.table_id === table.id)
      })));
      
      if (configsDataRes.success) {
        setSavedConfigurations(configsDataRes.configurations || []);
      } else {
        throw new Error(configsDataRes.message || "Error carregant llista de configuracions.");
      }
      setError(null);
      setConfigError(null);
    } catch (err) {
      const errorMessage = err.message || (err.response?.data?.message) || 'Error en carregar les dades inicials.';
      setError(errorMessage); // Error general per a la càrrega inicial
      console.error("Error fetching initial data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initialDataLoad();
  }, []);
  
  // --- LÒGICA DE DRAG AND DROP ---
  const handleDropStudentOnTable = async (studentId, targetTableId, originalTableIdFromDragItem) => {
    const studentToMove = students.find(s => s.id === studentId);
    const targetTable = tables.find(t => t.id === targetTableId);

    if (!studentToMove || !targetTable) { 
        console.error("Drop: Alumne o Taula Destinació no trobats!");
        toast.error("S'ha produït un error: alumne o taula no trobats.");
        return; 
    }
    if (studentToMove.table_id === targetTableId) { 
        return; // No fer res si es deixa anar a la mateixa taula
    }

    // Validació de capacitat al frontend (complementa la de canDrop)
    const currentStudentsInTargetTable = students.filter(s => s.table_id === targetTableId && s.id !== studentId);
    if (currentStudentsInTargetTable.length >= targetTable.capacity) { 
        toast.warn(`La taula "${targetTable.table_number}" està plena! No es pot afegir l'alumne "${studentToMove.name}".`);
        return; 
    }
    // Validació de restriccions al frontend (complementa la de canDrop)
    if (studentToMove.restrictions && studentToMove.restrictions.length > 0) {
        for (const sidInTable of currentStudentsInTargetTable.map(s=>s.id)) {
            if (studentToMove.restrictions.includes(sidInTable)) {
                 toast.error(`Conflicte de restricció: ${studentToMove.name} no pot seure amb un alumne ja present a la taula ${targetTable.table_number}.`);
                 return;
            }
        }
    }


    const previousStudentTableId = studentToMove.table_id;
    const originalStudentsState = JSON.parse(JSON.stringify(students));
    const originalTablesState = JSON.parse(JSON.stringify(tables));

    const updatedStudents = students.map(s => 
      s.id === studentId ? { ...s, table_id: targetTableId } : s
    );
    setStudents(updatedStudents);
    setTables(prevTables => 
        prevTables.map(table => ({
            ...table,
            students: updatedStudents.filter(s => s.table_id === table.id)
        }))
    );
    try {
      await studentService.updateStudent(studentId, { table_id: targetTableId }); //
      console.log(`Backend: Alumne ${studentId} assignat a taula ${targetTableId}. Venia de ${previousStudentTableId}.`);
    } catch (err) {
      console.error("Backend Error (Drop):", err.response || err);
      toast.error(`Error desant l'assignació al servidor: ${err.response?.data?.message || err.message}. Revertint canvis locals.`);
      setStudents(originalStudentsState);
      setTables(originalTablesState);
    }
  };

  const handleUnassignStudent = async (studentId, fromTableId) => {
    const studentToUnassign = students.find(s => s.id === studentId);
    if (!studentToUnassign || studentToUnassign.table_id !== fromTableId) {
      return; // Ja està desassignat o no pertany a la taula esperada
    }
    
    const originalStudentsState = JSON.parse(JSON.stringify(students));
    const originalTablesState = JSON.parse(JSON.stringify(tables));

    const updatedStudents = students.map(s => 
      s.id === studentId ? { ...s, table_id: null } : s
    );
    setStudents(updatedStudents);
    setTables(prevTables => 
        prevTables.map(table => ({
            ...table,
            students: updatedStudents.filter(s => s.table_id === table.id)
        }))
    );
    try {
      await studentService.updateStudent(studentId, { table_id: null }); //
      console.log(`Backend: Alumne ${studentId} desassignat correctament.`);
    } catch (err) {
      console.error("Backend Error (Unassign):", err.response || err);
      toast.error(`Error desant la desassignació: ${err.response?.data?.message || err.message}. Revertint canvis locals.`);
      setStudents(originalStudentsState);
      setTables(originalTablesState);
    }
  };

  // --- LÒGICA D'AUTO-ASSIGNACIÓ ---
  const handleAutoAssign = async () => {
    setIsProcessingAutoAssign(true);
    setAutoAssignError(null); // Neteja error previ d'auto-assignació
    setProposedAssignments([]);
    try {
      const payload = {
        students: students, 
        tables: tables.map(t => ({ 
          id: t.id, capacity: t.capacity, table_number: t.table_number 
        })),
        balanceByGender: balanceByGender,
      };
      const response = await axios.post('http://localhost:3001/api/assignments/auto-assign', payload);
      if (response.data.success) {
        setProposedAssignments(response.data.proposedAssignments || []);
        if (!response.data.proposedAssignments || response.data.proposedAssignments.length === 0) {
            toast.warn("L'algorisme no ha generat noves assignacions.");
        } else {
            toast.info(`L'algorisme proposa ${response.data.proposedAssignments.length} noves assignacions.`);
        }
      } else {
        throw new Error(response.data.message || "Error en l'auto-assignació des del backend.");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error cridant a l\'algorisme.';
      setAutoAssignError(errorMessage);
      console.error("Error en auto-assignació:", err.response || err);
      toast.error(errorMessage);
    } finally {
      setIsProcessingAutoAssign(false);
    }
  };

  const applyProposedAssignments = async () => {
    if (proposedAssignments.length === 0) return;
    setIsApplyingProposal(true);
    setAutoAssignError(null);
    const originalStudents = JSON.parse(JSON.stringify(students));
    const originalTables = JSON.parse(JSON.stringify(tables));
    let successCount = 0;

    try {
      let tempStudents = [...students];
      for (const proposal of proposedAssignments) {
        tempStudents = tempStudents.map(s => s.id === proposal.studentId ? {...s, table_id: proposal.tableId} : s);
      }
      setStudents(tempStudents);
      setTables(prevTables => 
        prevTables.map(table => ({ ...table, students: tempStudents.filter(s => s.table_id === table.id) }))
      );

      for (const proposal of proposedAssignments) {
        await studentService.updateStudent(proposal.studentId, { table_id: proposal.tableId }); //
        successCount++;
      }
      toast.success(`${successCount} assignacions aplicades correctament.`);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error aplicant propostes.';
      setAutoAssignError(errorMessage);
      toast.error(`${errorMessage} Es revertiran els canvis.`);
      setStudents(originalStudents);
      setTables(originalTables);    
    } finally {
      setIsApplyingProposal(false);
      setProposedAssignments([]); 
      await initialDataLoad(); // Refresca tot per assegurar consistència màxima
    }
  };

  const discardProposedAssignments = () => {
    setProposedAssignments([]);
    setAutoAssignError(null);
    toast.info("Propostes descartades.");
  };

  // --- LÒGICA PER DESAR/CARREGAR CONFIGURACIONS ---
  const handleSaveCurrentConfiguration = async () => {
    if (!newConfigName.trim()) { toast.warn("Si us plau, introdueix un nom per a la configuració."); return; }
    setConfigLoading(true); setConfigError(null);
    try {
      const currentAssignments = students.map(s => ({ studentId: s.id, tableId: s.table_id }));
      const payload = { name: newConfigName, description: newConfigDescription, assignments: currentAssignments };
      const response = await configurationService.saveConfiguration(payload);
      if (response.success) {
        toast.success(`Configuració "${response.configuration.name}" desada!`);
        setNewConfigName(''); setNewConfigDescription('');
        await fetchSavedConfigurations(); 
      } else { throw new Error(response.message); }
    } catch (err) {
      const msg = err.message || "No s'ha pogut desar la configuració.";
      setConfigError(msg); toast.error(msg); console.error("Error saving configuration:", err);
    } 
    finally { setConfigLoading(false); }
  };

  const fetchSavedConfigurations = async () => {
      // Aquesta funció ja estava definida correctament a la teva versió anterior, 
      // la incloc aquí per completesa dins d'initialDataLoad o si es crida sola.
      setConfigLoading(true);
      try {
        const response = await configurationService.getAllConfigurations();
        if (response.success) {
          setSavedConfigurations(response.configurations || []);
        } else { throw new Error(response.message); }
        setConfigError(null);
      } catch (err) {
      const msg = err.message || "No s'han pogut carregar les configuracions desades.";
      setConfigError(msg);
      console.error("Error fetching saved configurations:", err);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleLoadSelectedConfiguration = async () => {
    if (!selectedConfigId) { toast.warn("Si us plau, selecciona una configuració per carregar."); return; }
    if (!window.confirm("Segur? La distribució actual es perdrà.")) return;
    setConfigLoading(true); setConfigError(null);
    try {
      const response = await configurationService.getConfigurationById(selectedConfigId);
      if (response.success && response.configuration?.assignments) {
        const { assignments, name } = response.configuration;
        const updatedStudents = students.map(s => { // Comença amb tots els alumnes actuals
          const assignment = assignments.find(a => a.studentId === s.id);
          return { ...s, table_id: assignment ? assignment.tableId : null }; // Assigna o desassigna
        });
        setStudents(updatedStudents);
        setTables(prevTables => 
          prevTables.map(table => ({ ...table, students: updatedStudents.filter(s => s.table_id === table.id) }))
        );
        setProposedAssignments([]); // Neteja propostes d'auto-assignació
        toast.success(`Configuració "${name}" carregada.`);
      } else { throw new Error(response.message); }
    } catch (err) { /* ... (com abans, utilitza setConfigError) ... */ }
    finally { setConfigLoading(false); }
  };

  const handleDeleteSelectedConfiguration = async () => {
    if (!selectedConfigId) { toast.warn("Si us plau, selecciona una configuració per esborrar."); return; }
    if (!window.confirm("Segur que vols esborrar aquesta configuració?")) return;
    setConfigLoading(true); setConfigError(null);
    try {
      const response = await configurationService.deleteConfiguration(selectedConfigId);
      if (response.success) {
        toast.success(response.message);
        setSelectedConfigId(''); 
        await fetchSavedConfigurations();
      } else { throw new Error(response.message); }
    } catch (err) { /* ... (com abans, utilitza setConfigError) ... */ }
    finally { setConfigLoading(false); }
  };

  const handleUnassignAllStudents = async () => {
    const assignedStudentsCount = students.filter(s => s.table_id !== null).length;
    if (assignedStudentsCount === 0) {
      toast.warn("No hi ha alumnes assignats a taules per desassignar.");
      return;
    }

    if (window.confirm("Segur que vols treure tots els alumnes de les seves taules i tornar-los al pool d'alumnes no assignats?")) {
      setIsUnassigningAll(true);
      setError(null); // Neteja errors generals

      try {
        // Crida al nou endpoint del backend
        // Podries crear una funció a studentService.js per a això:
        // ex: await studentService.unassignAll();
        const response = await axios.post('http://localhost:3001/api/students/unassign-all'); 

        if (response.data.success) {
          toast.success(response.data.message || `${response.data.unassignedCount || 0} alumnes desassignats.`);
          // Refresquem totes les dades per mostrar els canvis
          await initialDataLoad(); 
        } else {
          throw new Error(response.data.message || "Error desassignant tots els alumnes des del backend.");
        }
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || 'No s\'ha pogut desassignar tots els alumnes.';
        // Podries usar setError(errorMessage) si vols mostrar l'error en un lloc fix de la pàgina
        toast.error(errorMessage);
        console.error("Error unassigning all students:", err.response || err);
      } finally {
        setIsUnassigningAll(false);
      }
    }
  };


  // --- RENDERITZAT ---
  if (loading) {
    return <div style={loadingErrorStyle}>Carregant dades de la classe...</div>;
  }

  // Error crític durant la càrrega inicial de dades
  if (error && students.length === 0 && tables.length === 0) {
    return <div style={{ ...loadingErrorStyle, color: 'red' }}>Error de càrrega: {error} <button onClick={initialDataLoad}>Reintentar</button></div>;
  }
  
  const unassignedStudents = students.filter(s => !s.table_id);

  return (
    <div style={pageStyle}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px', width: '100%' }}>Distribució de la classe</h2>
      
      {/* Secció de Configuracions Desades */}
      <div style={configSectionStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Distribucions desades</h3>
        {configError && <p style={{ color: 'red', fontWeight:'bold' }}>Error de configuració: {configError}</p>}
        
        <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #ddd' }}>
          <h4 style={{marginTop:0, marginBottom: '10px'}}>Desar distribució actual</h4>
          <input 
            type="text" 
            placeholder="Nom de la nova configuració..." 
            style={configInputStyle}
            value={newConfigName}
            onChange={(e) => setNewConfigName(e.target.value)}
            disabled={configLoading}
          />
          <textarea 
            placeholder="Descripció (opcional)..." 
            style={{...configInputStyle, height: '60px', resize: 'vertical'}}
            value={newConfigDescription}
            onChange={(e) => setNewConfigDescription(e.target.value)}
            disabled={configLoading}
          />
          <button onClick={handleSaveCurrentConfiguration} disabled={configLoading || !newConfigName.trim()} style={{...configButtonStyle, backgroundColor: '#5bc0de', color: 'white'}}>
            {configLoading ? 'Desant...' : 'Desar distribució actual'}
          </button>
        </div>

        {savedConfigurations.length > 0 ? (
          <div>
            <h4 style={{marginTop:0, marginBottom: '10px'}}>Carregar o Esborrar Distribució</h4>
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <select 
                  value={selectedConfigId} 
                  onChange={(e) => {setSelectedConfigId(e.target.value); setConfigError(null);}}
                  style={{...configSelectStyle, flexGrow: 1}}
                  disabled={configLoading}
                >
                  <option value="">-- Selecciona una configuració --</option>
                  {savedConfigurations.map(config => (
                    <option key={config.id} value={config.id}>
                      {config.name} (Desada: {new Date(config.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                <button onClick={handleLoadSelectedConfiguration} disabled={configLoading || !selectedConfigId} style={{...configButtonStyle, backgroundColor: '#5cb85c', color: 'white'}}>
                  {configLoading ? '...' : 'Carregar'}
                </button>
                <button onClick={handleDeleteSelectedConfiguration} disabled={configLoading || !selectedConfigId} style={{...configButtonStyle, backgroundColor: '#d9534f', color: 'white'}}>
                  {configLoading ? '...' : 'Esborrar'}
                </button>
            </div>
          </div>
        ) : (
            !configLoading && <p><em>No hi ha configuracions desades.</em></p>
        )}
        {configLoading && <p style={{fontSize: '0.9em', color: '#555'}}>Processant operació de configuració...</p>}
      </div>

      {/* Secció d'Auto-Assignació */}
      <div style={autoAssignSectionStyle}>
        <div style={autoAssignControlsStyle}>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={balanceByGender}
                onChange={(e) => setBalanceByGender(e.target.checked)}
                disabled={isProcessingAutoAssign || isApplyingProposal}
              />
              Intentar equilibrar per gènere
            </label>
            <button 
              onClick={handleAutoAssign} 
              disabled={isProcessingAutoAssign || isApplyingProposal || loading} 
              style={autoAssignButtonStyle}
            >
              {isProcessingAutoAssign ? 'Processant algorisme...' : 'Assignar automàticament alumnes restants'}
            </button>
        </div>

        <button
            onClick={handleUnassignAllStudents} // <--- NOVA FUNCIÓ HANDLER
            disabled={isProcessingAutoAssign || isApplyingProposal || loading || configLoading || isUnassigningAll}
            style={{...unassignAllButtonStyle, marginTop: '10px'}} 
            title="Mou tots els alumnes de les taules al pool d'alumnes no assignats"
        >
            {isUnassigningAll ? 'Desassignant Tots...' : 'Netejar taules'}
        </button>

        {autoAssignError && <p style={{ color: 'red', marginTop: '10px', fontWeight:'bold' }}>Error d'assignació: {autoAssignError}</p>}
        {proposedAssignments.length > 0 && !isApplyingProposal && (
          <div style={proposalSectionStyle}>
            <h4 style={{marginTop:0}}>Assignacions Proposades:</h4>
            <ul style={{listStylePosition: 'inside', paddingLeft:0, maxHeight: '150px', overflowY: 'auto', marginBottom: '15px'}}>
              {proposedAssignments.map(p => (
                <li key={p.studentId}><strong>{p.studentName}</strong> → Taula <strong>{p.tableName}</strong></li>
              ))}
            </ul>
            <div style={{textAlign:'center'}}>
                <button onClick={applyProposedAssignments} style={{...proposalButtonStyle, backgroundColor: '#28a745', color: 'white'}} disabled={isApplyingProposal}>
                    {isApplyingProposal ? 'Aplicant...' : 'Acceptar i Aplicar'}
                </button>
                <button onClick={discardProposedAssignments} style={{...proposalButtonStyle, backgroundColor: '#6c757d', color: 'white'}} disabled={isApplyingProposal}>
                    Descartar
                </button>
            </div>
          </div>
        )}
        {isApplyingProposal && <p style={loadingErrorStyle}>Aplicant assignacions proposades...</p>}
      </div>
      
      {/* Contingut Principal: Pool i Taules */}
      <div style={contentWrapperStyle}>
        <div style={poolStyle}> 
          <StudentPoolDropZone 
            onDropToPool={handleUnassignStudent}
            unassignedStudentsCount={unassignedStudents.length}
          >
            {unassignedStudents.length > 0 ? (
              unassignedStudents.map(student => (
                <DraggableStudentCard 
                  key={`pool-${student.id}`}
                  student={{...student, originalTableId: null }}
                  onDragEnd={handleUnassignStudent} 
                />
              ))
            ) : (
              <p style={{textAlign: 'center', fontStyle: 'italic', marginTop: '20px', color: '#777'}}>
                Cap alumne per assignar.
              </p>
            )}
          </StudentPoolDropZone>
        </div>

        <div style={tablesAreaStyle}>
          {tables.length > 0 ? (
            tables.map(table => (
              <DroppableTable 
                key={table.id} 
                table={table}
                studentsInTable={table.students}
                onDropStudent={handleDropStudentOnTable}
                onDragEndStudent={handleUnassignStudent} 
              />
            ))
          ) : (
            <p style={loadingErrorStyle}>No hi ha taules creades.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ClassroomArrangementPage() {
  return (
    <DragProvider>
      <ClassroomArrangementPageContent />
    </DragProvider>
  );
}


export default ClassroomArrangementPage;