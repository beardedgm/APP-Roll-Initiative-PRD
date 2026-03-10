import { useEffect, useCallback } from 'react';
import useUIStore from '../../store/useUIStore';

export default function Modal({ id, title, children, footer }) {
  const activeModal = useUIStore(s => s.activeModal);
  const closeModal = useUIStore(s => s.closeModal);
  const isOpen = activeModal === id;

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') closeModal();
  }, [closeModal]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className="modal-dialog">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn--remove modal-close" aria-label="Close" onClick={closeModal}>
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
