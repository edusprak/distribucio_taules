// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { ToastContainer, toast } from 'react-toastify'; // <-- IMPORTA toast i ToastContainer
import 'react-toastify/dist/ReactToastify.css'; // <-- IMPORTA EL CSS PER ALS ESTILS DELS TOASTS

import './App.css'; //
import StudentManagementPage from './pages/StudentManagementPage'; //
import TableManagementPage from './pages/TableManagementPage'; //
import ClassroomArrangementPage from './pages/ClassroomArrangementPage'; //

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      {/* DragProvider anava aquí si el vas posar a App.js, mantén-lo si és el cas */}
      {/* <DragProvider> */}
        <Router>
          <div className="App">
            <nav style={{ marginBottom: '20px', background: '#f0f0f0', padding: '10px', borderBottom: '1px solid #ddd' }}>
              <Link to="/" style={{ marginRight: '15px', textDecoration: 'none', color: '#333' }}>Inici</Link>
              <Link to="/students" style={{ marginRight: '15px', textDecoration: 'none', color: '#333' }}>Gestionar alumnes</Link>
              <Link to="/tables" style={{ marginRight: '15px', textDecoration: 'none', color: '#333' }}>Gestionar taules</Link>
              <Link to="/arrange-classroom" style={{ textDecoration: 'none', color: '#333' }}>Distribuir alumnes</Link>
            </nav>

            <main style={{ padding: '20px' }}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/students" element={<StudentManagementPage />} /> 
                <Route path="/tables" element={<TableManagementPage />} /> 
                <Route path="/arrange-classroom" element={<ClassroomArrangementPage />} /> 
              </Routes>
            </main>

            {/* AFEGEIX ToastContainer AQUÍ */}
            {/* Pots configurar-lo amb opcions, ex: position, autoClose, etc. */}
            <ToastContainer
              position="top-right"
              autoClose={5000} // Tanca automàticament després de 5 segons
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored" // Pots provar "light", "dark", "colored"
            />
          </div>
        </Router>
      {/* </DragProvider> */}
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
      margin: '0 auto',
      boxShadow: '0 6px 18px rgba(0,0,0,0.1)'
    }}>
      <h1 style={{
        color: '#2c3e50',
        fontSize: '2.5rem',
        marginBottom: '20px',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
      }}>Aplicació de distribució d'alumnes per la guapa del Verduna</h1>
      
      <div style={{
        margin: '30px auto',
        position: 'relative',
        maxWidth: '600px',
        transition: 'transform 0.3s ease'
      }}>
        <img 
          src="/alba.jpg" 
          alt="Foto Alba" 
          style={{ 
            width: '100%',
            height: 'auto',
            borderRadius: '12px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
            transition: 'transform 0.3s ease',
            ':hover': {
              transform: 'scale(1.02)'
            }
          }}
        />
      </div>
      
      <p style={{
        fontSize: '1.2rem',
        color: '#555',
        marginTop: '30px',
        fontStyle: 'italic'
      }}>Selecciona una opció del menú per començar a gestionar la distribució d'alumnes.</p>
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        marginTop: '30px'
      }}>
        <Link to="/students" style={{
          padding: '12px 24px',
          background: '#3498db',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          transition: 'background 0.2s ease'
        }}>Gestionar Alumnes</Link>
        
        <Link to="/arrange-classroom" style={{
          padding: '12px 24px',
          background: '#2ecc71',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          transition: 'background 0.2s ease'
        }}>Distribuir Alumnes</Link>
      </div>
    </div>
  );
}

export default App;