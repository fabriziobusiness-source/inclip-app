import { infoEstadoTrabajo, ESTADOS_POSTULACION, ESTADOS_CLIPERO, ESTADOS_RETIRO } from '../../lib/estados';

/* Pastilla: es la única excepción al radio de 4px de todo el sistema.

   Dos registros a propósito:
   · Chip de ESTADO: mayúsculas, 11px, peso 700, tracking .04em. Se lee
     como etiqueta de sistema y se distingue de un rótulo cualquiera.
   · Etiqueta informativa (tipo de trabajo, "Incluye publicación"): caja
     baja. Son datos del trabajo, no estados, y en mayúsculas gritarían
     más que el estado que tienen al lado. */

const FALLBACK = 'text-muted bg-paper/5 border-transparent';

export default function Badge({ children, className = '', punto = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.75rem] font-medium leading-none ${className}`}
    >
      {punto && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

function ChipEstado({ info, punto = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-bold uppercase leading-none tracking-[0.04em] ${info.clase}`}
    >
      {punto && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
      {info.etiqueta}
    </span>
  );
}

export function BadgeEstadoTrabajo({ estado }) {
  return <ChipEstado info={infoEstadoTrabajo(estado)} punto />;
}

export function BadgeEstadoPostulacion({ estado }) {
  return <ChipEstado info={ESTADOS_POSTULACION[estado] || { etiqueta: estado, clase: FALLBACK }} />;
}

export function BadgeEstadoClipero({ estado }) {
  return <ChipEstado info={ESTADOS_CLIPERO[estado] || { etiqueta: estado, clase: FALLBACK }} />;
}

export function BadgeEstadoRetiro({ estado }) {
  return <ChipEstado info={ESTADOS_RETIRO[estado] || { etiqueta: estado, clase: FALLBACK }} />;
}

/** Chip de acento naranja tintado. Para destacar un dato, no un estado. */
export function BadgeAcento({ children }) {
  return <span className="badge-accent">{children}</span>;
}

/** Etiqueta informativa neutra. La usan el tipo de trabajo y "Incluye publicación". */
export function BadgeInfo({ children }) {
  return <Badge className="border-line2 text-muted">{children}</Badge>;
}
