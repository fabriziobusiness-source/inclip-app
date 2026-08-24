import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* Si faltan las variables, la app arranca igual y muestra una pantalla que
   explica qué falta. Es mucho mejor que una pantalla negra con un error de
   consola que solo entiende quien tiene la consola abierta. */
export const faltaConfiguracion = !url || !anonKey;

export const supabase = faltaConfiguracion
  ? null
  : createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

export const URL_APP = import.meta.env.VITE_APP_URL || window.location.origin;

/* Traduce los errores de Postgres a algo que una persona pueda leer.
   Las excepciones que lanzamos a propósito en el SQL ya vienen escritas en
   español: esas se muestran tal cual. */
export function mensajeDeError(error) {
  if (!error) return 'Algo salió mal. Inténtalo de nuevo.';
  const m = error.message || String(error);

  if (/duplicate key|already registered|User already registered/i.test(m)) {
    return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  }
  if (/Invalid login credentials/i.test(m)) {
    return 'Correo o contraseña incorrectos.';
  }
  if (/Email not confirmed/i.test(m)) {
    return 'Confirma tu correo con el link que te enviamos.';
  }
  if (/Password should be at least/i.test(m)) {
    return 'La contraseña necesita al menos 8 caracteres.';
  }
  if (/row-level security|violates row-level/i.test(m)) {
    return 'No tienes permiso para hacer eso.';
  }
  if (/Failed to fetch|NetworkError/i.test(m)) {
    return 'No hay conexión con el servidor. Revisa tu internet.';
  }
  return m;
}
