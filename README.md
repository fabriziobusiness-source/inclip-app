# Inclip, web app

Marketplace de dos lados que conecta cliperos y editores de video de Latinoamérica con
emprendedores que necesitan volumen de clips.

**Mecánica central:** el emprendedor publica cuánto está dispuesto a pagar por su proyecto, y
los cliperos aceptan ese precio o hacen una contraoferta. El emprendedor elige por precio y
por calificación.

La landing vive aparte, en `landing-cliperos/`, y manda su tráfico aquí con el tipo de usuario
ya definido en la URL. Este repositorio es el producto.

---

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| País y moneda | Solo Bolivia. Bolivianos (`Bs`), como constante en `src/config.js` |
| Comisión | 15%, sin cobrar el primer trabajo completado de cada clipero |
| Pagos | Escrow modelado en base de datos desde el día uno; la transferencia real la hace el admin a mano |
| Archivos | Solo links externos. No se aloja video: únicamente fotos de perfil y miniaturas |
| Registro | Perfilado progresivo. El registro pide correo y contraseña, nada más |

Cambiar la comisión no requiere un despliegue: vive en la tabla `app_config`. Lo de
`src/config.js` es lo que se le muestra al usuario, así que si cambias una, cambia la otra o la
pantalla dirá una cosa y el cobro hará otra.

---

## Puesta en marcha

### 1. Crea el proyecto en Supabase

En [supabase.com](https://supabase.com) crea un proyecto nuevo. Elige la región más cercana a
Bolivia (`sa-east-1`, São Paulo).

### 2. Corre el esquema

Abre **SQL Editor → New query**, pega el contenido completo de
[`supabase/schema.sql`](supabase/schema.sql) y ejecútalo.

Eso crea las tablas, los tipos, las políticas RLS, las funciones de negocio y los dos buckets
de Storage. Es idempotente: puedes volver a correrlo sobre una base ya creada.

Las reglas que importan viven en funciones SQL, no en el frontend: aceptar una oferta, congelar
el precio y liberar el pago pasan por `SECURITY DEFINER`. El navegador es de quien lo abre; ahí
no se defiende nada.

### 3. Configura la autenticación

En **Authentication → Providers**:

- **Email** queda activo por defecto. Mientras pruebas, desactiva *Confirm email* en
  **Authentication → Sign In / Providers → Email** para no depender del correo en cada registro.
- **Google**: actívalo y pega el Client ID y el Client Secret de tu proyecto en
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials). La URI de
  redirección autorizada es la que Supabase te muestra en esa misma pantalla.

En **Authentication → URL Configuration** pon tu **Site URL** (`http://localhost:5173` en local,
tu dominio en producción) y agrega ambas a **Redirect URLs**.

### 4. Variables de entorno

```bash
cp .env.example .env
```

Rellena con lo que encuentras en **Project settings → API**:

| Variable | Dónde sale |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Project API keys → `anon` / `public` |
| `VITE_APP_URL` | `http://localhost:5173` en local, tu dominio en producción |

> Todo lo que empieza con `VITE_` viaja al navegador. **Nunca pongas ahí la `service_role`
> key:** esa salta el RLS y quien abra el bundle podría leer y borrar toda la base.

Si faltan las variables, la app arranca igual y muestra una pantalla que explica qué falta, en
vez de una pantalla negra con un error en la consola.

### 5. Corre la app

```bash
npm install && npm run dev
```

### 6. Hazte admin

Regístrate normal desde la app y luego, en el SQL Editor:

```sql
update public.perfiles set rol = 'admin'
where id = (select id from auth.users where email = 'TU@EMAIL.COM');
```

Vuelve a entrar y verás el panel de administración.

---

## Cómo funciona el registro

El brief lo llama **perfilado progresivo**: cada dato se pide en el momento en que el usuario
entiende qué gana con darlo. Pedir foto y portafolio antes de que la persona haya visto un solo
trabajo publicado es la forma más eficiente de perder a un clipero que ya estaba convencido.

| Paso | Cuándo | Qué se pide |
|---|---|---|
| 1 | Registro | Correo y contraseña, o Google. Nada más |
| 2 | Primer ingreso | Nombre y confirmar rol, preseleccionado por `?tipo=` |
| 3a | Clipero, antes de su **primera oferta** | Foto, handle de redes, portafolio |
| 3b | Emprendedor, al publicar | Nada extra |

Ningún paso posterior al 1 bloquea la exploración. El clipero puede navegar todos los trabajos
con el perfil a medias, que es justamente lo que lo convence de completarlo. El muro aparece
recién al ofertar, con el porqué escrito: los clientes eligen viendo portafolio y
calificaciones.

### Contrato con la landing

```
https://app.inclip.com/registro?tipo=cliente     → emprendedor
https://app.inclip.com/registro?tipo=clipero     → clipero
```

La app lee `?tipo=` y preselecciona el rol. Si alguien llega con `?tipo=clipero`, no se le
vuelve a preguntar si edita o publica: ya lo dijo con el clic. Si el parámetro falta o es
inválido, la selección de rol aparece como primer paso.

El valor viaja en los metadatos del usuario de Supabase, y un trigger lo convierte en el rol del
perfil. Así el clic no se pierde entre el registro y la confirmación del correo.

En la landing, `CONFIG.APP_EN_VIVO` debe pasar a `true` el día que despliegues esto. Hasta
entonces sus CTAs abren WhatsApp.

---

## Ciclo de vida de un trabajo

```
abierto → asignado → en_progreso → entregado → en_ajustes (opcional) → completado
                                                        ↘ cancelado · en_disputa
```

1. El cliente publica: define el **total** que paga y la app deriva el precio por clip.
2. Los cliperos aprobados aceptan ese precio o contraofertan con el suyo.
3. El cliente compara por precio y calificación, y acepta una. El precio queda congelado.
4. El clipero entrega pegando el link de una carpeta.
5. El cliente aprueba, o pide su única ronda de ajustes.
6. Al aprobar, el monto pasa al saldo del clipero y ambos se califican.

### Reglas que impone la base de datos

- Una sola oferta por clipero por trabajo (índice único, no una comprobación del frontend).
- Las ofertas expiran a las 72 horas sin respuesta.
- Un clipero no puede exceder la capacidad que él mismo declaró.
- Una sola ronda de ajustes por trabajo.
- El precio acordado no se modifica después de aceptado (lo protege un trigger).
- **Las calificaciones quedan ocultas hasta que ambas partes califiquen o pasen 7 días.** Sin
  esto nadie deja una reseña honesta por miedo a que le devuelvan una mala. La regla vive en la
  política RLS de `calificaciones`, no en un filtro del cliente.

---

## Pagos

El dinero se mueve por fuera de la app y aquí se registra:

1. El cliente acepta una oferta y transfiere. El admin marca el depósito en **Admin → Trabajos**.
2. Al aprobarse la entrega, se escriben dos movimientos en el libro del clipero: el bruto y la
   comisión. El saldo se calcula sumando esa columna, así que no hay un campo `saldo` que pueda
   quedar desincronizado.
3. El clipero solicita un retiro. El admin transfiere y **después** lo marca como pagado en
   **Admin → Retiros**: marcarlo antes dejaría el saldo mintiendo.

El modelo ya está listo para automatizarlo cuando entre una pasarela. Nada de lo anterior habría
que rehacerlo.

---

## Almacenamiento

**No se aloja video.** Es la decisión técnica más importante del MVP.

- El portafolio son links externos (YouTube, TikTok, Instagram, Drive) más una miniatura.
- Las entregas son un link de carpeta (Drive, Dropbox, WeTransfer).
- Supabase Storage guarda solo fotos de perfil y miniaturas: JPG, PNG o WebP, máximo 500 KB,
  comprimidas en el navegador antes de subir.

Cien cliperos con cinco videos cada uno son varios gigabytes que se cobran en almacenamiento y
otra vez en ancho de banda en cada reproducción. Con links externos ese costo es cero.

Los puntos donde correspondería cambiar esto llevan un comentario `FUTURO: migrar a hosting de
video propio`.

---

## Despliegue en Netlify

1. Conecta el repositorio. `netlify.toml` ya trae el comando (`npm run build`), la carpeta
   (`dist`) y la redirección de SPA que hace falta para que recargar en `/cliente/trabajos` no
   devuelva 404.
2. En **Site settings → Environment variables** carga las tres variables de `.env.example`, con
   `VITE_APP_URL` apuntando a tu dominio.
3. Agrega ese dominio a **Redirect URLs** en Supabase, o el login con Google volverá a
   `localhost`.

---

## Estructura

```
src/
  config.js            Moneda, comisión, límites y reglas visibles
  lib/
    supabase.js        Cliente y traducción de errores de Postgres a español
    formato.js         Dinero, fechas, plazos, URLs
    estados.js         Un tratamiento visual por estado, decidido en un solo lugar
    imagenes.js        Compresión en el navegador y subida a Storage
  hooks/
    useAuth.jsx        Sesión, perfil y ficha de clipero
    useDatos.js        Cargando / error / datos, para no repetir el mismo useEffect
  components/ui/       Button, Card, Badge, Input, Modal, EmptyState, Skeleton,
                       StarRating, PriceDisplay, Avatar, Toast, Aviso
  components/          Layout, TrabajoCard, ListaPostulaciones, ModalCalificar, AvisoPerfil
  pages/               auth · cliente · clipero · admin · perfil
  App.jsx              Rutas protegidas por rol
supabase/schema.sql
netlify.toml
```

El diseño lo manda [`DESIGN.md`](DESIGN.md), en la raíz del proyecto. Dos reglas que el código
ya rompió una vez y no deben volver:

- **Verde y ámbar son solo para la diferencia de precio** contra el presupuesto publicado. Nunca
  para éxito, error ni estado general. En la lista de postulaciones conviven los dos
  significados, y si el verde dijera además "aceptada", nadie sabría cuál está leyendo.
- **Ningún degradado de marca ni sombra de color.** La jerarquía la dan las tres superficies y
  las hairlines.

---

## Lo que este MVP no hace

Queda fuera a propósito, con el modelo de datos preparado para agregarlo después: pasarela de
pagos integrada, chat en tiempo real, disputas automatizadas, facturación, app móvil nativa y
campañas por CPM o por vistas.
