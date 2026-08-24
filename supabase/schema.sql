-- ═══════════════════════════════════════════════════════════════════════════
--  INCLIP — esquema completo
--  Marketplace de cliperos y editores de video. MVP.
--
--  Cómo usarlo:
--    1. Supabase → SQL Editor → New query
--    2. Pega este archivo completo y ejecútalo (Run)
--    3. Crea los buckets de Storage con el bloque del final
--
--  Es idempotente: puedes volver a ejecutarlo sobre una base ya creada.
--
--  Principio: las reglas de negocio que importan (aceptar una oferta,
--  congelar el precio, liberar el pago) viven en funciones SQL, no en el
--  frontend. El navegador es de quien lo abre; ahí no se defiende nada.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ───────────────────────────────────────────────────────────────────────────
--  1. TIPOS
-- ───────────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.rol_usuario as enum ('cliente', 'clipero', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_clipero as enum ('pendiente', 'en_revision', 'aprobado', 'pausado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_trabajo as enum ('clips', 'anuncios', 'reels');
exception when duplicate_object then null; end $$;

-- Ciclo de vida del trabajo (definido en PROMPT-APP-INCLIP):
-- abierto → asignado → en_progreso → entregado → en_ajustes (opcional) → completado
do $$ begin
  create type public.estado_trabajo as enum (
    'abierto', 'asignado', 'en_progreso', 'entregado',
    'en_ajustes', 'completado', 'cancelado', 'en_disputa'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_postulacion as enum ('acepta_precio', 'contraoferta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_postulacion as enum ('pendiente', 'aceptada', 'rechazada', 'expirada', 'retirada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_entrega as enum ('enviada', 'aprobada', 'ajustes_solicitados');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plataforma_portafolio as enum ('youtube', 'tiktok', 'instagram', 'drive', 'otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_movimiento as enum ('liberacion', 'comision', 'retiro', 'ajuste');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_retiro as enum ('solicitado', 'procesando', 'pagado', 'rechazado');
exception when duplicate_object then null; end $$;


-- ───────────────────────────────────────────────────────────────────────────
--  2. TABLAS
-- ───────────────────────────────────────────────────────────────────────────

-- ── perfiles ──────────────────────────────────────────────────────────────
-- Se crea sola por trigger al registrarse. Solo el email es obligatorio en
-- el registro: `nombre` y `rol` se confirman en el primer ingreso (paso 2 del
-- perfilado progresivo). Por eso `nombre` es nullable.
create table if not exists public.perfiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  rol           public.rol_usuario,
  nombre        text,
  foto_url      text,
  descripcion   text,
  handle_redes  text,
  pais          text default 'Bolivia',
  ciudad        text,
  -- El emprendedor declara su negocio; no bloquea nada, es contexto para el clipero.
  tipo_negocio  text,
  creado_en     timestamptz not null default now(),
  constraint nombre_largo check (nombre is null or char_length(nombre) between 2 and 60),
  constraint bio_larga    check (descripcion is null or char_length(descripcion) <= 400)
);

-- ── cliperos ──────────────────────────────────────────────────────────────
-- Métricas denormalizadas (calificacion_promedio, trabajos_completados) para
-- no recalcularlas en cada listado. Las mantienen triggers, no el frontend.
create table if not exists public.cliperos (
  perfil_id             uuid primary key references public.perfiles(id) on delete cascade,
  estado                public.estado_clipero not null default 'pendiente',
  especialidad          text,
  herramientas_ia       text,
  link_portafolio       text,
  capacidad_semanal     int not null default 3 check (capacidad_semanal between 1 and 50),
  trabajos_completados  int not null default 0,
  entregas_a_tiempo     int not null default 0,
  calificacion_promedio numeric(3,2) not null default 0,
  total_calificaciones  int not null default 0,
  creado_en             timestamptz not null default now()
);

-- ── portafolio ────────────────────────────────────────────────────────────
-- Solo links externos + una miniatura en imagen.
-- FUTURO: migrar a hosting de video propio. Hoy alojar video es el costo más
-- alto de toda la app (almacenamiento + ancho de banda en cada reproducción).
create table if not exists public.portafolio (
  id            uuid primary key default gen_random_uuid(),
  clipero_id    uuid not null references public.cliperos(perfil_id) on delete cascade,
  titulo        text not null check (char_length(titulo) between 2 and 100),
  url_externa   text not null,
  miniatura_url text,
  plataforma    public.plataforma_portafolio not null default 'otro',
  orden         int not null default 0,
  creado_en     timestamptz not null default now()
);
create index if not exists idx_portafolio_clipero on public.portafolio(clipero_id, orden);

-- ── trabajos ──────────────────────────────────────────────────────────────
create table if not exists public.trabajos (
  id                     uuid primary key default gen_random_uuid(),
  cliente_id             uuid not null references public.perfiles(id) on delete cascade,
  titulo                 text not null check (char_length(titulo) between 5 and 120),
  descripcion            text not null check (char_length(descripcion) between 20 and 4000),
  tipo                   public.tipo_trabajo not null default 'clips',
  cantidad_clips         int not null check (cantidad_clips between 1 and 500),
  precio_total           numeric(12,2) not null check (precio_total > 0),
  -- El cliente pone el total; la app deriva el precio por clip. Nunca al revés.
  precio_por_clip        numeric(12,2) generated always as (round(precio_total / cantidad_clips, 2)) stored,
  fecha_limite           date not null,
  requiere_publicacion   boolean not null default false,
  plataformas_publicacion text[] not null default '{}',
  url_material_fuente    text,
  url_referencias        text,
  estado                 public.estado_trabajo not null default 'abierto',

  clipero_id             uuid references public.cliperos(perfil_id) on delete set null,
  -- Precio congelado al aceptar la oferta. No se toca nunca más.
  precio_acordado        numeric(12,2),
  precio_acordado_clip   numeric(12,2),
  comision_porcentaje    numeric(5,2) not null default 0,
  comision_monto         numeric(12,2) not null default 0,
  monto_clipero          numeric(12,2) not null default 0,

  -- Escrow modelado desde el día uno; la liquidación real es manual (admin).
  deposito_confirmado    boolean not null default false,
  pago_liberado          boolean not null default false,

  rondas_ajuste          int not null default 0 check (rondas_ajuste <= 1),
  creado_en              timestamptz not null default now(),
  asignado_en            timestamptz,
  entregado_en           timestamptz,
  completado_en          timestamptz,

  constraint plataformas_solo_si_publica
    check (requiere_publicacion or cardinality(plataformas_publicacion) = 0)
);
create index if not exists idx_trabajos_estado     on public.trabajos(estado, creado_en desc);
create index if not exists idx_trabajos_cliente    on public.trabajos(cliente_id, creado_en desc);
create index if not exists idx_trabajos_clipero    on public.trabajos(clipero_id, creado_en desc);

-- ── postulaciones ─────────────────────────────────────────────────────────
-- El índice único es la regla "una sola contraoferta por clipero por trabajo".
-- No se confía en que el frontend no mande dos.
create table if not exists public.postulaciones (
  id              uuid primary key default gen_random_uuid(),
  trabajo_id      uuid not null references public.trabajos(id) on delete cascade,
  clipero_id      uuid not null references public.cliperos(perfil_id) on delete cascade,
  tipo            public.tipo_postulacion not null,
  precio_por_clip numeric(12,2) not null check (precio_por_clip > 0),
  precio_total    numeric(12,2) not null check (precio_total > 0),
  mensaje         text check (mensaje is null or char_length(mensaje) <= 200),
  plazo_dias      int check (plazo_dias is null or plazo_dias between 1 and 30),
  estado          public.estado_postulacion not null default 'pendiente',
  creado_en       timestamptz not null default now(),
  expira_en       timestamptz not null default now() + interval '72 hours',
  unique (trabajo_id, clipero_id)
);
create index if not exists idx_postulaciones_trabajo on public.postulaciones(trabajo_id, estado);
create index if not exists idx_postulaciones_clipero on public.postulaciones(clipero_id, creado_en desc);

-- ── entregas ──────────────────────────────────────────────────────────────
-- Se guarda el link de la carpeta, no los archivos.
-- FUTURO: migrar a hosting de video propio.
create table if not exists public.entregas (
  id                 uuid primary key default gen_random_uuid(),
  trabajo_id         uuid not null references public.trabajos(id) on delete cascade,
  clipero_id         uuid not null references public.cliperos(perfil_id) on delete cascade,
  url_entrega        text not null,
  nota               text check (nota is null or char_length(nota) <= 1000),
  links_publicaciones text[] not null default '{}',
  version            int not null default 1,
  estado             public.estado_entrega not null default 'enviada',
  creado_en          timestamptz not null default now()
);
create index if not exists idx_entregas_trabajo on public.entregas(trabajo_id, version desc);

-- ── revisiones ────────────────────────────────────────────────────────────
create table if not exists public.revisiones (
  id         uuid primary key default gen_random_uuid(),
  entrega_id uuid not null references public.entregas(id) on delete cascade,
  comentario text not null check (char_length(comentario) between 5 and 1000),
  creado_en  timestamptz not null default now()
);

-- ── calificaciones ────────────────────────────────────────────────────────
create table if not exists public.calificaciones (
  id             uuid primary key default gen_random_uuid(),
  trabajo_id     uuid not null references public.trabajos(id) on delete cascade,
  de_perfil_id   uuid not null references public.perfiles(id) on delete cascade,
  para_perfil_id uuid not null references public.perfiles(id) on delete cascade,
  estrellas      int not null check (estrellas between 1 and 5),
  comentario     text check (comentario is null or char_length(comentario) <= 500),
  creado_en      timestamptz not null default now(),
  -- Nadie califica dos veces el mismo trabajo.
  unique (trabajo_id, de_perfil_id)
);
create index if not exists idx_calificaciones_para on public.calificaciones(para_perfil_id, creado_en desc);

-- ── movimientos ───────────────────────────────────────────────────────────
-- Libro contable del clipero. El saldo se calcula sumando esto: no hay una
-- columna "saldo" que pueda quedar desincronizada.
create table if not exists public.movimientos (
  id          uuid primary key default gen_random_uuid(),
  perfil_id   uuid not null references public.perfiles(id) on delete cascade,
  trabajo_id  uuid references public.trabajos(id) on delete set null,
  tipo        public.tipo_movimiento not null,
  monto       numeric(12,2) not null,      -- positivo entra, negativo sale
  detalle     text,
  creado_en   timestamptz not null default now()
);
create index if not exists idx_movimientos_perfil on public.movimientos(perfil_id, creado_en desc);

-- ── retiros ───────────────────────────────────────────────────────────────
create table if not exists public.retiros (
  id           uuid primary key default gen_random_uuid(),
  clipero_id   uuid not null references public.cliperos(perfil_id) on delete cascade,
  monto        numeric(12,2) not null check (monto > 0),
  metodo       text not null,
  datos_cobro  text not null,
  estado       public.estado_retiro not null default 'solicitado',
  nota_admin   text,
  creado_en    timestamptz not null default now(),
  procesado_en timestamptz
);
create index if not exists idx_retiros_clipero on public.retiros(clipero_id, creado_en desc);


-- ───────────────────────────────────────────────────────────────────────────
--  3. FUNCIONES AUXILIARES
--  SECURITY DEFINER + search_path fijo: si leyeran `perfiles` con los permisos
--  de quien llama, las políticas RLS de `perfiles` se llamarían a sí mismas.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.mi_rol()
returns public.rol_usuario
language sql stable security definer set search_path = public, pg_temp as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create or replace function public.es_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select rol = 'admin' from public.perfiles where id = auth.uid()), false);
$$;

create or replace function public.es_clipero_aprobado()
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select estado = 'aprobado' from public.cliperos where perfil_id = auth.uid()), false);
$$;

-- Regla anti-represalia: una calificación se destapa cuando ambas partes ya
-- calificaron, o cuando pasaron 7 días. Sin esto nadie deja una reseña honesta
-- por miedo a que le devuelvan una mala.
create or replace function public.calificaciones_destapadas(p_trabajo uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select (select count(*) from public.calificaciones where trabajo_id = p_trabajo) >= 2;
$$;

-- ¿Este clipero ofertó en este trabajo? Se usa en la política RLS de `trabajos`
-- para que pueda seguir viendo el trabajo aunque se lo hayan dado a otro.
-- Va como SECURITY DEFINER a propósito: si la política de `trabajos` consultara
-- `postulaciones` con RLS, y la de `postulaciones` consulta `trabajos`, Postgres
-- entraría en recursión infinita.
create or replace function public.postule_en(p_trabajo uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.postulaciones
    where trabajo_id = p_trabajo and clipero_id = auth.uid()
  );
$$;

-- Saldo del clipero, en tres cifras que significan cosas distintas.
create or replace function public.saldo_de(p_perfil uuid)
returns table (disponible numeric, en_tramite numeric, retenido numeric)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  -- El saldo es privado: solo el dueño y el admin.
  if p_perfil <> auth.uid() and not public.es_admin() then
    raise exception 'No puedes consultar el saldo de otra persona.';
  end if;

  return query
  select
    coalesce((select sum(m.monto) from public.movimientos m where m.perfil_id = p_perfil), 0)::numeric,
    coalesce((select sum(r.monto) from public.retiros r
              where r.clipero_id = p_perfil and r.estado in ('solicitado','procesando')), 0)::numeric,
    -- Retenido: el trabajo está en curso, el dinero todavía no es suyo.
    coalesce((select sum(t.monto_clipero) from public.trabajos t
              where t.clipero_id = p_perfil
                and t.estado in ('asignado','en_progreso','entregado','en_ajustes')), 0)::numeric;
end $$;

create or replace function public.mi_saldo()
returns table (disponible numeric, en_tramite numeric, retenido numeric)
language sql stable security definer set search_path = public, pg_temp as $$
  select * from public.saldo_de(auth.uid());
$$;


-- ───────────────────────────────────────────────────────────────────────────
--  4. TRIGGERS
-- ───────────────────────────────────────────────────────────────────────────

-- Al registrarse se crea el perfil con el rol que venía en la URL de la landing
-- (?tipo=cliente | ?tipo=clipero), guardado en los metadatos del usuario.
-- Si el parámetro faltaba, `rol` queda null y la app pide elegirlo en el paso 2.
create or replace function public.manejar_usuario_nuevo()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_rol  public.rol_usuario;
  v_tipo text := new.raw_user_meta_data->>'tipo';
begin
  if v_tipo in ('cliente', 'clipero') then
    v_rol := v_tipo::public.rol_usuario;
  else
    v_rol := null;
  end if;

  insert into public.perfiles (id, rol, nombre, foto_url)
  values (
    new.id,
    v_rol,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), ''),
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;

  if v_rol = 'clipero' then
    insert into public.cliperos (perfil_id) values (new.id) on conflict do nothing;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.manejar_usuario_nuevo();

-- Recalcula la calificación promedio del perfil calificado.
create or replace function public.recalcular_calificacion()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.cliperos c
  set calificacion_promedio = coalesce(sub.prom, 0),
      total_calificaciones  = coalesce(sub.total, 0)
  from (
    select avg(estrellas)::numeric(3,2) as prom, count(*) as total
    from public.calificaciones
    where para_perfil_id = new.para_perfil_id
  ) sub
  where c.perfil_id = new.para_perfil_id;
  return new;
end $$;

drop trigger if exists trg_recalcular_calificacion on public.calificaciones;
create trigger trg_recalcular_calificacion
  after insert on public.calificaciones
  for each row execute function public.recalcular_calificacion();

-- El precio acordado es inmutable. Esto no es un detalle: es la promesa de la app.
create or replace function public.proteger_precio_acordado()
returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if old.precio_acordado is not null and new.precio_acordado is distinct from old.precio_acordado then
    raise exception 'El precio acordado no se modifica después de aceptado.';
  end if;
  return new;
end $$;

drop trigger if exists trg_proteger_precio on public.trabajos;
create trigger trg_proteger_precio
  before update on public.trabajos
  for each row execute function public.proteger_precio_acordado();


-- ───────────────────────────────────────────────────────────────────────────
--  5. FUNCIONES DE NEGOCIO (RPC)
-- ───────────────────────────────────────────────────────────────────────────

-- ── Paso 2 del perfilado progresivo: nombre + confirmar rol ───────────────
create or replace function public.confirmar_perfil(p_nombre text, p_rol public.rol_usuario)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_rol_actual public.rol_usuario;
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión.'; end if;
  if p_rol not in ('cliente', 'clipero') then raise exception 'Rol inválido.'; end if;
  if char_length(trim(p_nombre)) < 2 then raise exception 'Escribe tu nombre.'; end if;

  select rol into v_rol_actual from public.perfiles where id = auth.uid();

  -- El rol se define una sola vez. Cambiarlo después dejaría trabajos huérfanos.
  if v_rol_actual is not null and v_rol_actual <> p_rol then
    raise exception 'Tu cuenta ya está registrada como %. Escríbenos si necesitas cambiarla.', v_rol_actual;
  end if;

  update public.perfiles set nombre = trim(p_nombre), rol = coalesce(v_rol_actual, p_rol)
  where id = auth.uid();

  if coalesce(v_rol_actual, p_rol) = 'clipero' then
    insert into public.cliperos (perfil_id) values (auth.uid()) on conflict do nothing;
  end if;
end $$;

-- ── Paso 3a: el clipero completa su perfil justo antes de su primera oferta ──
-- Aquí es donde el dato tiene sentido para él: ya vio trabajos reales con
-- presupuestos, y sabe que la foto y el portafolio son lo que hace que lo elijan.
-- El paso a `en_revision` va en una función porque el clipero no puede escribir
-- su propio `estado` (si pudiera, se aprobaría solo).
create or replace function public.completar_perfil_clipero(
  p_foto_url     text,
  p_descripcion  text default null,
  p_ciudad       text default null,
  p_handle       text default null,
  p_especialidad text default null,
  p_herramientas text default null,
  p_link_portafolio text default null,
  p_capacidad    int default null
)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión.'; end if;
  if coalesce(trim(p_foto_url), '') = '' then
    raise exception 'Sube una foto de perfil: es lo primero que mira el cliente.';
  end if;

  update public.perfiles set
    foto_url     = trim(p_foto_url),
    descripcion  = coalesce(nullif(trim(coalesce(p_descripcion,'')), ''), descripcion),
    ciudad       = coalesce(nullif(trim(coalesce(p_ciudad,'')), ''), ciudad),
    handle_redes = coalesce(nullif(trim(coalesce(p_handle,'')), ''), handle_redes)
  where id = auth.uid();

  update public.cliperos set
    especialidad    = coalesce(nullif(trim(coalesce(p_especialidad,'')), ''), especialidad),
    herramientas_ia = coalesce(nullif(trim(coalesce(p_herramientas,'')), ''), herramientas_ia),
    link_portafolio = coalesce(nullif(trim(coalesce(p_link_portafolio,'')), ''), link_portafolio),
    capacidad_semanal = coalesce(p_capacidad, capacidad_semanal),
    estado = case when estado = 'pendiente' then 'en_revision' else estado end
  where perfil_id = auth.uid();
end $$;

-- ── Postularse: aceptar el precio o contraofertar ─────────────────────────
create or replace function public.postular(
  p_trabajo         uuid,
  p_tipo            public.tipo_postulacion,
  p_precio_por_clip numeric default null,
  p_mensaje         text default null,
  p_plazo_dias      int default null
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_trabajo   public.trabajos%rowtype;
  v_clipero   public.cliperos%rowtype;
  v_perfil    public.perfiles%rowtype;
  v_precio    numeric(12,2);
  v_activos   int;
  v_id        uuid;
begin
  select * into v_trabajo from public.trabajos where id = p_trabajo;
  if not found then raise exception 'Ese trabajo ya no existe.'; end if;
  if v_trabajo.estado <> 'abierto' then raise exception 'Este trabajo ya no recibe ofertas.'; end if;

  select * into v_clipero from public.cliperos where perfil_id = auth.uid();
  if not found then raise exception 'Solo los cliperos pueden ofertar.'; end if;

  -- Paso 3a del perfilado progresivo: el perfil se exige aquí, no antes.
  -- Navegar trabajos con el perfil a medias está permitido; ofertar no,
  -- porque el cliente elige mirando foto, portafolio y calificaciones.
  select * into v_perfil from public.perfiles where id = auth.uid();
  if v_perfil.nombre is null or v_perfil.foto_url is null then
    raise exception 'Completa tu perfil antes de enviar tu primera oferta.';
  end if;

  if v_clipero.estado <> 'aprobado' then
    raise exception 'Tu perfil todavía está en revisión. Te avisamos apenas quede aprobado.';
  end if;

  -- Capacidad semanal declarada por el propio clipero.
  select count(*) into v_activos from public.trabajos
  where clipero_id = auth.uid() and estado in ('asignado','en_progreso','entregado','en_ajustes');
  if v_activos >= v_clipero.capacidad_semanal then
    raise exception 'Llegaste a tu capacidad de % trabajos a la vez. Entrega alguno o súbela en tu perfil.',
      v_clipero.capacidad_semanal;
  end if;

  if p_tipo = 'acepta_precio' then
    v_precio := v_trabajo.precio_por_clip;
  else
    if p_precio_por_clip is null or p_precio_por_clip <= 0 then
      raise exception 'Escribe tu precio por clip.';
    end if;
    v_precio := round(p_precio_por_clip, 2);
  end if;

  insert into public.postulaciones (trabajo_id, clipero_id, tipo, precio_por_clip, precio_total, mensaje, plazo_dias)
  values (
    p_trabajo, auth.uid(), p_tipo, v_precio,
    round(v_precio * v_trabajo.cantidad_clips, 2),
    nullif(trim(coalesce(p_mensaje, '')), ''),
    p_plazo_dias
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'Ya ofertaste en este trabajo. Se permite una sola oferta por clipero.';
end $$;

-- ── El cliente acepta una oferta ──────────────────────────────────────────
-- Todo pasa dentro de una sola función: se congela el precio, se calcula la
-- comisión y se rechaza al resto. Si esto viviera en el frontend, una pestaña
-- cerrada a medio camino dejaría el trabajo asignado sin precio congelado.
create or replace function public.aceptar_postulacion(p_postulacion uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_post      public.postulaciones%rowtype;
  v_trabajo   public.trabajos%rowtype;
  v_pct       numeric(5,2);
  v_comision  numeric(12,2);
  v_completos int;
begin
  select * into v_post from public.postulaciones where id = p_postulacion;
  if not found then raise exception 'Esa oferta ya no existe.'; end if;

  select * into v_trabajo from public.trabajos where id = v_post.trabajo_id;
  if v_trabajo.cliente_id <> auth.uid() and not public.es_admin() then
    raise exception 'Este trabajo no es tuyo.';
  end if;
  if v_trabajo.estado <> 'abierto' then raise exception 'Este trabajo ya fue asignado o cerrado.'; end if;
  if v_post.estado <> 'pendiente' then raise exception 'Esa oferta ya no está disponible.'; end if;
  if v_post.expira_en < now() then raise exception 'Esa oferta expiró.'; end if;

  -- Comisión: el primer trabajo completado de cada clipero va sin comisión.
  -- Cambia estos valores en app_config (abajo) y no toques la función.
  select count(*) into v_completos from public.trabajos
  where clipero_id = v_post.clipero_id and estado = 'completado';

  select case when v_completos = 0 and primer_trabajo_gratis then 0 else comision_porcentaje end
  into v_pct from public.app_config where id = 1;

  v_pct := coalesce(v_pct, 0);
  v_comision := round(v_post.precio_total * v_pct / 100, 2);

  update public.trabajos set
    estado               = 'asignado',
    clipero_id           = v_post.clipero_id,
    precio_acordado      = v_post.precio_total,
    precio_acordado_clip = v_post.precio_por_clip,
    comision_porcentaje  = v_pct,
    comision_monto       = v_comision,
    monto_clipero        = v_post.precio_total - v_comision,
    asignado_en          = now()
  where id = v_trabajo.id;

  update public.postulaciones set estado = 'aceptada' where id = p_postulacion;
  update public.postulaciones set estado = 'rechazada'
  where trabajo_id = v_trabajo.id and id <> p_postulacion and estado = 'pendiente';
end $$;

-- ── El clipero entrega ────────────────────────────────────────────────────
create or replace function public.enviar_entrega(
  p_trabajo uuid,
  p_url     text,
  p_nota    text default null,
  p_links   text[] default '{}'
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_trabajo public.trabajos%rowtype;
  v_version int;
  v_id      uuid;
begin
  select * into v_trabajo from public.trabajos where id = p_trabajo;
  if not found then raise exception 'Ese trabajo ya no existe.'; end if;
  if v_trabajo.clipero_id <> auth.uid() then raise exception 'Este trabajo no es tuyo.'; end if;
  if v_trabajo.estado not in ('asignado','en_progreso','en_ajustes') then
    raise exception 'Este trabajo no está en un estado que admita entregas.';
  end if;
  if coalesce(trim(p_url), '') = '' then raise exception 'Pega el link de la carpeta con los clips.'; end if;
  if v_trabajo.requiere_publicacion and coalesce(cardinality(p_links), 0) = 0 then
    raise exception 'Este trabajo incluye publicación: pega también los links de los posts.';
  end if;

  select coalesce(max(version), 0) + 1 into v_version from public.entregas where trabajo_id = p_trabajo;

  insert into public.entregas (trabajo_id, clipero_id, url_entrega, nota, links_publicaciones, version)
  values (p_trabajo, auth.uid(), trim(p_url), nullif(trim(coalesce(p_nota,'')), ''), coalesce(p_links,'{}'), v_version)
  returning id into v_id;

  update public.trabajos set estado = 'entregado', entregado_en = now() where id = p_trabajo;
  return v_id;
end $$;

-- ── El cliente pide ajustes (una sola ronda) ──────────────────────────────
create or replace function public.solicitar_ajustes(p_entrega uuid, p_comentario text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_entrega public.entregas%rowtype;
  v_trabajo public.trabajos%rowtype;
begin
  select * into v_entrega from public.entregas where id = p_entrega;
  if not found then raise exception 'Esa entrega ya no existe.'; end if;

  select * into v_trabajo from public.trabajos where id = v_entrega.trabajo_id;
  if v_trabajo.cliente_id <> auth.uid() then raise exception 'Este trabajo no es tuyo.'; end if;
  if v_trabajo.estado <> 'entregado' then raise exception 'No hay una entrega pendiente de revisar.'; end if;
  if v_trabajo.rondas_ajuste >= 1 then
    raise exception 'Ya usaste tu ronda de ajustes en este trabajo.';
  end if;
  if char_length(trim(coalesce(p_comentario,''))) < 5 then
    raise exception 'Explica qué hay que ajustar.';
  end if;

  insert into public.revisiones (entrega_id, comentario) values (p_entrega, trim(p_comentario));
  update public.entregas set estado = 'ajustes_solicitados' where id = p_entrega;
  update public.trabajos set estado = 'en_ajustes', rondas_ajuste = rondas_ajuste + 1 where id = v_trabajo.id;
end $$;

-- ── El cliente aprueba: se libera el pago al saldo del clipero ────────────
create or replace function public.aprobar_entrega(p_entrega uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_entrega public.entregas%rowtype;
  v_trabajo public.trabajos%rowtype;
  v_a_tiempo boolean;
begin
  select * into v_entrega from public.entregas where id = p_entrega;
  if not found then raise exception 'Esa entrega ya no existe.'; end if;

  select * into v_trabajo from public.trabajos where id = v_entrega.trabajo_id;
  if v_trabajo.cliente_id <> auth.uid() and not public.es_admin() then
    raise exception 'Este trabajo no es tuyo.';
  end if;
  if v_trabajo.estado <> 'entregado' then raise exception 'No hay una entrega pendiente de aprobar.'; end if;

  v_a_tiempo := (v_trabajo.entregado_en::date <= v_trabajo.fecha_limite);

  update public.entregas set estado = 'aprobada' where id = p_entrega;
  update public.trabajos set estado = 'completado', completado_en = now() where id = v_trabajo.id;

  -- Escrow: el monto pasa al saldo del clipero. La salida real de dinero la
  -- hace el admin a mano y la marca en el panel de retiros.
  -- Se anotan dos líneas (bruto y comisión) en vez de una neta: así el clipero
  -- ve de dónde sale cada boliviano y el libro cuadra sumando la columna.
  insert into public.movimientos (perfil_id, trabajo_id, tipo, monto, detalle)
  values (v_trabajo.clipero_id, v_trabajo.id, 'liberacion', v_trabajo.precio_acordado,
          'Pago liberado — ' || v_trabajo.titulo);

  if v_trabajo.comision_monto > 0 then
    insert into public.movimientos (perfil_id, trabajo_id, tipo, monto, detalle)
    values (v_trabajo.clipero_id, v_trabajo.id, 'comision', -v_trabajo.comision_monto,
            'Comisión de la plataforma (' || v_trabajo.comision_porcentaje || '%)');
  end if;

  update public.cliperos set
    trabajos_completados = trabajos_completados + 1,
    entregas_a_tiempo    = entregas_a_tiempo + (case when v_a_tiempo then 1 else 0 end)
  where perfil_id = v_trabajo.clipero_id;
end $$;

-- ── Calificación bidireccional ────────────────────────────────────────────
create or replace function public.calificar(p_trabajo uuid, p_estrellas int, p_comentario text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_trabajo public.trabajos%rowtype;
  v_para    uuid;
begin
  select * into v_trabajo from public.trabajos where id = p_trabajo;
  if not found then raise exception 'Ese trabajo ya no existe.'; end if;
  if v_trabajo.estado <> 'completado' then raise exception 'Solo se califica un trabajo completado.'; end if;

  if auth.uid() = v_trabajo.cliente_id then
    v_para := v_trabajo.clipero_id;
  elsif auth.uid() = v_trabajo.clipero_id then
    v_para := v_trabajo.cliente_id;
  else
    raise exception 'No participaste en este trabajo.';
  end if;

  insert into public.calificaciones (trabajo_id, de_perfil_id, para_perfil_id, estrellas, comentario)
  values (p_trabajo, auth.uid(), v_para, p_estrellas, nullif(trim(coalesce(p_comentario,'')), ''));
exception
  when unique_violation then raise exception 'Ya calificaste este trabajo.';
end $$;

-- ── Cerrar un trabajo sin elegir a nadie ──────────────────────────────────
create or replace function public.cancelar_trabajo(p_trabajo uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_trabajo public.trabajos%rowtype;
begin
  select * into v_trabajo from public.trabajos where id = p_trabajo;
  if not found then raise exception 'Ese trabajo ya no existe.'; end if;
  if v_trabajo.cliente_id <> auth.uid() and not public.es_admin() then
    raise exception 'Este trabajo no es tuyo.';
  end if;
  if v_trabajo.estado not in ('abierto','asignado') then
    raise exception 'Un trabajo en curso no se cancela solo: escríbenos y lo revisamos.';
  end if;

  update public.trabajos set estado = 'cancelado' where id = p_trabajo;
  update public.postulaciones set estado = 'rechazada' where trabajo_id = p_trabajo and estado = 'pendiente';
end $$;

-- ── Expirar postulaciones sin respuesta a las 72 horas ────────────────────
-- Se puede agendar con pg_cron; mientras tanto la app la llama al abrir los
-- listados, que es suficiente para el volumen del MVP.
create or replace function public.expirar_postulaciones()
returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_n int;
begin
  update public.postulaciones set estado = 'expirada'
  where estado = 'pendiente' and expira_en < now();
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ── Retiros ───────────────────────────────────────────────────────────────
create or replace function public.solicitar_retiro(p_monto numeric, p_metodo text, p_datos text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_saldo record;
  v_id    uuid;
begin
  select * into v_saldo from public.saldo_de(auth.uid());
  if p_monto is null or p_monto <= 0 then raise exception 'Escribe cuánto quieres retirar.'; end if;
  if p_monto > (v_saldo.disponible - v_saldo.en_tramite) then
    raise exception 'No tienes ese saldo disponible.';
  end if;
  if coalesce(trim(p_metodo),'') = '' or coalesce(trim(p_datos),'') = '' then
    raise exception 'Dinos a qué cuenta te transferimos.';
  end if;

  insert into public.retiros (clipero_id, monto, metodo, datos_cobro)
  values (auth.uid(), round(p_monto,2), trim(p_metodo), trim(p_datos))
  returning id into v_id;
  return v_id;
end $$;

-- ── Acciones de admin ─────────────────────────────────────────────────────
create or replace function public.admin_estado_clipero(p_clipero uuid, p_estado public.estado_clipero)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.es_admin() then raise exception 'Solo el admin.'; end if;
  update public.cliperos set estado = p_estado where perfil_id = p_clipero;
end $$;

create or replace function public.admin_marcar_deposito(p_trabajo uuid, p_valor boolean)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.es_admin() then raise exception 'Solo el admin.'; end if;
  update public.trabajos set deposito_confirmado = p_valor where id = p_trabajo;
end $$;

create or replace function public.admin_resolver_retiro(p_retiro uuid, p_estado public.estado_retiro, p_nota text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_retiro public.retiros%rowtype;
begin
  if not public.es_admin() then raise exception 'Solo el admin.'; end if;

  select * into v_retiro from public.retiros where id = p_retiro;
  if not found then raise exception 'Ese retiro no existe.'; end if;
  if v_retiro.estado = 'pagado' then raise exception 'Ese retiro ya se pagó.'; end if;

  update public.retiros set estado = p_estado, nota_admin = p_nota, procesado_en = now() where id = p_retiro;

  -- El movimiento negativo se registra solo cuando el dinero salió de verdad.
  if p_estado = 'pagado' then
    insert into public.movimientos (perfil_id, tipo, monto, detalle)
    values (v_retiro.clipero_id, 'retiro', -v_retiro.monto, 'Retiro pagado — ' || v_retiro.metodo);
  end if;
end $$;

-- Métricas del panel admin, en una sola consulta.
create or replace function public.admin_metricas()
returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare v json;
begin
  if not public.es_admin() then raise exception 'Solo el admin.'; end if;
  select json_build_object(
    'trabajos_por_estado', (select coalesce(json_object_agg(t.estado, t.n), '{}'::json)
                            from (select estado::text as estado, count(*) n from public.trabajos group by 1) t),
    'cliperos_por_estado', (select coalesce(json_object_agg(c.estado, c.n), '{}'::json)
                            from (select estado::text as estado, count(*) n from public.cliperos group by 1) c),
    'clientes',            (select count(*) from public.perfiles where rol = 'cliente'),
    'precio_clip_promedio',(select coalesce(round(avg(precio_acordado_clip), 2), 0)
                            from public.trabajos where precio_acordado_clip is not null),
    'clips_entregados',    (select coalesce(sum(cantidad_clips), 0) from public.trabajos where estado = 'completado'),
    'entregas_a_tiempo_pct', (select case when sum(trabajos_completados) > 0
                                    then round(100.0 * sum(entregas_a_tiempo) / sum(trabajos_completados), 1)
                                    else 0 end from public.cliperos),
    'comision_acumulada',  (select coalesce(sum(comision_monto), 0) from public.trabajos where estado = 'completado'),
    'retiros_pendientes',  (select count(*) from public.retiros where estado in ('solicitado','procesando'))
  ) into v;
  return v;
end $$;


-- ───────────────────────────────────────────────────────────────────────────
--  6. CONFIGURACIÓN DE NEGOCIO
--  Una sola fila. Cambiar la comisión no debería requerir un deploy.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.app_config (
  id                     int primary key default 1 check (id = 1),
  comision_porcentaje    numeric(5,2) not null default 15 check (comision_porcentaje between 0 and 50),
  primer_trabajo_gratis  boolean not null default true,
  moneda                 text not null default 'Bs',
  actualizado_en         timestamptz not null default now()
);
insert into public.app_config (id) values (1) on conflict (id) do nothing;


-- ───────────────────────────────────────────────────────────────────────────
--  7. ROW LEVEL SECURITY
--  Regla de fondo: cada quien ve lo suyo, el perfil del clipero es público
--  para usuarios registrados, y el admin ve todo.
-- ───────────────────────────────────────────────────────────────────────────

alter table public.perfiles       enable row level security;
alter table public.cliperos       enable row level security;
alter table public.portafolio     enable row level security;
alter table public.trabajos       enable row level security;
alter table public.postulaciones  enable row level security;
alter table public.entregas       enable row level security;
alter table public.revisiones     enable row level security;
alter table public.calificaciones enable row level security;
alter table public.movimientos    enable row level security;
alter table public.retiros        enable row level security;
alter table public.app_config     enable row level security;

-- ── perfiles ──────────────────────────────────────────────────────────────
drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles for select to authenticated
  using (true);   -- solo nombre, foto, ciudad y bio: es la tarjeta pública

drop policy if exists perfiles_update on public.perfiles;
create policy perfiles_update on public.perfiles for update to authenticated
  using (id = auth.uid() or public.es_admin())
  with check (id = auth.uid() or public.es_admin());

drop policy if exists perfiles_insert on public.perfiles;
create policy perfiles_insert on public.perfiles for insert to authenticated
  with check (id = auth.uid());

-- ── cliperos ──────────────────────────────────────────────────────────────
drop policy if exists cliperos_select on public.cliperos;
create policy cliperos_select on public.cliperos for select to authenticated using (true);

drop policy if exists cliperos_insert on public.cliperos;
create policy cliperos_insert on public.cliperos for insert to authenticated
  with check (perfil_id = auth.uid());

-- El clipero edita su ficha pero no su propio estado ni sus métricas:
-- esas columnas solo las mueven las funciones SECURITY DEFINER y el admin.
drop policy if exists cliperos_update on public.cliperos;
create policy cliperos_update on public.cliperos for update to authenticated
  using (perfil_id = auth.uid() or public.es_admin())
  with check (perfil_id = auth.uid() or public.es_admin());

revoke update on public.cliperos from authenticated;
grant update (especialidad, herramientas_ia, link_portafolio, capacidad_semanal)
  on public.cliperos to authenticated;

-- ── portafolio ────────────────────────────────────────────────────────────
drop policy if exists portafolio_select on public.portafolio;
create policy portafolio_select on public.portafolio for select to authenticated using (true);

drop policy if exists portafolio_todo on public.portafolio;
create policy portafolio_todo on public.portafolio for all to authenticated
  using (clipero_id = auth.uid() or public.es_admin())
  with check (clipero_id = auth.uid() or public.es_admin());

-- ── trabajos ──────────────────────────────────────────────────────────────
-- Los trabajos abiertos los ve cualquier clipero registrado, aunque su perfil
-- esté a medias: explorar es lo que lo convence de completarlo.
drop policy if exists trabajos_select on public.trabajos;
create policy trabajos_select on public.trabajos for select to authenticated using (
  cliente_id = auth.uid()
  or clipero_id = auth.uid()
  or (estado = 'abierto' and public.mi_rol() = 'clipero')
  or public.postule_en(id)   -- para que "Mis postulaciones" no quede en blanco al perder
  or public.es_admin()
);

drop policy if exists trabajos_insert on public.trabajos;
create policy trabajos_insert on public.trabajos for insert to authenticated
  with check (cliente_id = auth.uid() and public.mi_rol() = 'cliente');

drop policy if exists trabajos_update on public.trabajos;
create policy trabajos_update on public.trabajos for update to authenticated
  using (
    (cliente_id = auth.uid() and estado = 'abierto')   -- editar mientras nadie se comprometió
    or public.es_admin()
  )
  with check (cliente_id = auth.uid() or public.es_admin());

drop policy if exists trabajos_delete on public.trabajos;
create policy trabajos_delete on public.trabajos for delete to authenticated
  using (cliente_id = auth.uid() and estado = 'abierto');

-- ── postulaciones ─────────────────────────────────────────────────────────
-- Un clipero no ve las ofertas de los demás: sabría exactamente cuánto bajar.
drop policy if exists postulaciones_select on public.postulaciones;
create policy postulaciones_select on public.postulaciones for select to authenticated using (
  clipero_id = auth.uid()
  or exists (select 1 from public.trabajos t where t.id = trabajo_id and t.cliente_id = auth.uid())
  or public.es_admin()
);

-- El insert real pasa por public.postular(), que valida capacidad, estado y
-- perfil completo. Aquí solo se permite retirar la propia oferta.
drop policy if exists postulaciones_update on public.postulaciones;
create policy postulaciones_update on public.postulaciones for update to authenticated
  using (clipero_id = auth.uid() and estado = 'pendiente')
  with check (clipero_id = auth.uid());

-- ── entregas ──────────────────────────────────────────────────────────────
drop policy if exists entregas_select on public.entregas;
create policy entregas_select on public.entregas for select to authenticated using (
  clipero_id = auth.uid()
  or exists (select 1 from public.trabajos t where t.id = trabajo_id and t.cliente_id = auth.uid())
  or public.es_admin()
);

-- ── revisiones ────────────────────────────────────────────────────────────
drop policy if exists revisiones_select on public.revisiones;
create policy revisiones_select on public.revisiones for select to authenticated using (
  exists (
    select 1 from public.entregas e join public.trabajos t on t.id = e.trabajo_id
    where e.id = entrega_id and (e.clipero_id = auth.uid() or t.cliente_id = auth.uid())
  )
  or public.es_admin()
);

-- ── calificaciones ────────────────────────────────────────────────────────
-- Aquí vive la regla anti-represalia: quien recibe una calificación no la ve
-- hasta que ambos calificaron o pasaron 7 días. Quien la escribió siempre ve
-- la suya.
drop policy if exists calificaciones_select on public.calificaciones;
create policy calificaciones_select on public.calificaciones for select to authenticated using (
  de_perfil_id = auth.uid()
  or public.es_admin()
  or creado_en <= now() - interval '7 days'
  or public.calificaciones_destapadas(trabajo_id)
);

-- ── movimientos y retiros ─────────────────────────────────────────────────
drop policy if exists movimientos_select on public.movimientos;
create policy movimientos_select on public.movimientos for select to authenticated
  using (perfil_id = auth.uid() or public.es_admin());

drop policy if exists retiros_select on public.retiros;
create policy retiros_select on public.retiros for select to authenticated
  using (clipero_id = auth.uid() or public.es_admin());

-- ── app_config ────────────────────────────────────────────────────────────
drop policy if exists app_config_select on public.app_config;
create policy app_config_select on public.app_config for select to authenticated using (true);

drop policy if exists app_config_update on public.app_config;
create policy app_config_update on public.app_config for update to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ───────────────────────────────────────────────────────────────────────────
--  8. STORAGE — solo imágenes
--  Nada de video: es el costo más alto de la app y el que menos aporta hoy.
--  FUTURO: migrar a hosting de video propio.
-- ───────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatares',   'avatares',   true, 524288, array['image/jpeg','image/png','image/webp']),
  ('miniaturas', 'miniaturas', true, 524288, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada quien escribe solo dentro de la carpeta con su propio id.
drop policy if exists "imagenes lectura publica" on storage.objects;
create policy "imagenes lectura publica" on storage.objects for select
  using (bucket_id in ('avatares','miniaturas'));

drop policy if exists "imagenes subida propia" on storage.objects;
create policy "imagenes subida propia" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatares','miniaturas') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "imagenes update propia" on storage.objects;
create policy "imagenes update propia" on storage.objects for update to authenticated
  using (bucket_id in ('avatares','miniaturas') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "imagenes borrado propio" on storage.objects;
create policy "imagenes borrado propio" on storage.objects for delete to authenticated
  using (bucket_id in ('avatares','miniaturas') and (storage.foldername(name))[1] = auth.uid()::text);


-- ───────────────────────────────────────────────────────────────────────────
--  9. PERMISOS DE EJECUCIÓN
-- ───────────────────────────────────────────────────────────────────────────

grant execute on function public.confirmar_perfil(text, public.rol_usuario) to authenticated;
grant execute on function public.completar_perfil_clipero(text, text, text, text, text, text, text, int) to authenticated;
grant execute on function public.postule_en(uuid) to authenticated;
grant execute on function public.postular(uuid, public.tipo_postulacion, numeric, text, int) to authenticated;
grant execute on function public.aceptar_postulacion(uuid) to authenticated;
grant execute on function public.enviar_entrega(uuid, text, text, text[]) to authenticated;
grant execute on function public.solicitar_ajustes(uuid, text) to authenticated;
grant execute on function public.aprobar_entrega(uuid) to authenticated;
grant execute on function public.calificar(uuid, int, text) to authenticated;
grant execute on function public.cancelar_trabajo(uuid) to authenticated;
grant execute on function public.expirar_postulaciones() to authenticated;
grant execute on function public.solicitar_retiro(numeric, text, text) to authenticated;
grant execute on function public.mi_saldo() to authenticated;
grant execute on function public.saldo_de(uuid) to authenticated;
grant execute on function public.admin_estado_clipero(uuid, public.estado_clipero) to authenticated;
grant execute on function public.admin_marcar_deposito(uuid, boolean) to authenticated;
grant execute on function public.admin_resolver_retiro(uuid, public.estado_retiro, text) to authenticated;
grant execute on function public.admin_metricas() to authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
--  10. HACERTE ADMIN
--  Regístrate normal en la app y luego ejecuta esto con tu email:
--
--    update public.perfiles set rol = 'admin'
--    where id = (select id from auth.users where email = 'TU@EMAIL.COM');
--
--  Y si quieres aprobar cliperos automáticamente mientras arrancas:
--
--    update public.cliperos set estado = 'aprobado' where estado in ('pendiente','en_revision');
-- ═══════════════════════════════════════════════════════════════════════════
