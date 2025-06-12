// frontend/src/components/export/ExportDistributionButton.js
import React, { useState } from 'react';
import { 
  Button, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  CircularProgress,
  Box
} from '@mui/material';
import { 
  FileDownload as FileDownloadIcon,
  TableChart as TableChartIcon,
  Description as DescriptionIcon,
  Summarize as SummarizeIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { 
  exportDistributionToCSV, 
  exportDistributionToExcel, 
  exportDistributionSummary 
} from '../../utils/exportUtils';

const ExportDistributionButton = ({ 
  distribucio, 
  studentsData, 
  plantilla, 
  disabled = false,
  variant = "outlined",
  size = "small",
  className = ""
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    if (disabled || !distribucio || !studentsData || !plantilla) {
      toast.warning("No hi ha dades de distribució per exportar.");
      return;
    }
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = async (exportType) => {
    setIsExporting(true);
    handleClose();
    
    try {
      switch (exportType) {
        case 'csv':
          exportDistributionToCSV(distribucio, studentsData, plantilla);
          toast.success('Distribució exportada a CSV correctament!');
          break;
        case 'excel':
          exportDistributionToExcel(distribucio, studentsData, plantilla);
          toast.success('Distribució exportada a Excel correctament!');
          break;
        case 'summary':
          exportDistributionSummary(distribucio, studentsData, plantilla);
          toast.success('Resum de distribució exportat correctament!');
          break;
        default:
          toast.error('Tipus d\'exportació no reconegut.');
      }
    } catch (error) {
      console.error('Error durant l\'exportació:', error);
      toast.error('Error durant l\'exportació: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const canExport = distribucio && studentsData && studentsData.length > 0 && plantilla;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || !canExport || isExporting}
        startIcon={isExporting ? <CircularProgress size={16} /> : <FileDownloadIcon />}
        className={className}
        sx={{ 
          minWidth: 120,
          textTransform: 'none'
        }}
      >
        {isExporting ? 'Exportant...' : 'Exportar'}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="CSV" 
            secondary="Fitxer de valors separats per comes"
          />
        </MenuItem>
        
        <MenuItem onClick={() => handleExport('excel')}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Excel" 
            secondary="Full de càlcul amb múltiples pestanyes"
          />
        </MenuItem>
        
        <MenuItem onClick={() => handleExport('summary')}>
          <ListItemIcon>
            <SummarizeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Resum (TXT)" 
            secondary="Estadístiques i resum de la distribució"
          />
        </MenuItem>
      </Menu>

      {!canExport && !disabled && (
        <Box component="span" sx={{ ml: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
          {!distribucio && "Carrega una distribució"}
          {distribucio && (!studentsData || studentsData.length === 0) && "No hi ha alumnes"}
          {distribucio && studentsData && studentsData.length > 0 && !plantilla && "Falta informació de plantilla"}
        </Box>
      )}
    </>
  );
};

export default ExportDistributionButton;
