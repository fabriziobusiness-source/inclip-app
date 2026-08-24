import { Link } from 'react-router-dom';

const VARIANTES = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const TAMANOS = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

/**
 * Botón único de la app. Puede renderizarse como <button>, <Link> o <a>
 * según reciba `to` o `href`, para que un enlace siga siendo un enlace
 * (abrible en pestaña nueva, indexable por el lector de pantalla como link).
 */
export default function Button({
  variante = 'primary',
  tamano = 'md',
  cargando = false,
  className = '',
  children,
  to,
  href,
  disabled,
  ...props
}) {
  const clases = `btn ${VARIANTES[variante] || VARIANTES.primary} ${TAMANOS[tamano]} ${className}`.trim();

  const contenido = (
    <>
      {cargando && (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
        />
      )}
      {children}
    </>
  );

  if (to && !disabled) {
    return (
      <Link to={to} className={clases} {...props}>
        {contenido}
      </Link>
    );
  }
  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={clases} {...props}>
        {contenido}
      </a>
    );
  }

  return (
    <button className={clases} disabled={disabled || cargando} aria-busy={cargando || undefined} {...props}>
      {contenido}
    </button>
  );
}
