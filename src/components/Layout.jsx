import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MARCA } from '../config';
import Avatar from './ui/Avatar';

/* Barra lateral de 220px en escritorio, navegación inferior en móvil.
   Mobile-first no es un adorno: los editores entran desde el celular.

   La navegación inferior admite 4 destinos como máximo. Con cinco, cada
   uno queda en 75px en una pantalla de 375px y el texto empieza a
   partirse. Lo que no entra lleva `movil: false` y se alcanza desde otro
   lado: "Mi perfil" cuelga del avatar de la barra superior. */

const IC = {
  trabajos: 'M3 7h18M3 12h18M3 17h12',
  publicar: 'M12 5v14M5 12h14',
  ofertas: 'M4 6h16M4 12h10M4 18h7',
  entregas: 'M4 4h16v12H4zM8 20h8',
  perfil: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  saldo: 'M3 7h18v12H3zM3 11h18',
  admin: 'M12 3l8 4v5c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V7l8-4z',
  metricas: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
};

function Icono({ d }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const MENUS = {
  cliente: [
    { to: '/cliente/trabajos', etiqueta: 'Mis trabajos', icono: IC.trabajos },
    { to: '/cliente/publicar', etiqueta: 'Publicar', icono: IC.publicar },
    { to: '/cliente/perfil', etiqueta: 'Mi perfil', icono: IC.perfil },
  ],
  editor: [
    { to: '/editor/trabajos', etiqueta: 'Trabajos', icono: IC.trabajos },
    { to: '/editor/postulaciones', etiqueta: 'Mis ofertas', icono: IC.ofertas },
    { to: '/editor/mis-trabajos', etiqueta: 'En curso', icono: IC.entregas },
    { to: '/editor/saldo', etiqueta: 'Saldo', icono: IC.saldo },
    // Se llega tocando el avatar de la barra superior.
    { to: '/editor/perfil', etiqueta: 'Mi perfil', icono: IC.perfil, movil: false },
  ],
  admin: [
    { to: '/admin/metricas', etiqueta: 'Métricas', icono: IC.metricas },
    { to: '/admin/editores', etiqueta: 'Editores', icono: IC.perfil },
    { to: '/admin/trabajos', etiqueta: 'Trabajos', icono: IC.trabajos },
    { to: '/admin/retiros', etiqueta: 'Retiros', icono: IC.saldo },
  ],
};

export default function Layout() {
  const { perfil, rol, salir } = useAuth();
  const menu = MENUS[rol] || [];
  const menuMovil = menu.filter((item) => item.movil !== false).slice(0, 4);
  const inicio = menu[0]?.to || '/';
  const rutaPerfil =
    rol === 'editor' ? '/editor/perfil' : rol === 'cliente' ? '/cliente/perfil' : '/admin/metricas';

  return (
    <div className="min-h-dvh">
      {/* ── Barra superior en móvil ─────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur-md lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to={inicio} className="flex items-center gap-2">
            <span
              className="h-6 w-6 rounded-md"
              style={{ background: '#FF5A1F' }}
              aria-hidden="true"
            />
            <span className="text-[16px] font-bold tight">{MARCA.NOMBRE}</span>
          </Link>
          <Link to={rutaPerfil} aria-label="Mi perfil">
            <Avatar url={perfil?.foto_url} nombre={perfil?.nombre} tamano="sm" />
          </Link>
        </div>
      </header>

      {/* ── Sidebar en escritorio ───────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-line bg-ink2/60 px-3 py-5 lg:flex">
        <Link to={inicio} className="mb-7 flex items-center gap-2.5 px-2">
          <span
            className="h-7 w-7 rounded-lg"
            style={{ background: '#FF5A1F' }}
            aria-hidden="true"
          />
          <span className="text-[18px] font-bold tight">{MARCA.NOMBRE}</span>
        </Link>

        <nav className="flex-1 space-y-1" aria-label="Navegación principal">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-[14px] transition-colors ${
                  isActive ? 'bg-flame/10 font-bold text-flame' : 'text-muted hover:bg-paper/[0.04] hover:text-paper'
                }`
              }
            >
              <Icono d={item.icono} />
              {item.etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-line pt-4">
          <div className="flex items-center gap-3 px-2 pb-3">
            <Avatar url={perfil?.foto_url} nombre={perfil?.nombre} tamano="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{perfil?.nombre || 'Sin nombre'}</p>
              <p className="truncate text-[11.5px] capitalize text-muted">
                {rol === 'cliente' ? 'Emprendedor' : rol}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={salir}
            className="w-full px-3 py-2 text-left text-[13px] text-muted transition-colors hover:bg-paper/[0.04] hover:text-paper"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Contenido ───────────────────────────────────────── */}
      <div className="lg:pl-[220px]">
        <main className="mx-auto w-full max-w-content px-4 pb-28 pt-5 sm:px-6 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {/* ── Navegación inferior en móvil ────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navegación principal"
      >
        <div className="flex">
          {menuMovil.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] transition-colors ${
                  isActive ? 'text-flame' : 'text-muted'
                }`
              }
            >
              <Icono d={item.icono} />
              <span className="leading-none">{item.etiqueta}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Encabezado estándar de página. */
export function Encabezado({ titulo, bajada, accion, className = '' }) {
  return (
    <div className={`mb-5 flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-[24px] font-bold leading-tight tight sm:text-[28px]">{titulo}</h1>
        {bajada && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">{bajada}</p>}
      </div>
      {accion}
    </div>
  );
}
