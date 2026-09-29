import React from 'react';

const ChipGroup = ({ options, selectedValues = [], onChange, label }) => {
  const toggleChip = (topic) => {
    let updated;
    if (selectedValues.includes(topic)) {
      updated = selectedValues.filter((t) => t !== topic);
    } else {
      updated = [...selectedValues, topic];
    }
    onChange(updated);
  };

  return (
    <div className="settings-field">
      {label && <label className="settings-label">{label}</label>}
      <div className="chip-group">
        {options.map((topic) => {
          const isSelected = selectedValues.includes(topic);
          return (
            <button
              key={topic}
              type="button"
              className={`chip-item ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleChip(topic)}
              aria-pressed={isSelected}
            >
              <span>{isSelected ? '✓' : '+'}</span>
              <span>{topic}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChipGroup;
