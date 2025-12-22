import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import './Modal.css';
import { useModalLock } from '../../hooks/useModalLock.js';

function Modal({ isOpen, onClose, title, children }) {
  const [isRendered, setIsRendered] = useState(false);
  const [show, setShow] = useState(false);
  useModalLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const timer = setTimeout(() => setShow(true), 10); // Add 'open' class after a short delay
      return () => clearTimeout(timer);
    } else {
      setShow(false); // Remove 'open' class to trigger closing animation
    }
  }, [isOpen]);

  const handleTransitionEnd = () => {
    if (!isOpen) {
      setIsRendered(false); // Unmount after closing animation
    }
  };

  if (!isRendered) {
    return null;
  }

  return ReactDOM.createPortal(
    <div 
      className={`modal-overlay ${show ? 'open' : ''}`} 
      onClick={onClose}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close-button" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default Modal;
