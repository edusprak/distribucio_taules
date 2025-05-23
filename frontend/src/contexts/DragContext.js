// frontend/src/contexts/DragContext.js
import React, { createContext, useState, useContext } from 'react';

const DragContext = createContext();

export const useDragState = () => {
  return useContext(DragContext);
};

export const DragProvider = ({ children }) => {
  const [draggedStudentInfo, setDraggedStudentInfo] = useState(null); 
  // draggedStudentInfo serà: { id: studentId, restrictions: [id1, id2,...] } o null

  const startDraggingStudent = (studentId, restrictions) => {
    setDraggedStudentInfo({ id: studentId, restrictions: restrictions || [] });
  };

  const stopDraggingStudent = () => {
    setDraggedStudentInfo(null);
  };

  const value = {
    draggedStudentInfo,
    startDraggingStudent,
    stopDraggingStudent,
  };

  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
};