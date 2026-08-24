/* Bloques con la forma del contenido final, nunca un spinner a pantalla
   completa. El usuario ve dónde va a aparecer cada cosa y la página no
   salta cuando llegan los datos: si el hueco del precio mide lo mismo
   que el precio, no hay reflow.

   Las medidas de aquí siguen a las de los componentes reales. Si cambia
   TrabajoCard, cambia SkeletonTarjetas. */

export default function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Espeja TrabajoCard: chips, precio grande, precio unitario, título, resumen, pie. */
export function SkeletonTarjetas({ cantidad = 3 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Cargando trabajos">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="mb-3 flex gap-2">
            <Skeleton className="h-[22px] w-20 rounded-full" />
            <Skeleton className="h-[22px] w-24 rounded-full" />
          </div>

          {/* Precio total: 2.25rem de alto, igual que PriceDisplay */}
          <Skeleton className="h-9 w-36" />
          <Skeleton className="mt-2 h-3.5 w-44" />

          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-1.5 h-4 w-2/3" />

          <Skeleton className="mt-4 h-3 w-36" />
        </div>
      ))}
    </div>
  );
}

/** Espeja las filas con avatar: foto, nombre, metadatos y acción a la derecha. */
export function SkeletonFilas({ cantidad = 4, conAvatar = true }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="card flex items-center gap-4 p-4">
          {conAvatar && <Skeleton className="h-11 w-11 shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
          <div className="shrink-0 text-right">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Espeja las tarjetas de cifra del panel admin. */
export function SkeletonCifras({ cantidad = 4 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Cargando métricas">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="card p-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2.5 h-7 w-20" />
          <Skeleton className="mt-3 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/** Espeja la grilla vertical 9:16 del portafolio. */
export function SkeletonPortafolio({ cantidad = 3 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true" aria-label="Cargando portafolio">
      {Array.from({ length: cantidad }).map((_, i) => (
        <Skeleton key={i} className="aspect-[9/16] w-full" />
      ))}
    </div>
  );
}

/** Espeja el encabezado de una pantalla de detalle. */
export function SkeletonEncabezado() {
  return (
    <div className="mb-5" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="mt-2.5 h-4 w-80 max-w-full" />
    </div>
  );
}
