import React from 'react';

const SegmentedControl = ({ options, value, onChange, label, name }) => {
  return (
    <div className="settings-field">
      {label && <label className="settings-label">{label}</label>}
      <div className="segmented-control" role="radiogroup" aria-label={label || name}>
        {options.map((option) => {
          const optionValue = typeof option === 'object' ? option.value : option;
          const optionLabel = typeof option === 'object' ? option.label : option;
          const isSelected = String(value) === String(optionValue);

          return (
            <button
              key={optionValue}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`segmented-btn ${isSelected ? 'selected' : ''}`}
              onClick={() => onChange(optionValue)}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SegmentedControl;
