import { dinero, dineroUnitario, numero } from '../../lib/formato';

/* ══════════════════════════════════════════════════════════════
   El componente más importante del producto.

   El total va grande y protagónico; el precio por clip va debajo,
   pequeño y gris. "Bs 1.400" es una oferta, "70 Bs" es un
   tarifario: el número grande es lo que hace que el editor abra
   el trabajo. La jerarquía no se invierte ni se empata nunca.
   ══════════════════════════════════════════════════════════════ */

const TAMANOS = {
  sm: 'text-[1.5rem]',
  md: 'text-[2.25rem]',
  lg: 'text-[2.25rem] sm:text-[2.75rem]',
};

export default function PriceDisplay({
  total,
  cantidadClips,
  porClip,
  tamano = 'md',
  acento = true,
  etiqueta,
  className = '',
}) {
  const unitario = porClip ?? (cantidadClips > 0 ? total / cantidadClips : null);

  return (
    <div className={className}>
      {etiqueta && <p className="mb-1 text-[0.8125rem] text-muted">{etiqueta}</p>}

      <p
        className={`num font-black leading-[1.03] tracking-[-0.04em] ${TAMANOS[tamano] || TAMANOS.md} ${
          acento ? 'text-flame' : 'text-paper'
        }`}
      >
        {dinero(total)}
      </p>

      {unitario != null && (
        <p className="num mt-1.5 text-[0.875rem] text-muted">
          {dineroUnitario(Math.round(unitario * 100) / 100)} por clip
          {cantidadClips ? ` · ${numero(cantidadClips)} clip${cantidadClips === 1 ? '' : 's'}` : ''}
        </p>
      )}
    </div>
  );
}

/**
 * Diferencia entre una oferta y el presupuesto publicado.
 *
 * Único lugar del producto donde se usan el verde y el ámbar. Están
 * reservados a esto: en la lista de postulaciones conviven los
 * estados y las diferencias de precio, y si el verde significara
 * además "aceptada" el cliente no sabría cuál está leyendo.
 *
 * El texto dice lo mismo que el color. El color solo nunca basta.
 */
export function DiferenciaPrecio({ oferta, presupuesto }) {
  const delta = Number(oferta) - Number(presupuesto);
  if (!Number.isFinite(delta)) return null;

  if (Math.abs(delta) < 0.01) {
    return <span className="text-[0.8125rem] font-bold text-verde">Acepta tu precio</span>;
  }

  const menor = delta < 0;
  return (
    <span className={`num text-[0.8125rem] font-bold ${menor ? 'text-verde' : 'text-ambar'}`}>
      {menor ? '−' : '+'}
      {dinero(Math.abs(delta), { conSimbolo: false })} {menor ? 'menos' : 'más'} que tu presupuesto
    </span>
  );
}
