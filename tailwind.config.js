/** @type {import('tailwindcss').Config} */

/* Tokens de DESIGN.md. La paleta anterior (cian #00E5FF + violeta #7C5CFF sobre
   azul-negro frío) quedó retirada: era la paleta por defecto de las herramientas
   de IA y hacía que Inclip pareciera una startup de IA más en vez de un mercado
   donde circula dinero.

   Los nombres viejos siguen definidos como alias para que las clases ya escritas
   en src/ no se rompan, pero apuntan a los valores nuevos. Cuando toques un
   archivo, cambia sus clases al nombre nuevo. Los alias se borran al final. */

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Superficies. Negro cálido, nunca negro puro. ── */
        ink:   '#0B0907',   // fondo de la app
        ink2:  '#131110',   // tarjetas, paneles, barra lateral
        ink3:  '#1C1917',   // elevado: menús, modales, filas en hover

        /* ── Tinta ── */
        paper: '#F7F5F3',   // texto primario   18.3:1 sobre ink
        muted: '#A39D98',   // texto secundario  7.4:1 sobre ink

        /* ── Acento único. No hay segundo color de marca. ── */
        flame:  '#FF5A1F',  // 6.4:1 sobre ink
        flame2: '#FF7A45',  // hover

        /* ── Semáforo de precio. SOLO para la diferencia contra el
              presupuesto publicado, nunca para éxito ni estado general. ── */
        verde: '#4ADE80',   // la oferta iguala o baja tu presupuesto
        ambar: '#FBBF24',   // la oferta lo supera

        /* ── Rojo funcional. Solo destructivo y error real: disputa,
              cancelación, fallo de subida. Nunca decorativo. ── */
        rojo:  '#F87171',   // 7.2:1 sobre ink

        /* ── Alias heredados. No usar en código nuevo. ── */
        base:  '#0B0907',   // → ink
        surf:  '#131110',   // → ink2
        surf2: '#1C1917',   // → ink3
        mut:   '#A39D98',   // → muted
        cy:    '#FF5A1F',   // → flame  (era cian)
        vi:    '#A39D98',   // → muted  (era violeta; el sistema nuevo no tiene segundo acento)
        ok:    '#4ADE80',   // → verde
        warn:  '#FBBF24',   // → ambar
        bad:   '#F87171',   // → rojo
      },

      borderColor: {
        line:  'rgba(247,245,243,0.09)',   // divisores
        line2: 'rgba(247,245,243,0.18)',   // bordes de control
      },

      /* Radio de 4px en todo. Los chips de estado son pastilla y para eso
         ya existe rounded-full. Las esquinas de 16px o más son la firma del
         SaaS de IA; 4px lee comercial, que es lo que Inclip es.
         Las escalas grandes se aplastan a 4px a propósito, para que las
         24 clases rounded-xl/2xl que ya existen queden correctas solas. */
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
        '3xl': '4px',
      },

      maxWidth: { content: '1240px' },

      fontFamily: {
        sans: ['Satoshi', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },

      transitionTimingFunction: {
        salida: 'cubic-bezier(.16, 1, .3, 1)',
      },
    },
  },
  plugins: [],
};
