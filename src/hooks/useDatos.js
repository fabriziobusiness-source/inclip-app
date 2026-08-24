import { useCallback, useEffect, useRef, useState } from 'react';
import { mensajeDeError } from '../lib/supabase';

/**
 * Envuelve una consulta a Supabase con los tres estados que toda pantalla
 * necesita: cargando, error y datos. Evita repetir el mismo useEffect con
 * el mismo try/catch en cada página.
 *
 * `consulta` debe devolver { data, error } — la forma que ya usa supabase-js.
 */
export function useDatos(consulta, deps = []) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const montado = useRef(true);

  const ejecutar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const { data, error: err } = await consulta();
      if (!montado.current) return;
      if (err) throw err;
      setDatos(data);
    } catch (e) {
      if (montado.current) setError(mensajeDeError(e));
    } finally {
      if (montado.current) setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    montado.current = true;
    ejecutar();
    return () => {
      montado.current = false;
    };
  }, [ejecutar]);

  return { datos, cargando, error, recargar: ejecutar, setDatos };
}
