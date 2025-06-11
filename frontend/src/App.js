// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider, CssBaseline } from '@mui/material';

import './App.css';
import StudentManagementPage from './pages/StudentManagementPage';
import ClassManagementPage from './pages/ClassManagementPage'; // NOVA PÀGINA
import PlantillaAulaManagementPage from './pages/PlantillaAulaManagementPage';
import ClassroomArrangementPage from './pages/ClassroomArrangementPage';
import theme from './assets/theme';

// Importar components d'autenticació
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Component per botó de logout
function LogoutButton() {
  const { logout, user } = useAuth();
  
  const handleLogout = () => {
    if (window.confirm('Estàs segur que vols tancar la sessió?')) {
      logout();
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
      <span style={{ 
        fontSize: '14px', 
        color: 'rgba(255,255,255,0.9)',
        background: 'rgba(255,255,255,0.1)',
        padding: '6px 12px',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        👤 {user?.username || 'Usuari'}
      </span>
      <button 
        onClick={handleLogout}
        style={{
          background: 'rgba(231, 76, 60, 0.8)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.3)',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#e74c3c';
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(231, 76, 60, 0.8)';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        🚪 Sortir
      </button>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ProtectedRoute>
          <DndProvider backend={HTML5Backend}>
            <Router>          <div className="App" style={{ width: '100%', maxWidth: '100%' }}>
                <AppContent />
              </div>
            </Router>
          </DndProvider>
        </ProtectedRoute>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  return (
    <>
      <nav style={{ 
        marginBottom: '20px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '15px 20px', 
        borderBottom: '3px solid #5a67d8',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link to="/" className="nav-link" style={{ 
            textDecoration: 'none', 
            color: 'white', 
            fontWeight: 'bold',
            fontSize: '1.1rem',
            padding: '8px 15px',
            borderRadius: '6px',
            transition: 'all 0.3s ease',
            backgroundColor: 'rgba(255,255,255,0.1)'
          }}>
            🏠 Inici
          </Link>
          <Link to="/classes" className="nav-link" style={{ 
            textDecoration: 'none', 
            color: 'white', 
            padding: '8px 15px',
            borderRadius: '6px',
            transition: 'all 0.3s ease'
          }}>
            📚 Classes
          </Link>
          <Link to="/students" className="nav-link" style={{ 
            textDecoration: 'none', 
            color: 'white',
            padding: '8px 15px',
            borderRadius: '6px',
            transition: 'all 0.3s ease'
          }}>
            👥 Alumnes
          </Link>
          <Link to="/plantilles-aula" className="nav-link" style={{ 
            textDecoration: 'none', 
            color: 'white',
            padding: '8px 15px',
            borderRadius: '6px',
            transition: 'all 0.3s ease'
          }}>
            📋 Plantilles
          </Link>
          <Link to="/distribucions" className="nav-link" style={{ 
            textDecoration: 'none', 
            color: 'white',
            padding: '8px 15px',
            borderRadius: '6px',
            transition: 'all 0.3s ease'
          }}>
            🎯 Distribuir
          </Link>
        </div>
        <LogoutButton />
      </nav>

      <main style={{ padding: '20px', width: '100%' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/students" element={<StudentManagementPage />} /> 
          <Route path="/classes" element={<ClassManagementPage />} /> {/* NOVA RUTA */}
          <Route path="/plantilles-aula" element={<PlantillaAulaManagementPage />} />
          <Route path="/distribucions" element={<ClassroomArrangementPage />} />
        </Routes>
      </main>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
    </>
  );
}

function HomePage() {
  return (
    <div className="home-container" style={{
      textAlign: 'center',
      padding: '40px 20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      maxWidth: '900px',
      margin: '20px auto', // Added margin
      boxShadow: '0 6px 18px rgba(0,0,0,0.1)'
    }}>
      <h1 style={{
        color: '#2c3e50',
        fontSize: '2.5rem',
        marginBottom: '20px',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
      }}>Aplicació de distribució d'alumnes</h1>
      
      <p style={{
        fontSize: '1.2rem',
        color: '#555',
        marginTop: '30px',
        fontStyle: 'italic'
      }}>Selecciona una opció del menú per començar a gestionar la distribució d'alumnes.</p>
      
      <div style={{
        display: 'flex',
        flexWrap: 'wrap', // Permet que els botons vagin a la línia següent si no caben
        justifyContent: 'center',
        gap: '15px',
        marginTop: '30px'
      }}>
         <Link to="/classes" className="home-button" style={{padding: '12px 24px', background: '#1abc9c', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', transition: 'background 0.2s ease'}}>
          Gestionar classes
        </Link>
        <Link to="/students" className="home-button" style={{padding: '12px 24px', background: '#3498db', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', transition: 'background 0.2s ease'}}>
          Gestionar alumnes
        </Link>
        <Link to="/plantilles-aula" className="home-button" style={{padding: '12px 24px', background: '#9b59b6', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', transition: 'background 0.2s ease'}}>
          Gestionar plantilles
        </Link>
        <Link to="/distribucions" className="home-button" style={{padding: '12px 24px', background: '#e67e22', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', transition: 'background 0.2s ease'}}>
          Distribuir alumnes
        </Link>
      </div>
    </div>
  );
}

export default App;