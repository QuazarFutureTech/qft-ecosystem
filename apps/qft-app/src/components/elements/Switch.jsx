import React from 'react';
import './Switch.css';

export default function Switch({ checked, onChange, ariaLabel, disabled = false, label }) {
  // If there's a label, we don't need an aria-label on the input if the label is descriptive
  const inputAriaLabel = label ? undefined : ariaLabel;

  return (
    <label className="qft-switch-container" aria-label={label ? ariaLabel : undefined}>
      <div className="qft-switch">
        <input 
          type="checkbox" 
          aria-label={inputAriaLabel} 
          checked={checked} 
          onChange={onChange} 
          disabled={disabled} 
        />
        <span className="qft-switch-slider" aria-hidden="true"></span>
      </div>
      {label && <span className="qft-switch-label">{label}</span>}
    </label>
  );
}
