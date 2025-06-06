// frontend/src/pages/StudentManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

import studentService from '../services/studentService';
import StudentList from '../components/students/StudentList';
import StudentForm from '../components/students/StudentForm';
import ConfirmModal from '../components/ConfirmModal';

// Estilos
const pageStyle = {
    maxWidth: '800px',
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

// NUEVO: Estilo para el input de búsqueda
const searchInputStyle = {
    padding: '10px',
    fontSize: '1em',
    border: '1px solid #ccc',
    borderRadius: '4px',
    marginBottom: '20px',
    width: 'calc(100% - 22px)', // Ocupa todo el ancho menos el padding y borde
    boxSizing: 'border-box',
};

const loadingErrorStyle = {
    textAlign: 'center',
    padding: '20px',
    fontSize: '1.1em',
};

function StudentManagementPage() {
  const [allStudents, setAllStudents] = useState([]); // Lista original de todos los alumnos
  const [filteredStudents, setFilteredStudents] = useState([]); // Lista de alumnos a mostrar (filtrada)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isFormVisible, setIsFormVisible] = useState(false);
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
      // Inicialmente no filtramos, el useEffect de abajo lo hará
      // setFilteredStudents(data); 
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error en carregar els alumnes.';
      setError(errorMessage);
      console.error("Error fetching students:", err);
      setAllStudents([]);
      // setFilteredStudents([]);
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
      // El useEffect [searchTerm, allStudents] se encargará de actualizar filteredStudents
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

  const handleSaveStudent = async (studentData) => {
    setLoading(true);
    setError(null); // Limpiar errores previos antes de guardar
    try {
      let studentNameForToast = studentData.name;
      if (editingStudent) {
        await studentService.updateStudent(editingStudent.id, studentData); //
        studentNameForToast = editingStudent.name; // Usa el nombre original si se está editando (o el nuevo, como prefieras)
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
    return <div style={loadingErrorStyle}>Carregant alumnes...</div>;
  }

  if (error && allStudents.length === 0 && !isFormVisible) {
    return <div style={{ ...loadingErrorStyle, color: 'red' }}>Error: {error} <button onClick={fetchStudents}>Reintentar</button></div>;
  }

  return (
    <div style={pageStyle}>
      <h2>Gestió d'alumnes</h2>
      
      {error && !isFormVisible && <p style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '10px' }}>Error: {error}</p>}
      
      {!isFormVisible && (
        <>
          {/* NUEVO: Input de búsqueda */}
          <input
            type="text"
            placeholder="Cercar alumne per nom..."
            style={searchInputStyle}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button style={buttonStyle} onClick={handleCreateNew}>
            + Crear nou alumne
          </button>
        </>
      )}

      {isFormVisible && (
        <>
          {error && <p style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '10px' }}>Error desant: {error}</p>}
          <StudentForm 
            studentToEdit={editingStudent}
            onSave={handleSaveStudent}
            onClose={handleCloseForm}
            allStudents={allStudents} 
          />
        </>
      )}

      {!isFormVisible && (
        // Se pasa filteredStudents en lugar de allStudents
        filteredStudents.length > 0 ? (
          <StudentList 
            students={filteredStudents} 
            onEditStudent={handleEditStudent} 
            onDeleteStudent={(studentId) => { // Modificado para pasar nombre al modal
                const student = allStudents.find(s => s.id === studentId);
                if (student) {
                    openConfirmDeleteModal(studentId, student.name);
                }
            }} 
          />
        ) : (
          !loading && searchTerm && <div style={loadingErrorStyle}>No s'han trobat alumnes amb el nom "{searchTerm}".</div>
        )
      )}
      {!isFormVisible && !loading && allStudents.length === 0 && !searchTerm && (
         <div style={loadingErrorStyle}>No hi ha alumnes per mostrar. Comença creant-ne un!</div>
      )}
      
      {loading && allStudents.length > 0 && <div style={{ ...loadingErrorStyle, fontSize: '0.9em', color: '#555' }}>Actualitzant dades...</div>}

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleDeleteStudent}
        title="Confirmar Esborrat"
        message={`Segur que vols esborrar l'alumne "${studentToDelete?.name}"? Aquesta acció no es pot desfer.`}
      />
    </div>
  );
}

export default StudentManagementPage;