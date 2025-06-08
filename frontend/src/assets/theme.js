// frontend/src/assets/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976D2', // Blau viu
      contrastText: '#fff',
    },
    secondary: {
      main: '#43A047', // Verd fresc
      contrastText: '#fff',
    },
    background: {
      default: '#F4F6FB', // Fons pàgina
      paper: '#FFFFFF',   // Fons seccions
    },
    text: {
      primary: '#222B45',
      secondary: '#6B778C',
    },
    warning: {
      main: '#FFC107',
      contrastText: '#222B45',
    },
    error: {
      main: '#D32F2F',
      contrastText: '#fff',
    },
    divider: '#E0E3EA',
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: 'Inter, Arial, sans-serif',
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
  },
});

export default theme;
