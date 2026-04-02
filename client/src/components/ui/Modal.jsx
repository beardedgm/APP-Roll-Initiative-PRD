import { useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import useUIStore from '../../store/useUIStore';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function Modal({ id, title, children, footer }) {
  const activeModal = useUIStore(s => s.activeModal);
  const closeModal = useUIStore(s => s.closeModal);
  const isOpen = activeModal === id;
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      closeModal();
      return;
    }

    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }, [closeModal]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.addEventListener('keydown', handleKeyDown);

      // Auto-focus first focusable element after render
      requestAnimationFrame(() => {
        if (dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        }
      });

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Restore focus to previously focused element
        if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
          previousFocusRef.current.focus();
        }
      };
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
      <div className="modal-dialog" ref={dialogRef}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn--remove modal-close" aria-label="Close" onClick={closeModal}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
