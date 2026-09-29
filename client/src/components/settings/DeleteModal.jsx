import React, { useState } from 'react';

const DeleteModal = ({ isOpen, onClose, onConfirm, isDeleting }) => {
  const [confirmInput, setConfirmInput] = useState('');

  if (!isOpen) return null;

  const isConfirmed = confirmInput.trim().toUpperCase() === 'DELETE';

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
      <div className="modal-card">
        <h3 id="delete-modal-title" style={{ fontSize: '1.3rem', color: 'var(--danger-ref)', marginBottom: '0.75rem' }}>
          Delete Account Permanently?
        </h3>
        <p style={{ color: 'var(--text-muted-ref)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
          This action <strong>cannot be undone</strong>. All your mock interview history, AI performance evaluations, recordings, and personal data will be permanently deleted.
        </p>
        <p style={{ color: 'var(--text-ref)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>
          Type <code style={{ color: 'var(--danger-ref)', background: 'rgba(255,92,92,0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>DELETE</code> to confirm:
        </p>
        <input
          type="text"
          className="settings-input"
          placeholder="Type DELETE"
          value={confirmInput}
          onChange={(e) => setConfirmInput(e.target.value)}
          disabled={isDeleting}
          style={{ marginBottom: '1.5rem' }}
          autoFocus
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary-outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ background: 'var(--danger-ref)', borderColor: 'var(--danger-ref)' }}
            disabled={!isConfirmed || isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
