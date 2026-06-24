import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

type ModalProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  size?: 'narrow' | 'wide';
  variant?: 'dialog' | 'sheet';
};

export function Modal({ title, subtitle, children, onClose, size = 'narrow', variant = 'dialog' }: ModalProps) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal modal-${size} modal-${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Dialog schliessen">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
