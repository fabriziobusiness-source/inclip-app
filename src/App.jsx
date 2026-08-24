import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { faltaConfiguracion } from './lib/supabase';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/ui/Toast';
import Layout from './components/Layout';

import Registro from './pages/auth/Registro';
import Login from './pages/auth/Login';
import Bienvenida from './pages/auth/Bienvenida';
import NuevaClave from './pages/auth/NuevaClave';

import ClienteTrabajos from './pages/cliente/Trabajos';
import ClientePublicar from './pages/cliente/Publicar';
import ClienteDetalle from './pages/cliente/DetalleTrabajo';
import ClientePerfil from './pages/cliente/Perfil';

import CliperoTrabajos from './pages/clipero/Trabajos';
import CliperoDetalle from './pages/clipero/DetalleTrabajo';
import CliperoPostulaciones from './pages/clipero/Postulaciones';
import CliperoMisTrabajos from './pages/clipero/MisTrabajos';
import CliperoEntregar from './pages/clipero/Entregar';
import CliperoSaldo from './pages/clipero/Saldo';
import CliperoPerfil from './pages/clipero/Perfil';

import AdminMetricas from './pages/admin/Metricas';
import AdminCliperos from './pages/admin/Cliperos';
import AdminTrabajos from './pages/admin/Trabajos';
import AdminRetiros from './pages/admin/Retiros';

import PerfilPublico from './pages/perfil/PerfilPublico';
import NoEncontrado from './pages/NoEncontrado';

/* ── Pantalla de configuración faltante ──────────────────────
   Sin las variables de entorno la app no puede hablar con nadie.
   Mejor decirlo con letras que dejar una pantalla negra.        */
function FaltanVariables() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="card max-w-md p-6">
        <h1 className="text-[18px] font-bold tight">Falta configurar Supabase</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-mut">
          Crea un archivo <code className="text-cy">.env</code> a partir de{' '}
          <code className="text-cy">.env.example</code> con{' '}
          <code className="text-cy">VITE_SUPABASE_URL</code> y{' '}
          <code className="text-cy">VITE_SUPABASE_ANON_KEY</code>, y vuelve a arrancar el servidor.
        </p>
        <p className="mt-3 text-[13px] text-mut">
          En Netlify van en <strong className="text-paper">Site settings → Environment variables</strong>.
        </p>
      </div>
    </main>
  );
}

function Cargando() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5" aria-busy="true">
      <div className="w-full max-w-md space-y-3">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-28 w-full rounded-2xl" />
        <div className="skeleton h-28 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/* ── Puerta de entrada ───────────────────────────────────────
   Decide en un solo sitio qué ve cada persona según su sesión,
   su rol y lo que le falta del perfil. Si esta lógica se
   repartiera por las pantallas, cada nueva pantalla sería otra
   oportunidad de olvidarse una comprobación.                   */
function Privado({ rolesPermitidos }) {
  const { sesion, perfil, rol, cargando, perfilBasicoListo } = useAuth();
  const location = useLocation();

  if (cargando) return <Cargando />;

  if (!sesion) {
    return <Navigate to="/entrar" replace state={{ desde: location.pathname }} />;
  }

  // El perfil lo crea un trigger; en el primer parpadeo puede no haber llegado.
  if (!perfil) return <Cargando />;

  // Paso 2 pendiente: nombre y rol.
  if (!perfilBasicoListo) {
    return <Navigate to="/bienvenida" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(rol)) {
    return <Navigate to={inicioDe(rol)} replace />;
  }

  return <Layout />;
}

export function inicioDe(rol) {
  if (rol === 'clipero') return '/clipero/trabajos';
  if (rol === 'admin') return '/admin/metricas';
  if (rol === 'cliente') return '/cliente/trabajos';
  return '/entrar';
}

function RaizRedirigida() {
  const { sesion, rol, cargando, perfilBasicoListo } = useAuth();
  if (cargando) return <Cargando />;
  if (!sesion) return <Navigate to="/entrar" replace />;
  if (!perfilBasicoListo) return <Navigate to="/bienvenida" replace />;
  return <Navigate to={inicioDe(rol)} replace />;
}

/* Registro y login no se le muestran a quien ya entró. */
function SoloInvitados({ children }) {
  const { sesion, cargando, rol, perfilBasicoListo } = useAuth();
  if (cargando) return <Cargando />;
  if (sesion) return <Navigate to={perfilBasicoListo ? inicioDe(rol) : '/bienvenida'} replace />;
  return children;
}

function PasoBienvenida() {
  const { sesion, cargando, rol, perfilBasicoListo } = useAuth();
  if (cargando) return <Cargando />;
  if (!sesion) return <Navigate to="/entrar" replace />;
  if (perfilBasicoListo) return <Navigate to={inicioDe(rol)} replace />;
  return <Bienvenida />;
}

export default function App() {
  if (faltaConfiguracion) return <FaltanVariables />;

  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<RaizRedirigida />} />

          <Route path="/registro" element={<SoloInvitados><Registro /></SoloInvitados>} />
          <Route path="/entrar" element={<SoloInvitados><Login /></SoloInvitados>} />
          <Route path="/bienvenida" element={<PasoBienvenida />} />
          <Route path="/nueva-clave" element={<NuevaClave />} />

          {/* ── Emprendedor ── */}
          <Route element={<Privado rolesPermitidos={['cliente']} />}>
            <Route path="/cliente/trabajos" element={<ClienteTrabajos />} />
            <Route path="/cliente/publicar" element={<ClientePublicar />} />
            <Route path="/cliente/trabajos/:id" element={<ClienteDetalle />} />
            <Route path="/cliente/perfil" element={<ClientePerfil />} />
          </Route>

          {/* ── Clipero ── */}
          <Route element={<Privado rolesPermitidos={['clipero']} />}>
            <Route path="/clipero/trabajos" element={<CliperoTrabajos />} />
            <Route path="/clipero/trabajos/:id" element={<CliperoDetalle />} />
            <Route path="/clipero/postulaciones" element={<CliperoPostulaciones />} />
            <Route path="/clipero/mis-trabajos" element={<CliperoMisTrabajos />} />
            <Route path="/clipero/entregar/:id" element={<CliperoEntregar />} />
            <Route path="/clipero/saldo" element={<CliperoSaldo />} />
            <Route path="/clipero/perfil" element={<CliperoPerfil />} />
          </Route>

          {/* ── Admin ── */}
          <Route element={<Privado rolesPermitidos={['admin']} />}>
            <Route path="/admin/metricas" element={<AdminMetricas />} />
            <Route path="/admin/cliperos" element={<AdminCliperos />} />
            <Route path="/admin/trabajos" element={<AdminTrabajos />} />
            <Route path="/admin/retiros" element={<AdminRetiros />} />
          </Route>

          {/* ── Perfil público: lo abre cualquiera con sesión ── */}
          <Route element={<Privado />}>
            <Route path="/clipero/perfil/:id" element={<PerfilPublico />} />
          </Route>

          <Route path="*" element={<NoEncontrado />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
