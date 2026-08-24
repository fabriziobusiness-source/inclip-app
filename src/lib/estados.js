/* Un color por estado, decidido en un solo lugar. Si el badge de un estado se
   ve distinto en dos pantallas, el usuario cree que son dos cosas distintas.

   Regla del sistema (DESIGN.md): el naranja marca lo que necesita tu atención
   ahora. Lo que avanza solo va en tinta neutra. Lo cerrado va plano.

   Verde y ámbar NO aparecen aquí. Están reservados a la diferencia de precio
   contra el presupuesto publicado. En la lista de postulaciones conviven los
   dos significados, y si el verde dijera además "aceptada", el clipero no
   sabría cuál de las dos cosas está leyendo. */

/* Tratamientos, para que ningún estado invente el suyo. */
const ACCION   = 'text-ink bg-flame border-flame';            // requiere tu acción ya
const ESPERA   = 'text-flame bg-flame/10 border-flame/30';    // te toca a ti, sin urgencia
const EN_CURSO = 'text-muted bg-transparent border-line2';    // avanza, tú no haces nada
const ACTIVO   = 'text-paper bg-transparent border-line2';    // vivo y confirmado
const CERRADO  = 'text-muted bg-paper/5 border-transparent';  // terminado
const PROBLEMA = 'text-rojo bg-rojo/10 border-rojo/30';       // excepción real

export const ESTADOS_TRABAJO = {
  abierto: {
    etiqueta: 'Abierto',
    clase: ACCION,
    descripcionCliente: 'Recibiendo ofertas de cliperos.',
    descripcionClipero: 'Puedes ofertar en este trabajo.',
  },
  asignado: {
    etiqueta: 'Asignado',
    clase: ACTIVO,
    descripcionCliente: 'Ya elegiste clipero. Espera la entrega.',
    descripcionClipero: 'Es tuyo. Ponte a editar.',
  },
  en_progreso: {
    etiqueta: 'En progreso',
    clase: EN_CURSO,
    descripcionCliente: 'El clipero está trabajando.',
    descripcionClipero: 'En curso.',
  },
  entregado: {
    etiqueta: 'Entregado',
    clase: ESPERA,
    descripcionCliente: 'Revisa la entrega y apruébala o pide ajustes.',
    descripcionClipero: 'Entregado. Esperando la revisión del cliente.',
  },
  en_ajustes: {
    etiqueta: 'En ajustes',
    clase: EN_CURSO,
    descripcionCliente: 'Pediste ajustes. El clipero está corrigiendo.',
    descripcionClipero: 'El cliente pidió ajustes. Vuelve a entregar.',
  },
  completado: {
    etiqueta: 'Completado',
    clase: CERRADO,
    descripcionCliente: 'Trabajo cerrado.',
    descripcionClipero: 'Cerrado. El monto está en tu saldo.',
  },
  cancelado: {
    etiqueta: 'Cancelado',
    clase: CERRADO,
    descripcionCliente: 'Cerraste este trabajo sin elegir a nadie.',
    descripcionClipero: 'El cliente cerró este trabajo.',
  },
  en_disputa: {
    etiqueta: 'En disputa',
    clase: PROBLEMA,
    descripcionCliente: 'Lo estamos revisando. Te escribimos.',
    descripcionClipero: 'Lo estamos revisando. Te escribimos.',
  },
};

export const ESTADOS_POSTULACION = {
  pendiente: { etiqueta: 'Pendiente',  clase: ESPERA },
  aceptada:  { etiqueta: 'Aceptada',   clase: ACCION },
  rechazada: { etiqueta: 'No elegida', clase: CERRADO },
  expirada:  { etiqueta: 'Expirada',   clase: CERRADO },
  retirada:  { etiqueta: 'Retirada',   clase: CERRADO },
};

export const ESTADOS_CLIPERO = {
  pendiente:   { etiqueta: 'Perfil incompleto', clase: ESPERA },
  en_revision: { etiqueta: 'En revisión',       clase: EN_CURSO },
  aprobado:    { etiqueta: 'Aprobado',          clase: ACTIVO },
  pausado:     { etiqueta: 'Pausado',           clase: PROBLEMA },
};

export const ESTADOS_RETIRO = {
  solicitado: { etiqueta: 'Solicitado', clase: ESPERA },
  procesando: { etiqueta: 'Procesando', clase: EN_CURSO },
  pagado:     { etiqueta: 'Pagado',     clase: ACTIVO },
  rechazado:  { etiqueta: 'Rechazado',  clase: PROBLEMA },
};

/** Estados en los que el trabajo ocupa un cupo de la capacidad del clipero. */
export const ESTADOS_ACTIVOS = ['asignado', 'en_progreso', 'entregado', 'en_ajustes'];

export function infoEstadoTrabajo(estado) {
  return ESTADOS_TRABAJO[estado] || { etiqueta: estado, clase: CERRADO };
}
