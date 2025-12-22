import { useEffect } from 'react';

let modalLockCount = 0;

const addBodyLock = () => {
  modalLockCount += 1;
  if (modalLockCount === 1) {
    document.body.classList.add('modal-open');
  }
};

const removeBodyLock = () => {
  modalLockCount = Math.max(0, modalLockCount - 1);
  if (modalLockCount === 0) {
    document.body.classList.remove('modal-open');
  }
};

export function useModalLock(isOpen) {
  useEffect(() => {
    if (isOpen) {
      addBodyLock();
      return () => removeBodyLock();
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => () => removeBodyLock(), []);
}
