// frontend/src/services/studentService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE_URL ? `${process.env.REACT_APP_API_BASE_URL}/students` : 'http://localhost:3001/api/students';

const getAllStudents = async () => {
  try {
    const response = await axios.get(API_URL);
    // Ara la resposta inclourà `preferences`
    return response.data;
  } catch (error) {
    console.error("Error fetching all students:", error.response || error);
    throw error.response?.data || error;
  }
};

const getStudentById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`);
    // Ara la resposta inclourà `preferences`
    return response.data;
  } catch (error) {
    console.error(`Error fetching student with id ${id}:`, error.response || error);
    throw error.response?.data || error;
  }
};

// studentData ara pot incloure: { name, academic_grade, gender, id_classe_alumne, restrictions: [], preferences: [] }
const createStudent = async (studentData) => {
  try {
    const { table_id, ...dataToSend } = studentData; // table_id no és part del model Student
    const response = await axios.post(API_URL, dataToSend);
    return response.data;
  } catch (error) {
    console.error("Error creating student:", error.response || error);
    throw error.response?.data || error;
  }
};

// studentData ara pot incloure: { name, academic_grade, gender, id_classe_alumne, restrictions: [], preferences: [] }
const updateStudent = async (id, studentData) => {
  try {
    const { table_id, ...dataToSend } = studentData; // table_id no és part del model Student
    const response = await axios.put(`${API_URL}/${id}`, dataToSend);
    return response.data;
  } catch (error) {
    console.error(`Error updating student with id ${id}:`, error.response || error);
    throw error.response?.data || error;
  }
};

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