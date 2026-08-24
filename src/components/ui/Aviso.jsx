/* Bloque de mensaje en línea.

   Ni verde ni ámbar aparecen aquí. Están reservados a la diferencia de
   precio contra el presupuesto, y un aviso de "guardado" en verde al lado
   de una oferta en verde haría que el color dejara de significar algo.

   El reparto es el del sistema: naranja para lo que pide tu atención,
   tinta neutra para lo informativo y lo ya resuelto, rojo solo para un
   error real. */

const TIPOS = {
  info: 'border-line2 bg-paper/[0.03]',
  ok: 'border-line bg-paper/[0.03]',
  warn: 'border-flame/35 bg-flame/[0.08]',
  error: 'border-rojo/40 bg-rojo/[0.07]',
};

export default function Aviso({ tipo = 'info', titulo, children, className = '' }) {
  return (
    <div
      className={`border px-4 py-3 text-[0.9375rem] leading-relaxed ${TIPOS[tipo] || TIPOS.info} ${className}`}
      role={tipo === 'error' ? 'alert' : undefined}
    >
      {titulo && (
        <p className={`mb-1 font-bold ${tipo === 'warn' ? 'text-flame' : tipo === 'error' ? 'text-rojo' : 'text-paper'}`}>
          {titulo}
        </p>
      )}
      <div className="text-muted [&_strong]:font-bold [&_strong]:text-paper">{children}</div>
    </div>
  );
}
