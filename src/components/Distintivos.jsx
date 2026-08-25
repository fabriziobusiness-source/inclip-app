import { infoModalidad } from '../config';

/* ══════════════════════════════════════════════════════════════
   Los dos distintivos que puede ganar un editor, y sus modalidades.

   El check NO es azul. DESIGN.md fija un solo acento y prohíbe un
   segundo color de marca: un azul de Instagram metería un color
   ajeno justo en el elemento más visible del perfil. Va en naranja,
   que es el color que el sistema reserva para lo que importa.
   ══════════════════════════════════════════════════════════════ */

export function IconoVerificado({ tamano = 16, className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {/* Sello dentado, como el de las redes, para que se lea sin explicación */}
      <path
        fill="currentColor"
        d="M12 1.6l2.3 1.9 3-.3 1 2.8 2.6 1.5-.9 2.9.9 2.9-2.6 1.5-1 2.8-3-.3L12 22.4l-2.3-1.9-3 .3-1-2.8-2.6-1.5.9-2.9-.9-2.9L5.7 6l1-2.8 3 .3L12 1.6z"
      />
      <path
        d="M8.2 12.1l2.6 2.6 5-5.2"
        fill="none"
        stroke="#0B0907"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Check de verificado. Se pone al lado del nombre, nunca suelto. */
export function SelloVerificado({ tamano = 16, conTexto = false }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 text-flame"
      title="Identidad verificada por videollamada"
    >
      <IconoVerificado tamano={tamano} />
      {conTexto && <span className="text-[0.8125rem] font-bold">Verificado</span>}
      <span className="sr-only">Cuenta verificada</span>
    </span>
  );
}

/** Certificación de IA. Es una habilidad de la persona, no una función de la app. */
export function SelloIA({ conTexto = true }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line2 px-2.5 py-1 text-[0.6875rem] font-bold uppercase leading-none tracking-[0.04em] text-paper"
      title="Domina herramientas de IA en su flujo de trabajo, comprobado en videollamada"
    >
      <svg viewBox="0 0 24 24" width="12" height="12" className="shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M12 2l1.9 5.6L19.5 9l-4.2 3.6 1.2 5.7L12 15.4 7.5 18.3l1.2-5.7L4.5 9l5.6-1.4L12 2z" />
      </svg>
      {conTexto && 'IA'}
    </span>
  );
}

/** Las modalidades que trabaja un editor, o la que pide un trabajo. */
export function ChipModalidad({ valor, conApodo = false }) {
  const m = infoModalidad(valor);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-line2 px-2.5 py-1 text-[0.75rem] font-medium leading-none text-muted"
      title={m.resumen}
    >
      {conApodo ? m.apodo : m.etiqueta}
    </span>
  );
}

/**
 * Bloque compacto para poner junto al nombre en listas y perfiles.
 * Acepta la fila de `editores` tal cual viene de la base.
 */
export function DistintivosEditor({ editor, tamano = 16, mostrarModalidades = false }) {
  if (!editor) return null;

  return (
    <>
      {editor.verificado && <SelloVerificado tamano={tamano} />}
      {editor.certificado_ia && <SelloIA />}
      {mostrarModalidades &&
        (editor.modalidades || []).map((m) => <ChipModalidad key={m} valor={m} conApodo />)}
    </>
  );
}
