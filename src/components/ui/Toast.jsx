import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

/* Sin verde para el éxito: ese color es de la diferencia de precio y de
   nada más. Un aviso de "guardado" no pide nada al usuario, así que va en
   tinta neutra. El naranja queda para lo que sí necesita su atención. */
const ESTILOS = {
  ok: 'border-line2 text-paper',
  info: 'border-flame/40 text-flame',
  error: 'border-rojo/40 text-rojo',
};

export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([]);

  const quitar = useCallback((id) => {
    setAvisos((a) => a.filter((x) => x.id !== id));
  }, []);

  const mostrar = useCallback(
    (mensaje, tipo = 'info') => {
      const id = Math.random().toString(36).slice(2);
      setAvisos((a) => [...a, { id, mensaje, tipo }]);
      // Un error se lee más despacio que una confirmación.
      setTimeout(() => quitar(id), tipo === 'error' ? 7000 : 4500);
    },
    [quitar]
  );

  const api = useMemo(
    () => ({
      exito: (m) => mostrar(m, 'ok'),
      error: (m) => mostrar(m, 'error'),
      info: (m) => mostrar(m, 'info'),
    }),
    [mostrar]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-x-0 bottom-[86px] z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end"
          role="status"
          aria-live="polite"
        >
          {avisos.map((a) => (
            <div
              key={a.id}
              className={`card rise pointer-events-auto flex w-full max-w-sm items-start gap-3 bg-ink3 px-4 py-3 text-[0.9375rem] ${ESTILOS[a.tipo]}`}
            >
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-paper">{a.mensaje}</span>
              <button
                type="button"
                onClick={() => quitar(a.id)}
                aria-label="Cerrar aviso"
                className="-mr-1 shrink-0 p-1 text-muted transition-colors hover:text-paper"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast necesita estar dentro de <ToastProvider>');
  return ctx;
}
