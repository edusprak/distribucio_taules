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
import ExportDistributionButton from '../components/export/ExportDistributionButton';
import axios from 'axios';
import Select from 'react-select'; // Per al selector de classes
import { Box, Paper, Typography, Button, TextField, Checkbox, FormControlLabel, Divider, CircularProgress, MenuItem, Select as MuiSelect, InputLabel, FormControl, Alert, Tooltip, Radio, RadioGroup } from '@mui/material';
import { styled } from '@mui/material/styles';

// Layout principal: dues columnes, esquerra (controls) i dreta (drag&drop)
const MainLayout = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  height: 'calc(100vh - 64px)', // 64px per la navbar
  gap: theme.spacing(2),
  background: theme.palette.background.default,
}));

const Sidebar = styled(Paper)(({ theme }) => ({
  width: 340,
  minWidth: 300,
  maxWidth: 360,
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  background: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
  borderRadius: theme.shape.borderRadius,
  height: '100%',
  overflowY: 'auto',
}));

const DragDropArea = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'row',
  gap: theme.spacing(2),
  height: '100%',
  minWidth: 0,
}));

const PoolZone = styled(Paper)(({ theme }) => ({
  width: 300,
  minWidth: 260,
  maxWidth: 340,
  padding: theme.spacing(1),
  background: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflowY: 'auto',
}));

const TablesZone = styled(Box)(({ theme }) => ({
  flex: 1,
  background: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  padding: theme.spacing(2),
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(3),
  alignContent: 'flex-start',
  justifyContent: 'flex-start',
  height: '100%',
  overflowY: 'auto',
}));

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
    const [error, setError] = useState({ global: null, plantilla: null, distribucio: null, autoAssign: null, classes: null });    const [isProcessingAutoAssign, setIsProcessingAutoAssign] = useState(false);
    const [balanceByGender, setBalanceByGender] = useState(false);
    const [usePreferences, setUsePreferences] = useState(true);
    const [gradeAssignmentCriteria, setGradeAssignmentCriteria] = useState('academic'); // 'academic', 'attitude', 'average'
    const [lastAssignmentMetrics, setLastAssignmentMetrics] = useState(null);
    
    // Nova funcionalitat: Mètriques dinàmiques
    const [currentMetrics, setCurrentMetrics] = useState(null);

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
            let studentsForPool = [];            if (selectedFilterClasses.length > 0) {
                const selectedClassIds = selectedFilterClasses
                    .filter(sc => sc && sc.value) // Filtrar elements vàlids
                    .map(sc => sc.value);
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
                setDescNovaDistribucio(distribucio.descripcio_distribucio || '');                // Establir les classes seleccionades per al filtre segons la distribució carregada
                if (distribucio.selected_classes && distribucio.selected_classes.length > 0) {
                    const filterClasses = distribucio.selected_classes
                        .filter(c => c && c.id_classe && c.nom_classe) // Filtrar elements vàlids
                        .map(c => ({ value: c.id_classe, label: c.nom_classe }));
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
                // Netejar mètriques de l'assignació automàtica en carregar una distribució
                setLastAssignmentMetrics(null);
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
                selected_classes_ids: selectedFilterClasses
                    .filter(sc => sc && sc.value) // Filtrar elements vàlids
                    .map(sc => sc.value) // AFEGIT
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
            }        }
        
        // Guardar l'estat anterior per comprovar preferències trencades
        const previousState = [...displayedStudents];
        
        setDisplayedStudents(prevStudents =>
            prevStudents.map(s =>
                s.id === studentId ? { ...s, taula_plantilla_id: targetTablePlantillaId } : s
            )
        );
        
        // Comprovar preferències trencades després del moviment
        checkBrokenPreferences(studentId, targetTablePlantillaId, previousState);
        
        // Netejar mètriques de l'assignació automàtica quan es mou manualment un alumne
        setLastAssignmentMetrics(null);
    };

    const handleUnassignStudent = async (studentId, fromTablePlantillaId) => {
        const studentToUnassign = displayedStudents.find(s => s.id === studentId);        if (!studentToUnassign || studentToUnassign.taula_plantilla_id !== fromTablePlantillaId) {
            return; 
        }
        
        // Guardar l'estat anterior per comprovar preferències trencades
        const previousState = [...displayedStudents];
        
        setDisplayedStudents(prevStudents =>
            prevStudents.map(s =>
                s.id === studentId ? { ...s, taula_plantilla_id: null } : s
            )
        );
        
        // Comprovar preferències trencades després de moure al pool
        checkBrokenPreferences(studentId, null, previousState);
        
        // Netejar mètriques de l'assignació automàtica quan es mou manualment un alumne
        setLastAssignmentMetrics(null);
    };
      const handleClearCurrentAssignments = () => {
        if (!activePlantilla) return;
        if (!window.confirm("Segur que vols treure tots els alumnes de les taules actuals i tornar-los al pool? Els canvis no desats es perdran.")) return;
        setDisplayedStudents(prevStudents => 
            prevStudents.map(s => ({ ...s, taula_plantilla_id: null }))
        );
        setLastAssignmentMetrics(null); // Netejar mètriques
        toast.info("Totes les assignacions actuals netejades (dels alumnes mostrats).");
    };

    const handleAutoAssign = async () => {
        if (!activePlantilla) {
            toast.error("Selecciona una plantilla d'aula abans d'assignar automàticament.");
            return;
        }
        if (unassignedStudents.length === 0) {
            toast.info("No hi ha alumnes no assignats (del filtre de classe actual) per a l'assignació automàtica.");
            return;
        }
        setIsProcessingAutoAssign(true);        setError(prev => ({ ...prev, autoAssign: null }));
        // Elimino estats ja no usats per l'autoassignació directa
        // setProposedAssignments([]);

        const studentsForAutoAssignPayload = unassignedStudents.map(s => ({
            id: s.id,
            name: s.name,
            academic_grade: s.academic_grade,
            attitude_grade: s.attitude_grade,
            gender: s.gender,
            restrictions: s.restrictions,
            preferences: s.preferences, // <-- AFEGIT
            current_table_id: null
        }));
        const alreadyAssignedStudentsPayload = displayedStudents
            .filter(s => s.taula_plantilla_id !== null)
            .map(s => ({
                id: s.id,
                name: s.name,
                academic_grade: s.academic_grade,
                attitude_grade: s.attitude_grade,
                gender: s.gender,
                restrictions: s.restrictions,
                preferences: s.preferences, // <-- AFEGIT
                current_table_id: s.taula_plantilla_id 
            }));
        const payloadStudents = [...alreadyAssignedStudentsPayload, ...studentsForAutoAssignPayload];        try {            const payload = {
                plantilla_id: activePlantilla.id_plantilla,
                students: payloadStudents,
                balanceByGender: balanceByGender,
                usePreferences: usePreferences,
                gradeAssignmentCriteria: gradeAssignmentCriteria,
            };
            const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}/assignments/auto-assign`, payload);            if (response.data.success) {
                const assignments = response.data.proposedAssignments || [];
                const warnings = response.data.warnings || [];
                const metrics = response.data.metrics || {};
                
                if (assignments.length === 0) {
                    toast.warn("L'algorisme no ha generat noves assignacions per als alumnes del pool.");
                } else {
                    // Aplica directament les assignacions proposades
                    let currentDisplayedStudents = [...displayedStudents];
                    assignments.forEach(proposal => {
                        currentDisplayedStudents = currentDisplayedStudents.map(s =>
                            s.id === proposal.studentId ? { ...s, taula_plantilla_id: proposal.tableId } : s
                        );
                    });                    setDisplayedStudents(currentDisplayedStudents);
                    
                    // Guardar mètriques per mostrar
                    setLastAssignmentMetrics(metrics);
                    
                    // Missatge de success amb mètriques de preferències
                    let successMessage = `${assignments.length} assignacions automàtiques aplicades directament.`;
                    if (usePreferences && metrics.totalStudentsWithPreferences > 0) {
                        successMessage += ` Preferències satisfetes: ${metrics.studentsWithSatisfiedPreferences}/${metrics.totalStudentsWithPreferences} (${metrics.preferencesSatisfactionRate}%).`;
                    }
                    successMessage += " Desa la distribució per persistir els canvis.";
                    
                    toast.success(successMessage);
                    
                    // Mostra avisos de preferències/restriccions si n'hi ha
                    if (warnings.length > 0) {
                        warnings.forEach(w => toast.info(w));
                    }
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

    // Funció per calcular mètriques dinàmiques basant-se en l'estat actual
    const calculateCurrentMetrics = useCallback(() => {
        if (!activePlantilla || !displayedStudents.length) {
            setCurrentMetrics(null);
            return;
        }

        // Alumnes assignats (exclou els que estan al pool)
        const assignedStudents = displayedStudents.filter(s => s.taula_plantilla_id !== null);
        
        if (assignedStudents.length === 0) {
            setCurrentMetrics(null);
            return;
        }

        const metrics = {
            totalStudentsAssigned: assignedStudents.length,
            totalStudentsWithPreferences: 0,
            studentsWithSatisfiedPreferences: 0,
            preferencesSatisfactionRate: 0,
            averageGradeBalance: 0,
            genderBalance: null
        };

        // Calcular mètriques de preferències si usePreferences està activat
        if (usePreferences) {
            const studentsWithPrefs = assignedStudents.filter(s => s.preferences && s.preferences.length > 0);
            metrics.totalStudentsWithPreferences = studentsWithPrefs.length;
            
            let satisfiedCount = 0;
            for (const student of studentsWithPrefs) {
                // Trobar companys de taula
                const tablemates = assignedStudents
                    .filter(s => s.taula_plantilla_id === student.taula_plantilla_id && s.id !== student.id)
                    .map(s => s.id);
                
                // Verificar si té almenys un preferit com a company
                const hasPreferredTablemate = student.preferences.some(prefId => 
                    tablemates.includes(prefId)
                );
                
                if (hasPreferredTablemate) {
                    satisfiedCount++;
                }
            }
            
            metrics.studentsWithSatisfiedPreferences = satisfiedCount;
            metrics.preferencesSatisfactionRate = studentsWithPrefs.length > 0 
                ? Math.round((satisfiedCount / studentsWithPrefs.length) * 100) 
                : 100;
        }        // Calcular mètriques d'equilibri de notes (acadèmiques i d'actitud)
        const tablesByPlantillaId = {};
        assignedStudents.forEach(student => {
            const tableId = student.taula_plantilla_id;
            if (!tablesByPlantillaId[tableId]) {
                tablesByPlantillaId[tableId] = [];
            }
            tablesByPlantillaId[tableId].push(student);
        });

        // Mètriques per notes acadèmiques
        const academicTableAverages = Object.values(tablesByPlantillaId)
            .map(studentsInTable => {
                const validGrades = studentsInTable
                    .map(s => parseFloat(s.academic_grade))
                    .filter(grade => !isNaN(grade));
                
                return validGrades.length > 0 
                    ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length
                    : null;
            })
            .filter(avg => avg !== null);

        // Mètriques per notes d'actitud
        const attitudeTableAverages = Object.values(tablesByPlantillaId)
            .map(studentsInTable => {
                const validGrades = studentsInTable
                    .map(s => parseFloat(s.attitude_grade))
                    .filter(grade => !isNaN(grade));
                
                return validGrades.length > 0 
                    ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length
                    : null;
            })
            .filter(avg => avg !== null);

        // Calcular equilibri per notes acadèmiques
        if (academicTableAverages.length > 1) {
            const avgOfAverages = academicTableAverages.reduce((sum, avg) => sum + avg, 0) / academicTableAverages.length;
            const variance = academicTableAverages.reduce((sum, avg) => sum + Math.pow(avg - avgOfAverages, 2), 0) / academicTableAverages.length;
            metrics.averageAcademicGradeBalance = Math.round((1 / (1 + variance)) * 100);
        } else {
            metrics.averageAcademicGradeBalance = academicTableAverages.length === 1 ? 100 : 0;
        }

        // Calcular equilibri per notes d'actitud
        if (attitudeTableAverages.length > 1) {
            const avgOfAverages = attitudeTableAverages.reduce((sum, avg) => sum + avg, 0) / attitudeTableAverages.length;
            const variance = attitudeTableAverages.reduce((sum, avg) => sum + Math.pow(avg - avgOfAverages, 2), 0) / attitudeTableAverages.length;
            metrics.averageAttitudeGradeBalance = Math.round((1 / (1 + variance)) * 100);
        } else {
            metrics.averageAttitudeGradeBalance = attitudeTableAverages.length === 1 ? 100 : 0;
        }

        // Mantenir la mètrica original per compatibilitat
        metrics.averageGradeBalance = metrics.averageAcademicGradeBalance;

        // Calcular mètriques d'equilibri de gènere si balanceByGender està activat
        if (balanceByGender) {
            const genderRatios = Object.values(tablesByPlantillaId)
                .map(studentsInTable => {
                    const maleCount = studentsInTable.filter(s => s.gender === 'male').length;
                    const femaleCount = studentsInTable.filter(s => s.gender === 'female').length;
                    const total = maleCount + femaleCount;
                    return total > 0 ? Math.abs(maleCount - femaleCount) / total : 0;
                });
            
            if (genderRatios.length > 0) {
                const avgGenderImbalance = genderRatios.reduce((sum, ratio) => sum + ratio, 0) / genderRatios.length;
                metrics.genderBalance = Math.round((1 - avgGenderImbalance) * 100);
            }
        }

        setCurrentMetrics(metrics);
    }, [activePlantilla, displayedStudents, usePreferences, balanceByGender]);

    // Efecte per recalcular mètriques quan canviï l'estat dels estudiants
    useEffect(() => {
        calculateCurrentMetrics();
    }, [calculateCurrentMetrics]);

    // Funció per detectar i notificar preferències trencades
    const checkBrokenPreferences = useCallback((studentId, newTableId, previousState) => {
        if (!usePreferences) return;

        const studentMoving = previousState.find(s => s.id === studentId);
        if (!studentMoving || !studentMoving.preferences || studentMoving.preferences.length === 0) return;

        const oldTableId = studentMoving.taula_plantilla_id;
        
        // Comprovar si l'alumne que es mou perd preferències
        let brokenPreferencesForMovingStudent = [];
        if (oldTableId !== null) {
            // Alumnes que quedaran a l'antiga taula
            const studentsRemainingInOldTable = previousState
                .filter(s => s.taula_plantilla_id === oldTableId && s.id !== studentId)
                .map(s => s.id);
            
            // Preferències que es trenquen per l'alumne que es mou
            const preferencesLostByMoving = studentMoving.preferences.filter(prefId => 
                studentsRemainingInOldTable.includes(prefId)
            );
            
            if (preferencesLostByMoving.length > 0) {
                // Comprovar si l'alumne encara té altres preferències satisfetes a la nova taula
                const studentsInNewTable = newTableId ? 
                    previousState.filter(s => s.taula_plantilla_id === newTableId).map(s => s.id) : [];
                
                const preferencesKeptOrGained = studentMoving.preferences.filter(prefId => 
                    studentsInNewTable.includes(prefId)
                );
                
                // Si l'alumne perd totes les preferències
                if (preferencesKeptOrGained.length === 0) {
                    preferencesLostByMoving.forEach(prefId => {
                        const preferredStudent = allStudents.find(s => s.id === prefId);
                        if (preferredStudent) {
                            brokenPreferencesForMovingStudent.push(preferredStudent.name);
                        }
                    });
                }
            }
        }

        // Comprovar si altres alumnes perden les seves preferències amb l'alumne que es mou
        let brokenPreferencesForOthers = [];
        if (oldTableId !== null) {
            const studentsInOldTable = previousState.filter(s => 
                s.taula_plantilla_id === oldTableId && 
                s.id !== studentId &&
                s.preferences && 
                s.preferences.includes(studentId)
            );
            
            studentsInOldTable.forEach(student => {
                // Comprovar si aquest alumne encara té altres preferències satisfetes
                const otherTablemates = previousState
                    .filter(s => s.taula_plantilla_id === oldTableId && s.id !== studentId && s.id !== student.id)
                    .map(s => s.id);
                
                const otherSatisfiedPreferences = student.preferences.filter(prefId => 
                    prefId !== studentId && otherTablemates.includes(prefId)
                );
                
                // Si aquest alumne perd la seva única preferència satisfeta
                if (otherSatisfiedPreferences.length === 0) {
                    brokenPreferencesForOthers.push(student.name);
                }
            });
        }

        // Mostrar notificacions
        if (brokenPreferencesForMovingStudent.length > 0) {
            toast.warning(`⚠️ ${studentMoving.name} ja no té cap preferència satisfeta (abans estava amb: ${brokenPreferencesForMovingStudent.join(', ')})`);
        }
        
        if (brokenPreferencesForOthers.length > 0) {
            toast.warning(`⚠️ ${brokenPreferencesForOthers.join(', ')} ${brokenPreferencesForOthers.length === 1 ? 'ja no té' : 'ja no tenen'} cap preferència satisfeta (${studentMoving.name} era la seva preferència)`);
        }
    }, [usePreferences, allStudents]);

    // Render
    if (loading.global && !activePlantilla && !loading.classes) {
        return <Box display="flex" alignItems="center" justifyContent="center" height="80vh"><CircularProgress /></Box>;
    }
    if (loading.classes) {
        return <Box display="flex" alignItems="center" justifyContent="center" height="80vh"><CircularProgress /></Box>;
    }
    
    const unassignedStudents = displayedStudents.filter(s => s.taula_plantilla_id === null);
    const taulesPerRenderitzar = activePlantilla 
        ? activePlantilla.taules.map(t => ({
            ...t,
            students: displayedStudents.filter(s => s.taula_plantilla_id === t.id_taula_plantilla)
          }))
        : [];

    return (
        <MainLayout>
      <Sidebar>
        <Typography variant="h5" color="primary" fontWeight={700} mb={1} align="center">
          Distribució d'alumnes
        </Typography>
        <Divider sx={{ mb: 1 }} />
        {/* 1. Selecció de plantilla i distribució */}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>1. Selecciona plantilla</Typography>
          {error.plantilla && <Alert severity="error" sx={{ mb: 1 }}>{error.plantilla}</Alert>}
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel id="plantillaSelectorLabel">Plantilla</InputLabel>
            <MuiSelect
              labelId="plantillaSelectorLabel"
              id="plantillaSelector"
              value={selectedPlantillaId}
              label="Plantilla"
              onChange={e => setSelectedPlantillaId(e.target.value)}
              disabled={loading.plantilles || loading.global}
            >
              <MenuItem value="">-- Selecciona una Plantilla --</MenuItem>
              {plantillesAula.map(p => (
                <MenuItem key={p.id_plantilla} value={p.id_plantilla}>
                  {p.nom_plantilla} (Creada: {new Date(p.created_at).toLocaleDateString()})
                </MenuItem>
              ))}
            </MuiSelect>
          </FormControl>
          {loading.plantilles && <Typography variant="body2">Carregant plantilles...</Typography>}
        </Box>
        {activePlantilla && (
          <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>Distribució desada</Typography>
            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
              <InputLabel id="distribucioSelectorLabel">Distribució</InputLabel>
              <MuiSelect
                labelId="distribucioSelectorLabel"
                id="distribucioSelector"
                value={selectedDistribucioId}
                label="Distribució"
                onChange={e => setSelectedDistribucioId(e.target.value)}
                disabled={loading.distribucions || distribucionsDesades.length === 0}              >
                <MenuItem value="">-- Nova distribució / Carregar --</MenuItem>                {distribucionsDesades.map(d => {
                  const tooltipContent = (
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Descripció:</div>
                      <div style={{ marginBottom: '8px' }}>{d.descripcio_distribucio || 'Sense descripció'}</div>
                      <div style={{ fontSize: '0.9em', color: '#ddd' }}>
                        Creada: {new Date(d.created_at).toLocaleString('ca-ES')}
                      </div>
                    </div>
                  );
                  
                  return (
                    <MenuItem key={d.id_distribucio} value={d.id_distribucio}>
                      <Tooltip 
                        title={tooltipContent}
                        placement="right"
                        arrow
                        enterDelay={500}
                        leaveDelay={100}
                      >
                        <span style={{ width: '100%' }}>
                          {d.nom_distribucio} ({d.filtered_classes?.length > 0 ? d.filtered_classes.map(fc=>fc.nom_classe).join(', ') : 'Sense filtre classe'})
                        </span>
                      </Tooltip>
                    </MenuItem>
                  );
                })}
              </MuiSelect>
            </FormControl>            <Box display="flex" gap={1} mb={1}>
              <Button variant="contained" color="success" size="small" fullWidth onClick={handleLoadSelectedDistribucio} disabled={!selectedDistribucioId || loading.global}>
                Carregar
              </Button>
              <Button variant="contained" color="error" size="small" fullWidth onClick={openConfirmDeleteDistribucioModal} disabled={!selectedDistribucioId || loading.global}>
                Esborrar
              </Button>
            </Box>
            {/* Exportar distribució carregada */}
            {selectedDistribucioId && activeDistribucioInfo && (
              <Box mb={1}>
                <ExportDistributionButton
                  distribucio={{
                    nom_distribucio: activeDistribucioInfo.nom,
                    descripcio_distribucio: activeDistribucioInfo.descripcio || '',
                    created_at: new Date().toISOString()
                  }}
                  studentsData={displayedStudents}
                  plantilla={activePlantilla}
                  variant="outlined"
                  size="small"
                  disabled={loading.global || displayedStudents.length === 0}
                />
              </Box>
            )}
            {loading.distribucions && <Typography variant="body2">Carregant distribucions...</Typography>}
            {error.distribucio && <Alert severity="error">{error.distribucio}</Alert>}
          </Box>
        )}
        {/* 2. Filtre de classes */}
        {activePlantilla && availableClasses.length > 0 && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>2. Filtra per classe</Typography>
            <Select
              isMulti
              options={availableClasses}
              value={selectedFilterClasses}
              onChange={setSelectedFilterClasses}
              placeholder="Selecciona classes..."
              isDisabled={loading.global || loading.classes}
              noOptionsMessage={() => "No hi ha classes disponibles."}
              styles={{
                control: base => ({ ...base, minHeight: 36, borderRadius: 8, borderColor: '#E0E3EA', fontSize: 14 }),
                valueContainer: base => ({ ...base, padding: '0 8px'}),
                input: base => ({ ...base, margin: 0 }),
              }}
            />
            {error.classes && <Alert severity="error" sx={{ mt: 1 }}>{error.classes}</Alert>}
          </Box>
        )}
        {/* 4. Controls d'assignació */}        {activePlantilla && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>3. Modifica la distribució</Typography>
            <FormControlLabel
              control={<Checkbox checked={usePreferences} onChange={e => setUsePreferences(e.target.checked)} size="small" disabled={isProcessingAutoAssign} />}
              label={<Typography variant="body2">Usar preferències dels alumnes</Typography>}
              sx={{ mb: 1 }}
            />            <FormControlLabel
              control={<Checkbox checked={balanceByGender} onChange={e => setBalanceByGender(e.target.checked)} size="small" disabled={isProcessingAutoAssign} />}
              label={<Typography variant="body2">Intentar equilibrar per gènere</Typography>}
              sx={{ mb: 1 }}
            />
            
            {/* Nova secció per al criteri de notes */}
            <Box sx={{ mb: 2, p: 1.5, border: '1px solid #E0E3EA', borderRadius: 1, bgcolor: '#F8F9FA' }}>
              <Typography variant="body2" fontWeight={600} mb={1}>Criteri de notes per a l'assignació</Typography>
              <FormControl component="fieldset" size="small">
                <RadioGroup
                  value={gradeAssignmentCriteria}
                  onChange={(e) => setGradeAssignmentCriteria(e.target.value)}
                  row
                >
                  <FormControlLabel
                    value="academic"
                    control={<Radio size="small" disabled={isProcessingAutoAssign} />}
                    label={<Typography variant="body2">Nota acadèmica</Typography>}
                    sx={{ mr: 2 }}
                  />
                  <FormControlLabel
                    value="attitude"
                    control={<Radio size="small" disabled={isProcessingAutoAssign} />}
                    label={<Typography variant="body2">Nota d'actitud</Typography>}
                    sx={{ mr: 2 }}
                  />
                  <FormControlLabel
                    value="average"
                    control={<Radio size="small" disabled={isProcessingAutoAssign} />}
                    label={<Typography variant="body2">Promig de les dues</Typography>}
                  />
                </RadioGroup>
              </FormControl>
            </Box>
            
            {/* Llegenda de colors per a les notes */}
            <Box sx={{ mb: 2, p: 1, border: '1px solid #E0E3EA', borderRadius: 1, bgcolor: '#FAFAFA' }}>
              <Typography variant="caption" fontWeight={600} mb={0.5} display="block">
                Colors de les targetes ({gradeAssignmentCriteria === 'academic' ? 'nota acadèmica' : gradeAssignmentCriteria === 'attitude' ? 'nota d\'actitud' : 'promig de notes'}):
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: '#ffe6e6', border: '1px solid #ddd', borderRadius: 0.5 }} />
                  <Typography variant="caption">0-3</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: '#fff9e6', border: '1px solid #ddd', borderRadius: 0.5 }} />
                  <Typography variant="caption">4-7</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: '#e8f5e8', border: '1px solid #ddd', borderRadius: 0.5 }} />
                  <Typography variant="caption">8-10</Typography>
                </Box>
              </Box>
            </Box>
            
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="small"
              onClick={handleAutoAssign}
              disabled={isProcessingAutoAssign || loading.autoAssign || unassignedStudents.length === 0 || selectedFilterClasses.length === 0}
              sx={{ mb: 1 }}
            >
              {isProcessingAutoAssign ? 'Processant...' : 'Assignar automàticament alumnes no assignats'}
            </Button>
            <Button
              variant="outlined"
              color="warning"
              fullWidth
              size="small"
              onClick={handleClearCurrentAssignments}
              disabled={loading.global || displayedStudents.every(s => s.taula_plantilla_id === null) || selectedFilterClasses.length === 0}
              sx={{ mb: 1 }}
            >
              Desassignar tots els alumnes (del filtre actual)            </Button>
            {error.autoAssign && <Alert severity="error" sx={{ mt: 1 }}>{error.autoAssign}</Alert>}
              {/* Mètriques dinàmiques de la distribució actual */}
            {(currentMetrics || lastAssignmentMetrics) && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  📊 {currentMetrics ? 'Mètriques de la distribució actual' : 'Últimes mètriques d\'assignació'}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Alumnes assignats:</strong> {(currentMetrics || lastAssignmentMetrics).totalStudentsAssigned}
                </Typography>
                
                {/* Mètriques de preferències */}
                {usePreferences && (currentMetrics || lastAssignmentMetrics).totalStudentsWithPreferences > 0 && (
                  <>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Alumnes amb preferències:</strong> {(currentMetrics || lastAssignmentMetrics).totalStudentsWithPreferences}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Preferències satisfetes:</strong> {(currentMetrics || lastAssignmentMetrics).studentsWithSatisfiedPreferences}/{(currentMetrics || lastAssignmentMetrics).totalStudentsWithPreferences}
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: (currentMetrics || lastAssignmentMetrics).preferencesSatisfactionRate >= 80 ? 'success.main' : 
                             (currentMetrics || lastAssignmentMetrics).preferencesSatisfactionRate >= 60 ? 'warning.main' : 'error.main',
                      fontWeight: 600
                    }}>
                      <strong>Taxa d'èxit:</strong> {(currentMetrics || lastAssignmentMetrics).preferencesSatisfactionRate}%
                    </Typography>
                  </>
                )}
                {usePreferences && (currentMetrics || lastAssignmentMetrics).totalStudentsWithPreferences === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Cap alumne té preferències definides
                  </Typography>
                )}
                {!usePreferences && (
                  <Typography variant="body2" color="text.secondary">
                    Preferències desactivades - Només equilibri acadèmic i de gènere
                  </Typography>
                )}
              </Box>
            )}
            
            {/* {isApplyingProposal && <Box display="flex" alignItems="center" justifyContent="center" py={2}><CircularProgress size={24} /></Box>} */}
          </Box>
        )}
        {/* 3. Desa distribució */}
        {activePlantilla && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>4. Desa la distribució</Typography>
            {/* {activeDistribucioInfo && <Typography variant="body2" color="secondary">{selectedDistribucioId ? `Editant: ${activeDistribucioInfo.nom}` : 'Creant nova distribució...'}</Typography>} */}
            <TextField
              size="small"
              fullWidth
              label="Nom de la distribució"
              value={nomNovaDistribucio}
              onChange={e => setNomNovaDistribucio(e.target.value)}
              sx={{ mb: 1 }}
            />
            <TextField
              size="small"
              fullWidth
              label="Descripció (opcional)"
              value={descNovaDistribucio}
              onChange={e => setDescNovaDistribucio(e.target.value)}
              multiline
              minRows={2}
              sx={{ mb: 1 }}
            />            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="small"
              onClick={handleSaveCurrentDistribucio}
              disabled={loading.distribucio || !nomNovaDistribucio.trim() || selectedFilterClasses.length === 0}
              sx={{ mb: 1 }}
            >
              {loading.distribucio ? 'Desant...' : (selectedDistribucioId ? 'Actualitzar distribució' : 'Desar nova distribució')}
            </Button>
            {selectedFilterClasses.length === 0 && <Alert severity="warning">Has de seleccionar almenys una classe per poder desar la distribució.</Alert>}
          </Box>
        )}
        {/* 4. Exportar distribució */}
        {activePlantilla && displayedStudents.length > 0 && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>5. Exportar distribució</Typography>
            <ExportDistributionButton
              distribucio={{
                nom_distribucio: nomNovaDistribucio || activeDistribucioInfo?.nom || 'Distribució actual',
                descripcio_distribucio: descNovaDistribucio || activeDistribucioInfo?.descripcio || '',
                created_at: new Date().toISOString()
              }}
              studentsData={displayedStudents}
              plantilla={activePlantilla}
              variant="outlined"
              size="small"
              disabled={loading.global}
              className="w-100"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.75rem' }}>
              Exporta la distribució actual en diferents formats per compartir o arxivar.
            </Typography>
          </Box>
        )}

      </Sidebar>
      {/* Zona principal: drag & drop */}
      <DragDropArea>
        <PoolZone>
          <StudentPoolDropZone 
            onDropToPool={handleUnassignStudent}
            unassignedStudentsCount={unassignedStudents.length}
          >            {unassignedStudents.length > 0 ? (              unassignedStudents.map(student => (                <DraggableStudentCard 
                  key={`pool-${student.id}`}
                  student={{...student, originalTableId: null }}
                  studentsInSameTable={[]} // Pool d'alumnes no té companys de taula
                  allStudents={allStudents}
                  gradeAssignmentCriteria={gradeAssignmentCriteria}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                {selectedFilterClasses.length === 0 ? "Selecciona classes per veure alumnes al pool." : "Tots els alumnes de les classes seleccionades estan assignats o no n'hi ha."}
              </Typography>
            )}
          </StudentPoolDropZone>
        </PoolZone>
        <TablesZone>
          {taulesPerRenderitzar.length > 0 ? (
            taulesPerRenderitzar.map(taula => (              <DroppableTable
                key={taula.id_taula_plantilla}
                table={{
                  id: taula.id_taula_plantilla,
                  table_number: taula.identificador_taula_dins_plantilla,
                  capacity: taula.capacitat,
                }}
                studentsInTable={taula.students}
                onDropStudent={handleDropStudentOnTable}
                allStudents={allStudents}
                gradeAssignmentCriteria={gradeAssignmentCriteria}
              />
            ))
          ) : (
            !loading.global && activePlantilla && <Typography variant="body2" color="text.secondary" align="center">Aquesta plantilla no té taules definides.</Typography>
          )}
          {loading.global && activePlantilla && <Box display="flex" alignItems="center" justifyContent="center" py={2}><CircularProgress size={24} /></Box>}
        </TablesZone>
      </DragDropArea>
      <ConfirmModal
        isOpen={isConfirmDeleteDistribucioOpen}
        onClose={() => setIsConfirmDeleteDistribucioOpen(false)}
        onConfirm={handleDeleteSelectedDistribucio}
        title="Confirmar Esborrat de Distribució"
        message={`Segur que vols esborrar la distribució "${distribucioToDelete?.nom_distribucio}"?`}
      />
    </MainLayout>
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