// frontend/src/components/distribution/UndoRedoButtons.js
import React, { memo } from 'react';
import { Button, ButtonGroup, Tooltip, Box, Typography } from '@mui/material';
import { Undo, Redo, History } from '@mui/icons-material';
import { useDistributionCache } from '../../contexts/DistributionCacheContext';

const UndoRedoButtons = ({ disabled = false }) => {
  const { state, actions } = useDistributionCache();
  
  const historyInfo = actions.getHistoryInfo();
  
  const handleUndo = () => {
    if (actions.canUndo()) {
      actions.undo();
    }
  };

  const handleRedo = () => {
    if (actions.canRedo()) {
      actions.redo();
    }
  };

  // Si no hi ha historial, no mostrar els botons
  if (historyInfo.total === 0) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ButtonGroup variant="outlined" size="small" disabled={disabled}>
        <Tooltip 
          title={actions.canUndo() ? 'Desfer darrer canvi' : 'No hi ha canvis per desfer'}
          placement="top"
        >
          <span>
            <Button 
              onClick={handleUndo}
              disabled={!actions.canUndo() || disabled}
              startIcon={<Undo />}
              sx={{ 
                minWidth: '90px',
                '&:disabled': {
                  color: 'rgba(0, 0, 0, 0.26)',
                  borderColor: 'rgba(0, 0, 0, 0.12)'
                }
              }}
            >
              Desfer
            </Button>
          </span>
        </Tooltip>
        
        <Tooltip 
          title={actions.canRedo() ? 'Refer darrer canvi desfet' : 'No hi ha canvis per refer'}
          placement="top"
        >
          <span>
            <Button 
              onClick={handleRedo}
              disabled={!actions.canRedo() || disabled}
              startIcon={<Redo />}
              sx={{ 
                minWidth: '90px',
                '&:disabled': {
                  color: 'rgba(0, 0, 0, 0.26)',
                  borderColor: 'rgba(0, 0, 0, 0.12)'
                }
              }}
            >
              Refer
            </Button>
          </span>
        </Tooltip>
      </ButtonGroup>
      
      <Tooltip 
        title={`Historial: ${historyInfo.current + 1} de ${historyInfo.total} canvis`}
        placement="top"
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          px: 1,
          py: 0.5,
          borderRadius: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          fontSize: '0.75rem',
          color: 'text.secondary'
        }}>
          <History sx={{ fontSize: '1rem' }} />
          <Typography variant="caption" component="span">
            {historyInfo.current + 1}/{historyInfo.total}
          </Typography>
        </Box>
      </Tooltip>
      
      {state.isDirty && (
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'warning.main',
            fontStyle: 'italic',
            ml: 1
          }}
        >
          • No desat
        </Typography>
      )}
    </Box>
  );
};

export default memo(UndoRedoButtons);
