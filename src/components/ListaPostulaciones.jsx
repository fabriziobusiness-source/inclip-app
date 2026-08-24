import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dinero, dineroUnitario, tiempoRelativo } from '../lib/formato';
import Avatar from './ui/Avatar';
import Button from './ui/Button';
import StarRating from './ui/StarRating';
import { BadgeInfo, BadgeEstadoPostulacion } from './ui/Badge';
import { DiferenciaPrecio } from './ui/PriceDisplay';

/* Las ofertas se ordenan por precio o por calificación porque son los dos
   ejes con los que de verdad se decide. Cualquier otro orden es decoración. */

const ORDENES = [
  { valor: 'precio', etiqueta: 'Menor precio' },
  { valor: 'calificacion', etiqueta: 'Mejor calificado' },
  { valor: 'reciente', etiqueta: 'Más reciente' },
];

export default function ListaPostulaciones({ postulaciones, presupuesto, onAceptar, aceptando, editable = true }) {
  const [orden, setOrden] = useState('precio');

  const lista = [...(postulaciones || [])].sort((a, b) => {
    if (orden === 'precio') return Number(a.precio_total) - Number(b.precio_total);
    if (orden === 'calificacion') {
      const ca = a.cliperos?.calificacion_promedio ?? 0;
      const cb = b.cliperos?.calificacion_promedio ?? 0;
      if (cb !== ca) return cb - ca;
      return (b.cliperos?.total_calificaciones ?? 0) - (a.cliperos?.total_calificaciones ?? 0);
    }
    return new Date(b.creado_en) - new Date(a.creado_en);
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-mut">Ordenar por</span>
        {ORDENES.map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => setOrden(o.valor)}
            aria-pressed={orden === o.valor}
            className={`rounded-full border px-3 py-1 text-[12.5px] transition-colors ${
              orden === o.valor
                ? 'border-cy/45 bg-cy/[0.09] text-cy'
                : 'border-line bg-paper/[0.02] text-mut hover:border-line2 hover:text-paper'
            }`}
          >
            {o.etiqueta}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {lista.map((p) => {
          const perfil = p.cliperos?.perfiles;
          const metricas = p.cliperos;
          return (
            <div key={p.id} className="card p-4">
              <div className="flex flex-wrap items-start gap-4">
                <Avatar url={perfil?.foto_url} nombre={perfil?.nombre} tamano="md" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14.5px] font-semibold">{perfil?.nombre || 'Clipero'}</p>
                    {/* Neutro a propósito: el verde de "acepta tu precio" ya lo
                        pone DiferenciaPrecio abajo. Repetirlo aquí en color
                        diluiría el único significado que tiene ese verde. */}
                    {p.tipo === 'acepta_precio' && <BadgeInfo>Aceptó tu precio</BadgeInfo>}
                    {p.estado !== 'pendiente' && <BadgeEstadoPostulacion estado={p.estado} />}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StarRating
                      valor={metricas?.calificacion_promedio}
                      total={metricas?.total_calificaciones}
                    />
                    <span className="text-[12px] text-mut">
                      {metricas?.trabajos_completados ?? 0} trabajo
                      {(metricas?.trabajos_completados ?? 0) === 1 ? '' : 's'} completado
                      {(metricas?.trabajos_completados ?? 0) === 1 ? '' : 's'}
                    </span>
                  </div>

                  {p.mensaje && (
                    <p className="mt-2.5 rounded-lg border border-line bg-paper/[0.02] px-3 py-2 text-[13px] leading-relaxed text-mut">
                      {p.mensaje}
                    </p>
                  )}

                  {p.plazo_dias && (
                    <p className="mt-2 text-[12.5px] text-mut">
                      Entrega en {p.plazo_dias} día{p.plazo_dias === 1 ? '' : 's'}
                    </p>
                  )}

                  <p className="mt-2 text-[12px] text-mut">Ofertó {tiempoRelativo(p.creado_en)}</p>
                </div>

                {/* Precio: total grande, por clip pequeño. Igual que en todas partes. */}
                <div className="w-full shrink-0 sm:w-auto sm:text-right">
                  <p className="num text-[24px] font-extrabold leading-none tight text-paper">
                    {dinero(p.precio_total)}
                  </p>
                  <p className="num mt-1 text-[12.5px] text-mut">
                    {dineroUnitario(p.precio_por_clip)} por clip
                  </p>
                  <div className="mt-1.5">
                    <DiferenciaPrecio oferta={p.precio_total} presupuesto={presupuesto} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
                    <Button variante="ghost" tamano="sm" to={`/clipero/perfil/${p.clipero_id}`}>
                      Ver perfil
                    </Button>
                    {editable && p.estado === 'pendiente' && (
                      <Button
                        tamano="sm"
                        onClick={() => onAceptar(p)}
                        cargando={aceptando === p.id}
                        disabled={Boolean(aceptando)}
                      >
                        Aceptar oferta
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
