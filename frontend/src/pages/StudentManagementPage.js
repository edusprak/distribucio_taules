// frontend/src/pages/StudentManagementPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // <-- IMPORTA toast

import studentService from '../services/studentService';
import StudentList from '../components/students/StudentList';
import StudentForm from '../components/students/StudentForm'; // Assegura't que aquest component ja existeix


// Estils bàsics (pots moure'ls a un fitxer CSS o definir-los aquí)
const pageStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif', // Un tipus de lletra base per exemple
};

const buttonStyle = {
    padding: '10px 15px',
    fontSize: '1em',
    backgroundColor: '#28a745', // Verd per a "crear"
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

function StudentManagementPage() {
  const [students, setStudents] = useState([]); // Llista de tots els alumnes
  const [loading, setLoading] = useState(true); // Estat de càrrega general
  const [error, setError] = useState(null); // Per a missatges d'error
  
  const [isFormVisible, setIsFormVisible] = useState(false); // Controla la visibilitat del formulari
  const [editingStudent, setEditingStudent] = useState(null); // Emmagatzema l'alumne que s'està editant, o null si es crea

  // Funció per carregar (o refrescar) la llista d'alumnes des del backend
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await studentService.getAllStudents();
      setStudents(data);
      setError(null); // Reseteja errors anteriors si la càrrega és exitosa
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Error en carregar els alumnes.';
      setError(errorMessage);
      console.error("Error fetching students:", err);
      setStudents([]); // Reseteja alumnes en cas d'error per evitar mostrar dades antigues
    } finally {
      setLoading(false);
    }
  };

  // useEffect per carregar els alumnes inicialment quan el component es munta
  useEffect(() => {
    fetchStudents();
  }, []); // L'array de dependències buit assegura que s'executa només un cop

  // Handler per obrir el formulari en mode "crear nou alumne"
  const handleCreateNew = () => {
    setEditingStudent(null); // Assegura que no hi ha cap alumne en edició
    setIsFormVisible(true); // Mostra el formulari
  };

  // Handler per obrir el formulari en mode "editar alumne"
  // Carrega les dades completes de l'alumne (incloent restriccions) abans de mostrar el formulari
  const handleEditStudent = async (studentBasics) => {
    try {
      setLoading(true); // Indica càrrega de dades per a l'edició
      const fullStudentData = await studentService.getStudentById(studentBasics.id);
      setEditingStudent(fullStudentData); // Alumne complet amb restriccions
      setIsFormVisible(true); // Mostra el formulari
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Error en carregar les dades de l'alumne per editar.";
      console.error("Error fetching student details for editing:", err);
      setError(errorMessage);
      setIsFormVisible(false); // No obrim el formulari si hi ha error
      setEditingStudent(null);
    } finally {
      setLoading(false);
    }
  };

  // Handler per esborrar un alumne
  const handleDeleteStudent = async (studentId) => {
    if (window.confirm(`Segur que vols esborrar l'alumne amb ID ${studentId}? Aquesta acció no es pot desfer.`)) {
      try {
        setLoading(true); // O un estat de loading específic per a l'esborrat
        await studentService.deleteStudent(studentId);
        await fetchStudents(); // Refresca la llista d'alumnes
        toast.warn(`Alumne amb ID ${studentId} esborrat correctament.`);
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || `Error en esborrar l'alumne ${studentId}.`;
        setError(errorMessage);
        console.error("Error deleting student:", err.response || err);
        toast.warn(`Error en esborrar l'alumne: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Handler per tancar el formulari (cridat des de StudentForm)
  const handleCloseForm = () => {
    setIsFormVisible(false);
    setEditingStudent(null); // Reseteja l'alumne en edició
    setError(null); // Reseteja errors del formulari o de càrrega
  };

  // Handler per guardar (crear o actualitzar) un alumne (cridat des de StudentForm)
  const handleSaveStudent = async (studentData) => {
    setLoading(true);
    try {
      if (editingStudent) { // Mode edició
        await studentService.updateStudent(editingStudent.id, studentData);
      } else { // Mode creació
        await studentService.createStudent(studentData);
      }
      await fetchStudents(); // Refresca la llista
      setIsFormVisible(false); // Tanca el formulari
      setEditingStudent(null); // Reseteja l'alumne en edició
      setError(null);
    } catch (error) { // error pot ser un objecte amb error.message o un objecte d'error d'Axios
      const errorMessage = error.message || (error.error ? `${error.error}: ${error.details || ''}` : JSON.stringify(error));
      console.error("Error guardant l'alumne:", error);
      setError(`Error guardant l'alumne: ${errorMessage}`); // Mostra l'error a la pàgina
      // toast.warn() pot ser molest, considera mostrar l'error dins del formulari o a la pàgina
      // toast.warn(`Error guardant l'alumne: ${errorMessage}`); 
      // No tanquem el formulari si hi ha un error, perquè l'usuari pugui corregir
    } finally {
      setLoading(false);
    }
  };

  // Renderitzat condicional basat en l'estat de càrrega i error
  if (loading && students.length === 0) { 
    return <div style={loadingErrorStyle}>Carregant alumnes...</div>;
  }

  // Mostra un error principal si la càrrega inicial falla i no hi ha alumnes
  if (error && students.length === 0 && !isFormVisible) {
    return <div style={{ ...loadingErrorStyle, color: 'red' }}>Error: {error} <button onClick={fetchStudents}>Reintentar</button></div>;
  }

  return (
    <div style={pageStyle}>
      <h2>Gestió d'Alumnes</h2>
      
      {/* Mostra errors generals o de guardat si n'hi ha i el formulari no està obert o és un error no relacionat amb el formulari */}
      {error && !isFormVisible && <p style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '10px' }}>Error: {error}</p>}
      
      {!isFormVisible && (
        <button style={buttonStyle} onClick={handleCreateNew}>
          + Crear Nou Alumne
        </button>
      )}

      {isFormVisible && (
        <>
          {/* Mostra l'error dins de la secció del formulari si està relacionat amb el guardat */}
          {error && <p style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '10px' }}>Error: {error}</p>}
          <StudentForm 
            studentToEdit={editingStudent}
            onSave={handleSaveStudent}
            onClose={handleCloseForm}
            allStudents={students} // Per a les opcions de restriccions
          />
        </>
      )}

      {/* Llista d'alumnes (només es mostra si el formulari no està visible) */}
      {!isFormVisible && (
        students.length > 0 ? (
          <StudentList 
            students={students} 
            onEditStudent={handleEditStudent} 
            onDeleteStudent={handleDeleteStudent} 
          />
        ) : (
          // Mostra aquest missatge si no hi ha alumnes i no s'està carregant ni hi ha error inicial
          !loading && <div style={loadingErrorStyle}>No hi ha alumnes per mostrar. Comença creant-ne un!</div>
        )
      )}
      
      {/* Indicador de càrrega subtil si ja hi ha dades però s'estan refrescant */}
      {loading && students.length > 0 && <div style={{ ...loadingErrorStyle, fontSize: '0.9em', color: '#555' }}>Actualitzant dades...</div>}
    </div>
  );
}

export default StudentManagementPage;