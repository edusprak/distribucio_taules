// frontend/src/pages/StudentManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Box, Paper, Typography, Button, TextField, Divider, CircularProgress, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';

import studentService from '../services/studentService';
import StudentList from '../components/students/StudentList';
import StudentForm from '../components/students/StudentForm';
import StudentImport from '../components/students/StudentImport';
import ConfirmModal from '../components/ConfirmModal';

const MainContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  minHeight: 'calc(100vh - 64px)',
  background: theme.palette.background.default,
  padding: theme.spacing(3),
}));

const ContentPaper = styled(Paper)(({ theme }) => ({
  width: '100%',
  maxWidth: 600,
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  background: theme.palette.background.paper,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

function StudentManagementPage() {
  const [allStudents, setAllStudents] = useState([]); // Lista original de todos los alumnos
  const [filteredStudents, setFilteredStudents] = useState([]); // Lista de alumnos a mostrar (filtrada)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
  const [isImportVisible, setIsImportVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState(''); // NUEVO ESTADO para el término de búsqueda

  // Cargar alumnos
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await studentService.getAllStudents();
      setAllStudents(data);
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error en carregar els alumnes.';
      setError(errorMessage);
      console.error("Error fetching students:", err);
      setAllStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // NUEVO: useEffect para filtrar alumnos cuando searchTerm o allStudents cambian
  useEffect(() => {
    if (!searchTerm) {
      setFilteredStudents(allStudents); // Si no hay término, muestra todos
    } else {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const filtered = allStudents.filter(student =>
        student && student.name && student.name.toLowerCase().includes(lowercasedSearchTerm)
      );
      setFilteredStudents(filtered);
    }
  }, [searchTerm, allStudents]);

  const handleCreateNew = () => {
    setEditingStudent(null);
    setIsFormVisible(true);
    setError(null); // Limpiar errores al abrir el formulario
  };

  const handleEditStudent = async (studentBasics) => {
    try {
      setLoading(true);
      const fullStudentData = await studentService.getStudentById(studentBasics.id); //
      setEditingStudent(fullStudentData);
      setIsFormVisible(true);
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Error en carregar les dades de l'alumne per editar.";
      console.error("Error fetching student details for editing:", err);
      setError(errorMessage);
      toast.error(errorMessage); // Notificar al usuario
      setIsFormVisible(false);
      setEditingStudent(null);
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDeleteModal = (studentId, studentName) => {
    setStudentToDelete({ id: studentId, name: studentName });
    setIsConfirmModalOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setLoading(true);
      await studentService.deleteStudent(studentToDelete.id); //
      toast.success(`Alumne "${studentToDelete.name}" esborrat correctament.`);
      await fetchStudents(); // Refresca la lista completa de alumnos
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || `Error en esborrar l'alumne ${studentToDelete.name}.`;
      setError(errorMessage); // Muestra el error en la página si es relevante
      console.error("Error deleting student:", err.response || err);
      toast.error(`Error en esborrar l'alumne: ${errorMessage}`);
    } finally {
      setLoading(false);
      setIsConfirmModalOpen(false);
      setStudentToDelete(null);
    }
  };
    const handleCloseForm = () => {
    setIsFormVisible(false);
    setEditingStudent(null);
    setError(null);
  };

  const handleOpenImport = () => {
    setIsImportVisible(true);
    setIsFormVisible(false);
    setEditingStudent(null);
    setError(null);
  };

  const handleCloseImport = () => {
    setIsImportVisible(false);
    setError(null);
  };

  const handleSaveStudent = async (studentData) => {
    setLoading(true);
    setError(null); // Limpiar errores previos antes de guardar
    try {
      if (editingStudent) {
        await studentService.updateStudent(editingStudent.id, studentData); //
        toast.success(`Alumne "${studentData.name}" actualitzat.`);
      } else {
        await studentService.createStudent(studentData); //
        toast.success(`Alumne "${studentData.name}" creat.`);
      }
      await fetchStudents();
      setIsFormVisible(false);
      setEditingStudent(null);
    } catch (error) {
      const errorMessage = error.message || (error.error ? `${error.error}: ${error.details || ''}` : JSON.stringify(error));
      console.error("Error guardant l'alumne:", error);
      setError(`Error guardant l'alumne: ${errorMessage}`);
      toast.error(`Error guardant l'alumne: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && allStudents.length === 0) {
    return (
      <MainContainer>
        <ContentPaper>
          <Box display="flex" alignItems="center" justifyContent="center" minHeight={200}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>Carregant alumnes...</Typography>
          </Box>
        </ContentPaper>
      </MainContainer>
    );
  }

  if (error && allStudents.length === 0 && !isFormVisible) {
    return (
      <MainContainer>
        <ContentPaper>
          <Alert severity="error" sx={{ mb: 2 }}>Error: {error}</Alert>
          <Button variant="contained" color="primary" onClick={fetchStudents}>Reintentar</Button>
        </ContentPaper>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <ContentPaper>
        <Typography variant="h5" color="primary" fontWeight={700} align="center" mb={1}>
          Gestió d'alumnes
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {error && !isFormVisible && <Alert severity="error" sx={{ mb: 2 }}>Error: {error}</Alert>}        {!isFormVisible && !isImportVisible && (
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              size="small"
              fullWidth
              label="Cercar alumne per nom..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Box display="flex" justifyContent="flex-end" gap={1}>
              <Button variant="outlined" color="primary" onClick={handleOpenImport}>
                Importar alumnes
              </Button>
              <Button variant="contained" color="success" onClick={handleCreateNew}>
                + Crear nou alumne
              </Button>
            </Box>
          </Box>
        )}        {isFormVisible && (
          <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>Error desant: {error}</Alert>}
            <StudentForm
              studentToEdit={editingStudent}
              onSave={handleSaveStudent}
              onClose={handleCloseForm}
              allStudents={allStudents}
            />
          </Box>
        )}
        
        {isImportVisible && (
          <Box>
            <StudentImport
              onClose={handleCloseImport}
              onImportSuccess={fetchStudents}
            />
          </Box>
        )}        {!isFormVisible && !isImportVisible && (
          filteredStudents.length > 0 ? (
            <StudentList
              students={filteredStudents}
              onEditStudent={handleEditStudent}
              onDeleteStudent={studentId => {
                const student = allStudents.find(s => s.id === studentId);
                if (student) {
                  openConfirmDeleteModal(studentId, student.name);
                }
              }}
            />
          ) : (
            !loading && searchTerm && <Alert severity="info">No s'han trobat alumnes amb el nom "{searchTerm}".</Alert>
          )
        )}
        {!isFormVisible && !isImportVisible && !loading && allStudents.length === 0 && !searchTerm && (
          <Alert severity="info">No hi ha alumnes per mostrar. Comença creant-ne un!</Alert>
        )}
        {loading && allStudents.length > 0 && (
          <Box display="flex" alignItems="center" justifyContent="center" minHeight={60}>
            <CircularProgress size={20} sx={{ mr: 2 }} />
            <Typography variant="body2" color="text.secondary">Actualitzant dades...</Typography>
          </Box>
        )}
        <ConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleDeleteStudent}
          title="Confirmar Esborrat"
          message={`Segur que vols esborrar l'alumne "${studentToDelete?.name}"? Aquesta acció no es pot desfer.`}
        />
      </ContentPaper>
    </MainContainer>
  );
}

export default StudentManagementPage;