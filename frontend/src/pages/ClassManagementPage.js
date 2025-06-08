// frontend/src/pages/ClassManagementPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import classService from '../services/classService';
import ClassList from '../components/classes/ClassList';
import ConfirmModal from '../components/ConfirmModal';
import { Box, Paper, Typography, Button, TextField, Divider, CircularProgress, Alert } from '@mui/material';
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
  maxWidth: '90%',
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  background: theme.palette.background.paper,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

function ClassManagementPage() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingClass, setEditingClass] = useState(null); // { id_classe, nom_classe, descripcio_classe }
    const [currentName, setCurrentName] = useState('');
    const [currentDescription, setCurrentDescription] = useState('');

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [classToDelete, setClassToDelete] = useState(null);


    const fetchClasses = async () => {
        setLoading(true);
        try {
            const data = await classService.getAllClasses();
            if (data.success) {
                setClasses(data.classes);
                setError(null);
            } else {
                throw new Error(data.message || "Error carregant les classes.");
            }
        } catch (err) {
            setError(err.message || "Error en carregar les classes.");
            setClasses([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    const handleCreateNew = () => {
        setEditingClass(null);
        setCurrentName('');
        setCurrentDescription('');
        setIsFormVisible(true);
        setError(null);
    };

    const handleEdit = (classe) => {
        setEditingClass(classe);
        setCurrentName(classe.nom_classe);
        setCurrentDescription(classe.descripcio_classe || '');
        setIsFormVisible(true);
        setError(null);
    };

    const handleCloseForm = () => {
        setIsFormVisible(false);
        setEditingClass(null);
        setError(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!currentName.trim()) {
            toast.warn("El nom de la classe és obligatori.");
            return;
        }
        setLoading(true);
        const classData = {
            nom_classe: currentName.trim(),
            descripcio_classe: currentDescription.trim() || null,
        };

        try {
            if (editingClass) {
                await classService.updateClass(editingClass.id_classe, classData);
                toast.success(`Classe '${classData.nom_classe}' actualitzada.`);
            } else {
                await classService.createClass(classData);
                toast.success(`Classe '${classData.nom_classe}' creada.`);
            }
            await fetchClasses();
            handleCloseForm();
        } catch (err) {
            const errorMessage = err.message || "Error desant la classe.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    const openConfirmDeleteModal = (classe) => {
        setClassToDelete(classe);
        setIsConfirmModalOpen(true);
    };

    const handleDelete = async () => {
        if (!classToDelete) return;
        setLoading(true);
        try {
            await classService.deleteClass(classToDelete.id_classe);
            toast.success(`Classe '${classToDelete.nom_classe}' esborrada.`);
            await fetchClasses(); // Refresca la llista
             // També hauries de refrescar la llista d'alumnes a StudentManagementPage si està oberta,
             // o almenys la propera vegada que es carregui, perquè els alumnes ja no tindran aquesta classe.
        } catch (err) {
            const errorMessage = err.message || "Error esborrant la classe.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
            setIsConfirmModalOpen(false);
            setClassToDelete(null);
        }
    };


    if (loading && classes.length === 0) return (
      <MainContainer>
        <ContentPaper>
          <Box display="flex" alignItems="center" justifyContent="center" minHeight={200}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>Carregant classes...</Typography>
          </Box>
        </ContentPaper>
      </MainContainer>
    );
    return (
      <MainContainer>
        <ContentPaper>
          <Typography variant="h5" color="primary" fontWeight={700} align="center" mb={1}>
            Gestió de classes
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {error && <Alert severity="error" sx={{ mb: 2 }}>Error: {error}</Alert>}
          {!isFormVisible && (
            <Button variant="contained" color="success" sx={{ mb: 2, alignSelf: 'flex-end' }} onClick={handleCreateNew}>
              + Crear nova classe
            </Button>
          )}
          {isFormVisible && (
            <Box component="form" onSubmit={handleSave} sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6" fontWeight={600} mb={1}>{editingClass ? 'Editar classe' : 'Crear nova classe'}</Typography>
              <TextField
                size="small"
                fullWidth
                label="Nom de la classe"
                value={currentName}
                onChange={e => setCurrentName(e.target.value)}
                required
                sx={{ mb: 1 }}
              />
              <TextField
                size="small"
                fullWidth
                label="Descripció (opcional)"
                value={currentDescription}
                onChange={e => setCurrentDescription(e.target.value)}
                multiline
                minRows={2}
                sx={{ mb: 1 }}
              />
              <Box display="flex" justifyContent="flex-end" gap={1}>
                <Button type="button" variant="outlined" color="inherit" onClick={handleCloseForm}>Cancel·lar</Button>
                <Button type="submit" variant="contained" color="primary" disabled={loading}>
                  {loading ? 'Desant...' : (editingClass ? 'Actualitzar Classe' : 'Crear Classe')}
                </Button>
              </Box>
            </Box>
          )}          {!isFormVisible && (
            classes.length > 0 ? (
              <ClassList 
                classes={classes}
                onEditClass={handleEdit}
                onDeleteClass={openConfirmDeleteModal}
              />
            ) : (
              !loading && <Alert severity="info">No hi ha classes per mostrar. Comença creant-ne una!</Alert>
            )
          )}
          <ConfirmModal
            isOpen={isConfirmModalOpen}
            onClose={() => setIsConfirmModalOpen(false)}
            onConfirm={handleDelete}
            title="Confirmar Esborrat de Classe"
            message={`Segur que vols esborrar la classe "${classToDelete?.nom_classe}"? Els alumnes assignats a aquesta classe perdran la seva assignació de classe (passaran a no tenir-ne cap). Aquesta acció no es pot desfer.`}
          />
        </ContentPaper>
      </MainContainer>
    );
}

export default ClassManagementPage;