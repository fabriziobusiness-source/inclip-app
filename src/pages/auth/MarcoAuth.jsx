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
