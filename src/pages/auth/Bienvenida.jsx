import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
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

  const [nombre, setNombre] = useState(perfil?.nombre || '');
  const [rol, setRol] = useState(perfil?.rol || null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const rolPreseleccionado = Boolean(perfil?.rol);

  async function enviar(e) {
    e.preventDefault();
    setError('');

    // `perfil.rol` es la fuente de verdad cuando ya viene preseleccionado:
    // llega de forma asíncrona después del primer render, así que el estado
    // local `rol` puede quedarse en null aunque el texto de arriba ya diga
    // cuál es tu rol. Se prioriza perfil.rol y se cae a `rol` solo cuando
    // nadie lo preseleccionó y la persona lo eligió a mano en el fieldset.
    const rolFinal = perfil?.rol || rol;

    if (!rolFinal) {
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
        p_rol: rolFinal,
      });
      if (err) throw err;
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
                { valor: 'editor', titulo: 'Edito video', detalle: 'Oferto en trabajos y entrego' },
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
              {perfil?.rol === 'editor' ? 'editor' : 'emprendedor'}
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
