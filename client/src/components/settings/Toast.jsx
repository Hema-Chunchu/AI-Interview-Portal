import React from 'react';

const Toast = ({ message, type = 'success', onClose }) => {
  if (!message) return null;

  return (
    <div className="toast-container">
      <div className={`toast toast-${type}`} role="status">
        <span>{type === 'success' ? '✓' : '⚠️'}</span>
        <span style={{ flex: 1 }}>{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'currentColor',
              cursor: 'pointer',
              fontSize: '1.1rem',
              padding: '0 0.2rem'
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
