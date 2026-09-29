import React from 'react';

const SettingsCard = ({ title, hint, children }) => {
  return (
    <div className="settings-card">
      {(title || hint) && (
        <div className="settings-card-header">
          {title && <h3 className="settings-card-title">{title}</h3>}
          {hint && <p className="settings-card-hint">{hint}</p>}
        </div>
      )}
      <div className="settings-card-body">{children}</div>
    </div>
  );
};

export default SettingsCard;
