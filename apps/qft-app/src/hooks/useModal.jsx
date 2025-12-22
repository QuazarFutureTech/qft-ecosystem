import { useState, useCallback } from 'react';

export function useModal() {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert', // 'alert', 'confirm', or 'prompt'
    inputValue: '',
    onConfirm: null,
  });

  const showAlert = useCallback((message, title = 'Notice') => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title,
        message,
        type: 'alert',
        inputValue: '',
        onConfirm: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
      });
    });
  }, []);

  const showConfirm = useCallback((message, title = 'Confirm Action') => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title,
        message,
        type: 'confirm',
        inputValue: '',
        onConfirm: (confirmed) => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(confirmed);
        },
      });
    });
  }, []);

  const showPrompt = useCallback((message, title = 'Input Required', defaultValue = '') => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title,
        message,
        type: 'prompt',
        inputValue: defaultValue,
        onConfirm: (value) => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(value);
        },
      });
    });
  }, []);

  const closeModal = useCallback(() => {
    if (modalState.onConfirm) {
      modalState.onConfirm(false);
    }
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, [modalState.onConfirm]);

  return {
    modalState,
    showAlert,
    showConfirm,
    showPrompt,
    closeModal,
  };
}
