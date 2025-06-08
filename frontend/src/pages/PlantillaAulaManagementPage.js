// frontend/src/pages/PlantillaAulaManagementPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import plantillaAulaService from '../services/plantillaAulaService';
import PlantillaAulaList from '../components/plantilles_aula/PlantillaAulaList'; // Nou component
import PlantillaAulaForm from '../components/plantilles_aula/PlantillaAulaForm'; // Nou component
import ConfirmModal from '../components/ConfirmModal'; // Component existent
import { Box, Paper, Typography, Button, Divider, CircularProgress, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';

const MainContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  minHeight: 'calc(100vh - 64px)',
  background: theme.palette.background.default,
  padding: theme.spacing(3),
}));

const ContentPaper = styled(Paper)(({ theme }) => ({
  width: '100%',
  maxWidth: 700,
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  background: theme.palette.background.paper,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

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
        return (
          <MainContainer>
            <ContentPaper>
              <Box display="flex" alignItems="center" justifyContent="center" minHeight={200}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>Carregant plantilles...</Typography>
              </Box>
            </ContentPaper>
          </MainContainer>
        );
    }
    return (
        <MainContainer>
          <ContentPaper>
            <Typography variant="h5" color="primary" fontWeight={700} align="center" mb={1}>
              Gestió de plantilles
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {error && !isFormVisible && <Alert severity="error" sx={{ mb: 2 }}>Error: {error}</Alert>}
            {!isFormVisible && (
                <Button variant="contained" color="success" sx={{ mb: 2, alignSelf: 'flex-end' }} onClick={handleCreateNewPlantilla}>
                    + Crear nova plantilla
                </Button>
            )}
            {isFormVisible && (
                <Box>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>Error: {error}</Alert>}
                    <PlantillaAulaForm
                        onSave={handleSavePlantilla}
                        onClose={handleCloseForm}
                    />
                </Box>
            )}
            {!isFormVisible && (
                plantilles.length > 0 ? (
                    <PlantillaAulaList
                        plantilles={plantilles}
                        onDeletePlantilla={openConfirmDeleteModal}
                    />
                ) : (
                    !loading && <Alert severity="info">No hi ha plantilles d'aula. Comença creant-ne una!</Alert>
                )
            )}
            {loading && plantilles.length > 0 && (
              <Box display="flex" alignItems="center" justifyContent="center" minHeight={60}>
                <CircularProgress size={20} sx={{ mr: 2 }} />
                <Typography variant="body2" color="text.secondary">Actualitzant dades...</Typography>
              </Box>
            )}
            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleDeletePlantilla}
                title="Confirmar Esborrat"
                message={`Segur que vols esborrar la plantilla "${plantillaToDelete?.nom_plantilla}"? Totes les distribucions associades també s'esborraran.`}
            />
          </ContentPaper>
        </MainContainer>
    );
}

export default PlantillaAulaManagementPage;