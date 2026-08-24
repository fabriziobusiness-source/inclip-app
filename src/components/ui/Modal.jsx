import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ abierto, onCerrar, titulo, descripcion, children, ancho = 'max-w-lg' }) {
  const panelRef = useRef(null);
  const previo = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;

    previo.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    const alTeclado = (e) => {
      if (e.key === 'Escape') {
        onCerrar?.();
        return;
      }
      // Atrapa el foco dentro del diálogo: tabular fuera de un modal abierto
      // deja al usuario de teclado navegando una página que no puede ver.
      if (e.key === 'Tab' && panelRef.current) {
        const foco = panelRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!foco.length) return;
        const primero = foco[0];
        const ultimo = foco[foco.length - 1];
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    };

    document.addEventListener('keydown', alTeclado);
    const t = setTimeout(() => {
      const primero = panelRef.current?.querySelector('input, textarea, select, button');
      primero?.focus();
    }, 30);

    return () => {
      document.removeEventListener('keydown', alTeclado);
      document.body.style.overflow = '';
      clearTimeout(t);
      previo.current?.focus?.();
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
        onClick={onCerrar}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`card rise relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-b-none p-5 sm:rounded-b-2xl sm:p-6 ${ancho}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold tight">{titulo}</h2>
            {descripcion && <p className="mt-1 text-[13.5px] text-mut">{descripcion}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-mut transition-colors hover:bg-paper/5 hover:text-paper"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
