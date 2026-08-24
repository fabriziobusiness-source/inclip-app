# 🚀 PROMPT MAESTRO — WEB APP MVP (marketplace de cliperos)

*Copiar todo lo que está debajo de la línea y pegarlo en Claude Code.*
*Antes de pegar: reemplaza `[NOMBRE]` por el nombre elegido.*

---

Construye el **MVP** de una web app llamada **[NOMBRE]**: un marketplace de dos lados que conecta cliperos y editores de video de Latinoamérica con emprendedores que necesitan volumen de clips a bajo costo.

## PRINCIPIO RECTOR

**Construir lo mínimo que permita completar un trabajo real de punta a punta.** Si algo se puede resolver por fuera de la app en esta versión, se resuelve por fuera y la app solo lo registra.

**No implementar ahora:** pagos integrados con pasarela, chat en tiempo real, sistema de disputas automatizado, facturación, app móvil nativa, campañas por CPM/vistas. Dejar el código preparado para agregarlos, no construirlos.

## LOS TRES ROLES

- **CLIENTE** (emprendedor): publica trabajos, recibe ofertas, elige clipero, recibe entregas, califica.
- **CLIPERO** (editor): ve trabajos, se postula aceptando el precio o con contraoferta, entrega, califica.
- **ADMIN**: aprueba cliperos, confirma depósitos y pagos, resuelve casos, ve métricas.

---

## MECÁNICA CENTRAL: OFERTAS Y CONTRAOFERTAS (estilo inDrive)

Esta es la funcionalidad diferencial de la app. Implementarla bien es la prioridad número uno.

### Cómo publica el cliente

Al crear un trabajo, el cliente define:
- Cantidad de clips que necesita (ej: 20)
- **Precio total que está dispuesto a pagar** por todo el proyecto (ej: 1.400 Bs)
- El sistema **calcula y muestra automáticamente el precio por clip** (1.400 ÷ 20 = 70 Bs por clip)

**Regla de presentación visual, importante:** en las tarjetas de trabajo, el **precio total va en grande y protagónico**; el precio por clip va debajo, en tamaño pequeño y color gris. El número grande es lo que engancha al clipero.

```
┌─────────────────────────────┐
│  Bs 1.400                   │  ← grande, con acento de color
│  70 Bs por clip · 20 clips  │  ← pequeño, gris
└─────────────────────────────┘
```

### Cómo se postula el clipero

Al abrir un trabajo, el clipero tiene dos botones:

1. **"Aceptar precio"** → se postula al precio publicado
2. **"Hacer contraoferta"** → abre un campo donde ingresa **su precio por clip**

En la contraoferta, mostrar **en vivo**, mientras escribe, un bloque de previsualización:

```
Si aceptan tu oferta cobrarás:
  Bs 1.600 en total
  80 Bs × 20 clips
```

Cada postulación (aceptada o contraoferta) genera un registro con: clipero, precio por clip propuesto, total calculado, mensaje opcional (máx. 200 caracteres) y fecha.

### Cómo elige el cliente

El cliente ve la lista de postulaciones ordenables por precio y por calificación. Cada fila muestra:
- Foto, nombre y calificación en estrellas del clipero
- Precio ofertado (total grande, por clip pequeño)
- Diferencia respecto a su presupuesto, marcada en color (verde si es igual o menor, ámbar si es mayor)
- Botón "Ver perfil" y botón "Aceptar oferta"

Al aceptar una oferta: el trabajo pasa a `asignado`, el precio acordado se congela, y las demás postulaciones pasan a `rechazada`.

### Reglas de la negociación

- Una sola contraoferta por clipero por trabajo (evita el regateo infinito)
- Las postulaciones expiran automáticamente si el cliente no responde en 72 horas
- El cliente puede cerrar el trabajo sin elegir a nadie
- El precio acordado queda inmutable una vez aceptado

---

## MODELO DE DATOS (Supabase)

Entregar el SQL de creación de tablas y las políticas RLS.

**profiles** — id (fk auth.users), rol (cliente/clipero/admin), nombre, foto_url, descripcion (bio corta), pais, ciudad, creado_en

**cliperos** — perfil_id, estado (pendiente/aprobado/pausado), especialidad (podcast/gaming/entrevistas/anuncios), herramientas_ia (texto libre), trabajos_completados, entregas_a_tiempo, calificacion_promedio, total_calificaciones, capacidad_semanal

**portafolio** — id, clipero_id, titulo, url_externa, miniatura_url, plataforma (youtube/tiktok/instagram/drive/otro), orden

**trabajos** — id, cliente_id, titulo, descripcion, tipo (clips/anuncios/reels), cantidad_clips, precio_total, precio_por_clip (calculado), fecha_limite, requiere_publicacion (booleano), plataformas_publicacion (array, solo si requiere_publicacion), url_material_fuente, url_referencias, estado (abierto/asignado/en_progreso/entregado/aprobado/cancelado), clipero_id (nullable), precio_acordado (nullable), deposito_confirmado (booleano), creado_en

**postulaciones** — id, trabajo_id, clipero_id, tipo (acepta_precio/contraoferta), precio_por_clip, precio_total, mensaje, estado (pendiente/aceptada/rechazada/expirada), creado_en

**entregas** — id, trabajo_id, clipero_id, url_entrega, nota, version, estado (enviada/aprobada/revision_solicitada), creado_en

**revisiones** — id, entrega_id, comentario, creado_en

**calificaciones** — id, trabajo_id, de_perfil_id, para_perfil_id, estrellas (1–5), comentario, creado_en

---

## OPCIÓN DE PUBLICACIÓN EN CUENTAS DEL CLIPERO

Al publicar el trabajo, el cliente marca una casilla: **"¿Quieres que el clipero también publique los clips en sus propias cuentas?"**

- Si está **desactivada** (por defecto): el clipero solo entrega los archivos. Es el flujo estándar.
- Si está **activada**: el cliente elige las plataformas y el clipero, además de entregar, publica y pega los links de los posts en su entrega.

Los trabajos con esta opción activa llevan un **badge visible** en la tarjeta ("Incluye publicación"), porque cambia el alcance del trabajo y el clipero debe verlo antes de ofertar.

---

## PORTAFOLIO Y ALMACENAMIENTO DE VIDEO ⚠️

**Decisión técnica del MVP: no alojar video propio. Usar links externos + miniatura en imagen.**

Motivo: alojar video es lo más caro y lento de toda la app. Cien cliperos con cinco videos cada uno son varios gigabytes que se cobran en almacenamiento y en ancho de banda cada vez que alguien los mira. Con links externos el costo es cero.

**Implementación:**
- El clipero agrega piezas de portafolio pegando un **link externo** (YouTube, TikTok, Instagram, Drive)
- Sube solo una **imagen de miniatura** (JPG/PNG, máx. 500 KB, comprimida en el cliente antes de subir)
- La galería muestra las miniaturas en grilla; al hacer clic se abre el link en pestaña nueva
- Para links de TikTok, Instagram y YouTube, intentar incrustar el reproductor nativo; si falla, mostrar la miniatura con enlace

**Lo mismo aplica a las entregas de trabajo:** el clipero entrega pegando un **link de carpeta** (Drive, Dropbox, WeTransfer). La app registra el link, no los archivos. Añadir un campo de nota para instrucciones.

Dejar en el código un comentario `// FUTURO: migrar a hosting de video propio` en los puntos donde correspondería.

---

## PERFIL PÚBLICO DEL CLIPERO

Accesible desde cualquier postulación. Debe mostrar:
- Foto, nombre, ciudad y país
- Descripción corta (bio)
- Calificación promedio en estrellas + número total de calificaciones
- Métricas: trabajos completados · % de entregas a tiempo
- Especialidad y herramientas de IA que domina
- **Galería de portafolio** en grilla de miniaturas
- Últimas reseñas escritas recibidas, con estrellas y nombre de quien la dejó

---

## SISTEMA DE CALIFICACIONES (bidireccional)

- Al aprobarse un trabajo, **ambas partes** deben calificarse: 1–5 estrellas + comentario opcional
- Las calificaciones son visibles en el perfil público de cada uno
- La calificación promedio del clipero se recalcula automáticamente
- Un usuario no puede calificar dos veces el mismo trabajo
- Mostrar las reseñas más recientes primero

**Regla anti-represalia:** las calificaciones de un trabajo permanecen ocultas hasta que ambas partes califiquen o pasen 7 días. Sin esto, nadie deja una reseña honesta por miedo a que le devuelvan una mala.

---

## PANTALLAS

### Públicas
1. **Login / Registro** — Supabase Auth con email y contraseña. En el registro se elige rol.
2. **Onboarding clipero** — nombre, foto, ciudad, bio, especialidad, herramientas de IA, capacidad semanal, primeras piezas de portafolio. Queda en estado `pendiente`.
3. **Onboarding cliente** — nombre, tipo de negocio, foto.
4. **Perfil público de clipero** — según lo descrito arriba.

### Panel CLIENTE
5. **Mis trabajos** — lista con estado, cantidad de clips, precio y número de postulaciones recibidas.
6. **Publicar trabajo** — formulario con el cálculo de precio por clip en vivo, casilla de publicación en cuentas, links de material fuente y referencias.
7. **Postulaciones recibidas** — lista ordenable por precio y calificación, con acceso al perfil y botón de aceptar.
8. **Detalle de trabajo** — datos, clipero asignado, entregas, botones "Aprobar" y "Pedir revisión" (una sola ronda), y calificación al aprobar.

### Panel CLIPERO
9. **Trabajos disponibles** — tarjetas con precio total grande, precio por clip pequeño, cantidad, fecha límite y badge de publicación si aplica. Filtros por tipo y por precio.
10. **Detalle de trabajo** — descripción completa, material fuente, y los dos botones: aceptar precio / contraofertar con previsualización en vivo.
11. **Mis postulaciones** — enviadas, con su estado.
12. **Mis trabajos** — asignados y en curso, con fecha límite.
13. **Entregar** — campo de link + nota. Si el trabajo requiere publicación, campos adicionales para los links de los posts.
14. **Mi perfil** — editar bio, foto, portafolio; ver métricas y reseñas.

### Panel ADMIN
15. **Cliperos** — aprobar, pausar, ver métricas.
16. **Trabajos** — todos, con filtro por estado; marcar depósito y pago confirmados.
17. **Métricas** — trabajos por estado, cliperos activos, precio promedio por clip, % de entregas a tiempo.

---

## FLUJO COMPLETO (debe funcionar de punta a punta)

```
Cliente publica trabajo (define precio total → app calcula por clip)
  → aparece en "Trabajos disponibles" de los cliperos aprobados
  → cliperos aceptan el precio o hacen contraoferta
  → cliente revisa perfiles y postulaciones → acepta una
  → trabajo pasa a "asignado", precio acordado congelado
  → clipero entrega (link de carpeta + nota)
  → cliente aprueba o pide una revisión
  → al aprobar, ambos se califican
  → se actualizan métricas y reseñas del clipero
```

**El pago queda fuera de la app en el MVP:** el admin marca `deposito_confirmado` cuando el cliente deposita, y marca el pago al clipero cuando se libera. Dejar el modelo de datos preparado para automatizarlo después.

---

## REGLAS DE NEGOCIO

- Solo cliperos `aprobados` ven y se postulan a trabajos
- Un clipero no puede exceder su capacidad semanal declarada en trabajos activos
- Una contraoferta por clipero por trabajo
- Postulaciones expiran a las 72 horas sin respuesta
- Una sola ronda de revisión por entrega
- El precio acordado no se modifica después de aceptado
- Calificaciones ocultas hasta que ambos califiquen o pasen 7 días
- RLS: cada quien ve solo lo suyo; los perfiles de clipero son públicos; el admin ve todo

---

## DISEÑO

> ⚠️ **Esta sección ya no decide cómo se ve la app. La fuente de verdad visual es
> [DESIGN.md](DESIGN.md), en esta misma carpeta.**
>
> La paleta que este brief dictaba (fondo `#08090C`, cian `#00E5FF`, violeta `#7C5CFF`)
> quedó **retirada** en el rediseño de julio de 2026: cian y violeta sobre oscuro es la
> paleta por defecto de las herramientas de IA, y hacía que Inclip pareciera una startup de
> IA más en vez de un mercado. La vigente es naranja `#FF5A1F` sobre negro cálido `#0B0907`,
> con un solo acento.
>
> También queda anulada la regla de "un badge de color propio por cada estado". Los estados
> usan seis tratamientos de tinta definidos en `DESIGN.md`, y el verde y el ámbar están
> reservados exclusivamente a la diferencia de precio.

Sigue vigente de esta sección lo que es estructura de producto y no color:

- Sidebar en escritorio, navegación inferior en móvil.
- **Mobile-first obligatorio:** los cliperos entrarán casi siempre desde el celular.
- Componentes reutilizables: Button, Card, Badge de estado, Input, Modal, EmptyState, Skeleton, StarRating, PriceDisplay (el del número grande + subtexto).
- Estados vacíos con mensaje útil y acción sugerida.
- Skeletons en la carga, no spinners a pantalla completa.
- Interfaz completa en español latino. Moneda en bolivianos (Bs), con la unidad como constante configurable.

---

## STACK Y ESTRUCTURA

- **React + Vite + Tailwind CSS**
- **Supabase** para base de datos, auth y almacenamiento (solo imágenes)
- Despliegue en **Netlify**, con `netlify.toml` incluyendo la redirección de SPA
- Variables de entorno en `.env.example`

```
src/
  lib/supabase.js
  hooks/          (useAuth, useTrabajos, usePostulaciones, useClipero)
  components/ui/
  components/
  pages/auth/
  pages/cliente/
  pages/clipero/
  pages/admin/
  pages/perfil/
  App.jsx (rutas protegidas por rol)
supabase/schema.sql
netlify.toml
.env.example
README.md
```

## ENTREGABLE

Proyecto funcional, con el SQL listo para pegar en Supabase y un README con los pasos para crear el proyecto, correr el SQL, configurar variables y desplegar en Netlify.

**Orden de construcción:** (1) auth y roles · (2) esquema y RLS · (3) publicar trabajo con cálculo de precio · (4) sistema de ofertas y contraofertas · (5) perfiles y portafolio · (6) entregas y aprobación · (7) calificaciones · (8) panel admin · (9) pulido visual.
