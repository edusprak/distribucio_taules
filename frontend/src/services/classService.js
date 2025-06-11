// frontend/src/services/classService.js
import axios from 'axios';

const API_URL_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';
const API_URL = `${API_URL_BASE}/classes`;

// Crear una nova classe
const createClass = async (classData) => {
    try {
        const response = await axios.post(API_URL, classData);
        return response.data; // Esperem { success: true, classe: novaClasse }
    } catch (error) {
        console.error("Error creating class:", error.response || error);
        throw error.response?.data || error;
    }
};

// Obtenir totes les classes
const getAllClasses = async () => {
    try {
        const response = await axios.get(API_URL);
        return response.data; // Esperem { success: true, classes: [] }
    } catch (error) {
        console.error("Error fetching all classes:", error.response || error);
        throw error.response?.data || error;
    }
};

// Obtenir una classe per ID
const getClassById = async (id_classe) => {
    try {
        const response = await axios.get(`${API_URL}/${id_classe}`);
        return response.data; // Esperem { success: true, classe: { ... } }
    } catch (error) {
        console.error(`Error fetching class ${id_classe}:`, error.response || error);
        throw error.response?.data || error;
    }
};

// Actualitzar una classe
const updateClass = async (id_classe, classData) => {
    try {
        const response = await axios.put(`${API_URL}/${id_classe}`, classData);
        return response.data; // Esperem { success: true, classe: { ... } }
    } catch (error) {
        console.error(`Error updating class ${id_classe}:`, error.response || error);
        throw error.response?.data || error;
    }
};

// Esborrar una classe
const deleteClass = async (id_classe) => {
    try {
        const response = await axios.delete(`${API_URL}/${id_classe}`);
        return response.data; // Esperem { success: true, message: "..." }
    } catch (error) {
        console.error(`Error deleting class ${id_classe}:`, error.response || error);
        throw error.response?.data || error;
    }
};

const classService = {
    createClass,
    getAllClasses,
    getClassById,
    updateClass,
    deleteClass,
};

export default classService;