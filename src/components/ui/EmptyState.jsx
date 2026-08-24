import Button from './Button';

/**
 * Un estado vacío no dice "no hay nada". Dice qué pasa y qué hacer ahora.
 *
 * Sin icono gigante centrado y sin ilustración: ocupan la mitad del bloque
 * y no aportan información. El texto y la acción son todo el componente.
 *
 * `variante="plano"` quita la caja, para cuando el vacío ya vive dentro de
 * una tarjeta y no hace falta anidar una segunda.
 */
export default function EmptyState({
  titulo,
  mensaje,
  accion,
  accionTo,
  accionHref,
  accionOnClick,
  secundaria,
  variante = 'tarjeta',
  className = '',
}) {
  const caja =
    variante === 'plano'
      ? 'border border-dashed border-line2 px-6 py-10'
      : 'card px-6 py-12';

  return (
    <div className={`${caja} text-left ${className}`}>
      <h3 className="text-[1.0625rem] font-bold tight">{titulo}</h3>

      {mensaje && <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-muted">{mensaje}</p>}

      {accion && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button to={accionTo} href={accionHref} onClick={accionOnClick} tamano="sm">
            {accion}
          </Button>
          {secundaria}
        </div>
      )}
    </div>
  );
}
