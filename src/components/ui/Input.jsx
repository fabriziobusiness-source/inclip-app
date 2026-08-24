import { useId } from 'react';

function Envoltura({ id, etiqueta, ayuda, error, requerido, children }) {
  return (
    <div>
      {etiqueta && (
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-paper">
          {etiqueta}
          {requerido && <span className="ml-1 text-cy" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[12.5px] text-rojo">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="mt-1.5 text-[12.5px] text-mut">
            {ayuda}
          </p>
        )
      )}
    </div>
  );
}

export default function Input({ etiqueta, ayuda, error, requerido, className = '', id, ...props }) {
  const auto = useId();
  const inputId = id || auto;
  return (
    <Envoltura id={inputId} etiqueta={etiqueta} ayuda={ayuda} error={error} requerido={requerido}>
      <input
        id={inputId}
        className={`field ${error ? 'field-error' : ''} ${className}`.trim()}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : ayuda ? `${inputId}-ayuda` : undefined}
        {...props}
      />
    </Envoltura>
  );
}

export function Textarea({ etiqueta, ayuda, error, requerido, className = '', id, rows = 4, ...props }) {
  const auto = useId();
  const inputId = id || auto;
  return (
    <Envoltura id={inputId} etiqueta={etiqueta} ayuda={ayuda} error={error} requerido={requerido}>
      <textarea
        id={inputId}
        rows={rows}
        className={`field resize-y ${error ? 'field-error' : ''} ${className}`.trim()}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : ayuda ? `${inputId}-ayuda` : undefined}
        {...props}
      />
    </Envoltura>
  );
}

export function Select({ etiqueta, ayuda, error, requerido, opciones = [], className = '', id, children, ...props }) {
  const auto = useId();
  const inputId = id || auto;
  return (
    <Envoltura id={inputId} etiqueta={etiqueta} ayuda={ayuda} error={error} requerido={requerido}>
      <select
        id={inputId}
        className={`field ${error ? 'field-error' : ''} ${className}`.trim()}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : ayuda ? `${inputId}-ayuda` : undefined}
        {...props}
      >
        {children ||
          opciones.map((o) => (
            <option key={o.valor ?? o} value={o.valor ?? o}>
              {o.etiqueta ?? o}
            </option>
          ))}
      </select>
    </Envoltura>
  );
}

export function Checkbox({ etiqueta, ayuda, id, className = '', ...props }) {
  const auto = useId();
  const inputId = id || auto;
  return (
    <div className={`flex gap-3 ${className}`}>
      <input
        id={inputId}
        type="checkbox"
        className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer rounded border-line2 bg-paper/[0.03] accent-cy"
        {...props}
      />
      <label htmlFor={inputId} className="cursor-pointer select-none">
        <span className="block text-[14px] text-paper">{etiqueta}</span>
        {ayuda && <span className="mt-0.5 block text-[12.5px] text-mut">{ayuda}</span>}
      </label>
    </div>
  );
}
