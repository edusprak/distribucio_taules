// frontend/src/pages/ClassroomArrangementPage.js // (Considera reanomenar-lo a DistribucioPage.js o similar)
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { DragProvider } from '../contexts/DragContext'; // Es manté
import studentService from '../services/studentService';
import plantillaAulaService from '../services/plantillaAulaService'; // NOU
import distribucioService from '../services/distribucioService'; // NOU (abans configurationService)
// import tableService from '../services/tableService'; // ELIMINAT

import DraggableStudentCard from '../components/students/DraggableStudentCard'; // Es manté
import DroppableTable from '../components/tables/DroppableTable'; // S'haurà d'adaptar
import StudentPoolDropZone from '../components/students/StudentPoolDropZone'; // Es manté
import ConfirmModal from '../components/ConfirmModal';
import axios from 'axios'; // Per auto-assignació

// ... [Mantenir estils o adaptar-los] ...
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold' };
const pageStyle = { display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', fontFamily: 'Arial, sans-serif', alignItems: 'stretch' };
const contentWrapperStyle = { display: 'flex', gap: '20px', flexGrow: 1 };
const poolStyle = { width: '300px', border: '1px solid #ccc', borderRadius: '8px', padding: '0px', backgroundColor: '#f9f9f9', maxHeight: 'calc(80vh - 120px)', overflowY: 'auto', display: 'flex', flexDirection: 'column' };
const tablesAreaStyle = { flexGrow: 1, border: '1px solid #ccc', borderRadius: '8px', padding: '15px', backgroundColor: '#e9e9e9', display: 'flex', flexWrap: 'wrap', gap: '20px', alignContent: 'flex-start', maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' };
const loadingErrorStyle = { textAlign: 'center', padding: '20px', fontSize: '1.1em', width: '100%' };
const controlSectionBaseStyle = { padding: '15px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '10px' }; // Reduït marginBottom
const selectionSectionStyle = { ...controlSectionBaseStyle, borderColor: '#007bff', backgroundColor: '#f0f7ff', display: 'flex', flexDirection: 'column', gap: '10px' };
const inputStyle = { display: 'block', width: 'calc(100% - 22px)', padding: '8px 10px', marginBottom: '10px', border: '1px solid #ced4da', borderRadius: '4px', boxSizing: 'border-box' };
const buttonStyle = { padding: '8px 15px', fontSize: '0.9em', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px', minWidth: '80px'};


function ClassroomArrangementPageContent() {
    const [allStudents, setAllStudents] = useState([]); // Tots els alumnes de la BD
    const [displayedStudents, setDisplayedStudents] = useState([]); // Alumnes amb el seu estat d'assignació actual
    
    const [plantillesAula, setPlantillesAula] = useState([]);
    const [selectedPlantillaId, setSelectedPlantillaId] = useState('');
    const [activePlantilla, setActivePlantilla] = useState(null); // Contindrà { id_plantilla, nom_plantilla, taules: [] }

    const [distribucionsDesades, setDistribucionsDesades] = useState([]); // Distribucions per a la plantilla activa
    const [selectedDistribucioId, setSelectedDistribucioId] = useState('');
    const [activeDistribucioInfo, setActiveDistribucioInfo] = useState(null); // Nom, descripció de la distribució carregada

    const [nomNovaDistribucio, setNomNovaDistribucio] = useState('');
    const [descNovaDistribucio, setDescNovaDistribucio] = useState('');

    const [loading, setLoading] = useState({ global: true, plantilles: true, distribucions: false, autoAssign: false });
    const [error, setError] = useState({ global: null, plantilla: null, distribucio: null, autoAssign: null });
    
    // Estats per auto-assignació (es mantenen similars)
    const [isProcessingAutoAssign, setIsProcessingAutoAssign] = useState(false);
    const [proposedAssignments, setProposedAssignments] = useState([]);
    const [isApplyingProposal, setIsApplyingProposal] = useState(false);
    const [balanceByGender, setBalanceByGender] = useState(false);
    
    const [isConfirmDeleteDistribucioOpen, setIsConfirmDeleteDistribucioOpen] = useState(false);
    const [distribucioToDelete, setDistribucioToDelete] = useState(null);

    // 1. Càrrega inicial d'alumnes i llista de plantilles
    const fetchInitialData = useCallback(async () => {
        setLoading(prev => ({ ...prev, global: true, plantilles: true }));
        try {
            const studentsRes = await studentService.getAllStudents();
            setAllStudents(studentsRes); // Guardem tots els alumnes originals
            setDisplayedStudents(studentsRes.map(s => ({ ...s, taula_plantilla_id: null }))); // Inicialment cap assignat

            const plantillesRes = await plantillaAulaService.getAllPlantillesAula();
            if (plantillesRes.success) {
                setPlantillesAula(plantillesRes.plantilles);
            } else {
                throw new Error(plantillesRes.message || "Error carregant plantilles d'aula.");
            }
            setError(prev => ({ ...prev, global: null, plantilla: null }));
        } catch (err) {
            console.error("Error fetching initial data:", err);
            setError(prev => ({ ...prev, global: err.message, plantilla: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, global: false, plantilles: false }));
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // 2. Efecte per carregar les taules d'una plantilla quan selectedPlantillaId canvia
    useEffect(() => {
        if (selectedPlantillaId) {
            const loadPlantillaDetails = async () => {
                setLoading(prev => ({ ...prev, global: true })); // Indicar càrrega
                setError(prev => ({ ...prev, plantilla: null, distribucio: null }));
                setActiveDistribucioInfo(null);
                setSelectedDistribucioId('');
                try {
                    const response = await plantillaAulaService.getPlantillaAulaById(selectedPlantillaId);
                    if (response.success) {
                        setActivePlantilla(response.plantilla);
                        // Resetejar displayedStudents a la seva assignació base (cap) per aquesta plantilla
                        setDisplayedStudents(allStudents.map(s => ({ ...s, taula_plantilla_id: null })));
                        // Carregar les distribucions per a aquesta nova plantilla
                        fetchDistribucionsForPlantilla(selectedPlantillaId);
                    } else {
                        throw new Error(response.message || `Error carregant detalls de la plantilla ${selectedPlantillaId}`);
                    }
                } catch (err) {
                    console.error("Error loading plantilla details:", err);
                    setError(prev => ({ ...prev, plantilla: err.message }));
                    setActivePlantilla(null);
                    setDistribucionsDesades([]);
                } finally {
                    setLoading(prev => ({ ...prev, global: false }));
                }
            };
            loadPlantillaDetails();
        } else {
            setActivePlantilla(null); // Netejar si no hi ha plantilla seleccionada
            setDistribucionsDesades([]);
            setDisplayedStudents(allStudents.map(s => ({ ...s, taula_plantilla_id: null })));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPlantillaId, allStudents]); // allStudents aquí per si canvia la llista global d'alumnes

    // 3. Funció per carregar distribucions d'una plantilla
    const fetchDistribucionsForPlantilla = async (plantillaId) => {
        if (!plantillaId) return;
        setLoading(prev => ({ ...prev, distribucions: true }));
        try {
            const response = await distribucioService.getAllDistribucions(plantillaId);
            if (response.success) {
                setDistribucionsDesades(response.distribucions);
            } else {
                throw new Error(response.message || "Error carregant distribucions.");
            }
            setError(prev => ({ ...prev, distribucio: null }));
        } catch (err) {
            console.error("Error fetching distribucions for plantilla:", err);
            setError(prev => ({ ...prev, distribucio: err.message }));
            setDistribucionsDesades([]);
        } finally {
            setLoading(prev => ({ ...prev, distribucions: false }));
        }
    };
    
    // 4. Handler per carregar una distribució seleccionada
    const handleLoadSelectedDistribucio = async () => {
        if (!selectedDistribucioId || !activePlantilla) {
            toast.warn("Selecciona una plantilla i una distribució per carregar.");
            return;
        }
        setLoading(prev => ({ ...prev, global: true }));
        try {
            const response = await distribucioService.getDistribucioById(selectedDistribucioId);
            if (response.success && response.distribucio) {
                const { distribucio } = response;
                setActiveDistribucioInfo({ nom: distribucio.nom_distribucio, descripcio: distribucio.descripcio_distribucio });
                setNomNovaDistribucio(distribucio.nom_distribucio); // Pre-omplir per si es vol desar amb el mateix nom
                setDescNovaDistribucio(distribucio.descripcio_distribucio || '');

                // Actualitzar l'estat dels alumnes
                const newDisplayedStudents = allStudents.map(stud => {
                    const assignacio = distribucio.assignacions.find(a => a.alumne_id === stud.id);
                    return {
                        ...stud,
                        taula_plantilla_id: assignacio ? assignacio.taula_plantilla_id : null
                    };
                });
                setDisplayedStudents(newDisplayedStudents);
                toast.success(`Distribució "${distribucio.nom_distribucio}" carregada.`);
            } else {
                throw new Error(response.message || "No s'ha pogut carregar la distribució.");
            }
        } catch (err) {
            console.error("Error loading distribucio:", err);
            toast.error(`Error carregant distribució: ${err.message}`);
            setError(prev => ({ ...prev, distribucio: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, global: false }));
        }
    };

    // 5. Handler per desar la distribució actual
    const handleSaveCurrentDistribucio = async () => {
        if (!activePlantilla) {
            toast.warn("Selecciona una plantilla d'aula primer.");
            return;
        }
        if (!nomNovaDistribucio.trim()) {
            toast.warn("Introdueix un nom per a la distribució.");
            return;
        }

        setLoading(prev => ({ ...prev, distribucio: true }));
        try {
            const assignacionsActuals = displayedStudents
                .filter(s => s.taula_plantilla_id !== null) // Només alumnes assignats a una taula de la plantilla
                .map(s => ({ alumne_id: s.id, taula_plantilla_id: s.taula_plantilla_id }));
            
            // O si vols desar també els que estan al pool com a 'taula_plantilla_id: null'
            // const assignacionsActuals = displayedStudents.map(s => ({ alumne_id: s.id, taula_plantilla_id: s.taula_plantilla_id }));


            const payload = {
                nom_distribucio: nomNovaDistribucio,
                descripcio_distribucio: descNovaDistribucio,
                plantilla_id: activePlantilla.id_plantilla,
                assignacions: assignacionsActuals
            };

            const response = await distribucioService.saveDistribucio(payload);
            if (response.success) {
                toast.success(`Distribució "${response.distribucio.nom_distribucio}" desada!`);
                setNomNovaDistribucio('');
                setDescNovaDistribucio('');
                await fetchDistribucionsForPlantilla(activePlantilla.id_plantilla); // Refresca la llista de distribucions
                setSelectedDistribucioId(response.distribucio.id_distribucio); // Selecciona la nova/desada
                setActiveDistribucioInfo({ nom: response.distribucio.nom_distribucio, descripcio: response.distribucio.descripcio_distribucio});
            } else {
                throw new Error(response.message || "No s'ha pogut desar la distribució.");
            }
        } catch (err) {
            console.error("Error desant distribució:", err);
            toast.error(`Error desant distribució: ${err.message}`);
            setError(prev => ({ ...prev, distribucio: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, distribucio: false }));
        }
    };

    // 6. Handler per esborrar una distribució
    const openConfirmDeleteDistribucioModal = () => {
        if(!selectedDistribucioId) {
            toast.warn("Selecciona una distribució per esborrar.");
            return;
        }
        const distribucio = distribucionsDesades.find(d => d.id_distribucio === parseInt(selectedDistribucioId));
        if (distribucio) {
            setDistribucioToDelete(distribucio);
            setIsConfirmDeleteDistribucioOpen(true);
        }
    };

    const handleDeleteSelectedDistribucio = async () => {
        if (!distribucioToDelete) return;
        setLoading(prev => ({ ...prev, distribucio: true }));
        try {
            await distribucioService.deleteDistribucio(distribucioToDelete.id_distribucio);
            toast.success(`Distribució "${distribucioToDelete.nom_distribucio}" esborrada.`);
            setSelectedDistribucioId('');
            setActiveDistribucioInfo(null);
            setNomNovaDistribucio('');
            setDescNovaDistribucio('');
            await fetchDistribucionsForPlantilla(activePlantilla.id_plantilla);
        } catch (err) {
            console.error("Error esborrant distribució:", err);
            toast.error(`Error esborrant distribució: ${err.message}`);
        } finally {
            setLoading(prev => ({ ...prev, distribucio: false }));
            setIsConfirmDeleteDistribucioOpen(false);
            setDistribucioToDelete(null);
        }
    };

    // 7. Lògica de Drag and Drop (Adaptada)
    const handleDropStudentOnTable = async (studentId, targetTablePlantillaId, originalTableIdFromDragItem) => {
        // originalTableIdFromDragItem ara seria l'antic taula_plantilla_id o null si ve del pool
        const studentToMove = displayedStudents.find(s => s.id === studentId);
        const targetTable = activePlantilla?.taules.find(t => t.id_taula_plantilla === targetTablePlantillaId);

        if (!studentToMove || !targetTable || !activePlantilla) {
            toast.error("Error: Alumne, taula o plantilla no disponibles.");
            return;
        }
        if (studentToMove.taula_plantilla_id === targetTablePlantillaId) return; // No canvi

        // Validació de capacitat
        const studentsInTargetTable = displayedStudents.filter(s => s.taula_plantilla_id === targetTablePlantillaId && s.id !== studentId);
        if (studentsInTargetTable.length >= targetTable.capacitat) {
            toast.warn(`La taula "${targetTable.identificador_taula_dins_plantilla}" està plena!`);
            return;
        }
        // Validació de restriccions
        if (studentToMove.restrictions && studentToMove.restrictions.length > 0) {
            for (const sidInTable of studentsInTargetTable.map(s => s.id)) {
                if (studentToMove.restrictions.includes(sidInTable)) {
                    const restrictedWithName = allStudents.find(s => s.id === sidInTable)?.name || 'un alumne';
                    toast.error(`Conflicte: ${studentToMove.name} no pot seure amb ${restrictedWithName}.`);
                    return;
                }
            }
        }
        // Actualització local (optimista)
        setDisplayedStudents(prevStudents =>
            prevStudents.map(s =>
                s.id === studentId ? { ...s, taula_plantilla_id: targetTablePlantillaId } : s
            )
        );
        // NOTA: El desat al backend es fa quan l'usuari prem "Desar Distribució Actual".
        // No hi ha crida individual a l'API per cada moviment de drag & drop.
    };

    const handleUnassignStudent = async (studentId, fromTablePlantillaId) => { // fromTablePlantillaId és l'ID de la taula de la plantilla
        const studentToUnassign = displayedStudents.find(s => s.id === studentId);
        if (!studentToUnassign || studentToUnassign.taula_plantilla_id !== fromTablePlantillaId) {
            return; // Ja està desassignat o no pertany a la taula esperada
        }
        setDisplayedStudents(prevStudents =>
            prevStudents.map(s =>
                s.id === studentId ? { ...s, taula_plantilla_id: null } : s
            )
        );
        // Mateixa nota: el desat es fa globalment.
    };
    
    // 8. Netejar assignacions de la distribució actual (tornar tots al pool)
    const handleClearCurrentAssignments = () => {
        if (!activePlantilla) return;
        if (!window.confirm("Segur que vols treure tots els alumnes de les taules actuals i tornar-los al pool? Els canvis no desats es perdran.")) return;
        setDisplayedStudents(prevStudents => prevStudents.map(s => ({ ...s, taula_plantilla_id: null })));
        setProposedAssignments([]); // Netejar propostes d'auto-assignació també
        toast.info("Totes les assignacions actuals netejades.");
    };

    // 9. Lògica d'Auto-Assignació (Adaptada)
    const handleAutoAssign = async () => {
        if (!activePlantilla) {
            toast.error("Selecciona una plantilla d'aula abans d'assignar automàticament.");
            return;
        }
        setIsProcessingAutoAssign(true);
        setError(prev => ({ ...prev, autoAssign: null }));
        setProposedAssignments([]);

        // Només alumnes que estan actualment al pool (taula_plantilla_id === null)
        const studentsForAutoAssign = displayedStudents
            .filter(s => s.taula_plantilla_id === null)
            .map(s => ({ // Enviem les dades que l'algorisme espera
                id: s.id,
                name: s.name,
                academic_grade: s.academic_grade,
                gender: s.gender,
                restrictions: s.restrictions,
                current_table_id: null // Indiquem que són del pool
            }));
        
        // Afegim els alumnes ja assignats a taules de la plantilla actual per a que l'algorisme els consideri
         const alreadyAssignedStudents = displayedStudents
            .filter(s => s.taula_plantilla_id !== null)
            .map(s => ({
                id: s.id,
                name: s.name,
                academic_grade: s.academic_grade,
                gender: s.gender,
                restrictions: s.restrictions,
                current_table_id: s.taula_plantilla_id 
            }));
        
        const payloadStudents = [...alreadyAssignedStudents, ...studentsForAutoAssign];


        try {
            const payload = {
                plantilla_id: activePlantilla.id_plantilla,
                students: payloadStudents, // Només els del pool per assignar-los
                balanceByGender: balanceByGender,
            };
            const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}/assignments/auto-assign`, payload);
            if (response.data.success) {
                setProposedAssignments(response.data.proposedAssignments || []);
                if (!response.data.proposedAssignments || response.data.proposedAssignments.length === 0) {
                    toast.warn("L'algorisme no ha generat noves assignacions per als alumnes del pool.");
                } else {
                    toast.info(`L'algorisme proposa ${response.data.proposedAssignments.length} noves assignacions.`);
                }
            } else {
                throw new Error(response.data.message || "Error en l'auto-assignació des del backend.");
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "Error cridant a l'algorisme.";
            setError(prev => ({ ...prev, autoAssign: errorMessage }));
            toast.error(errorMessage);
        } finally {
            setIsProcessingAutoAssign(false);
        }
    };

    const applyProposedAssignments = () => {
        if (proposedAssignments.length === 0) return;
        setIsApplyingProposal(true);
        
        let currentDisplayedStudents = [...displayedStudents];
        proposedAssignments.forEach(proposal => {
            currentDisplayedStudents = currentDisplayedStudents.map(s =>
                s.id === proposal.studentId ? { ...s, taula_plantilla_id: proposal.tableId } : s
            );
        });
        setDisplayedStudents(currentDisplayedStudents);

        toast.success(`${proposedAssignments.length} assignacions proposades aplicades localment. Desa la distribució per persistir els canvis.`);
        setProposedAssignments([]);
        setIsApplyingProposal(false);
    };

     const discardProposedAssignments = () => {
        setProposedAssignments([]);
        setError(prev => ({ ...prev, autoAssign: null }));
        toast.info("Propostes descartades.");
    };


    // Renderitzat
    if (loading.global && !activePlantilla) {
        return <div style={loadingErrorStyle}>Carregant dades inicials...</div>;
    }
    
    const unassignedStudents = displayedStudents.filter(s => s.taula_plantilla_id === null);
    const taulesPerRenderitzar = activePlantilla 
        ? activePlantilla.taules.map(t => ({
            ...t, // id_taula_plantilla, identificador_taula_dins_plantilla, capacitat
            // Cal canviar 'id' a 'id_taula_plantilla' i 'table_number' a 'identificador_taula_dins_plantilla'
            // per a DroppableTable o adaptar DroppableTable
            students: displayedStudents.filter(s => s.taula_plantilla_id === t.id_taula_plantilla)
          }))
        : [];

    return (
        <div style={pageStyle}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', width: '100%' }}>Distribució d'alumnes a una plantilla</h2>

            {/* Secció de Selecció de Plantilla i Distribució */}
            <div style={selectionSectionStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '10px' }}>1. Selecciona plantilla</h3>
                {error.plantilla && <p style={{color: 'red'}}>Error plantilla: {error.plantilla}</p>}
                
                <label htmlFor="plantillaSelector" style={labelStyle}>Plantilla:</label>
                <select
                    id="plantillaSelector"
                    style={inputStyle}
                    value={selectedPlantillaId}
                    onChange={(e) => setSelectedPlantillaId(e.target.value)}
                    disabled={loading.plantilles || loading.global}
                >
                    <option value="">-- Selecciona una Plantilla --</option>
                    {plantillesAula.map(p => (
                        <option key={p.id_plantilla} value={p.id_plantilla}>
                            {p.nom_plantilla} (Creada: {new Date(p.created_at).toLocaleDateString()})
                        </option>
                    ))}
                </select>
                {loading.plantilles && <p>Carregant plantilles...</p>}

                {activePlantilla && (
                    <>
                        <label htmlFor="distribucioSelector" style={labelStyle}>Distribució desada (per "{activePlantilla.nom_plantilla}"):</label>
                        <div style={{display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px'}}>
                            <select
                                id="distribucioSelector"
                                style={{...inputStyle, marginBottom: '0', flexGrow: 1}}
                                value={selectedDistribucioId}
                                onChange={(e) => setSelectedDistribucioId(e.target.value)}
                                disabled={loading.distribucions || distribucionsDesades.length === 0}
                            >
                                <option value="">-- Nova distribució / Carregar --</option>
                                {distribucionsDesades.map(d => (
                                    <option key={d.id_distribucio} value={d.id_distribucio}>
                                        {d.nom_distribucio} (Desada: {new Date(d.created_at).toLocaleDateString()})
                                    </option>
                                ))}
                            </select>
                            <button onClick={handleLoadSelectedDistribucio} disabled={!selectedDistribucioId || loading.global} style={{...buttonStyle, backgroundColor: '#5cb85c', color: 'white'}}>
                                Carregar
                            </button>
                             <button onClick={openConfirmDeleteDistribucioModal} disabled={!selectedDistribucioId || loading.global} style={{...buttonStyle, backgroundColor: '#d9534f', color: 'white'}}>
                                Esborrar
                            </button>
                        </div>
                        {loading.distribucions && <p>Carregant distribucions...</p>}
                        {error.distribucio && <p style={{color: 'red'}}>Error distribucions: {error.distribucio}</p>}
                    </>
                )}
            </div>

            {/* Secció per desar la distribució actual */}
            {activePlantilla && (
                 <div style={{...controlSectionBaseStyle, borderColor: '#5bc0de', backgroundColor: '#f0faff'}}>
                    <h3 style={{ marginTop: 0, marginBottom: '10px' }}>2. Desa la distribució actual</h3>
                     {activeDistribucioInfo && <p><em>Editant: {activeDistribucioInfo.nom}</em></p>}
                    <input
                        type="text"
                        placeholder="Nom per a la nova distribució..."
                        style={inputStyle}
                        value={nomNovaDistribucio}
                        onChange={(e) => setNomNovaDistribucio(e.target.value)}
                    />
                    <textarea
                        placeholder="Descripció (opcional)..."
                        style={{...inputStyle, height: '60px', resize: 'vertical'}}
                        value={descNovaDistribucio}
                        onChange={(e) => setDescNovaDistribucio(e.target.value)}
                    />
                    <button onClick={handleSaveCurrentDistribucio} disabled={loading.distribucio || !nomNovaDistribucio.trim()} style={{...buttonStyle, backgroundColor: '#5bc0de', color: 'white'}}>
                        {loading.distribucio ? 'Desant...' : 'Desar distribució actual'}
                    </button>
                </div>
            )}

            {/* Secció d'Accions (Auto-Assignar, Netejar) */}
            {activePlantilla && (
                <div style={{...controlSectionBaseStyle, borderColor: '#ffc107', backgroundColor: '#fff8e1'}}>
                    <h3 style={{ marginTop: 0, marginBottom: '15px' }}>3. Modifica la distribució</h3>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center'}}>
                        <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
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
                            disabled={isProcessingAutoAssign || isApplyingProposal || loading.autoAssign || unassignedStudents.length === 0}
                            style={{...buttonStyle, backgroundColor: '#007bff', color: 'white', width: 'auto'}}
                        >
                            {isProcessingAutoAssign ? 'Processant...' : 'Assignar automàticament alumnes no assignats'}
                        </button>
                         <button
                            onClick={handleClearCurrentAssignments}
                            disabled={loading.global || displayedStudents.every(s => s.taula_plantilla_id === null)} // Desactivat si tot està al pool
                            style={{...buttonStyle, backgroundColor: '#ffc107', color: 'black', width: 'auto'}}
                            title="Mou tots els alumnes de les taules al pool d'alumnes no assignats"
                        >
                            Desassignar tots els alumnes
                        </button>
                    </div>
                    {error.autoAssign && <p style={{ color: 'red', marginTop: '10px', fontWeight:'bold' }}>Error auto-assignació: {error.autoAssign}</p>}
                    {proposedAssignments.length > 0 && !isApplyingProposal && (
                        <div style={{border: '1px solid orange', padding: '15px', marginTop: '15px', backgroundColor: '#fff3e0', borderRadius: '8px'}}>
                            <h4 style={{marginTop:0}}>Assignacions proposades:</h4>
                            <ul style={{listStylePosition: 'inside', paddingLeft:0, maxHeight: '150px', overflowY: 'auto', marginBottom: '15px'}}>
                            {proposedAssignments.map(p => (
                                <li key={p.studentId}><strong>{p.studentName}</strong> → Taula <strong>{p.tableName}</strong></li>
                            ))}
                            </ul>
                            <div style={{textAlign:'center'}}>
                                <button onClick={applyProposedAssignments} style={{...buttonStyle, backgroundColor: '#28a745', color: 'white'}} disabled={isApplyingProposal}>
                                    {isApplyingProposal ? 'Aplicant...' : 'Acceptar i aplicar propostes'}
                                </button>
                                <button onClick={discardProposedAssignments} style={{...buttonStyle, backgroundColor: '#6c757d', color: 'white'}} disabled={isApplyingProposal}>
                                    Descartar propostes
                                </button>
                            </div>
                        </div>
                    )}
                    {isApplyingProposal && <p style={loadingErrorStyle}>Aplicant assignacions proposades...</p>}
                </div>
            )}

            {/* Àrea Principal: Pool d'Alumnes i Taules de la Plantilla */}
            {activePlantilla && (
                <div style={contentWrapperStyle}>
                    <div style={poolStyle}> 
                        <StudentPoolDropZone 
                            onDropToPool={handleUnassignStudent} // Aquesta funció espera (studentId, fromTableId)
                            unassignedStudentsCount={unassignedStudents.length}
                        >
                            {unassignedStudents.length > 0 ? (
                                unassignedStudents.map(student => (
                                    <DraggableStudentCard 
                                        key={`pool-${student.id}`}
                                        student={{...student, originalTableId: null }} // Indiquem que ve del pool
                                        // onDragEnd no cal aquí si StudentPoolDropZone gestiona el drop per desassignar
                                    />
                                ))
                            ) : (
                                <p style={{textAlign: 'center', fontStyle: 'italic', marginTop: '20px', color: '#777'}}>
                                    Tots els alumnes assignats o no hi ha alumnes.
                                </p>
                            )}
                        </StudentPoolDropZone>
                    </div>

                    <div style={tablesAreaStyle}>
                        {taulesPerRenderitzar.length > 0 ? (
                            taulesPerRenderitzar.map(taula => (
                                <DroppableTable
                                    key={taula.id_taula_plantilla}
                                    // Adaptar les propietats que espera DroppableTable:
                                    table={{
                                        id: taula.id_taula_plantilla, // ID de la taula dins la plantilla
                                        table_number: taula.identificador_taula_dins_plantilla, // Nom/ID de la taula
                                        capacity: taula.capacitat,
                                        // students: ja està calculat a taulesPerRenderitzar
                                    }}
                                    studentsInTable={taula.students}
                                    onDropStudent={handleDropStudentOnTable}
                                    // onDragEndStudent ha de ser handleUnassignStudent si s'arrossega fora
                                    // però el drop al pool ja ho gestiona.
                                    // Potser cal onDragStart per passar info de la taula origen?
                                />
                            ))
                        ) : (
                            !loading.global && <p style={loadingErrorStyle}>Aquesta plantilla no té taules definides.</p>
                        )}
                        {loading.global && activePlantilla && <p>Actualitzant taules...</p>}
                    </div>
                </div>
            )}
             {!activePlantilla && !loading.global && !loading.plantilles && (
                <div style={{...loadingErrorStyle, marginTop: '30px', fontStyle: 'italic'}}>
                    Selecciona una plantilla d'aula per començar. Si no n'hi ha cap, ves a "Gestionar plantilles" per crear-ne una.
                </div>
             )}
             <ConfirmModal
                isOpen={isConfirmDeleteDistribucioOpen}
                onClose={() => setIsConfirmDeleteDistribucioOpen(false)}
                onConfirm={handleDeleteSelectedDistribucio}
                title="Confirmar Esborrat de Distribució"
                message={`Segur que vols esborrar la distribució "${distribucioToDelete?.nom_distribucio}"?`}
            />
        </div>
    );
}

function ClassroomArrangementPage() { // O DistribucioPage
  return (
    <DragProvider>
      <ClassroomArrangementPageContent />
    </DragProvider>
  );
}

export default ClassroomArrangementPage; // O DistribucioPage