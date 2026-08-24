/* ══════════════════════════════════════════════════════════════
   INCLIP — configuración de negocio
   Edita solo este archivo para cambiar moneda, comisión y límites.

   La comisión real la aplica la base de datos (tabla `app_config`).
   Lo de aquí es lo que se le muestra al usuario: si cambias el
   porcentaje, cámbialo también en Supabase o la pantalla dirá una
   cosa y el cobro hará otra.
   ══════════════════════════════════════════════════════════════ */

export const MARCA = {
  NOMBRE: 'Inclip',
  URL_LANDING: 'https://inclip.com',
  // WhatsApp operativo, formato internacional sin + ni espacios. 591 = Bolivia.
  WHATSAPP: '59176697094',
  EMAIL_SOPORTE: 'hola@inclip.com',
};

/* ── Moneda ────────────────────────────────────────────────────
   Bolivia, bolivianos. Está como constante y no escrito a mano en
   las pantallas para que abrir otro país sea cambiar esto y no
   buscar "Bs" por todo el código.                               */
export const MONEDA = {
  SIMBOLO: 'Bs',
  CODIGO: 'BOB',
  LOCALE: 'es-BO',
  DECIMALES: 2,
};

export const PAIS = {
  NOMBRE: 'Bolivia',
  CIUDADES: [
    'Santa Cruz', 'La Paz', 'Cochabamba', 'El Alto', 'Sucre',
    'Oruro', 'Tarija', 'Potosí', 'Trinidad', 'Cobija', 'Otra',
  ],
};

/* ── Comisión ──────────────────────────────────────────────────
   Se descuenta del pago al clipero al aprobarse el trabajo.
   El primer trabajo completado de cada clipero va sin comisión.  */
export const COMISION = {
  PORCENTAJE: 15,
  PRIMER_TRABAJO_GRATIS: true,
};

/* ── Reglas de la negociación ──────────────────────────────────
   Duplicadas a propósito: la base las impone, el frontend las
   explica. Si cambias una, cambia la otra.                       */
export const REGLAS = {
  HORAS_EXPIRACION_OFERTA: 72,
  RONDAS_AJUSTE: 1,
  DIAS_HASTA_DESTAPAR_CALIFICACION: 7,
  MAX_CARACTERES_MENSAJE: 200,
  PLAZO_ENTREGA_HORAS: 48, // la promesa de la landing
};

/* ── Imágenes ──────────────────────────────────────────────────
   No se aloja video. Portafolio y entregas son links externos.
   FUTURO: migrar a hosting de video propio.                      */
export const IMAGENES = {
  MAX_BYTES: 512 * 1024, // 500 KB después de comprimir en el cliente
  MAX_LADO_PX: 1280,
  CALIDAD_JPEG: 0.82,
  TIPOS: ['image/jpeg', 'image/png', 'image/webp'],
};

export const TIPOS_TRABAJO = [
  { valor: 'clips', etiqueta: 'Clips cortos' },
  { valor: 'anuncios', etiqueta: 'Anuncios' },
  { valor: 'reels', etiqueta: 'Reels / Shorts' },
];

export const ESPECIALIDADES = [
  { valor: 'podcast', etiqueta: 'Podcast' },
  { valor: 'gaming', etiqueta: 'Gaming' },
  { valor: 'entrevistas', etiqueta: 'Entrevistas' },
  { valor: 'anuncios', etiqueta: 'Anuncios' },
];

export const PLATAFORMAS_PUBLICACION = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'X'];

export const PLATAFORMAS_PORTAFOLIO = [
  { valor: 'youtube', etiqueta: 'YouTube' },
  { valor: 'tiktok', etiqueta: 'TikTok' },
  { valor: 'instagram', etiqueta: 'Instagram' },
  { valor: 'drive', etiqueta: 'Drive' },
  { valor: 'otro', etiqueta: 'Otro' },
];

export const METODOS_COBRO = ['Transferencia bancaria', 'QR Simple', 'Tigo Money', 'Otro'];
