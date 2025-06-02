// frontend/src/pages/ClassroomArrangementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { DragProvider } from '../contexts/DragContext';
import studentService from '../services/studentService';
import plantillaAulaService from '../services/plantillaAulaService';
import distribucioService from '../services/distribucioService';
import classService from '../services/classService'; // NOU

import DraggableStudentCard from '../components/students/DraggableStudentCard';
import DroppableTable from '../components/tables/DroppableTable';
import StudentPoolDropZone from '../components/students/StudentPoolDropZone';
import ConfirmModal from '../components/ConfirmModal';
import axios from 'axios';
import Select from 'react-select'; // Per al selector de classes

// Estils (es mantenen)
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold' };
const pageStyle = { display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', fontFamily: 'Arial, sans-serif', alignItems: 'stretch' };
const contentWrapperStyle = { display: 'flex', gap: '20px', flexGrow: 1 };
const poolStyle = { width: '300px', border: '1px solid #ccc', borderRadius: '8px', padding: '0px', backgroundColor: '#f9f9f9', maxHeight: 'calc(80vh - 120px)', overflowY: 'auto', display: 'flex', flexDirection: 'column' };
const tablesAreaStyle = { flexGrow: 1, border: '1px solid #ccc', borderRadius: '8px', padding: '15px', backgroundColor: '#e9e9e9', display: 'flex', flexWrap: 'wrap', gap: '20px', alignContent: 'flex-start', maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' };
const loadingErrorStyle = { textAlign: 'center', padding: '20px', fontSize: '1.1em', width: '100%' };
const controlSectionBaseStyle = { padding: '15px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '10px' };
const selectionSectionStyle = { ...controlSectionBaseStyle, borderColor: '#007bff', backgroundColor: '#f0f7ff', display: 'flex', flexDirection: 'column', gap: '10px' };
const inputStyle = { display: 'block', width: 'calc(100% - 22px)', padding: '8px 10px', marginBottom: '10px', border: '1px solid #ced4da', borderRadius: '4px', boxSizing: 'border-box' };
const buttonStyle = { padding: '8px 15px', fontSize: '0.9em', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px', minWidth: '80px'};
const classFilterSectionStyle = { ...controlSectionBaseStyle, borderColor: '#28a745', backgroundColor: '#f0fff0', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px'};
const selectStyles = { control: base => ({ ...base, ...inputStyle, padding:0, marginBottom:0, height: 'auto' }), input: base => ({ ...base, margin: '0px'}), valueContainer: base => ({ ...base, padding: '0 8px'})};


function ClassroomArrangementPageContent() {
    const [allStudents, setAllStudents] = useState([]);
    const [displayedStudents, setDisplayedStudents] = useState([]);
    
    const [plantillesAula, setPlantillesAula] = useState([]);
    const [selectedPlantillaId, setSelectedPlantillaId] = useState('');
    const [activePlantilla, setActivePlantilla] = useState(null);

    const [distribucionsDesades, setDistribucionsDesades] = useState([]);
    const [selectedDistribucioId, setSelectedDistribucioId] = useState('');
    const [activeDistribucioInfo, setActiveDistribucioInfo] = useState(null);

    const [nomNovaDistribucio, setNomNovaDistribucio] = useState('');
    const [descNovaDistribucio, setDescNovaDistribucio] = useState('');

    const [availableClasses, setAvailableClasses] = useState([]); // Llista de totes les classes de la BD { value: id_classe, label: nom_classe }
    const [selectedFilterClasses, setSelectedFilterClasses] = useState([]); // Classes seleccionades per al filtre { value: id_classe, label: nom_classe }


    const [loading, setLoading] = useState({ global: true, plantilles: true, distribucions: false, autoAssign: false, classes: true });
    const [error, setError] = useState({ global: null, plantilla: null, distribucio: null, autoAssign: null, classes: null });
    
    const [isProcessingAutoAssign, setIsProcessingAutoAssign] = useState(false);
    const [proposedAssignments, setProposedAssignments] = useState([]);
    const [isApplyingProposal, setIsApplyingProposal] = useState(false);
    const [balanceByGender, setBalanceByGender] = useState(false);
    
    const [isConfirmDeleteDistribucioOpen, setIsConfirmDeleteDistribucioOpen] = useState(false);
    const [distribucioToDelete, setDistribucioToDelete] = useState(null);

    // Càrrega inicial d'alumnes, llista de plantilles i classes
    const fetchInitialData = useCallback(async () => {
        setLoading(prev => ({ ...prev, global: true, plantilles: true, classes: true }));
        setError(prev => ({ ...prev, global: null, plantilla: null, distribucio: null, classes: null }));
        try {
            const [studentsRes, plantillesRes, classesRes] = await Promise.all([
                studentService.getAllStudents(),
                plantillaAulaService.getAllPlantillesAula(),
                classService.getAllClasses()
            ]);

            setAllStudents(studentsRes);
            setDisplayedStudents([]); // Es poblarà quan es seleccioni plantilla i classes

            if (plantillesRes.success) {
                setPlantillesAula(plantillesRes.plantilles);
            } else {
                throw new Error(plantillesRes.message || "Error carregant plantilles d'aula.");
            }

            if (classesRes.success) {
                setAvailableClasses(classesRes.classes.map(c => ({ value: c.id_classe, label: c.nom_classe })));
            } else {
                throw new Error(classesRes.message || "Error carregant les classes.");
            }

        } catch (err) {
            console.error("Error fetching initial data:", err);
            const errorMessage = err.message || "Error carregant dades inicials.";
            setError(prev => ({ ...prev, global: errorMessage, plantilla: errorMessage, classes: errorMessage }));
        } finally {
            setLoading(prev => ({ ...prev, global: false, plantilles: false, classes: false }));
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // Efecte per carregar les taules d'una plantilla i resetejar filtres/distribucions
    useEffect(() => {
        if (selectedPlantillaId) {
            const loadPlantillaDetails = async () => {
                setLoading(prev => ({ ...prev, global: true }));
                setError(prev => ({ ...prev, plantilla: null, distribucio: null }));
                setActiveDistribucioInfo(null);
                setSelectedDistribucioId('');
                setSelectedFilterClasses([]); // Reseteja filtre de classes en canviar plantilla
                setDisplayedStudents([]);   // Neteja alumnes mostrats
                try {
                    const response = await plantillaAulaService.getPlantillaAulaById(selectedPlantillaId);
                    if (response.success) {
                        setActivePlantilla(response.plantilla);
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
            setActivePlantilla(null);
            setDistribucionsDesades([]);
            setDisplayedStudents([]);
            setSelectedFilterClasses([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPlantillaId]);


    // Efecte per actualitzar displayedStudents quan canvia la plantilla activa o el filtre de classes (si NO s'ha carregat una distribució)
    useEffect(() => {
        if (activePlantilla && !selectedDistribucioId) { // Només si no hi ha una distribució carregada (que ja gestiona els seus alumnes)
            let studentsForPool = [];
            if (selectedFilterClasses.length > 0) {
                const selectedClassIds = selectedFilterClasses.map(sc => sc.value);
                studentsForPool = allStudents
                    .filter(s => s.id_classe_alumne && selectedClassIds.includes(s.id_classe_alumne))
                    .map(s => ({ ...s, taula_plantilla_id: null }));
            }
            setDisplayedStudents(studentsForPool);
        }
        // Si selectedDistribucioId té valor, handleLoadSelectedDistribucio s'encarrega de displayedStudents
    }, [activePlantilla, selectedFilterClasses, allStudents, selectedDistribucioId]);


    const fetchDistribucionsForPlantilla = async (plantillaId) => {
        if (!plantillaId) return;
        setLoading(prev => ({ ...prev, distribucions: true }));
        try {
            const response = await distribucioService.getAllDistribucions(plantillaId);
            if (response.success) {
                setDistribucionsDesades(response.distribucions); // Aquestes ja haurien d'incloure 'filtered_classes'
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
                setNomNovaDistribucio(distribucio.nom_distribucio);
                setDescNovaDistribucio(distribucio.descripcio_distribucio || '');

                // Establir les classes seleccionades per al filtre segons la distribució carregada
                if (distribucio.selected_classes && distribucio.selected_classes.length > 0) {
                    const filterClasses = distribucio.selected_classes.map(c => ({ value: c.id_classe, label: c.nom_classe }));
                    setSelectedFilterClasses(filterClasses);
                } else {
                    setSelectedFilterClasses([]); // Si la distribució no tenia filtre de classe, el netegem
                }
                
                // Actualitzar l'estat dels alumnes mostrats basant-se en ELS ALUMNES DE LA DISTRIBUCIÓ
                // Primer, agafem tots els alumnes que estan en les assignacions de la distribució
                const studentIdsInLoadedDistribucio = new Set(distribucio.assignacions.map(a => a.alumne_id));
                const studentsRelevantToLoadedDistribucio = allStudents.filter(s => studentIdsInLoadedDistribucio.has(s.id));

                const newDisplayedStudents = studentsRelevantToLoadedDistribucio.map(stud => {
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

    const handleSaveCurrentDistribucio = async () => {
        if (!activePlantilla) {
            toast.warn("Selecciona una plantilla d'aula primer.");
            return;
        }
        if (!nomNovaDistribucio.trim()) {
            toast.warn("Introdueix un nom per a la distribució.");
            return;
        }
        if (selectedFilterClasses.length === 0) {
            toast.warn("Has de seleccionar almenys una classe per desar la distribució.");
            return;
        }

        setLoading(prev => ({ ...prev, distribucio: true }));
        try {
            const assignacionsActuals = displayedStudents
                .map(s => ({ alumne_id: s.id, taula_plantilla_id: s.taula_plantilla_id })); // Inclou els del pool (null)
            
            const payload = {
                nom_distribucio: nomNovaDistribucio,
                descripcio_distribucio: descNovaDistribucio,
                plantilla_id: activePlantilla.id_plantilla,
                assignacions: assignacionsActuals,
                selected_classes_ids: selectedFilterClasses.map(sc => sc.value) // AFEGIT
            };

            const response = await distribucioService.saveDistribucio(payload);
            if (response.success) {
                toast.success(`Distribució "${response.distribucio.nom_distribucio}" desada!`);
                // No netegem nomNovaDistribucio ni descNovaDistribucio per si es vol sobreescriure.
                // setNomNovaDistribucio('');
                // setDescNovaDistribucio('');
                await fetchDistribucionsForPlantilla(activePlantilla.id_plantilla);
                setSelectedDistribucioId(response.distribucio.id_distribucio);
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
            // setSelectedFilterClasses([]); // Opcional: resetejar el filtre de classe
            // setDisplayedStudents([]);
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

    const handleDropStudentOnTable = async (studentId, targetTablePlantillaId, originalTableIdFromDragItem) => {
        const studentToMove = displayedStudents.find(s => s.id === studentId);
        const targetTable = activePlantilla?.taules.find(t => t.id_taula_plantilla === targetTablePlantillaId);

        if (!studentToMove || !targetTable || !activePlantilla) {
            toast.error("Error: Alumne, taula o plantilla no disponibles.");
            return;
        }
        if (studentToMove.taula_plantilla_id === targetTablePlantillaId) return;

        const studentsInTargetTable = displayedStudents.filter(s => s.taula_plantilla_id === targetTablePlantillaId && s.id !== studentId);
        if (studentsInTargetTable.length >= targetTable.capacitat) {
            toast.warn(`La taula "${targetTable.identificador_taula_dins_plantilla}" està plena!`);
            return;
        }
        if (studentToMove.restrictions && studentToMove.restrictions.length > 0) {
            for (const sidInTable of studentsInTargetTable.map(s => s.id)) {
                if (studentToMove.restrictions.includes(sidInTable)) {
                    const restrictedWithName = allStudents.find(s => s.id === sidInTable)?.name || 'un alumne';
                    toast.error(`Conflicte: ${studentToMove.name} no pot seure amb ${restrictedWithName}.`);
                    return;
                }
            }
        }
        setDisplayedStudents(prevStudents =>
            prevStudents.map(s =>
                s.id === studentId ? { ...s, taula_plantilla_id: targetTablePlantillaId } : s
            )
        );
    };

    const handleUnassignStudent = async (studentId, fromTablePlantillaId) => {
        const studentToUnassign = displayedStudents.find(s => s.id === studentId);
        if (!studentToUnassign || studentToUnassign.taula_plantilla_id !== fromTablePlantillaId) {
            return; 
        }
        setDisplayedStudents(prevStudents =>
            prevStudents.map(s =>
                s.id === studentId ? { ...s, taula_plantilla_id: null } : s
            )
        );
    };
    
    const handleClearCurrentAssignments = () => {
        if (!activePlantilla) return;
        if (!window.confirm("Segur que vols treure tots els alumnes de les taules actuals i tornar-los al pool? Els canvis no desats es perdran.")) return;
        setDisplayedStudents(prevStudents => 
            prevStudents.map(s => ({ ...s, taula_plantilla_id: null }))
        );
        setProposedAssignments([]);
        toast.info("Totes les assignacions actuals netejades (dels alumnes mostrats).");
    };

    const handleAutoAssign = async () => {
        if (!activePlantilla) {
            toast.error("Selecciona una plantilla d'aula abans d'assignar automàticament.");
            return;
        }
        // unassignedStudents ja està filtrat per classe si selectedFilterClasses té valor
        if (unassignedStudents.length === 0) {
            toast.info("No hi ha alumnes no assignats (del filtre de classe actual) per a l'assignació automàtica.");
            return;
        }
        setIsProcessingAutoAssign(true);
        setError(prev => ({ ...prev, autoAssign: null }));
        setProposedAssignments([]);

        const studentsForAutoAssignPayload = unassignedStudents.map(s => ({
            id: s.id,
            name: s.name,
            academic_grade: s.academic_grade,
            gender: s.gender,
            restrictions: s.restrictions,
            current_table_id: null
        }));
        
        const alreadyAssignedStudentsPayload = displayedStudents
            .filter(s => s.taula_plantilla_id !== null)
            .map(s => ({
                id: s.id,
                name: s.name,
                academic_grade: s.academic_grade,
                gender: s.gender,
                restrictions: s.restrictions,
                current_table_id: s.taula_plantilla_id 
            }));
        
        const payloadStudents = [...alreadyAssignedStudentsPayload, ...studentsForAutoAssignPayload];

        try {
            const payload = {
                plantilla_id: activePlantilla.id_plantilla,
                students: payloadStudents,
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

    if (loading.global && !activePlantilla && !loading.classes) {
        return <div style={loadingErrorStyle}>Carregant dades inicials...</div>;
    }
    if (loading.classes) {
        return <div style={loadingErrorStyle}>Carregant llista de classes...</div>;
    }
    
    const unassignedStudents = displayedStudents.filter(s => s.taula_plantilla_id === null);
    const taulesPerRenderitzar = activePlantilla 
        ? activePlantilla.taules.map(t => ({
            ...t,
            students: displayedStudents.filter(s => s.taula_plantilla_id === t.id_taula_plantilla)
          }))
        : [];

    return (
        <div style={pageStyle}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', width: '100%' }}>Distribució d'alumnes a una plantilla</h2>

            <div style={selectionSectionStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '10px' }}>1. Selecciona plantilla i distribució</h3>
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
                                        {d.nom_distribucio} ({d.filtered_classes?.length > 0 ? d.filtered_classes.map(fc=>fc.nom_classe).join(', ') : 'Sense filtre classe'})
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
            
            {activePlantilla && availableClasses.length > 0 && (
                 <div style={classFilterSectionStyle}>
                    <h3 style={{ marginTop: 0, marginBottom: '10px' }}>2. Filtra alumnes per classe</h3>
                    <label htmlFor="classFilterSelector" style={labelStyle}>Classes seleccionades:</label>
                    <Select
                        id="classFilterSelector"
                        isMulti
                        options={availableClasses}
                        value={selectedFilterClasses}
                        onChange={setSelectedFilterClasses}
                        placeholder="Selecciona classes..."
                        isDisabled={loading.global || loading.classes}
                        noOptionsMessage={() => "No hi ha classes disponibles."}
                        styles={selectStyles}
                    />
                    {error.classes && <p style={{color: 'red'}}>Error classes: {error.classes}</p>}
                </div>
            )}


            {activePlantilla && (
                 <div style={{...controlSectionBaseStyle, borderColor: '#5bc0de', backgroundColor: '#f0faff'}}>
                    <h3 style={{ marginTop: 0, marginBottom: '10px' }}>3. Desa la distribució actual</h3>
                     {activeDistribucioInfo && <p><em>{selectedDistribucioId ? `Editant: ${activeDistribucioInfo.nom}` : 'Creant nova distribució...'}</em></p>}
                    <input
                        type="text"
                        placeholder="Nom per a la distribució..."
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
                    <button 
                        onClick={handleSaveCurrentDistribucio} 
                        disabled={loading.distribucio || !nomNovaDistribucio.trim() || selectedFilterClasses.length === 0} 
                        style={{...buttonStyle, backgroundColor: '#5bc0de', color: 'white'}}
                        title={selectedFilterClasses.length === 0 ? "Has de seleccionar almenys una classe per desar" : "Desar distribució"}
                    >
                        {loading.distribucio ? 'Desant...' : (selectedDistribucioId ? 'Actualitzar distribució (Nou nom/Desc)' : 'Desar nova distribució')}
                    </button>
                     {selectedFilterClasses.length === 0 && <p style={{color: 'orange', fontSize: '0.9em', marginTop: '5px'}}>Nota: Has de seleccionar almenys una classe per poder desar la distribució.</p>}
                </div>
            )}

            {activePlantilla && (
                <div style={{...controlSectionBaseStyle, borderColor: '#ffc107', backgroundColor: '#fff8e1'}}>
                    <h3 style={{ marginTop: 0, marginBottom: '15px' }}>4. Modifica la distribució</h3>
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
                            disabled={isProcessingAutoAssign || isApplyingProposal || loading.autoAssign || unassignedStudents.length === 0 || selectedFilterClasses.length === 0}
                            style={{...buttonStyle, backgroundColor: '#007bff', color: 'white', width: 'auto'}}
                            title={selectedFilterClasses.length === 0 ? "Selecciona classes primer" : (unassignedStudents.length === 0 ? "No hi ha alumnes no assignats per aquesta selecció de classes" : "Assignar automàticament")}
                        >
                            {isProcessingAutoAssign ? 'Processant...' : 'Assignar automàticament alumnes no assignats'}
                        </button>
                         <button
                            onClick={handleClearCurrentAssignments}
                            disabled={loading.global || displayedStudents.every(s => s.taula_plantilla_id === null) || selectedFilterClasses.length === 0}
                            style={{...buttonStyle, backgroundColor: '#ffc107', color: 'black', width: 'auto'}}
                            title="Mou tots els alumnes de les taules al pool d'alumnes no assignats (per al filtre de classes actual)"
                        >
                            Desassignar tots els alumnes (del filtre actual)
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

            {activePlantilla && (selectedFilterClasses.length > 0 || displayedStudents.some(s => s.taula_plantilla_id !== null)) && (
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
                                    />
                                ))
                            ) : (
                                <p style={{textAlign: 'center', fontStyle: 'italic', marginTop: '20px', color: '#777'}}>
                                    {selectedFilterClasses.length === 0 ? "Selecciona classes per veure alumnes al pool." : "Tots els alumnes de les classes seleccionades estan assignats o no n'hi ha."}
                                </p>
                            )}
                        </StudentPoolDropZone>
                    </div>

                    <div style={tablesAreaStyle}>
                        {taulesPerRenderitzar.length > 0 ? (
                            taulesPerRenderitzar.map(taula => (
                                <DroppableTable
                                    key={taula.id_taula_plantilla}
                                    table={{
                                        id: taula.id_taula_plantilla,
                                        table_number: taula.identificador_taula_dins_plantilla,
                                        capacity: taula.capacitat,
                                    }}
                                    studentsInTable={taula.students}
                                    onDropStudent={handleDropStudentOnTable}
                                />
                            ))
                        ) : (
                            !loading.global && activePlantilla && <p style={loadingErrorStyle}>Aquesta plantilla no té taules definides.</p>
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
              {activePlantilla && selectedFilterClasses.length === 0 && !displayedStudents.some(s => s.taula_plantilla_id !== null) && (
                 <div style={{...loadingErrorStyle, marginTop: '30px', fontStyle: 'italic', color: '#777'}}>
                    Selecciona una o més classes per començar a distribuir alumnes.
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

function ClassroomArrangementPage() {
  return (
    <DragProvider>
      <ClassroomArrangementPageContent />
    </DragProvider>
  );
}

export default ClassroomArrangementPage;