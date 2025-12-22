import React, { useState } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import './CollapsibleCategory.css';

function CollapsibleCategory({ title, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-category">
      <button 
        className="category-header" 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="category-icon">
          {isOpen ? <FaChevronDown /> : <FaChevronRight />}
        </span>
        <span className="category-title">{title}</span>
      </button>
      {isOpen && (
        <div className="category-content">
          {children}
        </div>
      )}
    </div>
  );
}

export default CollapsibleCategory;
