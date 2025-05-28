// frontend/src/services/plantillaAulaService.js
import axios from 'axios';

const API_URL_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
const API_URL = `${API_URL_BASE}/plantilles_aula`;

// Crear una nova plantilla d'aula
// plantillaData: { nom_plantilla, descripcio_plantilla, taules: [{ identificador_taula_dins_plantilla, capacitat }] }
const createPlantillaAula = async (plantillaData) => {
    try {
        const response = await axios.post(API_URL, plantillaData);
        return response.data; // Esperem { success: true, plantilla: novaPlantilla }
    } catch (error) {
        console.error("Error creating plantilla d'aula:", error.response || error);
        throw error.response?.data || error;
    }
};

// Obtenir totes les plantilles d'aula (metadata)
const getAllPlantillesAula = async () => {
    try {
        const response = await axios.get(API_URL);
        return response.data; // Esperem { success: true, plantilles: [] }
    } catch (error) {
        console.error("Error fetching all plantilles d'aula:", error.response || error);
        throw error.response?.data || error;
    }
};

// Obtenir una plantilla d'aula específica per ID (amb les seves taules)
const getPlantillaAulaById = async (id_plantilla) => {
    try {
        const response = await axios.get(`${API_URL}/${id_plantilla}`); 
        return response.data; // Esperem { success: true, plantilla: {..., taules: []} }
    } catch (error) {
        console.error(`Error fetching plantilla d'aula ${id_plantilla}:`, error.response || error);
        throw error.response?.data || error;
    }
};

// Esborrar una plantilla d'aula
const deletePlantillaAula = async (id_plantilla) => {
    try {
        const response = await axios.delete(`${API_URL}/${id_plantilla}`);
        return response.data; // Esperem { success: true, message: "..." }
    } catch (error) {
        console.error(`Error deleting plantilla d'aula ${id_plantilla}:`, error.response || error);
        throw error.response?.data || error;
    }
};

const plantillaAulaService = {
    createPlantillaAula,
    getAllPlantillesAula,
    getPlantillaAulaById,
    deletePlantillaAula,
};

export default plantillaAulaService;