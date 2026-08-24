import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, URL_APP } from '../lib/supabase';

const AuthContext = createContext(null);

/** Dónde guardamos el `?tipo=` de la landing mientras dura el rodeo por Google. */
export const CLAVE_TIPO = 'inclip_tipo_registro';

/** Lee ese tipo, validado. Devuelve null si no hay o si es basura. */
export function tipoGuardado() {
  try {
    const v = sessionStorage.getItem(CLAVE_TIPO);
    return v === 'cliente' || v === 'clipero' ? v : null;
  } catch {
    return null;
  }
}

export function olvidarTipoGuardado() {
  try {
    sessionStorage.removeItem(CLAVE_TIPO);
  } catch {
    // Nada que hacer si el almacenamiento está bloqueado.
  }
}

/* ══════════════════════════════════════════════════════════════
   Sesión + perfil + ficha de clipero, en un solo lugar.

   `perfil.rol` y `perfil.nombre` pueden venir nulos: el registro
   solo pide correo y contraseña. Ese hueco es intencional, es el
   perfilado progresivo, y quien decide qué hacer con él es
   <Enrutador>, no cada pantalla.
   ══════════════════════════════════════════════════════════════ */

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [clipero, setClipero] = useState(null);
  const [cargando, setCargando] = useState(true);
  const montado = useRef(true);

  const cargarPerfil = useCallback(async (userId) => {
    if (!userId) {
      setPerfil(null);
      setClipero(null);
      return;
    }

    const { data: p } = await supabase.from('perfiles').select('*').eq('id', userId).maybeSingle();
    if (!montado.current) return;
    setPerfil(p || null);

    if (p?.rol === 'clipero') {
      const { data: c } = await supabase.from('cliperos').select('*').eq('perfil_id', userId).maybeSingle();
      if (!montado.current) return;
      setClipero(c || null);
    } else {
      setClipero(null);
    }
  }, []);

  useEffect(() => {
    montado.current = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!montado.current) return;
      setSesion(data.session);
      await cargarPerfil(data.session?.user?.id);
      if (montado.current) setCargando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSesion(s);
      if (evento === 'SIGNED_OUT') {
        setPerfil(null);
        setClipero(null);
        return;
      }
      // El perfil lo crea un trigger al registrarse. Si consultamos en el mismo
      // instante puede no existir todavía; un reintento corto lo resuelve sin
      // dejar al usuario en una pantalla vacía.
      if (s?.user?.id) {
        cargarPerfil(s.user.id).then(() => {
          setTimeout(() => montado.current && cargarPerfil(s.user.id), 700);
        });
      }
    });

    return () => {
      montado.current = false;
      sub.subscription.unsubscribe();
    };
  }, [cargarPerfil]);

  const refrescar = useCallback(() => cargarPerfil(sesion?.user?.id), [cargarPerfil, sesion]);

  const registrar = useCallback(async ({ email, password, tipo }) => {
    // El `tipo` viaja en los metadatos del usuario: el trigger de la base lo
    // convierte en el rol del perfil. Así el clic que la persona dio en la
    // landing no se pierde entre el registro y la confirmación del correo.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: tipo ? { tipo } : {},
        emailRedirectTo: `${URL_APP}/entrar`,
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const entrar = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const entrarConGoogle = useCallback(async (tipo) => {
    // El tipo que venía en la URL de la landing no sobrevive solo: con Google
    // el navegador se va a accounts.google.com y vuelve, y por ese camino no
    // existen los metadatos que sí lleva el signUp con correo. sessionStorage
    // aguanta el viaje de ida y vuelta en la misma pestaña y muere al cerrarla.
    if (tipo === 'cliente' || tipo === 'clipero') {
      try {
        sessionStorage.setItem(CLAVE_TIPO, tipo);
      } catch {
        // Modo privado con almacenamiento bloqueado. No es fatal: el paso 2
        // simplemente le preguntará el rol.
      }
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${URL_APP}/entrar`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
  }, []);

  const salir = useCallback(async () => {
    await supabase.auth.signOut();
    setPerfil(null);
    setClipero(null);
  }, []);

  const valor = useMemo(
    () => ({
      sesion,
      usuario: sesion?.user || null,
      perfil,
      clipero,
      cargando,
      rol: perfil?.rol || null,
      esAdmin: perfil?.rol === 'admin',
      // Paso 2 completo: ya tiene nombre y rol.
      perfilBasicoListo: Boolean(perfil?.rol && perfil?.nombre),
      // Paso 3a completo: lo que se exige antes de la primera oferta.
      perfilCliperoListo: Boolean(perfil?.nombre && perfil?.foto_url),
      registrar,
      entrar,
      entrarConGoogle,
      salir,
      refrescar,
    }),
    [sesion, perfil, clipero, cargando, registrar, entrar, entrarConGoogle, salir, refrescar]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth necesita estar dentro de <AuthProvider>');
  return ctx;
}
