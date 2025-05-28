// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './App.css';
import StudentManagementPage from './pages/StudentManagementPage';
import ClassManagementPage from './pages/ClassManagementPage'; // NOVA PÀGINA
import PlantillaAulaManagementPage from './pages/PlantillaAulaManagementPage';
import ClassroomArrangementPage from './pages/ClassroomArrangementPage';

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
        <Router>
          <div className="App">
            <nav style={{ marginBottom: '20px', background: '#f0f0f0', padding: '10px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'center', gap: '15px' }}>
              <Link to="/" style={{ textDecoration: 'none', color: '#333' }}>Inici</Link>
              <Link to="/classes" style={{ textDecoration: 'none', color: '#333' }}>Gestionar classes</Link>
              <Link to="/students" style={{ textDecoration: 'none', color: '#333' }}>Gestionar alumnes</Link>
              <Link to="/plantilles-aula" style={{ textDecoration: 'none', color: '#333' }}>Gestionar plantilles</Link>
              <Link to="/distribucions" style={{ textDecoration: 'none', color: '#333' }}>Distribuir alumnes</Link>
            </nav>

            <main style={{ padding: '20px' }}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/students" element={<StudentManagementPage />} /> 
                <Route path="/classes" element={<ClassManagementPage />} /> {/* NOVA RUTA */}
                <Route path="/plantilles-aula" element={<PlantillaAulaManagementPage />} />
                <Route path="/distribucions" element={<ClassroomArrangementPage />} />
              </Routes>
            </main>
            <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
          </div>
        </Router>
    </DndProvider>
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