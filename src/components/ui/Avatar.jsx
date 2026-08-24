import { iniciales } from '../../lib/formato';

const TAMANOS = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-11 w-11 text-[13px]',
  lg: 'h-16 w-16 text-[18px]',
  xl: 'h-24 w-24 text-[26px]',
};

export default function Avatar({ url, nombre, tamano = 'md', className = '' }) {
  const clases = `${TAMANOS[tamano] || TAMANOS.md} shrink-0 rounded-full object-cover ${className}`;

  if (url) {
    return (
      <img
        src={url}
        alt={nombre ? `Foto de ${nombre}` : ''}
        loading="lazy"
        decoding="async"
        className={`${clases} border border-line bg-surf2`}
      />
    );
  }

  return (
    <div
      className={`${clases} flex items-center justify-center border border-line bg-surf2 font-semibold text-mut`}
      aria-hidden={nombre ? undefined : 'true'}
      title={nombre || undefined}
    >
      {iniciales(nombre)}
    </div>
  );
}
