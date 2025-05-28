// frontend/src/components/plantilles_aula/PlantillaAulaForm.js
import React, { useState } from 'react';
import { toast } from 'react-toastify';

// Estils similars a altres formularis
const formStyle = { border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#f9f9f9' };
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold' };
const inputStyle = { width: 'calc(100% - 22px)', padding: '10px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' };
const buttonContainerStyle = { marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' };
const saveButtonStyle = { padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };
const cancelButtonStyle = { padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };
const addTableButtonStyle = { padding: '8px 12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px' };
const tableDefStyle = { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' };
const tableInputStyle = { ...inputStyle, marginBottom: '0', width: 'auto', flexGrow: 1 };
const removeTableButtonStyle = { padding: '5px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' };

function PlantillaAulaForm({ onSave, onClose }) {
    const [nomPlantilla, setNomPlantilla] = useState('');
    const [descripcioPlantilla, setDescripcioPlantilla] = useState('');
    const [taules, setTaules] = useState([{ identificador_taula_dins_plantilla: '', capacitat: '' }]);

    const handleTaulaChange = (index, field, value) => {
        const novesTaules = [...taules];
        novesTaules[index][field] = value;
        setTaules(novesTaules);
    };

    const afegirTaula = () => {
        setTaules([...taules, { identificador_taula_dins_plantilla: '', capacitat: '' }]);
    };

    const treureTaula = (index) => {
        const novesTaules = taules.filter((_, i) => i !== index);
        setTaules(novesTaules);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!nomPlantilla.trim()) {
            toast.warn('El nom de la plantilla és obligatori.');
            return;
        }
        if (taules.length === 0) {
            toast.warn('La plantilla ha de tenir almenys una taula.');
            return;
        }
        let isValidTaules = true;
        const processedTaules = taules.map(t => {
            const cap = parseInt(t.capacitat, 10);
            if (!t.identificador_taula_dins_plantilla.trim() || isNaN(cap) || cap <= 0) {
                isValidTaules = false;
            }
            return { identificador_taula_dins_plantilla: t.identificador_taula_dins_plantilla.trim(), capacitat: cap };
        });

        if (!isValidTaules) {
            toast.warn('Totes les taules han de tenir un identificador i una capacitat numèrica positiva.');
            return;
        }

        // Comprovar identificadors de taula duplicats dins la plantilla
        const identificadorsTaula = processedTaules.map(t => t.identificador_taula_dins_plantilla);
        if (new Set(identificadorsTaula).size !== identificadorsTaula.length) {
            toast.warn('Els identificadors de les taules dins de la plantilla han de ser únics.');
            return;
        }

        onSave({
            nom_plantilla: nomPlantilla,
            descripcio_plantilla: descripcioPlantilla,
            taules: processedTaules,
        });
    };

    return (
        <form onSubmit={handleSubmit} style={formStyle}>
            <h3>Crear nova plantilla</h3>
            <div>
                <label htmlFor="nomPlantilla" style={labelStyle}>Nom de la plantilla:</label>
                <input type="text" id="nomPlantilla" style={inputStyle} value={nomPlantilla} onChange={(e) => setNomPlantilla(e.target.value)} required />
            </div>
            <div>
                <label htmlFor="descripcioPlantilla" style={labelStyle}>Descripció (opcional):</label>
                <textarea id="descripcioPlantilla" style={{...inputStyle, height: '60px', resize: 'vertical'}} value={descripcioPlantilla} onChange={(e) => setDescripcioPlantilla(e.target.value)} />
            </div>

            <h4>Grups de la plantilla:</h4>
            {taules.map((taula, index) => (
                <div key={index} style={tableDefStyle}>
                    <input
                        type="text"
                        placeholder={`Identificador grup ${index + 1}`}
                        style={tableInputStyle}
                        value={taula.identificador_taula_dins_plantilla}
                        onChange={(e) => handleTaulaChange(index, 'identificador_taula_dins_plantilla', e.target.value)}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Capacitat"
                        style={{...tableInputStyle, flexGrow: 0.5}}
                        value={taula.capacitat}
                        onChange={(e) => handleTaulaChange(index, 'capacitat', e.target.value)}
                        min="1"
                        required
                    />
                    {taules.length > 1 && (
                        <button type="button" style={removeTableButtonStyle} onClick={() => treureTaula(index)}>
                            Treure
                        </button>
                    )}
                </div>
            ))}
            <button type="button" style={addTableButtonStyle} onClick={afegirTaula}>
                + Afegir grup
            </button>

            <div style={buttonContainerStyle}>
                <button type="button" onClick={onClose} style={cancelButtonStyle}>Cancel·lar</button>
                <button type="submit" style={saveButtonStyle}>Desar plantilla</button>
            </div>
        </form>
    );
}

export default PlantillaAulaForm;