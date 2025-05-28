// frontend/src/components/students/StudentList.js
import React from 'react';
import StudentListItem from './StudentListItem';

function StudentList({ students, onEditStudent, onDeleteStudent }) {
  if (!students || students.length === 0) {
    return <p>No hi ha alumnes per mostrar.</p>;
  }
  console.log('Dades rebudes a StudentList:', students); // Log per veure l'array d'alumnes

  return (
    <div>
      {students.map((student, index) => {
        // Log per veure cada alumne individualment abans de passar-lo a StudentListItem
        console.log(`StudentList: Mapejant alumne a l'índex ${index}:`, student); 
        
        // Comprovació addicional per si un element de l'array és undefined
        if (!student) { 
          console.error(`StudentList: Alumne a l'índex ${index} és undefined! Saltant aquest element.`);
          // Podries renderitzar alguna cosa per indicar l'error o simplement saltar-lo
          return <div key={`error-${index}`} style={{color: 'red', padding: '10px', border: '1px dashed red'}}>Error: Dades de l'alumne invàlides a la posició {index} de la llista.</div>; 
        }

        return (
          <StudentListItem 
            key={student.id || `student-item-${index}`} // Fallback per a la clau si student.id fos undefined o null
            student={student} 
            onEdit={onEditStudent}
            onDelete={onDeleteStudent}
          />
        );
      })}
    </div>
  );
}

export default StudentList;