// frontend/src/services/tableService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE_URL ? `${process.env.REACT_APP_API_BASE_URL}/api/tables` : 'http://localhost:3001/api/tables';

// Funció per obtenir totes les taules (amb els seus alumnes assignats, segons el backend)
const getAllTables = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    console.error("Error fetching all tables:", error.response || error);
    throw error.response?.data || error;
  }
};

// Funció per obtenir una taula per ID
const getTableById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching table with id ${id}:`, error.response || error);
    throw error.response?.data || error;
  }
};

// Funció per crear una nova taula
// tableData: { capacity, table_number }
const createTable = async (tableData) => {
  try {
    const response = await axios.post(API_URL, tableData);
    return response.data;
  } catch (error) {
    console.error("Error creating table:", error.response || error);
    throw error.response?.data || error;
  }
};

// Funció per actualitzar una taula
// tableData: pot contenir { capacity, table_number }
const updateTable = async (id, tableData) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, tableData);
    return response.data;
  } catch (error) {
    console.error(`Error updating table with id ${id}:`, error.response || error);
    throw error.response?.data || error;
  }
};

// Funció per esborrar una taula
const deleteTable = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting table with id ${id}:`, error.response || error);
    throw error.response?.data || error;
  }
};

const tableService = {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
};

export default tableService;