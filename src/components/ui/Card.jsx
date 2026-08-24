import { Link } from 'react-router-dom';

export default function Card({ hover = false, to, className = '', children, ...props }) {
  const clases = `card ${hover ? 'card-hover' : ''} ${className}`.trim();

  if (to) {
    return (
      <Link to={to} className={`block ${clases}`} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <div className={clases} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ titulo, subtitulo, accion, className = '' }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tight">{titulo}</h2>
        {subtitulo && <p className="mt-1 text-[13px] text-mut">{subtitulo}</p>}
      </div>
      {accion}
    </div>
  );
}
