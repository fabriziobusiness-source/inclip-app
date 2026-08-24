import { useState } from 'react';

/* Una estrella y el número. No cinco estrellas huecas: ocupan una
   franja entera de la fila y no dicen nada que "4,8" no diga mejor.
   La estrella va en naranja porque marca reputación, que es lo que
   el cliente compara; el ámbar está reservado a la diferencia de
   precio y no puede significar dos cosas en la misma pantalla. */

function Estrella({ className = '', tamano = 14 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      className={`shrink-0 ${className}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9L12 2.6z" />
    </svg>
  );
}

/**
 * Solo lectura. `valor` puede ser decimal (4.5).
 * Pasa `total` para mostrar sobre cuántas calificaciones se calcula.
 */
export default function StarRating({ valor = 0, total, tamano = 14, className = '' }) {
  const v = Number(valor) || 0;

  // Sin calificaciones no se finge una: se dice.
  if (!v) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <Estrella tamano={tamano} className="text-muted/35" />
        <span className="text-[0.8125rem] text-muted">Sin calificaciones</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      role="img"
      aria-label={`${v.toFixed(1)} de 5${total ? `, sobre ${total} calificaciones` : ''}`}
    >
      <Estrella tamano={tamano} className="text-flame" />
      <span className="num text-[0.8125rem] font-bold text-paper">{v.toFixed(1)}</span>
      {total > 0 && <span className="num text-[0.75rem] text-muted">({total})</span>}
    </span>
  );
}

/**
 * Selector para calificar. Aquí sí van las cinco: es un control de
 * entrada y hay que poder apuntar a cada valor.
 */
export function StarPicker({ valor, onChange, tamano = 30 }) {
  const [hover, setHover] = useState(0);
  const mostrado = hover || valor || 0;

  return (
    <div
      className="inline-flex gap-1.5"
      role="radiogroup"
      aria-label="Calificación en estrellas"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={valor === i}
          aria-label={`${i} ${i === 1 ? 'estrella' : 'estrellas'}`}
          onMouseEnter={() => setHover(i)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(i)}
          className={`transition-transform duration-150 ease-salida hover:scale-110 ${
            mostrado >= i ? 'text-flame' : 'text-muted/30'
          }`}
        >
          <Estrella tamano={tamano} />
        </button>
      ))}
    </div>
  );
}
