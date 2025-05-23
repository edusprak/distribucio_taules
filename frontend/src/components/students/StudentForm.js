// frontend/src/components/students/StudentForm.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // <-- IMPORTA toast
import Select from 'react-select'; // Per a la selecció múltiple de restriccions

// Estils bàsics (pots moure'ls a CSS)
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


function StudentForm({ studentToEdit, onSave, onClose, allStudents }) {
  const [name, setName] = useState('');
  const [academicGrade, setAcademicGrade] = useState('');
  const [gender, setGender] = useState('');
  const [selectedRestrictions, setSelectedRestrictions] = useState([]); // Emmagatzema objectes { value, label }

  // Opcions per al selector de gènere (exemple)
  const genderOptions = [
    { value: 'male', label: 'Masculí' },
    { value: 'female', label: 'Femení' },
    { value: 'other', label: 'Altre' },
    { value: 'prefer_not_to_say', label: 'Prefereixo no dir-ho' },
  ];

  // Prepara les opcions per al multi-select de restriccions
  // Exclou l'alumne actual (si s'està editant) de les opcions de restricció
  const studentOptionsForRestrictions = allStudents
    .filter(s => !studentToEdit || s.id !== studentToEdit.id) 
    .map(s => ({ value: s.id, label: s.name }));

  useEffect(() => {
    if (studentToEdit) {
      setName(studentToEdit.name || '');
      setAcademicGrade(studentToEdit.academic_grade !== null ? String(studentToEdit.academic_grade) : '');
      setGender(studentToEdit.gender || '');

      // Converteix l'array d'IDs de restriccions de studentToEdit
      // a l'array d'objectes { value, label } que react-select espera
      if (studentToEdit.restrictions && studentToEdit.restrictions.length > 0) {
        const currentRestrictionObjects = studentToEdit.restrictions.map(id => {
          const restrictedStudent = allStudents.find(s => s.id === id);
          return restrictedStudent ? { value: restrictedStudent.id, label: restrictedStudent.name } : null;
        }).filter(Boolean); // filter(Boolean) elimina els nulls si algun ID no es troba
        setSelectedRestrictions(currentRestrictionObjects);
      } else {
        setSelectedRestrictions([]);
      }
    } else {
      // Mode creació: reseteja els camps
      setName('');
      setAcademicGrade('');
      setGender('');
      setSelectedRestrictions([]);
    }
  }, [studentToEdit, allStudents]); // Es re-executa si studentToEdit o allStudents canvien

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
    }

    const studentData = {
      name,
      academic_grade: grade,
      gender: gender || null, // Envia null si el gènere està buit
      // Converteix l'array d'objectes {value, label} de nou a un array d'IDs
      restrictions: selectedRestrictions.map(r => r.value), 
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
        <label htmlFor="academicGrade" style={labelStyle}>Nota Acadèmica (0-10):</label>
        <input
          type="number"
          id="academicGrade"
          style={inputStyle}
          value={academicGrade}
          onChange={(e) => setAcademicGrade(e.target.value)}
          step="0.01" // Permet decimals
          min="0"
          max="10"
          required
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
            styles={{ // Estils per fer-lo semblant als altres inputs
                control: base => ({ ...base, ...inputStyle, padding: 0, marginBottom: '15px', height: 'auto' }),
                input: base => ({ ...base, margin: '0px'}), // Ajust per al text de l'input
                valueContainer: base => ({ ...base, padding: '0 8px'}), // Ajust per al valor seleccionat
            }}
        />
      </div>
      <div>
        <label htmlFor="restrictions" style={labelStyle}>No pot seure amb (Restriccions):</label>
        <Select
          id="restrictions"
          isMulti // Permet selecció múltiple
          options={studentOptionsForRestrictions}
          value={selectedRestrictions}
          onChange={setSelectedRestrictions}
          placeholder="Selecciona alumnes..."
          noOptionsMessage={() => "No hi ha altres alumnes per seleccionar"}
          styles={{
            control: base => ({ ...base, ...inputStyle, padding: 0, height: 'auto' }),
            input: base => ({ ...base, margin: '0px'}),
            valueContainer: base => ({ ...base, padding: '0 8px'}),
          }}
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