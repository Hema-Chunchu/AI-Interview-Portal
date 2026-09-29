import React from 'react';

const ToggleRow = ({ id, label, description, checked, onChange, disabled = false }) => {
  return (
    <div className="toggle-row">
      <div className="toggle-info">
        <label htmlFor={id} className="toggle-label" style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
          {label}
        </label>
        {description && <span className="toggle-desc">{description}</span>}
      </div>
      <label className="switch-container">
        <input
          type="checkbox"
          id={id}
          className="switch-input"
          checked={!!checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="switch-slider" />
      </label>
    </div>
  );
};

export default ToggleRow;
