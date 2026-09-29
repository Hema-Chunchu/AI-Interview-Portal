import React from 'react';

const UnsavedChangesBar = ({ onDiscard, onSave, isSaving }) => {
  return (
    <div className="unsaved-bar" role="alert" aria-live="polite">
      <div className="unsaved-bar-text">
        <span style={{ fontSize: '1.1rem' }}>⚠️</span>
        <span>Careful — you have unsaved changes!</span>
      </div>
      <div className="unsaved-bar-actions">
        <button
          type="button"
          className="btn-secondary-outline"
          onClick={onDiscard}
          disabled={isSaving}
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          Discard
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={onSave}
          disabled={isSaving}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
        >
          {isSaving ? (
            <>
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
              Saving...
            </>
          ) : (
            'Save changes'
          )}
        </button>
      </div>
    </div>
  );
};

export default UnsavedChangesBar;
