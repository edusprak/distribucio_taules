// frontend/src/components/ui/ConfirmModal.js
import React from 'react';

// Estils per al modal (pots millorar-los o moure'ls a un fitxer CSS)
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000, // Assegura que estigui per sobre d'altres elements
};

const modalContentStyle = {
  backgroundColor: '#fff',
  padding: '25px',
  borderRadius: '8px',
  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
  minWidth: '300px',
  maxWidth: '500px',
  textAlign: 'center',
};

const modalTitleStyle = {
  marginTop: 0,
  marginBottom: '15px',
  fontSize: '1.5em',
  color: '#333',
};

const modalMessageStyle = {
  marginBottom: '25px',
  fontSize: '1.1em',
  color: '#555',
};

const modalActionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end', // Botons a la dreta per convenció
  gap: '10px',
};

const buttonBaseStyle = {
    padding: '10px 18px',
    fontSize: '1em',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
};

const confirmButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#dc3545', // Vermell per a accions de confirmació perilloses (com esborrar)
    color: 'white',
};

const cancelButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#6c757d', // Gris per a cancel·lar
    color: 'white',
};


function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancel·lar" }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div style={modalOverlayStyle} onClick={onClose}> {/* Tanca si es clica fora */}
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}> {/* Evita que el clic al contingut tanqui el modal */}
        {title && <h2 style={modalTitleStyle}>{title}</h2>}
        <p style={modalMessageStyle}>{message}</p>
        <div style={modalActionsStyle}>
          <button style={cancelButtonStyle} onClick={onClose}>
            {cancelText}
          </button>
          <button style={confirmButtonStyle} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;