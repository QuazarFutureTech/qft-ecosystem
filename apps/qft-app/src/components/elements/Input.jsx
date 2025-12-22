import React from 'react';
import './Input.css';

export default function Input({ label, id, value, onChange, type = 'text', placeholder, ariaLabel }) {
  return (
    <div className="qft-field">
      {label && <label htmlFor={id} className="qft-label">{label}</label>}
      <input id={id} className="qft-input" type={type} value={value} onChange={onChange} placeholder={placeholder} aria-label={ariaLabel} />
    </div>
  );
}
