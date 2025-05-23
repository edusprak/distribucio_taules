// frontend/src/services/studentService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/students';

// Funció per obtenir tots els alumnes
const getAllStudents = async () => {
  // ... (aquesta ja estava bé)
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    console.error("Error fetching all students:", error);
    throw error; 
  }
};

// Funció per obtenir un alumne per ID
const getStudentById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`); // <--- CORREGIT
    return response.data;
  } catch (error) {
    console.error(`Error fetching student with id ${id}:`, error);
    throw error;
  }
};

// Funció per crear un nou alumne
const createStudent = async (studentData) => {
  // ... (aquesta ja estava bé)
  try {
    const response = await axios.post(API_URL, studentData);
    return response.data;
  } catch (error) {
    console.error("Error creating student:", error);
    throw error.response ? error.response.data : error;
  }
};

// Funció per actualitzar un alumne
const updateStudent = async (id, studentData) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, studentData); // <--- CORREGIT
    return response.data;
  } catch (error) {
    console.error(`Error updating student with id ${id}:`, error);
    throw error.response ? error.response.data : error;
  }
};

// Funció per esborrar un alumne
const deleteStudent = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`); // <--- CORREGIT
    return response.data; 
  } catch (error) {
    console.error(`Error deleting student with id ${id}:`, error);
    throw error;
  }
};

const studentService = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
};

export default studentService;