// frontend/src/components/students/StudentList.js
import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '10px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  border: '1px solid #ddd',
};

const thStyle = {
  backgroundColor: '#f2f2f2',
  padding: '12px 15px',
  textAlign: 'left',
  borderBottom: '2px solid #ddd',
  fontWeight: 'bold',
  position: 'sticky',
  top: 0,
};

const tdStyle = {
  padding: '10px 15px',
  borderBottom: '1px solid #ddd',
  verticalAlign: 'middle',
};

const trStyle = {
  ':hover': {
    backgroundColor: '#f5f5f5',
  }
};

const buttonStyle = {
  margin: '0 5px',
  padding: '6px 10px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

const deleteButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#dc3545',
  color: 'white',
};

const editableCellStyle = {
  ...tdStyle,
  cursor: 'pointer',
  position: 'relative',
};

const selectStyles = { 
  control: base => ({ 
    ...base, 
    border: '1px solid #007bff',
    borderRadius: '4px',
    minHeight: '36px',
    boxSizing: 'border-box',
  }),
  valueContainer: base => ({
    ...base,
    padding: '0 8px',
  }),
  option: base => ({
    ...base,
    padding: '8px',
  }),
};

function StudentList({ students, allStudents, onEditStudent, onDeleteStudent, allClasses }) {
  // Use allStudents (or fallback to students) for restrictions/preferences
  const studentsForOptions = allStudents || students;
  const [editingState, setEditingState] = useState(null); // { studentId, field, value }
  const [editingValue, setEditingValue] = useState('');
  const inputRef = useRef(null);
  
  // Funció per convertir el valor de gènere a la seva etiqueta en català
  const getGenderLabel = (genderValue) => {
    switch (genderValue) {
      case 'male':
        return 'Masculí';
      case 'female':
        return 'Femení';
      case 'other':
        return 'Altre';
      case 'prefer_not_to_say':
        return 'Prefereixo no dir-ho';
      default:
        return 'No especificat';
    }
  };
  
  // Opcions per al selector de gènere
  const genderOptions = [
    { value: 'male', label: 'Masculí' },
    { value: 'female', label: 'Femení' },
    { value: 'other', label: 'Altre' },
    { value: 'prefer_not_to_say', label: 'Prefereixo no dir-ho' },
  ];

  // Mapejar classes disponibles per al selector
  const classOptions = allClasses ? 
    allClasses.map(c => ({ value: c.id_classe, label: c.nom_classe })) : [];
      // Generar opcions d'estudiants per a restriccions i preferències
  const getStudentOptions = (currentStudentId) => {
    return studentsForOptions
      .filter(s => s.id !== currentStudentId)
      .map(s => ({ value: s.id, label: s.name }));
  };
    // Focus en l'input quan comença l'edició
  useEffect(() => {
    if (editingState && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingState]);

  // Funció per començar l'edició d'una cel·la
  const startEditing = (student, field) => {
    let value = '';
    switch (field) {
      case 'name':
        value = student.name || '';
        break;
      case 'academic_grade':
        value = student.academic_grade !== null ? String(student.academic_grade) : '';
        break;
      case 'gender':
        value = student.gender || '';
        break;
      case 'class_name':
        value = student.id_classe_alumne || '';
        break;
      case 'restrictions':
        value = student.restrictions || [];
        break;
      case 'preferences':
        value = student.preferences || [];
        break;
      default:
        value = '';
    }
    setEditingState({ studentId: student.id, field });
    setEditingValue(value);
  };

  // Funció per cancel·lar l'edició
  const cancelEditing = () => {
    setEditingState(null);
    setEditingValue('');
  };
  // Funció per guardar l'edició
  const saveEdit = (student) => {
    if (!editingState) return;
    
    const { field } = editingState;
    let updatedValue = editingValue;
    
    // Validar segons el camp
    if (field === 'academic_grade') {
      const grade = parseFloat(editingValue);
      if (isNaN(grade) || grade < 0 || grade > 10) {
        alert('La nota acadèmica ha de ser un número entre 0 i 10.');
        return;
      }
      updatedValue = grade;
    } else if (field === 'name' && !editingValue.trim()) {
      alert("El nom de l'alumne no pot estar buit.");
      return;
    } else if ((field === 'restrictions' || field === 'preferences')) {
      // Convertir el valor dels selectors multi a un array d'IDs
      updatedValue = editingValue.map(item => item.value);
      
      // Comprovar que un estudiant no estigui tant a restriccions com a preferències
      const otherField = field === 'restrictions' ? 'preferences' : 'restriccions';
      let otherValues = student[otherField] || [];
      
      if (Array.isArray(otherValues)) {
        const commonIds = updatedValue.filter(id => otherValues.includes(id));
        if (commonIds.length > 0) {
          const commonItems = commonIds.map(id => {
            const commonStudent = students.find(s => s.id === id);
            return commonStudent ? commonStudent.name : `ID ${id}`;
          });
          alert(`Un alumne no pot estar simultàniament en restriccions i preferències. Alumne(s) en comú: ${commonItems.join(', ')}.`);
          return;
        }
      }
    }
    
    // Crear una còpia de l'estudiant amb els canvis
    const updatedStudent = { ...student };
    
    // Assignar el valor actualitzat al camp corresponent
    switch (field) {
      case 'name':
        updatedStudent.name = updatedValue;
        break;
      case 'academic_grade':
        updatedStudent.academic_grade = updatedValue;
        break;
      case 'gender':
        updatedStudent.gender = updatedValue;
        break;
      case 'class_name':
        updatedStudent.id_classe_alumne = updatedValue;
        break;
      case 'restrictions':
        updatedStudent.restrictions = updatedValue;
        break;
      case 'preferences':
        updatedStudent.preferences = updatedValue;
        break;
      default:
        break;
    }
    
    // Cridar la funció d'actualització
    onEditStudent(updatedStudent, true);
    
    // Resetejar estat d'edició
    setEditingState(null);
    setEditingValue('');
  };
  
  // Gestió de tecles durant l'edició
  const handleKeyDown = (e, student) => {
    if (e.key === 'Enter') {
      saveEdit(student);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };
  if (!students || students.length === 0) {
    return <p style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>No hi ha alumnes per mostrar.</p>;
  }
    // Utilitzar fragments JSX per evitar nodes de text no desitjats
  return (
    <div style={{ overflowX: 'auto', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>{/* Agrupar els th per evitar espais en blanc */}
            <th style={thStyle}>Nom</th>
            <th style={{...thStyle, width: '80px'}}>Nota</th>
            <th style={{...thStyle, width: '100px'}}>Gènere</th>
            <th style={{...thStyle, width: '120px'}}>Classe</th>
            <th style={thStyle}>Restriccions</th>
            <th style={thStyle}>Preferències</th>
            <th style={{...thStyle, width: '140px'}}>Accions</th>
          </tr>
        </thead>        <tbody>{/* Eliminar salts de línia que poden crear nodes de text */}
          {students.map((student, index) => {
            if (!student) {
              return (
                <tr key={`error-${index}`}><td colSpan="7" style={{...tdStyle, color: 'red', padding: '10px', border: '1px dashed red'}}>
                    Error: Dades de l'alumne invàlides a la posició {index} de la llista.
                </td></tr>
              );
            }
            const displayGrade = student.academic_grade !== null && student.academic_grade !== undefined 
                        ? parseFloat(student.academic_grade).toFixed(2) 
                        : 'N/A';return (
              <tr key={student.id || `student-item-${index}`} style={trStyle}>{/* Agrupar tots els td per evitar espais en blanc */}
                <td style={editingState?.studentId === student.id && editingState.field === 'name' 
                    ? { ...tdStyle, padding: 0 } 
                    : { ...editableCellStyle }}
                  onClick={() => !editingState && startEditing(student, 'name')}
                >
                  {editingState?.studentId === student.id && editingState.field === 'name' ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, student)}
                      onBlur={() => cancelEditing()}
                      style={{ 
                        width: '100%', 
                        padding: '10px 15px', 
                        border: '1px solid #007bff', 
                        borderRadius: '3px',
                        boxSizing: 'border-box' 
                      }}
                    />
                  ) : (
                    student.name
                  )}
                </td>

                <td 
                  style={editingState?.studentId === student.id && editingState.field === 'academic_grade' 
                    ? { ...tdStyle, padding: 0 } 
                    : { ...editableCellStyle }}
                  onClick={() => !editingState && startEditing(student, 'academic_grade')}
                >
                  {editingState?.studentId === student.id && editingState.field === 'academic_grade' ? (
                    <input
                      ref={inputRef}
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, student)}
                      onBlur={() => cancelEditing()}
                      style={{ 
                        width: '100%', 
                        padding: '10px 15px', 
                        border: '1px solid #007bff', 
                        borderRadius: '3px',
                        boxSizing: 'border-box' 
                      }}
                    />
                  ) : (
                    displayGrade
                  )}
                </td>

                <td 
                  style={editingState?.studentId === student.id && editingState.field === 'gender' 
                    ? { ...tdStyle, padding: 0 } 
                    : { ...editableCellStyle }}
                  onClick={() => !editingState && startEditing(student, 'gender')}
                >
                  {editingState?.studentId === student.id && editingState.field === 'gender' ? (
                    <Select
                      options={genderOptions}
                      value={genderOptions.find(option => option.value === editingValue)}
                      onChange={(selectedOption) => {
                        setEditingValue(selectedOption ? selectedOption.value : '');
                        setTimeout(() => saveEdit(student), 100);
                      }}
                      onBlur={() => cancelEditing()}
                      menuPortalTarget={document.body}
                      styles={selectStyles}
                      isClearable
                    />
                  ) : (
                    getGenderLabel(student.gender)
                  )}
                </td>

                <td 
                  style={editingState?.studentId === student.id && editingState.field === 'class_name' 
                    ? { ...tdStyle, padding: 0 } 
                    : { ...editableCellStyle }}
                  onClick={() => !editingState && startEditing(student, 'class_name')}
                >
                  {editingState?.studentId === student.id && editingState.field === 'class_name' ? (
                    <Select
                      options={classOptions}
                      value={classOptions.find(option => option.value === editingValue)}
                      onChange={(selectedOption) => {
                        setEditingValue(selectedOption ? selectedOption.value : '');
                        setTimeout(() => saveEdit(student), 100);
                      }}
                      onBlur={() => cancelEditing()}
                      menuPortalTarget={document.body}
                      styles={selectStyles}
                      isClearable
                    />
                  ) : (
                    student.class_name || student.nom_classe || 'No assignat'
                  )}
                </td>                <td
                  style={editingState?.studentId === student.id && editingState.field === 'restrictions'
                    ? { ...tdStyle, padding: 0 }
                    : { ...editableCellStyle }}
                  onClick={() => !editingState && startEditing(student, 'restrictions')}
                >
                  {editingState?.studentId === student.id && editingState.field === 'restrictions' ? (
                    <Select
                      isMulti
                      options={getStudentOptions(student.id)}
                      value={Array.isArray(editingValue) 
                        ? editingValue.map(id => {
                            const restrictedStudent = studentsForOptions.find(s => s.id === id);
                            return restrictedStudent ? { value: restrictedStudent.id, label: restrictedStudent.name } : null;
                          }).filter(Boolean)
                        : []
                      }
                      onChange={selectedOptions => setEditingValue(selectedOptions || [])}
                      onBlur={() => saveEdit(student)}
                      menuPortalTarget={document.body}
                      styles={{
                        control: base => ({
                          ...base,
                          border: '1px solid #007bff',
                          borderRadius: '3px',
                          minHeight: '36px',
                        }),
                        menuPortal: base => ({ ...base, zIndex: 9999 })
                      }}
                    />                  ) : (
                    student.restrictions && student.restrictions.length > 0 
                      ? student.restrictions
                          .map(id => {
                            const restrictedStudent = studentsForOptions.find(s => s.id === id);
                            return restrictedStudent ? restrictedStudent.name : `ID ${id}`;
                          })
                          .join(', ')
                      : 'Cap'
                  )}
                </td>                <td
                  style={editingState?.studentId === student.id && editingState.field === 'preferences'
                    ? { ...tdStyle, padding: 0 }
                    : { ...editableCellStyle }}
                  onClick={() => !editingState && startEditing(student, 'preferences')}
                >
                  {editingState?.studentId === student.id && editingState.field === 'preferences' ? (
                    <Select
                      isMulti
                      options={getStudentOptions(student.id)}
                      value={Array.isArray(editingValue) 
                        ? editingValue.map(id => {
                            const preferredStudent = studentsForOptions.find(s => s.id === id);
                            return preferredStudent ? { value: preferredStudent.id, label: preferredStudent.name } : null;
                          }).filter(Boolean)
                        : []
                      }
                      onChange={selectedOptions => setEditingValue(selectedOptions || [])}
                      onBlur={() => saveEdit(student)}
                      menuPortalTarget={document.body}
                      styles={{
                        control: base => ({
                          ...base,
                          border: '1px solid #007bff',
                          borderRadius: '3px',
                          minHeight: '36px',
                        }),
                        menuPortal: base => ({ ...base, zIndex: 9999 })
                      }}
                    />
                  ) : (
                    student.preferences && student.preferences.length > 0
                      ? student.preferences
                          .map(id => {
                            const preferredStudent = studentsForOptions.find(s => s.id === id);
                            return preferredStudent ? preferredStudent.name : `ID ${id}`;
                          })
                          .join(', ')
                      : 'Cap'
                  )}
                </td>
                <td style={tdStyle}>
                  {editingState?.studentId === student.id ? (
                    <>
                      <button 
                        style={{
                          ...buttonStyle,
                          backgroundColor: '#28a745',
                          color: 'white',
                        }}
                        onClick={() => saveEdit(student)}
                      >
                        Desar
                      </button>
                      <button 
                        style={{
                          ...buttonStyle,
                          backgroundColor: '#6c757d',
                          color: 'white',
                        }}
                        onClick={cancelEditing}
                      >
                        Cancel·lar
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        style={deleteButtonStyle} 
                        onClick={() => onDeleteStudent(student.id)}
                      >
                        Esborrar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default StudentList;