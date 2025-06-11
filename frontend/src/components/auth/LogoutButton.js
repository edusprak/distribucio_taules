// frontend/src/components/auth/LogoutButton.js
import React from 'react';
import { Button } from '@mui/material';
import { ExitToApp } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const LogoutButton = () => {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Estàs segur que vols tancar la sessió?')) {
      logout();
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '0.9rem', color: '#666' }}>
        Usuari: {user?.username}
      </span>
      <Button
        onClick={handleLogout}
        size="small"
        startIcon={<ExitToApp />}
        sx={{
          color: '#d32f2f',
          '&:hover': {
            backgroundColor: 'rgba(211, 47, 47, 0.04)'
          }
        }}
      >
        Sortir
      </Button>
    </div>
  );
};

export default LogoutButton;
