import React from 'react';
import './Button.css';

export default function Button({ children, onClick, variant = 'default', ariaLabel, ...rest }) {
  return (
    <button
      className={`qft-btn qft-btn-${variant}`}
      onClick={onClick}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </button>
  );
}
