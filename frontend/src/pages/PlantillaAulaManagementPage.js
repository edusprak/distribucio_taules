// frontend/src/pages/PlantillaAulaManagementPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import plantillaAulaService from '../services/plantillaAulaService';
import PlantillaAulaList from '../components/plantilles_aula/PlantillaAulaList'; // Nou component
import PlantillaAulaForm from '../components/plantilles_aula/PlantillaAulaForm'; // Nou component
import ConfirmModal from '../components/ConfirmModal'; // Component existent

// Estils similars a altres pàgines de gestió
const pageStyle = { maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' };
const buttonStyle = { padding: '10px 15px', fontSize: '1em', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' };
const loadingErrorStyle = { textAlign: 'center', padding: '20px', fontSize: '1.1em' };

function PlantillaAulaManagementPage() {
    const [plantilles, setPlantilles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
    // No hi ha "editingPlantilla" perquè són immutables, només es creen.

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [plantillaToDelete, setPlantillaToDelete] = useState(null);

    const fetchPlantilles = async () => {
        try {
            setLoading(true);
            const data = await plantillaAulaService.getAllPlantillesAula();
            if (data.success) {
                setPlantilles(data.plantilles);
            } else {
                throw new Error(data.message || 'Error carregant plantilles');
            }
            setError(null);
        } catch (err) {
            const errorMessage = err.message || 'Error en carregar les plantilles.';
            setError(errorMessage);
            console.error("Error fetching plantilles:", err);
            setPlantilles([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlantilles();
    }, []);

    const handleCreateNewPlantilla = () => {
        setIsFormVisible(true);
        setError(null);
    };

    const handleCloseForm = () => {
        setIsFormVisible(false);
        setError(null);
    };

    const handleSavePlantilla = async (plantillaData) => {
        // plantillaData inclou nom_plantilla, descripcio_plantilla, taules: [{identificador_taula_dins_plantilla, capacitat}]
        setLoading(true);
        try {
            const response = await plantillaAulaService.createPlantillaAula(plantillaData);
            if (response.success) {
                toast.success(`Plantilla '${response.plantilla.nom_plantilla}' creada correctament!`);
                await fetchPlantilles();
                setIsFormVisible(false);
                setError(null);
            } else {
                throw new Error(response.message || 'Error desant la plantilla');
            }
        } catch (err) {
            const errorMessage = err.message || (err.error ? `${err.error}: ${err.details || ''}` : JSON.stringify(err));
            console.error("Error desant la plantilla:", err);
            setError(`Error desant la plantilla: ${errorMessage}`);
            toast.error(`Error desant la plantilla: ${errorMessage}`);
            // Mantenir el formulari obert si hi ha error de desat
        } finally {
            setLoading(false);
        }
    };

    const openConfirmDeleteModal = (plantilla) => {
        setPlantillaToDelete(plantilla);
        setIsConfirmModalOpen(true);
    };

    const handleDeletePlantilla = async () => {
        if (!plantillaToDelete) return;
        setLoading(true);
        try {
            await plantillaAulaService.deletePlantillaAula(plantillaToDelete.id_plantilla);
            toast.success(`Plantilla '${plantillaToDelete.nom_plantilla}' esborrada correctament.`);
            await fetchPlantilles();
            setError(null);
        } catch (err) {
            const errorMessage = err.message || `Error en esborrar la plantilla ${plantillaToDelete.nom_plantilla}.`;
            setError(errorMessage);
            console.error("Error deleting plantilla:", err);
            toast.error(`Error en esborrar: ${errorMessage}`);
        } finally {
            setLoading(false);
            setIsConfirmModalOpen(false);
            setPlantillaToDelete(null);
        }
    };


    if (loading && plantilles.length === 0) {
        return <div style={loadingErrorStyle}>Carregant plantilles...</div>;
    }

    return (
        <div style={pageStyle}>
            <h2>Gestió de plantilles</h2>

            {error && !isFormVisible && <p style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '10px' }}>Error: {error}</p>}

            {!isFormVisible && (
                <button style={buttonStyle} onClick={handleCreateNewPlantilla}>
                    + Crear nova plantilla
                </button>
            )}

            {isFormVisible && (
                <>
                    {error && <p style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '10px' }}>Error: {error}</p>}
                    <PlantillaAulaForm
                        onSave={handleSavePlantilla}
                        onClose={handleCloseForm}
                        // Passar alumnes no és necessari aquí, ja que les plantilles no tenen alumnes
                    />
                </>
            )}

            {!isFormVisible && (
                plantilles.length > 0 ? (
                    <PlantillaAulaList
                        plantilles={plantilles}
                        onDeletePlantilla={openConfirmDeleteModal}
                        // No hi ha onEditPlantilla ja que són immutables
                    />
                ) : (
                    !loading && <div style={loadingErrorStyle}>No hi ha plantilles d'aula. Comença creant-ne una!</div>
                )
            )}

            {loading && plantilles.length > 0 && <div style={{ ...loadingErrorStyle, fontSize: '0.9em', color: '#555' }}>Actualitzant dades...</div>}

            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleDeletePlantilla}
                title="Confirmar Esborrat"
                message={`Segur que vols esborrar la plantilla "${plantillaToDelete?.nom_plantilla}"? Totes les distribucions associades també s'esborraran.`}
            />
        </div>
    );
}

export default PlantillaAulaManagementPage;