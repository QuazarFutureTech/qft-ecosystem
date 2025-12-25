import React from 'react';

/**
 * A reusable Card component that applies the global 'qft-card' style.
 *
 * @param {object} props
 * @param {string} [props.title] - Optional title to display at the top of the card.
 * @param {React.ReactNode} props.children - The content to display inside the card.
 * @param {string} [props.className] - Optional additional class names.
 * @param {object} [props.style] - Optional inline styles.
 */
const Card = ({ title, children, className = '', style }) => {
  return (
    <div className={`qft-card ${className}`} style={style}>
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
};

export default Card;
