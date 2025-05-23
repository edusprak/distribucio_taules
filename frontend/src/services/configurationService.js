// frontend/src/services/configurationService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE_URL 
                ? `${process.env.REACT_APP_API_BASE_URL}/api/configurations` 
                : 'http://localhost:3001/api/configurations';

// Desar una nova configuració
// payload: { name, description (opcional), assignments: [{ studentId, tableId }, ...] }
const saveConfiguration = async (payload) => {
  try {
    const response = await axios.post(API_URL, payload);
    return response.data; // Esperem { success: true, configuration: newConfig }
  } catch (error) {
    console.error("Error saving configuration:", error.response || error);
    throw error.response?.data || error;
  }
};

// Obtenir totes les configuracions desades (només metadata)
const getAllConfigurations = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data; // Esperem { success: true, configurations: [...] }
  } catch (error) {
    console.error("Error fetching all configurations:", error.response || error);
    throw error.response?.data || error;
  }
};

// Obtenir una configuració específica amb les seves assignacions
const getConfigurationById = async (configId) => {
  try {
    const response = await axios.get(`${API_URL}/${configId}`);
    return response.data; // Esperem { success: true, configuration: { ..., assignments: [...] } }
  } catch (error) {
    console.error(`Error fetching configuration ${configId}:`, error.response || error);
    throw error.response?.data || error;
  }
};

// Esborrar una configuració
const deleteConfiguration = async (configId) => {
  try {
    const response = await axios.delete(`${API_URL}/${configId}`);
    return response.data; // Esperem { success: true, message: "..." }
  } catch (error) {
    console.error(`Error deleting configuration ${configId}:`, error.response || error);
    throw error.response?.data || error;
  }
};

// (Opcional) Actualitzar una configuració (ex: nom, descripció)
// const updateConfiguration = async (configId, updateData) => { ... };

const configurationService = {
  saveConfiguration,
  getAllConfigurations,
  getConfigurationById,
  deleteConfiguration,
  // updateConfiguration,
};

export default configurationService;