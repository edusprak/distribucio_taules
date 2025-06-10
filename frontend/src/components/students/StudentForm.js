// frontend/src/components/students/StudentForm.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Select from 'react-select';
import classService from '../../services/classService';

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
  width: 'calc(100% - 22px)',
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
const selectStyles = { 
    control: base => ({ ...base, ...inputStyle, padding: 0, marginBottom: '15px', height: 'auto' }),
    input: base => ({ ...base, margin: '0px'}),
    valueContainer: base => ({ ...base, padding: '0 8px'}),
};


function StudentForm({ studentToEdit, onSave, onClose, allStudents }) {
  const [name, setName] = useState('');
  const [academicGrade, setAcademicGrade] = useState('');
  const [gender, setGender] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedRestrictions, setSelectedRestrictions] = useState([]);
  const [selectedPreferences, setSelectedPreferences] = useState([]); // NOU ESTAT PER PREFERÈNCIES

  const genderOptions = [
    { value: 'male', label: 'Masculí' },
    { value: 'female', label: 'Femení' },
    { value: 'other', label: 'Altre' },
    { value: 'prefer_not_to_say', label: 'Prefereixo no dir-ho' },
  ];

  // Opcions per a restriccions i preferències (exclou l'alumne actual si s'està editant)
  const studentOptions = allStudents
    .filter(s => !studentToEdit || s.id !== studentToEdit.id) 
    .map(s => ({ value: s.id, label: s.name }));

  useEffect(() => {
    const fetchClasses = async () => {
        try {
            const response = await classService.getAllClasses();
            if (response.success) {
                setAvailableClasses(response.classes.map(c => ({ value: c.id_classe, label: c.nom_classe })));
            } else {
                toast.error("Error carregant les classes disponibles.");
            }
        } catch (error) {
            toast.error("Error carregant les classes disponibles: " + (error.message || "Error desconegut"));
        }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (studentToEdit) {
      setName(studentToEdit.name || '');
      setAcademicGrade(studentToEdit.academic_grade !== null ? String(studentToEdit.academic_grade) : '');
      setGender(studentToEdit.gender || '');
      
      if (studentToEdit.id_classe_alumne && availableClasses.length > 0) {
        const currentStudentClass = availableClasses.find(c => c.value === studentToEdit.id_classe_alumne);
        setSelectedClass(currentStudentClass || null);
      } else {
        setSelectedClass(null);
      }

      // Carregar restriccions
      if (studentToEdit.restrictions && studentToEdit.restrictions.length > 0) {
        const currentRestrictionObjects = studentToEdit.restrictions.map(id => {
          const restrictedStudent = allStudents.find(s => s.id === id);
          return restrictedStudent ? { value: restrictedStudent.id, label: restrictedStudent.name } : null;
        }).filter(Boolean);
        setSelectedRestrictions(currentRestrictionObjects);
      } else {
        setSelectedRestrictions([]);
      }

      // NOU: Carregar preferències
      if (studentToEdit.preferences && studentToEdit.preferences.length > 0) {
        const currentPreferenceObjects = studentToEdit.preferences.map(id => {
          const preferredStudent = allStudents.find(s => s.id === id);
          return preferredStudent ? { value: preferredStudent.id, label: preferredStudent.name } : null;
        }).filter(Boolean); // Filtra nulls si algun ID no es troba (poc probable si les dades són consistents)
        setSelectedPreferences(currentPreferenceObjects);
      } else {
        setSelectedPreferences([]);
      }

    } else { // Creant nou alumne
      setName('');
      setAcademicGrade('');
      setGender('');
      setSelectedClass(null);
      setSelectedRestrictions([]);
      setSelectedPreferences([]); // NOU
    }
  }, [studentToEdit, allStudents, availableClasses]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim() || academicGrade.trim() === '') {
        toast.warn('El nom i la nota acadèmica són obligatoris.');
        return;
    }
    const grade = parseFloat(academicGrade);
    if (isNaN(grade) || grade < 0 || grade > 10) {
        toast.warn('La nota acadèmica ha de ser un número entre 0 i 10.');
        return;
    }    // S'ha eliminat la validació que impedia un alumne estar tant a preferències com a restriccions
    const restrictionIds = selectedRestrictions.map(r => r.value);
    const preferenceIds = selectedPreferences.map(p => p.value);


    const studentData = {
      name,
      academic_grade: grade,
      gender: gender || null,
      id_classe_alumne: selectedClass ? selectedClass.value : null,
      restrictions: restrictionIds,
      preferences: preferenceIds, // NOU
    };
    onSave(studentData);
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div>
        <label htmlFor="name" style={labelStyle}>Nom:</label>
        <input
          type="text"
          id="name"
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="academicGrade" style={labelStyle}>Valor (0-10):</label>
        <input
          type="number"
          id="academicGrade"
          style={inputStyle}
          value={academicGrade}
          onChange={(e) => setAcademicGrade(e.target.value)}
          step="0.01"
          min="0"
          max="10"
          required
        />
      </div>
      <div>
        <label htmlFor="studentClass" style={labelStyle}>Classe:</label>
        <Select
            id="studentClass"
            options={availableClasses}
            value={selectedClass}
            onChange={setSelectedClass}
            placeholder="Selecciona classe..."
            isClearable
            noOptionsMessage={() => "No hi ha classes disponibles. Crea'n primer a 'Gestionar Classes'."}
            styles={selectStyles}
        />
      </div>
      <div>
        <label htmlFor="gender" style={labelStyle}>Gènere:</label>
        <Select
            id="gender"
            options={genderOptions}
            value={genderOptions.find(option => option.value === gender)}
            onChange={selectedOption => setGender(selectedOption ? selectedOption.value : '')}
            placeholder="Selecciona gènere..."
            isClearable
            styles={selectStyles}
        />
      </div>
      <div>
        <label htmlFor="restrictions" style={labelStyle}>No pot seure amb (Restriccions):</label>
        <Select
          id="restrictions"
          isMulti
          options={studentOptions}
          value={selectedRestrictions}
          onChange={setSelectedRestrictions}
          placeholder="Selecciona alumnes..."
          noOptionsMessage={() => "No hi ha altres alumnes per seleccionar"}
          styles={selectStyles}
        />
      </div>
      {/* NOU CAMP PER A PREFERÈNCIES */}
      <div>
        <label htmlFor="preferences" style={labelStyle}>Prefereix seure amb:</label>
        <Select
          id="preferences"
          isMulti
          options={studentOptions}
          value={selectedPreferences}
          onChange={setSelectedPreferences}
          placeholder="Selecciona alumnes..."
          noOptionsMessage={() => "No hi ha altres alumnes per seleccionar"}
          styles={selectStyles}
        />
      </div>
      <div style={buttonContainerStyle}>
        <button type="button" onClick={onClose} style={cancelButtonStyle}>
          Cancel·lar
        </button>
        <button type="submit" style={saveButtonStyle}>
          {studentToEdit ? 'Actualitzar Alumne' : 'Crear Alumne'}
        </button>
      </div>
    </form>
  );
}

export default StudentForm;