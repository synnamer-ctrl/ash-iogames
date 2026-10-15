import { useEffect, useRef, type ReactNode } from 'react';
import { IconButton } from './IconButton';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
  hideTitle?: boolean;
}

/** Paper-card dialog: closes on Escape or backdrop tap, keeps focus inside. */
export function Modal({ title, onClose, children, wide, className = '', hideTitle }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('[data-autofocus], button, input');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab' && el) {
        const items = [...el.querySelectorAll<HTMLElement>('button:not([disabled]), input, [tabindex="0"]')];
        if (items.length === 0) return;
        const a = items[0]!, b = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`modal paper ${wide ? 'modal--wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          {!hideTitle && <h2 className="modal__title">{title}</h2>}
          <IconButton icon="icon_cross" label="Close" size="sm" onClick={onClose} className="modal__close" />
        </div>
        {children}
      </div>
    </div>
  );
}
