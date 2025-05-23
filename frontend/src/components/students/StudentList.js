// frontend/src/components/students/StudentList.js
import React from 'react';
import StudentListItem from './StudentListItem';

function StudentList({ students, onEditStudent, onDeleteStudent }) {
  if (!students || students.length === 0) {
    return <p>No hi ha alumnes per mostrar.</p>;
  }

  return (
    <div>
      {students.map(student => (
        <StudentListItem 
          key={student.id} 
          student={student} 
          onEdit={onEditStudent}
          onDelete={onDeleteStudent}
        />
      ))}
    </div>
  );
}

export default StudentList;