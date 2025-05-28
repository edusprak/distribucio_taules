// frontend/src/services/distribucioService.js
import axios from 'axios';

const API_URL_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
const API_URL = `${API_URL_BASE}/distribucions`;

// Desar una nova distribució
// payload: { nom_distribucio, descripcio_distribucio, plantilla_id, assignacions: [{ alumne_id, taula_plantilla_id }] }
const saveDistribucio = async (payload) => {
  try {
    const response = await axios.post(API_URL, payload);
    return response.data; // Esperem { success: true, distribucio: novaDistribucio }
  } catch (error) {
    console.error("Error saving distribucio:", error.response || error);
    throw error.response?.data || error;
  }
};

// Obtenir totes les distribucions (pot filtrar per plantilla_id)
const getAllDistribucions = async (plantillaId = null) => {
  try {
    const params = plantillaId ? { plantilla_id: plantillaId } : {};
    const response = await axios.get(API_URL, { params });
    return response.data; // Esperem { success: true, distribucions: [...] }
  } catch (error) {
    console.error("Error fetching all distribucions:", error.response || error);
    throw error.response?.data || error;
  }
};

// Obtenir una distribució específica amb les seves assignacions
const getDistribucioById = async (id_distribucio) => {
  try {
const response = await axios.get(`${API_URL}/${id_distribucio}`);
    // Esperem { success: true, distribucio: { ..., assignacions: [...], assignacionsDetallades: [...] } }
    return response.data;
  } catch (error) {
    console.error(`Error fetching distribucio ${id_distribucio}:`, error.response || error);
    throw error.response?.data || error;
  }
};

// Esborrar una distribució
const deleteDistribucio = async (id_distribucio) => {
  try {
    const response = await axios.delete(`${API_URL}/</span>{id_distribucio}`);
    return response.data; // Esperem { success: true, message: "..." }
  } catch (error) {
    console.error(`Error deleting distribucio ${id_distribucio}:`, error.response || error);
    throw error.response?.data || error;
  }
};

const distribucioService = {
  saveDistribucio,
  getAllDistribucions,
  getDistribucioById,
  deleteDistribucio,
};

export default distribucioService;