import Card from './ui/Card';
import { BadgeInfo, BadgeEstadoTrabajo } from './ui/Badge';
import { ChipModalidad } from './Distintivos';
import PriceDisplay from './ui/PriceDisplay';
import { textoPlazo, diasRestantes, fecha } from '../lib/formato';
import { TIPOS_TRABAJO } from '../config';

function etiquetaTipo(tipo) {
  return TIPOS_TRABAJO.find((t) => t.valor === tipo)?.etiqueta || tipo;
}

/**
 * Tarjeta de trabajo. La usan el listado del editor y el del cliente.
 * El precio total va grande y primero; todo lo demás es contexto.
 */
export default function TrabajoCard({ trabajo, to, mostrarEstado = false, pie }) {
  const dias = diasRestantes(trabajo.fecha_limite);
  const urgente = dias !== null && dias <= 2 && dias >= 0;
  const vencido = dias !== null && dias < 0;

  return (
    <Card hover to={to} className="flex h-full flex-col p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {mostrarEstado && <BadgeEstadoTrabajo estado={trabajo.estado} />}
        {trabajo.modalidad && <ChipModalidad valor={trabajo.modalidad} conApodo />}
        <BadgeInfo>{etiquetaTipo(trabajo.tipo)}</BadgeInfo>
        {trabajo.requiere_publicacion && (
          <BadgeInfo>Incluye publicación</BadgeInfo>
        )}
      </div>

      <PriceDisplay
        total={trabajo.precio_total}
        cantidadClips={trabajo.cantidad_clips}
        porClip={trabajo.precio_por_clip}
      />

      <h3 className="mt-4 line-clamp-2 text-[15px] font-semibold leading-snug tight">{trabajo.titulo}</h3>
      {trabajo.descripcion && (
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-mut">{trabajo.descripcion}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-[12.5px]">
        <span className={vencido ? 'text-rojo' : urgente ? 'text-flame' : 'text-mut'}>
          {textoPlazo(trabajo.fecha_limite)}
        </span>
        <span className="text-mut" aria-hidden="true">·</span>
        <span className="text-mut">Entrega {fecha(trabajo.fecha_limite, { corto: true })}</span>
      </div>

      {pie && <div className="mt-3 border-t border-line pt-3">{pie}</div>}
    </Card>
  );
}
