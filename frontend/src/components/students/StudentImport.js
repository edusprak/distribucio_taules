// frontend/src/components/students/StudentImport.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Select from 'react-select';
import classService from '../../services/classService';
import studentService from '../../services/studentService';
import { Box, Button, Typography, Alert, CircularProgress, Paper } from '@mui/material';

const formStyle = {
  border: '1px solid #ccc',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '20px',
  backgroundColor: '#f9f9f9',
};

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontWeight: 'bold',
};

const inputStyle = {
  width: 'calc(100% - 22px)',
  padding: '10px',
  marginBottom: '15px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  boxSizing: 'border-box',
};

const buttonContainerStyle = {
  marginTop: '20px',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
};

const cancelButtonStyle = {
  padding: '10px 15px', 
  backgroundColor: '#6c757d', 
  color: 'white', 
  border: 'none', 
  borderRadius: '4px', 
  cursor: 'pointer'
};

const importButtonStyle = {
  padding: '10px 15px', 
  backgroundColor: '#28a745', 
  color: 'white', 
  border: 'none', 
  borderRadius: '4px', 
  cursor: 'pointer'
};

const selectStyles = { 
  control: base => ({ ...base, padding: 0, marginBottom: '15px', height: 'auto', minHeight: '38px' }),
  input: base => ({ ...base, margin: '0px'}),
  valueContainer: base => ({ ...base, padding: '0 8px'}),
};

const fileInputStyle = {
  ...inputStyle,
  border: '1px dashed #ccc',
  backgroundColor: '#f8f8f8',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  textAlign: 'center',
};

function StudentImport({ onClose, onImportSuccess }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [importTemplate, setImportTemplate] = useState(null);

  // Cargar las clases disponibles
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await classService.getAllClasses();
        if (response.success) {
          setAvailableClasses(response.classes.map(c => ({ value: c.id_classe, label: c.nom_classe })));
        } else {
          toast.error("Error carregant les classes disponibles.");
        }
      } catch (error) {
        toast.error("Error carregant les classes disponibles: " + (error.message || "Error desconegut"));
      }
    };
    fetchClasses();
  }, []);

  // Manejar cambio de archivo
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
      
      if (fileExtension !== 'csv' && fileExtension !== 'xlsx' && fileExtension !== 'xls') {
        setError('El formato de archivo no es válido. Por favor, utiliza CSV o Excel (xlsx/xls).');
        setFile(null);
        setFileName('');
        return;
      }
      
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError(null);
    } else {
      setFile(null);
      setFileName('');
    }
  };

  // Generar plantilla de ejemplo
  const generateTemplateFile = (type) => {
    // Campos de ejemplo para la plantilla
    const headers = ['nombre', 'nota', 'genero', 'restricciones', 'preferencias'];
    const sampleData = [
      ['Ana García', '8.5', 'female', 'Juan López', 'Maria Rodríguez'],
      ['Pedro Martínez', '7.2', 'male', '', 'Ana García'],
      ['Juan López', '6.8', 'male', 'Ana García', ''],
      ['Maria Rodríguez', '9.1', 'female', '', 'Pedro Martínez']
    ];
    
    if (type === 'csv') {
      // Crear contenido CSV
      const csvContent = [
        headers.join(','),
        ...sampleData.map(row => row.join(','))
      ].join('\n');
      
      // Crear y descargar el archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      setImportTemplate(URL.createObjectURL(blob));
      setTimeout(() => document.getElementById('templateLink').click(), 100);
    } else {
      // Para Excel necesitaríamos una librería como SheetJS, 
      // pero aquí solo proporcionaremos instrucciones para crear manualmente
      toast.info('Crea un archivo Excel con las siguientes columnas: nombre, nota, genero, restricciones, preferencias');
    }
  };

  // Importar estudiantes
  const handleImport = async () => {
    if (!file) {
      setError('Por favor, selecciona un archivo.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await studentService.importStudentsFromFile(
        file, 
        selectedClass ? selectedClass.value : null
      );
      
      if (result.success) {
        toast.success(result.message || 'Importación completada correctamente.');
        
        if (result.errors && result.errors.length > 0) {
          // Si hay errores pero la importación fue parcialmente exitosa
          toast.warning(`Se encontraron ${result.errors.length} errores durante la importación.`);
          console.error('Errores de importación:', result.errors);
        }
        
        onImportSuccess && onImportSuccess();
        onClose();
      } else {
        throw new Error(result.message || 'Error desconocido durante la importación.');
      }
    } catch (error) {
      setError(error.message || 'Error durante la importación. Por favor, verifica el formato del archivo.');
      toast.error(error.message || 'Error durante la importación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={formStyle}>
      <Typography variant="h6" gutterBottom>
        Importar alumnes des d'un fitxer
      </Typography>
      
      {error && <Alert severity="error" style={{ marginBottom: '15px' }}>{error}</Alert>}
      
      <div style={{ marginBottom: '15px' }}>
        <Typography variant="body2" color="textSecondary" paragraph>
          Pots importar alumnes des d'un fitxer CSV o Excel (xlsx/xls).
          El fitxer ha de tenir les següents columnes: nom (obligatori), nota, gènere, restriccions, preferències.
        </Typography>
        
        <Box display="flex" gap={1} mb={2}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={() => generateTemplateFile('csv')}
          >
            Descarregar plantilla CSV
          </Button>
          {importTemplate && (
            <a 
              id="templateLink"
              href={importTemplate}
              download="plantilla_importacion_alumnos.csv"
              style={{display: 'none'}}
            >
              Descargar
            </a>
          )}
        </Box>
      </div>
      
      <div>
        <label htmlFor="studentClass" style={labelStyle}>Classe (opcional):</label>
        <Select
            id="studentClass"
            options={availableClasses}
            value={selectedClass}
            onChange={setSelectedClass}
            placeholder="Selecciona classe..."
            isClearable
            noOptionsMessage={() => "No hi ha classes disponibles. Crea'n primer a 'Gestionar classes'."}
            styles={selectStyles}
        />
      </div>
      
      <div>
        <label htmlFor="fileInput" style={labelStyle}>Fitxer:</label>
        <div 
          style={fileInputStyle}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input
            type="file"
            id="fileInput"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {fileName ? (
            <Typography variant="body1">{fileName}</Typography>
          ) : (
            <>
              <Typography variant="body1">Clica aquí per seleccionar el fitxer</Typography>
              <Typography variant="body2" color="textSecondary">(CSV, XLSX, XLS)</Typography>
            </>
          )}
        </div>
      </div>
      
      <div style={buttonContainerStyle}>
        <button type="button" onClick={onClose} style={cancelButtonStyle} disabled={loading}>
          Cancel·lar
        </button>
        <button 
          type="button" 
          onClick={handleImport} 
          style={importButtonStyle}
          disabled={loading || !file}
        >
          {loading ? (
            <Box display="flex" alignItems="center">
              <CircularProgress size={16} style={{marginRight: '8px', color: 'white'}} />
              Importando...
            </Box>
          ) : 'Importar alumnes'}
        </button>
      </div>
    </div>
  );
}

export default StudentImport;
