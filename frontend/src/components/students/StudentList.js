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
  cursor: 'pointer',
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

const sortIconStyle = {
  marginLeft: '5px',
  fontSize: '0.8em',
  display: 'inline-block',
};

const thContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

function StudentList({ students, allStudents, onEditStudent, onDeleteStudent, allClasses }) {
  const studentsForOptions = allStudents || students;
  const [editingState, setEditingState] = useState(null); // { studentId, field, value }
  const [editingValue, setEditingValue] = useState('');
  const [sortBy, setSortBy] = useState('name'); // Per defecte, ordenem per nom
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' o 'desc'
  const inputRef = useRef(null);
    // Function zd because we now use Select option labels directly
  
  const genderOptions = [
    { value: 'male', label: 'Masculí' },
    { value: 'female', label: 'Femení' },
    { value: 'other', label: 'Altre' },
    { value: 'prefer_not_to_say', label: 'Prefereixo no dir-ho' },
  ];

  const classOptions = allClasses ? 
    allClasses.map(c => ({ value: c.id_classe, label: c.nom_classe })) : [];
    
  const getStudentOptions = (currentStudentId) => {
    return studentsForOptions
      .filter(s => s.id !== currentStudentId)
      .map(s => ({ value: s.id, label: s.name }));
  };
  
  useEffect(() => {
    if (editingState && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingState]);

  // Funció per gestionar el clic en l'encapçalament per ordenar
  const handleSortClick = (field) => {
    if (sortBy === field) {
      // Si ja estem ordenant per aquest camp, canviem la direcció
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Si canviem de camp, ordenem ascendentment
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  
  // Funció per obtenir el símbol de la fletxa segons el camp i l'ordre actual
  const getSortArrow = (field) => {
    if (sortBy === field) {
      return sortOrder === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };
  const startEditing = (student, field) => {
    let value = '';
    switch (field) {
      case 'name': value = student.name || ''; break;
      case 'academic_grade': value = student.academic_grade !== null ? String(student.academic_grade) : ''; break;
      case 'attitude_grade': value = student.attitude_grade !== null ? String(student.attitude_grade) : ''; break;
      case 'gender': value = student.gender || ''; break;
      case 'class_name': value = student.id_classe_alumne || ''; break;
      case 'restrictions': value = student.restrictions || []; break;
      case 'preferences': value = student.preferences || []; break;
      default: value = '';
    }
    setEditingState({ studentId: student.id, field });
    setEditingValue(value);
  };

  const cancelEditing = () => {
    setEditingState(null);
    setEditingValue('');
  };
  const saveEdit = (student) => {
    if (!editingState) return;
    
    const { field } = editingState;
    let updatedValue = editingValue;
    
    if (field === 'academic_grade') {
      const grade = parseFloat(editingValue);
      if (isNaN(grade) || grade < 0 || grade > 10) {
        alert('La nota acadèmica ha de ser un número entre 0 i 10.');
        return;
      }
      updatedValue = grade;
    } else if (field === 'attitude_grade') {
      const grade = parseFloat(editingValue);
      if (isNaN(grade) || grade < 0 || grade > 10) {
        alert('La nota d\'actitud ha de ser un número entre 0 i 10.');
        return;
      }
      updatedValue = grade;
    } else if (field === 'name' && !editingValue.trim()) {
      alert("El nom de l'alumne no pot estar buit.");
      return;    } else if ((field === 'restrictions' || field === 'preferences')) {
      updatedValue = editingValue.map(item => item.value);
      // Eliminada la validació que impedia un alumne estar tant a preferències com a restriccions
    }
    
    const updatedStudent = { ...student };
    
    switch (field) {
      case 'name': updatedStudent.name = updatedValue; break;
      case 'academic_grade': updatedStudent.academic_grade = updatedValue; break;
      case 'attitude_grade': updatedStudent.attitude_grade = updatedValue; break;
      case 'gender': updatedStudent.gender = updatedValue; break;
      case 'class_name': updatedStudent.id_classe_alumne = updatedValue; break;
      case 'restrictions': updatedStudent.restrictions = updatedValue; break;
      case 'preferences': updatedStudent.preferences = updatedValue; break;
      default: break;
    }
    
    onEditStudent(updatedStudent, true);
    setEditingState(null);
    setEditingValue('');
  };
  
  const handleKeyDown = (e, student) => {
    if (e.key === 'Enter') {
      saveEdit(student);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };
  
  // Ordenar estudiants segons el camp i la direcció seleccionats
  const getSortedStudents = () => {
    if (!students || students.length === 0) return [];
    
    return [...students].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;        case 'academic_grade':
          const gradeA = parseFloat(a.academic_grade) || 0;
          const gradeB = parseFloat(b.academic_grade) || 0;
          comparison = gradeA - gradeB;
          break;
        case 'attitude_grade':
          const attitudeA = parseFloat(a.attitude_grade) || 0;
          const attitudeB = parseFloat(b.attitude_grade) || 0;
          comparison = attitudeA - attitudeB;
          break;
        case 'gender':
          comparison = (a.gender || '').localeCompare(b.gender || '');
          break;
        case 'class_name':
          const classA = allClasses?.find(c => c.id_classe === a.id_classe_alumne)?.nom_classe || '';
          const classB = allClasses?.find(c => c.id_classe === b.id_classe_alumne)?.nom_classe || '';
          comparison = classA.localeCompare(classB);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  if (!students || students.length === 0) {
    return <p style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>No hi ha alumnes per mostrar.</p>;
  }

  const sortedStudents = getSortedStudents();

  // Renderitzar sense espais blancs entre elements
  return React.createElement(
    'div', 
    { style: { overflowX: 'auto', width: '100%', maxWidth: '1200px', margin: '0 auto' } },
    React.createElement(
      'table',
      { style: tableStyle },
      React.createElement(
        'thead',
        null,
        React.createElement(
          'tr',
          null,
          React.createElement(
            'th', 
            { style: thStyle, onClick: () => handleSortClick('name') },
            React.createElement(
              'div',
              { style: thContainerStyle },
              'Nom',
              React.createElement('span', { style: sortIconStyle }, getSortArrow('name'))
            )
          ),          React.createElement(
            'th', 
            { style: {...thStyle, width: '80px'}, onClick: () => handleSortClick('academic_grade') },
            React.createElement(
              'div',
              { style: thContainerStyle },
              'Nota Acadèmica',
              React.createElement('span', { style: sortIconStyle }, getSortArrow('academic_grade'))
            )
          ),
          React.createElement(
            'th', 
            { style: {...thStyle, width: '80px'}, onClick: () => handleSortClick('attitude_grade') },
            React.createElement(
              'div',
              { style: thContainerStyle },
              'Nota Actitud',
              React.createElement('span', { style: sortIconStyle }, getSortArrow('attitude_grade'))
            )
          ),
          React.createElement(
            'th', 
            { style: {...thStyle, width: '120px'}, onClick: () => handleSortClick('gender') },
            React.createElement(
              'div',
              { style: thContainerStyle },
              'Gènere',
              React.createElement('span', { style: sortIconStyle }, getSortArrow('gender'))
            )
          ),
          React.createElement(
            'th', 
            { style: {...thStyle, width: '150px'}, onClick: () => handleSortClick('class_name') },
            React.createElement(
              'div',
              { style: thContainerStyle },
              'Classe',
              React.createElement('span', { style: sortIconStyle }, getSortArrow('class_name'))
            )
          ),          React.createElement('th', { style: thStyle }, 'Restriccions'),
          React.createElement('th', { style: thStyle }, 'Preferències'),
          React.createElement('th', { style: thStyle }, 'Escollit per'),
          React.createElement('th', { style: {...thStyle, width: '140px'} }, 'Accions')
        )
      ),
      React.createElement(
        'tbody',
        null,
        sortedStudents.map((student, index) => {
          if (!student) {
            return React.createElement(
              'tr',
              { key: `error-${index}` },              React.createElement(
                'td',
                { colSpan: "9", style: {...tdStyle, color: 'red', padding: '10px', border: '1px dashed red'} },
                `Error: Dades de l'alumne invàlides a la posició ${index} de la llista.`
              )
            );
          }
          
          const displayGrade = student.academic_grade !== null && student.academic_grade !== undefined 
            ? parseFloat(student.academic_grade).toFixed(2) 
            : 'N/A';          const renderNameCell = () => {
            const isEditing = editingState?.studentId === student.id && editingState.field === 'name';
            
            if (isEditing) {
              return React.createElement(
                'input',
                {
                  ref: inputRef,
                  type: "text",
                  value: editingValue,
                  onChange: (e) => setEditingValue(e.target.value),
                  onKeyDown: (e) => handleKeyDown(e, student),
                  onBlur: () => cancelEditing(),
                  style: { 
                    width: '100%', 
                    padding: '10px 15px', 
                    border: '1px solid #007bff', 
                    borderRadius: '3px',
                    boxSizing: 'border-box' 
                  }
                }
              );
            } 
            return student.name;
          };          const renderGradeCell = () => {
            const isEditing = editingState?.studentId === student.id && editingState.field === 'academic_grade';
            
            if (isEditing) {
              return React.createElement(
                'input',
                {
                  ref: inputRef,
                  type: "number",
                  step: "0.01",
                  min: "0",
                  max: "10",
                  value: editingValue,
                  onChange: (e) => setEditingValue(e.target.value),
                  onKeyDown: (e) => handleKeyDown(e, student),
                  onBlur: () => cancelEditing(),
                  style: { 
                    width: '100%', 
                    padding: '10px 15px', 
                    border: '1px solid #007bff', 
                    borderRadius: '3px',
                    boxSizing: 'border-box' 
                  }
                }
              );
            } 
            return displayGrade;
          };

          const renderAttitudeGradeCell = () => {
            const displayAttitudeGrade = student.attitude_grade !== null && student.attitude_grade !== undefined 
              ? parseFloat(student.attitude_grade).toFixed(2) 
              : 'N/A';
            const isEditing = editingState?.studentId === student.id && editingState.field === 'attitude_grade';
            
            if (isEditing) {
              return React.createElement(
                'input',
                {
                  ref: inputRef,
                  type: "number",
                  step: "0.01",
                  min: "0",
                  max: "10",
                  value: editingValue,
                  onChange: (e) => setEditingValue(e.target.value),
                  onKeyDown: (e) => handleKeyDown(e, student),
                  onBlur: () => cancelEditing(),
                  style: { 
                    width: '100%', 
                    padding: '10px 15px', 
                    border: '1px solid #007bff', 
                    borderRadius: '3px',
                    boxSizing: 'border-box' 
                  }
                }
              );
            } 
            return displayAttitudeGrade;
          };const renderGenderCell = () => {
            const isEditing = editingState?.studentId === student.id && editingState.field === 'gender';
            
            if (isEditing) {
              return React.createElement(
                Select,
                {
                  options: genderOptions,
                  value: genderOptions.find(option => option.value === editingValue),
                  onChange: (selectedOption) => {
                    const newValue = selectedOption ? selectedOption.value : '';
                    setEditingValue(newValue);
                    // Apliquem el canvi directament
                    const updatedStudent = { ...student, gender: newValue };
                    onEditStudent(updatedStudent, true);
                    setEditingState(null);
                  },
                  menuPortalTarget: document.body,
                  styles: {
                    control: base => ({ 
                      ...base, 
                      border: '1px solid #007bff',
                      borderRadius: '3px',
                      minHeight: '36px',
                    }),
                    menuPortal: base => ({ ...base, zIndex: 9999 })
                  },
                  isClearable: true,
                  autoFocus: true
                }
              );
            } 
            
            // Mostrem el text del gènere
            const genderLabel = (() => {
              switch (student.gender) {
                case 'male': return 'Masculí';
                case 'female': return 'Femení';
                case 'other': return 'Altre';
                case 'prefer_not_to_say': return 'Prefereixo no dir-ho';
                default: return 'No especificat';
              }
            })();
            
            return genderLabel;
          };          const renderClassCell = () => {
            const isEditing = editingState?.studentId === student.id && editingState.field === 'class_name';
            
            if (isEditing) {
              return React.createElement(
                Select,
                {
                  options: classOptions,
                  value: classOptions.find(option => option.value === editingValue),
                  onChange: (selectedOption) => {
                    const newValue = selectedOption ? selectedOption.value : '';
                    setEditingValue(newValue);
                    // Apliquem el canvi directament
                    const updatedStudent = { ...student, id_classe_alumne: newValue };
                    onEditStudent(updatedStudent, true);
                    setEditingState(null);
                  },
                  menuPortalTarget: document.body,
                  styles: {
                    control: base => ({ 
                      ...base, 
                      border: '1px solid #007bff',
                      borderRadius: '3px',
                      minHeight: '36px',
                    }),
                    menuPortal: base => ({ ...base, zIndex: 9999 })
                  },
                  isClearable: true,
                  autoFocus: true
                }
              );
            } 
            
            // Mostrem el nom de la classe com a text
            return student.class_name || student.nom_classe || 'No assignat';
          };          const renderRestrictionsCell = () => {
            const isEditing = editingState?.studentId === student.id && editingState.field === 'restrictions';
              if (isEditing) {
              const currentOptions = getStudentOptions(student.id);
              const allStudentsOption = { value: 'SELECT_ALL', label: '🔲 Seleccionar tots els alumnes' };
              const clearAllOption = { value: 'CLEAR_ALL', label: '❌ Esborrar totes les seleccions' };
              const optionsWithActions = [allStudentsOption, clearAllOption, ...currentOptions];
              
              return React.createElement(
                Select,
                {
                  isMulti: true,
                  options: optionsWithActions,                  value: Array.isArray(editingValue) 
                    ? editingValue.filter(item => item && item.value).map(item => ({
                        value: item.value, 
                        label: item.label
                      }))
                    : [],onChange: selectedOptions => {
                    // Comprovar si s'ha seleccionat "Seleccionar tots"
                    const selectAllClicked = selectedOptions?.some(option => option.value === 'SELECT_ALL');
                    const clearAllClicked = selectedOptions?.some(option => option.value === 'CLEAR_ALL');
                    
                    let newValues;
                    if (selectAllClicked) {
                      // Seleccionar tots els alumnes menys les opcions especials
                      newValues = currentOptions;
                      setEditingValue(newValues);
                    } else if (clearAllClicked) {
                      // Esborrar totes les seleccions
                      newValues = [];
                      setEditingValue(newValues);
                    } else {
                      // Filtrar les opcions especials de la selecció
                      newValues = (selectedOptions || []).filter(option => 
                        option.value !== 'SELECT_ALL' && option.value !== 'CLEAR_ALL'
                      );
                      setEditingValue(newValues);
                    }
                    
                    // NO aplicar canvis directament, només actualitzar l'estat local
                    // L'usuari haurà de prémer Enter o fer clic fora per guardar
                  },                  onBlur: () => {
                    // Guardar quan l'usuari fa clic fora del component
                    const restrictionIds = Array.isArray(editingValue) 
                      ? editingValue.filter(item => item && item.value).map(item => item.value)
                      : [];
                    const updatedStudent = { 
                      ...student, 
                      restrictions: restrictionIds
                    };
                    onEditStudent(updatedStudent, true);
                    setEditingState(null);
                  },
                  onKeyDown: (e) => {
                    if (e.key === 'Enter') {
                      // Guardar quan l'usuari prem Enter
                      const restrictionIds = Array.isArray(editingValue) 
                        ? editingValue.filter(item => item && item.value).map(item => item.value)
                        : [];
                      const updatedStudent = { 
                        ...student, 
                        restrictions: restrictionIds
                      };
                      onEditStudent(updatedStudent, true);
                      setEditingState(null);
                    } else if (e.key === 'Escape') {
                      // Cancel·lar l'edició
                      setEditingState(null);
                      setEditingValue('');
                    }
                  },
                  menuPortalTarget: document.body,
                  closeMenuOnSelect: false, // Mantenir el menú obert després de seleccionar
                  isSearchable: true,
                  placeholder: "Cerca i selecciona alumnes... (Enter per guardar, Esc per cancel·lar)",
                  noOptionsMessage: () => "No s'han trobat alumnes",
                  styles: {
                    control: base => ({
                      ...base,
                      border: '1px solid #007bff',
                      borderRadius: '3px',
                      minHeight: '36px',
                    }),
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    option: (base, { data }) => ({
                      ...base,
                      backgroundColor: data.value === 'SELECT_ALL' ? '#e8f5e8' : 
                                     data.value === 'CLEAR_ALL' ? '#ffe8e8' : 
                                     base.backgroundColor,
                      fontWeight: (data.value === 'SELECT_ALL' || data.value === 'CLEAR_ALL') ? 'bold' : 'normal'
                    })
                  },
                  autoFocus: true
                }
              );
            } 
            
            // Mostrem sempre com a multi-select, però en mode només lectura
            const restrictionValues = Array.isArray(student.restrictions) 
              ? student.restrictions.map(id => {
                  const restrictedStudent = studentsForOptions.find(s => s.id === id);
                  return restrictedStudent ? { value: restrictedStudent.id, label: restrictedStudent.name } : null;
                }).filter(Boolean)
              : [];
              return React.createElement(
              Select,
              {
                isMulti: true,
                value: restrictionValues,
                isDisabled: true,
                components: {
                  DropdownIndicator: () => null, // Amaguem la fletxa del desplegable
                  IndicatorSeparator: () => null // Amaguem el separador
                },
                styles: {
                  control: base => ({ 
                    ...base, 
                    border: 'none',
                    boxShadow: 'none',
                    backgroundColor: 'transparent'
                  }),
                  multiValue: base => ({
                    ...base,
                    backgroundColor: '#f8d7da', // Vermell suau
                    border: '1px solid #dc3545'
                  }),
                  multiValueLabel: base => ({
                    ...base,
                    fontSize: '0.8rem',
                    color: '#721c24' // Text més fosc per millor contrast
                  })
                }
              }
            );
          };          const renderPreferencesCell = () => {
            const isEditing = editingState?.studentId === student.id && editingState.field === 'preferences';
              if (isEditing) {
              const currentOptions = getStudentOptions(student.id);
              const allStudentsOption = { value: 'SELECT_ALL', label: '🔲 Seleccionar tots els alumnes' };
              const clearAllOption = { value: 'CLEAR_ALL', label: '❌ Esborrar totes les seleccions' };
              const optionsWithActions = [allStudentsOption, clearAllOption, ...currentOptions];
              
              return React.createElement(
                Select,
                {
                  isMulti: true,
                  options: optionsWithActions,                  value: Array.isArray(editingValue) 
                    ? editingValue.filter(item => item && item.value).map(item => ({
                        value: item.value, 
                        label: item.label
                      }))
                    : [],onChange: selectedOptions => {
                    // Comprovar si s'ha seleccionat "Seleccionar tots"
                    const selectAllClicked = selectedOptions?.some(option => option.value === 'SELECT_ALL');
                    const clearAllClicked = selectedOptions?.some(option => option.value === 'CLEAR_ALL');
                    
                    let newValues;
                    if (selectAllClicked) {
                      // Seleccionar tots els alumnes menys les opcions especials
                      newValues = currentOptions;
                      setEditingValue(newValues);
                    } else if (clearAllClicked) {
                      // Esborrar totes les seleccions
                      newValues = [];
                      setEditingValue(newValues);
                    } else {
                      // Filtrar les opcions especials de la selecció
                      newValues = (selectedOptions || []).filter(option => 
                        option.value !== 'SELECT_ALL' && option.value !== 'CLEAR_ALL'
                      );
                      setEditingValue(newValues);
                    }
                    
                    // NO aplicar canvis directament, només actualitzar l'estat local
                    // L'usuari haurà de prémer Enter o fer clic fora per guardar
                  },                  onBlur: () => {
                    // Guardar quan l'usuari fa clic fora del component
                    const preferenceIds = Array.isArray(editingValue) 
                      ? editingValue.filter(item => item && item.value).map(item => item.value)
                      : [];
                    const updatedStudent = { 
                      ...student, 
                      preferences: preferenceIds
                    };
                    onEditStudent(updatedStudent, true);
                    setEditingState(null);
                  },
                  onKeyDown: (e) => {
                    if (e.key === 'Enter') {
                      // Guardar quan l'usuari prem Enter
                      const preferenceIds = Array.isArray(editingValue) 
                        ? editingValue.filter(item => item && item.value).map(item => item.value)
                        : [];
                      const updatedStudent = { 
                        ...student, 
                        preferences: preferenceIds
                      };
                      onEditStudent(updatedStudent, true);
                      setEditingState(null);
                    } else if (e.key === 'Escape') {
                      // Cancel·lar l'edició
                      setEditingState(null);
                      setEditingValue('');
                    }
                  },
                  menuPortalTarget: document.body,
                  closeMenuOnSelect: false, // Mantenir el menú obert després de seleccionar
                  isSearchable: true,
                  placeholder: "Cerca i selecciona alumnes... (Enter per guardar, Esc per cancel·lar)",
                  noOptionsMessage: () => "No s'han trobat alumnes",
                  styles: {
                    control: base => ({
                      ...base,
                      border: '1px solid #007bff',
                      borderRadius: '3px',
                      minHeight: '36px',
                    }),
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    option: (base, { data }) => ({
                      ...base,
                      backgroundColor: data.value === 'SELECT_ALL' ? '#e8f5e8' : 
                                     data.value === 'CLEAR_ALL' ? '#ffe8e8' : 
                                     base.backgroundColor,
                      fontWeight: (data.value === 'SELECT_ALL' || data.value === 'CLEAR_ALL') ? 'bold' : 'normal'
                    })
                  },                  autoFocus: true
                }
              );
            }
            
            // Mostrem sempre com a multi-select, però en mode només lectura
            const preferenceValues = Array.isArray(student.preferences) 
              ? student.preferences.map(id => {
                  const preferredStudent = studentsForOptions.find(s => s.id === id);
                  return preferredStudent ? { value: preferredStudent.id, label: preferredStudent.name } : null;
                }).filter(Boolean)
              : [];
            
            return React.createElement(
              Select,
              {
                isMulti: true,
                value: preferenceValues,
                isDisabled: true,
                components: {
                  DropdownIndicator: () => null, // Amaguem la fletxa del desplegable
                  IndicatorSeparator: () => null // Amaguem el separador
                },
                styles: {
                  control: base => ({ 
                    ...base, 
                    border: 'none',
                    boxShadow: 'none',
                    backgroundColor: 'transparent'
                  }),                  multiValue: base => ({
                    ...base,
                    backgroundColor: '#d4edda', // Verd suau
                    border: '1px solid #28a745'
                  }),
                  multiValueLabel: base => ({
                    ...base,
                    fontSize: '0.8rem',
                    color: '#155724' // Text verd fosc per millor contrast
                  })
                }
              }            );
          };

          const renderPreferredByCell = () => {
            // Aquesta columna no és editable, només mostra qui ha escollit aquest alumne
            const preferredByValues = Array.isArray(student.preferred_by) 
              ? student.preferred_by.map(id => {
                  const preferrerStudent = studentsForOptions.find(s => s.id === id);
                  return preferrerStudent ? { value: preferrerStudent.id, label: preferrerStudent.name } : null;
                }).filter(Boolean)
              : [];
              return React.createElement(
              Select,
              {
                isMulti: true,
                value: preferredByValues,
                isDisabled: true,
                components: {
                  DropdownIndicator: () => null, // Amaguem la fletxa del desplegable
                  IndicatorSeparator: () => null, // Amaguem el separador
                  MultiValueRemove: () => null // Amaguem la creu d'esborrar
                },
                styles: {
                  control: base => ({ 
                    ...base, 
                    border: 'none',
                    boxShadow: 'none',
                    backgroundColor: 'transparent'
                  }),                  multiValue: base => ({
                    ...base,
                    backgroundColor: '#ffffff', // Fons blanc
                    border: '1px solid #28a745' // Vora verda
                  }),
                  multiValueLabel: base => ({
                    ...base,
                    fontSize: '0.8rem',
                    color: '#155724' // Text verd fosc per millor contrast
                  })
                }
              }
            );
          };

          const renderActionsCell = () => {
            if (editingState?.studentId === student.id) {
              return [
                React.createElement(
                  'button',
                  {
                    key: 'save',
                    style: {
                      ...buttonStyle,
                      backgroundColor: '#28a745',
                      color: 'white',
                    },
                    onClick: () => saveEdit(student)
                  },
                  'Desar'
                ),
                React.createElement(
                  'button',
                  {
                    key: 'cancel',
                    style: {
                      ...buttonStyle,
                      backgroundColor: '#6c757d',
                      color: 'white',
                    },
                    onClick: cancelEditing
                  },
                  'Cancel·lar'
                )
              ];
            } 
            return React.createElement(
              'button',
              {
                style: deleteButtonStyle,
                onClick: () => onDeleteStudent(student.id)
              },
              'Esborrar'
            );
          };

          return React.createElement(
            'tr',
            { key: student.id || `student-item-${index}`, style: trStyle },
            React.createElement(
              'td', 
              { 
                style: editingState?.studentId === student.id && editingState.field === 'name' 
                  ? { ...tdStyle, padding: 0 } 
                  : { ...editableCellStyle },
                onClick: () => !editingState && startEditing(student, 'name')
              },
              renderNameCell()
            ),            React.createElement(
              'td', 
              { 
                style: editingState?.studentId === student.id && editingState.field === 'academic_grade' 
                  ? { ...tdStyle, padding: 0 } 
                  : { ...editableCellStyle },
                onClick: () => !editingState && startEditing(student, 'academic_grade')
              },
              renderGradeCell()
            ),
            React.createElement(
              'td', 
              { 
                style: editingState?.studentId === student.id && editingState.field === 'attitude_grade' 
                  ? { ...tdStyle, padding: 0 } 
                  : { ...editableCellStyle },
                onClick: () => !editingState && startEditing(student, 'attitude_grade')
              },
              renderAttitudeGradeCell()
            ),React.createElement(
              'td', 
              { 
                style: editingState?.studentId === student.id && editingState.field === 'gender' 
                  ? { ...tdStyle, padding: 0 } 
                  : { ...editableCellStyle },
                onClick: () => !editingState && startEditing(student, 'gender')
              },
              renderGenderCell()
            ),
            React.createElement(
              'td', 
              { 
                style: editingState?.studentId === student.id && editingState.field === 'class_name' 
                  ? { ...tdStyle, padding: 0 } 
                  : { ...editableCellStyle },
                onClick: () => !editingState && startEditing(student, 'class_name')
              },
              renderClassCell()
            ),
            React.createElement(
              'td', 
              { 
                style: editingState?.studentId === student.id && editingState.field === 'restrictions' 
                  ? { ...tdStyle, padding: 0 } 
                  : { ...editableCellStyle },
                onClick: () => !editingState && startEditing(student, 'restrictions')
              },
              renderRestrictionsCell()            ),
            React.createElement(
              'td', 
              { 
                style: editingState?.studentId === student.id && editingState.field === 'preferences' 
                  ? { ...tdStyle, padding: 0 } 
                  : { ...editableCellStyle },
                onClick: () => !editingState && startEditing(student, 'preferences')
              },
              renderPreferencesCell()
            ),
            React.createElement(
              'td', 
              { style: tdStyle }, // No editable, per això no té click handler
              renderPreferredByCell()
            ),
            React.createElement(
              'td', 
              { style: tdStyle },
              renderActionsCell()
            )
          );
        })
      )
    )
  );
}

export default StudentList;
