import { MARCA } from '../../config';

/** Contenedor visual compartido por registro y login. */
export default function MarcoAuth({ titulo, bajada, children }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-7 w-7 rounded-lg"
              style={{ background: '#FF5A1F' }}
              aria-hidden="true"
            />
            <span className="text-[19px] font-bold tight">{MARCA.NOMBRE}</span>
          </span>
        </div>

        <div className="card p-6 sm:p-7">
          <h1 className="text-[22px] font-bold leading-tight tight">{titulo}</h1>
          {bajada && <p className="mt-2 text-[14px] leading-relaxed text-mut">{bajada}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}

export function BotonGoogle({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="btn btn-ghost w-full">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z"
        />
        <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 010-4.22V7.05H2.18a11 11 0 000 9.9l3.66-2.84z" />
        <path
          fill="#EA4335"
          d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 002.18 7.05l3.66 2.84C6.71 7.29 9.14 4.75 12 4.75z"
        />
      </svg>
      {children}
    </button>
  );
}

export function Separador({ texto = 'o con tu correo' }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-paper/[0.09]" />
      <span className="text-[12px] text-mut">{texto}</span>
      <span className="h-px flex-1 bg-paper/[0.09]" />
    </div>
  );
}
