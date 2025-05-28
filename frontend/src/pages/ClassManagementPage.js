// frontend/src/pages/ClassManagementPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import classService from '../services/classService';
import ConfirmModal from '../components/ConfirmModal';

// Estils (pots externalitzar-los)
const pageStyle = { maxWidth: '700px', margin: '20px auto', padding: '20px', fontFamily: 'Arial, sans-serif' };
const formStyle = { border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#f9f9f9' };
const inputStyle = { width: 'calc(100% - 22px)', padding: '10px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px' };
const buttonStyle = { padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' };
const saveButtonStyle = { ...buttonStyle, backgroundColor: '#007bff', color: 'white' };
const cancelButtonStyle = { ...buttonStyle, backgroundColor: '#6c757d', color: 'white' };
const listStyle = { listStyleType: 'none', padding: 0 };
const listItemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' };
const errorMsgStyle = { color: 'red', marginBottom: '10px' };

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


    if (loading && classes.length === 0) return <div style={pageStyle}>Carregant classes...</div>;

    return (
        <div style={pageStyle}>
            <h2>Gestió de classes</h2>

            {error && <p style={errorMsgStyle}>Error: {error}</p>}

            {!isFormVisible && (
                <button style={{...saveButtonStyle, marginBottom: '20px'}} onClick={handleCreateNew}>
                    + Crear nova classe
                </button>
            )}

            {isFormVisible && (
                <form onSubmit={handleSave} style={formStyle}>
                    <h3>{editingClass ? 'Editar classe' : 'Crear nova classe'}</h3>
                    <div>
                        <label htmlFor="className" style={{display:'block', marginBottom:'5px'}}>Nom de la classe:</label>
                        <input
                            type="text"
                            id="className"
                            style={inputStyle}
                            value={currentName}
                            onChange={(e) => setCurrentName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="classDescription" style={{display:'block', marginBottom:'5px'}}>Descripció (opcional):</label>
                        <textarea
                            id="classDescription"
                            style={{...inputStyle, height: '60px', resize: 'vertical'}}
                            value={currentDescription}
                            onChange={(e) => setCurrentDescription(e.target.value)}
                        />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <button type="button" style={cancelButtonStyle} onClick={handleCloseForm}>Cancel·lar</button>
                        <button type="submit" style={saveButtonStyle} disabled={loading}>
                            {loading ? 'Desant...' : (editingClass ? 'Actualitzar Classe' : 'Crear Classe')}
                        </button>
                    </div>
                </form>
            )}

            {!isFormVisible && (
                classes.length > 0 ? (
                    <ul style={listStyle}>
                        {classes.map(classe => (
                            <li key={classe.id_classe} style={listItemStyle}>
                                <div>
                                    <strong>{classe.nom_classe}</strong>
                                    {classe.descripcio_classe && <p style={{margin: '5px 0 0', fontSize: '0.9em', color: '#555'}}>{classe.descripcio_classe}</p>}
                                </div>
                                <div>
                                    <button style={{...buttonStyle, backgroundColor: '#ffc107', color: 'black'}} onClick={() => handleEdit(classe)}>Editar</button>
                                    <button style={{...buttonStyle, backgroundColor: '#dc3545', color: 'white'}} onClick={() => openConfirmDeleteModal(classe)}>Esborrar</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    !loading && <p>No hi ha classes per mostrar. Comença creant-ne una!</p>
                )
            )}
            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleDelete}
                title="Confirmar Esborrat de Classe"
                message={`Segur que vols esborrar la classe "${classToDelete?.nom_classe}"? Els alumnes assignats a aquesta classe perdran la seva assignació de classe (passaran a no tenir-ne cap). Aquesta acció no es pot desfer.`}
            />
        </div>
    );
}

export default ClassManagementPage;