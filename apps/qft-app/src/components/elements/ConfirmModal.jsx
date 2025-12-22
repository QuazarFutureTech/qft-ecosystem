import React, { useState, useEffect } from 'react';
import './Modal.css';
import { useModalLock } from '../../hooks/useModalLock.js';

function ConfirmModal({ isOpen, onClose, title, message, type, onConfirm, inputValue = '' }) {
  const [promptInput, setPromptInput] = useState(inputValue);

  useModalLock(isOpen);

  useEffect(() => {
    if (isOpen && type === 'prompt') {
      setPromptInput(inputValue);
    }
  }, [isOpen, inputValue, type]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    if (onConfirm) {
      if (type === 'prompt') {
        onConfirm(promptInput);
      } else {
        onConfirm(true);
      }
    }
  };

  const handleCancel = () => {
    if (onConfirm) {
      if (type === 'prompt') {
        onConfirm(null);
      } else {
        onConfirm(false);
      }
    } else {
      onClose();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && type === 'prompt') {
      handleConfirm();
    }
  };

  return (
    <div className="modal-overlay open" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close-button" onClick={handleCancel}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '20px' }}>{message}</p>
          
          {type === 'prompt' && (
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter value..."
              autoFocus
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '20px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                background: 'var(--surface-3)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            />
          )}
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {(type === 'confirm' || type === 'prompt') && (
              <button className="qft-button" onClick={handleCancel} style={{ background: '#666' }}>
                Cancel
              </button>
            )}
            <button className="qft-button" onClick={handleConfirm}>
              {type === 'confirm' ? 'Confirm' : type === 'prompt' ? 'OK' : 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
