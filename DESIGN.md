# Sistema de diseño de Inclip

Verdad visual compartida por la landing y la web app. La verdad de producto vive en
[PRODUCT.md](PRODUCT.md); este archivo solo decide cómo se ve y cómo se comporta.

**Para el chat de desarrollo de la app: pega este archivo completo junto a
`PROMPT-WEBAPP-MVP-EDITORES.md`.** El brief define qué construir; esto define cómo se ve.

> **Cambio de paleta, julio 2026.** La identidad anterior era cian `#00E5FF` + violeta `#7C5CFF`
> sobre azul-negro frío. Se retiró: cian y violeta sobre oscuro es la paleta por defecto de
> las herramientas de IA, y hacía que Inclip pareciera una startup de IA más en vez de un
> mercado donde circula dinero real. **Cualquier referencia a la paleta vieja en briefs
> anteriores queda anulada por este archivo.**

---

## 1. Paleta

Un solo acento en todo el producto. Sin degradados de marca, sin segundo color decorativo.

```css
:root {
  /* Superficies. Negro cálido, nunca negro puro. */
  --ink:     #0B0907;   /* fondo de la app */
  --ink-2:   #131110;   /* tarjetas, paneles, barra lateral */
  --ink-3:   #1C1917;   /* elevado: menús, modales, filas en hover */
  --line:    rgba(247,245,243,.09);   /* divisores */
  --line-2:  rgba(247,245,243,.18);   /* bordes de control */

  /* Tinta */
  --paper:   #F7F5F3;   /* texto primario */
  --muted:   #A39D98;   /* texto secundario, etiquetas */

  /* Acento único */
  --flame:   #FF5A1F;
  --flame-2: #FF7A45;   /* hover */
  --flame-t: rgba(255,90,31,.10);   /* fondo tintado */
  --flame-b: rgba(255,90,31,.34);   /* borde tintado */
}
```

### Semáforo de precio, y solo de precio

`PRODUCT.md` reserva el verde y el ámbar exclusivamente para señalar diferencias de precio
frente al presupuesto publicado. **No los uses para éxito, error, ni estado general.**

```css
--verde: #4ADE80;   /* la oferta es igual o menor a tu presupuesto */
--ambar: #FBBF24;   /* la oferta lo supera */
```

Ambos verificados sobre `--ink`: verde 11.4:1, ámbar 12.6:1.

### Estados del trabajo

Los seis estados de `trabajos` usan tinta, no color propio. El acento se reserva para lo que
requiere acción del usuario.

| Estado | Tratamiento |
|---|---|
| `abierto` | chip naranja sólido, texto `--ink` |
| `asignado` | chip contorneado `--line-2`, texto `--paper` |
| `en_progreso` | chip contorneado, texto `--muted` |
| `entregado` | chip naranja tintado (`--flame-t` + `--flame-b`), texto `--flame` |
| `completado` | chip plano `rgba(247,245,243,.07)`, texto `--muted` |
| `cancelado` / `en_disputa` | chip plano, texto `--muted`, más un icono |

### Contraste verificado

| Par | Ratio | Uso |
|---|---|---|
| `--paper` sobre `--ink` | 18.3:1 | cuerpo |
| `--muted` sobre `--ink` | 7.4:1 | secundario |
| `--muted` sobre `--ink-2` | 7.0:1 | secundario en tarjeta |
| `--flame` sobre `--ink` | 6.4:1 | acento en texto |
| `--ink` sobre `--flame` | 6.4:1 | **texto de botón primario** |

**Blanco sobre naranja da 3.1:1 y no pasa AA.** El botón primario lleva texto casi negro.
Es lo contrario de lo que hace casi todo el mundo, y es lo correcto.

---

## 2. Tipografía

**Satoshi**, una sola familia en tres pesos. Nada de emparejar dos sans parecidas.

```
Display / títulos    900, tracking -0.03em, line-height 1.03
Subtítulos           700, tracking -0.02em
Cuerpo               500, line-height 1.6
```

Números: `font-variant-numeric: tabular-nums` **siempre**. Precios, calificaciones, contadores,
fechas. Sin esto las columnas de precio bailan al actualizarse y el producto se siente barato.

En Vite: instala `@fontsource-variable/satoshi` o sirve los `.woff2` desde `public/` con
`font-display: swap`. No enlaces Google Fonts desde el `<head>` en producción.

### Escala

```
display   clamp(2.05rem, 3.7vw, 2.7rem)
h1 app    1.5rem
h2        1.25rem
h3        1.0625rem
cuerpo    1rem
pequeño   0.9375rem
etiqueta  0.8125rem
micro     0.75rem
```

---

## 3. Forma y espacio

**Radio de 4px en todo.** Botones, tarjetas, inputs, modales. Única excepción: los chips de
estado son pastilla (`999px`). Esa es la regla completa; no hay un tercer radio.

El radio pequeño es deliberado. Las esquinas de 16px o más son la firma visual del SaaS de IA;
4px lee comercial, como un mercado, que es lo que Inclip es.

Escala de espaciado en múltiplos de 4px. Densidad de app diaria: `py-16` a `py-24` entre bloques,
`gap-3` a `gap-4` dentro de un grupo.

**Sombras: ninguna.** La jerarquía se construye con las tres superficies (`--ink`, `--ink-2`,
`--ink-3`) y con `--line`. Nada de halos de color: un `box-shadow` naranja difuso detrás de una
tarjeta es exactamente el tell que estamos evitando.

---

## 4. Componentes

### PriceDisplay
El componente más importante del producto. Regla de `PRODUCT.md`: **el total va grande y
protagónico, el precio por clip va debajo, pequeño y gris.**

```
Bs 1.400          ← 2.25rem, peso 900, tracking -0.04em, tabular
70 Bs por clip · 20 clips   ← 0.875rem, --muted
```

En listados de trabajos el total es lo que engancha al clipero. No lo empates en tamaño con
el precio unitario, y no inviertas la jerarquía nunca.

### Button
```
primario    bg --flame, texto --ink, peso 700, radio 4px
            hover: bg --flame-2
secundario  borde 1px --line-2, texto --paper
            hover: borde --flame, texto --flame
peligro     borde 1px, texto --muted; confirmación en modal, nunca botón rojo suelto
:active     transform: scale(.985)
```
Etiquetas de 1 a 3 palabras. Una etiqueta por intención en toda la app: si "Publicar trabajo"
es la acción, no aparece también como "Crear trabajo" en otra pantalla.

### Chip de estado
Pastilla, `0.6875rem`, peso 700, `letter-spacing .04em`, mayúsculas. Ver tabla de estados.

### Card / Panel
`--ink-2`, borde 1px `--line`, radio 4px. **Sin sombra.** Hover en filas interactivas: fondo a
`--ink-3`, no elevación.

Las tarjetas cuestan atención. Para agrupar contenido que no compite por jerarquía usa
`border-top` y espacio en blanco, no una caja.

### Input
```
fondo    rgba(247,245,243,.03)
borde    1px --line-2
foco     borde --flame, outline 2px --flame con offset 2px
```
Etiqueta **arriba** del campo, siempre. Texto de ayuda debajo. Error debajo del ayuda.
Nunca placeholder como etiqueta. El placeholder debe pasar 4.5:1 contra su fondo: usa
`--muted`, no un gris más claro.

### StarRating
Estrella rellena en `--flame`, número tabular al lado en `--paper`. No pintes cinco estrellas
huecas: ocupan espacio y no aportan. Una estrella y el número basta.

### EmptyState
Obligatorio en: trabajos disponibles sin resultados, mis postulaciones vacío, sin entregas,
portafolio vacío, sin calificaciones. Cada uno con una frase de qué pasa y **una acción
sugerida**. Nunca una ilustración genérica ni un icono gigante centrado.

### Skeleton
Bloques con la forma del contenido final, `rgba(247,245,243,.05)`, brillo que recorre en 1.4s.
Nunca un spinner a pantalla completa.

---

## 5. Estructura

- **Escritorio:** barra lateral fija de 220px en `--ink-2`, contenido a la derecha.
- **Móvil:** navegación inferior fija, 4 destinos máximo, misma superficie.
- **Mobile-first obligatorio.** `PRODUCT.md` lo registra como restricción de producto: los
  cliperos entran casi siempre desde el celular. Diseña la pantalla del clipero en 375px
  primero y expándela después.
- Altura de la barra superior: 64px máximo.
- Usa `min-h-[100dvh]`, nunca `h-screen`. En Safari iOS la barra de direcciones rompe `h-screen`.

---

## 6. Movimiento

La app es modo **operar**, no modo **persuadir**. Aquí el movimiento sirve al feedback y a la
continuidad, no a la voz de marca. La landing puede permitirse una secuencia coreografiada;
la app no.

```
100-150 ms   feedback inmediato (pulsación, hover)
150-300 ms   cambio de estado rutinario
300-500 ms   transición de layout, modal, cambio de vista
```

Curva: `cubic-bezier(.16, 1, .3, 1)`. Sin rebote, sin elástico.

Reglas duras:
- Anima solo `transform` y `opacity`. Nunca `width`, `height`, `top`, `left`.
- Nada de `window.addEventListener('scroll')`. Usa `IntersectionObserver` o
  animaciones dirigidas por scroll de CSS.
- Toda animación necesita su alternativa bajo `@media (prefers-reduced-motion: reduce)`.
- **El contenido nunca puede depender de JavaScript para ser visible.** Nada de `opacity: 0`
  esperando un observer: en un renderizador headless o una pestaña en segundo plano ese
  evento no llega y la pantalla se publica en blanco.
- Ningún bucle infinito decorativo. Si añades uno, debe pausarse fuera de pantalla.

Momentos que sí merecen movimiento en la app:
1. La oferta aceptada al elegir un clipero (cambio de estado, y es la decisión más importante).
2. La previsualización en vivo del total mientras el clipero escribe su contraoferta.
3. La entrada de una postulación nueva en la lista.

---

## 7. Lo que no se hace

Estos patrones están prohibidos en la app, no solo en la landing. Son las firmas que hacen
que un producto se lea como generado, y el objetivo declarado del rediseño es lo contrario.

- **Texto con degradado.** `background-clip: text` no se usa. El énfasis viene del peso o del color sólido.
- **Halos de color.** Un `box-shadow` naranja difuso detrás de una tarjeta o un precio.
- **Negro puro** `#000000` y blanco puro `#FFFFFF`. Matan la profundidad.
- **Rejilla decorativa de fondo.** Líneas de 1px en dos ejes solo si la superficie es un lienzo real.
- **Tarjetas idénticas repetidas** con icono, título y texto como estructura de una pantalla.
- **Etiqueta en mayúsculas con tracking encima de cada sección.** Como mucho una por pantalla.
- **Numeración decorativa** `01 / 02 / 03` salvo que el orden cargue información que el usuario necesita.
- **Em-dash** (`—`) en cualquier texto visible. Usa punto, coma, paréntesis o guion normal.
- **Nombres genéricos** en datos de ejemplo. Usa nombres bolivianos reales y verosímiles
  (Camila Rojas, Diego Peñaranda, Mariana Ortuño), nunca "Juan Pérez" ni "Usuario 1".
- **Cifras falsamente precisas.** Sin datos reales detrás, no inventes porcentajes ni promedios.
  `PRODUCT.md` lo registra como principio: métricas reales o ninguna.

---

## 8. Copy

Español latino neutro, tuteo, frases cortas. Un solo registro en todo el producto.

Los controles nombran su acción: "Aceptar oferta", no "Continuar". Los errores nombran el
problema y la salida: "No pudimos subir el archivo. Pesa más de 500 KB, comprímelo e intenta
de nuevo", no "Ocurrió un error".

No prometas ingresos concretos a los cliperos, en ninguna pantalla.

---

## 9. Referencia viva

La landing en `landing-cliperos/index.html` implementa todo lo anterior en CSS plano con estos
mismos tokens, sin framework. Sirve como referencia ejecutable: el simulador del hero, el panel
de estados del trabajo, los chips y el `PriceDisplay` ya están construidos y verificados en
contraste. Cuando dudes de cómo se ve algo, ábrela.

---

## 10. Estado de la migración de la app

**No empieces la migración de cero: la capa de tokens ya está hecha.** Esto se aplicó
directamente sobre `app-cliperos/` el 29 de julio. Verificado: cero hex de la paleta retirada,
cero clases violeta, cero degradados de marca en `src/`.

### Ya está hecho, no lo repitas

| Archivo | Qué se hizo |
|---|---|
| `tailwind.config.js` | Tokens nuevos + alias heredados + radio aplastado a 4px + Satoshi |
| `src/index.css` | Sistema completo reescrito. Mismos nombres de clase, valores nuevos |
| `src/lib/estados.js` | Seis tratamientos nombrados. Verde y ámbar retirados de los estados |
| `index.html` | theme-color, favicon, fondo, noscript y carga de Satoshi |
| 3 componentes | Degradados cian a violeta cambiados por naranja sólido |

### Cómo funcionan los alias

Las clases que ya existen en `src/` (`bg-base`, `bg-surf`, `text-mut`, `text-cy`, `bg-cy/10`)
**siguen funcionando y ya pintan los colores nuevos**, porque el config las redefine:

```
base → ink #0B0907      surf → ink2 #131110     surf2 → ink3 #1C1917
mut  → muted #A39D98    cy   → flame #FF5A1F    vi    → muted (no hay segundo acento)
ok   → verde #4ADE80    warn → ambar #FBBF24    bad   → rojo  #F87171
```

Quedan unas 262 apariciones de estos alias. **No hagas un reemplazo masivo**: renómbralas al
nombre nuevo solo cuando toques ese archivo por otra razón. Cuando no quede ninguna, borra el
bloque de alias del config. Un barrido global de 262 puntos sin motivo es riesgo sin ganancia.

### Lo que falta

1. **`npm install`.** Falló antes y por eso no se pudo verificar el build. Es lo primero.
2. **Revisar los componentes de `src/components/ui/`** contra la sección 4 de este archivo.
   Los colores ya son correctos, pero la forma no está verificada: `PriceDisplay` debe tener el
   total dominante y el precio por clip pequeño y gris, `Button` debe llevar texto casi negro
   sobre naranja, `StarRating` una sola estrella y el número, `Skeleton` con la forma del
   contenido final.
3. **Autoalojar Satoshi.** Hoy se carga desde el CDN de Fontshare en `index.html`. Para una app
   de uso diario conviene mover los `.woff2` a `public/` con `@font-face` y `font-display: swap`.
4. **Estados vacíos.** La sección 4 los exige en cinco pantallas: trabajos disponibles sin
   resultados, mis postulaciones vacío, sin entregas, portafolio vacío, sin calificaciones.

### Una regla que ya se rompió una vez

`estados.js` usaba verde para `completado` y ámbar para `entregado`. En la lista de
postulaciones conviven los estados y las diferencias de precio: si el verde significa dos cosas,
el clipero no sabe cuál está leyendo. **Verde y ámbar no vuelven a los estados.** El naranja
marca lo que necesita atención ahora, la tinta neutra lo que avanza solo, lo plano lo cerrado.
