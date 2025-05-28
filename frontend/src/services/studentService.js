// frontend/src/services/studentService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE_URL ? `${process.env.REACT_APP_API_BASE_URL}/api/students` : 'http://localhost:3001/api/students';


// Funció per obtenir tots els alumnes
const getAllStudents = async () => {
  try {
    const response = await axios.get(API_URL);
    // La resposta del backend ja no inclourà table_id directament a l'objecte alumne,
    // només id, name, academic_grade, gender, restrictions
    return response.data;
  } catch (error) {
    console.error("Error fetching all students:", error.response || error);
    throw error.response?.data || error;
  }
};

// Funció per obtenir un alumne per ID
const getStudentById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`);
    // La resposta del backend ja no inclourà table_id
    return response.data;
  } catch (error) {
    console.error(`Error fetching student with id ${id}:`, error.response || error);
    throw error.response?.data || error;
  }
};

// Funció per crear un nou alumne
// studentData: { name, academic_grade, gender, restrictions: [] }
const createStudent = async (studentData) => {
  try {
    // Assegura't que no s'envia table_id
    const { table_id, ...dataToSend } = studentData;
    const response = await axios.post(API_URL, dataToSend);
    return response.data;
  } catch (error) {
    console.error("Error creating student:", error.response || error);
    throw error.response?.data || error;
  }
};

// Funció per actualitzar un alumne
// studentData: pot contenir { name, academic_grade, gender, restrictions }
const updateStudent = async (id, studentData) => {
  try {
    // Assegura't que no s'envia table_id
    const { table_id, ...dataToSend } = studentData;
    const response = await axios.put(`${API_URL}/${id}`, dataToSend);
    return response.data;
  } catch (error) {
    console.error(`Error updating student with id ${id}:`, error.response || error);
    throw error.response?.data || error;
  }
};

// Funció per esborrar un alumne (es manté igual)
const deleteStudent = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting student with id ${id}:`, error.response || error);
    throw error.response?.data || error;
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