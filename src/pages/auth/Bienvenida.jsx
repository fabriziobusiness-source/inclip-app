import { useState } from 'react';
import { useAuth, tipoGuardado, olvidarTipoGuardado } from '../../hooks/useAuth';
import { supabase, mensajeDeError } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Aviso from '../../components/ui/Aviso';
import MarcoAuth from './MarcoAuth';

/* ══════════════════════════════════════════════════════════════
   PASO 2 del perfilado progresivo: nombre + confirmar rol.
   Dos toques y adentro.

   Si vino de la landing con ?tipo=, el rol llega preseleccionado y
   la persona solo escribe su nombre. No se le vuelve a preguntar
   si edita o publica: ya lo dijo con el clic.
   ══════════════════════════════════════════════════════════════ */

export default function Bienvenida() {
  const { perfil, refrescar } = useAuth();

  /* El rol puede venir de dos sitios: del trigger de la base, que lo sacó de
     los metadatos del signUp con correo, o de sessionStorage, si la persona
     entró con Google y el dato tuvo que esperar el rodeo por accounts.google.
     En los dos casos ya lo dijo con el clic en la landing y no se le vuelve
     a preguntar. */
  const preseleccion = perfil?.rol || tipoGuardado();

  const [nombre, setNombre] = useState(perfil?.nombre || '');
  const [rol, setRol] = useState(preseleccion);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const rolPreseleccionado = Boolean(preseleccion);

  async function enviar(e) {
    e.preventDefault();
    setError('');

    if (!rol) {
      setError('Elige qué vienes a hacer.');
      return;
    }
    if (nombre.trim().length < 2) {
      setError('Escribe tu nombre.');
      return;
    }

    setEnviando(true);
    try {
      const { error: err } = await supabase.rpc('confirmar_perfil', {
        p_nombre: nombre.trim(),
        p_rol: rol,
      });
      if (err) throw err;
      olvidarTipoGuardado(); // Ya está en la base; dejarlo aquí solo puede estorbar.
      await refrescar();
    } catch (err) {
      setError(mensajeDeError(err));
      setEnviando(false);
    }
  }

  return (
    <MarcoAuth
      titulo="¿Cómo te llamamos?"
      bajada={
        rolPreseleccionado
          ? 'Es lo único que necesitamos por ahora. El resto lo completas cuando te sirva.'
          : 'Dos datos y entras.'
      }
    >
      <form onSubmit={enviar} className="space-y-5" noValidate>
        <Input
          etiqueta="Tu nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Camila Rojas"
          autoComplete="name"
          autoFocus
          required
          maxLength={60}
          ayuda="Es el nombre que ve la otra parte. Puedes cambiarlo después."
        />

        {!rolPreseleccionado && (
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-paper">¿Qué vienes a hacer?</legend>
            <div className="grid gap-2">
              {[
                { valor: 'cliente', titulo: 'Necesito clips', detalle: 'Publico trabajos y recibo ofertas' },
                { valor: 'clipero', titulo: 'Edito video', detalle: 'Oferto en trabajos y entrego' },
              ].map((o) => (
                <label
                  key={o.valor}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    rol === o.valor ? 'border-cy/50 bg-cy/[0.06]' : 'border-line bg-paper/[0.02] hover:border-line2'
                  }`}
                >
                  <input
                    type="radio"
                    name="rol"
                    value={o.valor}
                    checked={rol === o.valor}
                    onChange={() => setRol(o.valor)}
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-cy"
                  />
                  <span>
                    <span className="block text-[14px] font-medium">{o.titulo}</span>
                    <span className="mt-0.5 block text-[12.5px] text-mut">{o.detalle}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {rolPreseleccionado && (
          <p className="text-[12.5px] text-mut">
            Entras como{' '}
            <strong className="font-medium text-paper">
              {rol === 'clipero' ? 'clipero' : 'emprendedor'}
            </strong>
            . Si no es lo que querías, escríbenos antes de publicar u ofertar.
          </p>
        )}

        {error && <Aviso tipo="error">{error}</Aviso>}

        <Button type="submit" cargando={enviando} className="w-full">
          Entrar
        </Button>
      </form>
    </MarcoAuth>
  );
}
