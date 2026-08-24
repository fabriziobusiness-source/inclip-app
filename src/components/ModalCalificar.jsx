import { useState } from 'react';
import { supabase, mensajeDeError } from '../lib/supabase';
import { REGLAS } from '../config';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Textarea } from './ui/Input';
import Aviso from './ui/Aviso';
import { StarPicker } from './ui/StarRating';
import { useToast } from './ui/Toast';

/**
 * Calificación bidireccional. Se explica la regla anti-represalia dentro del
 * propio modal: si el usuario no sabe que su reseña está tapada, se autocensura
 * igual, y toda la mecánica no sirve de nada.
 */
export default function ModalCalificar({ abierto, onCerrar, trabajoId, nombreDestino, onListo }) {
  const toast = useToast();
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (!estrellas) {
      setError('Elige de 1 a 5 estrellas.');
      return;
    }

    setEnviando(true);
    try {
      const { error: err } = await supabase.rpc('calificar', {
        p_trabajo: trabajoId,
        p_estrellas: estrellas,
        p_comentario: comentario.trim() || null,
      });
      if (err) throw err;
      toast.exito('Calificación enviada.');
      onListo?.();
      onCerrar();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={`Califica a ${nombreDestino || 'la otra parte'}`}
      descripcion="Es lo que va a leer la próxima persona que decida trabajar con esta cuenta."
    >
      <form onSubmit={enviar} className="space-y-5" noValidate>
        <div>
          <p className="mb-2 text-[13px] font-medium">¿Cómo te fue?</p>
          <StarPicker valor={estrellas} onChange={setEstrellas} />
        </div>

        <Textarea
          etiqueta="Comentario"
          rows={4}
          maxLength={500}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Qué salió bien, qué mejorarías."
          ayuda="Opcional, pero es lo que de verdad ayuda a la otra persona."
        />

        <Aviso tipo="info">
          Tu calificación queda oculta hasta que ambos califiquen o pasen{' '}
          {REGLAS.DIAS_HASTA_DESTAPAR_CALIFICACION} días. Así nadie escribe pensando en la represalia.
        </Aviso>

        {error && <Aviso tipo="error">{error}</Aviso>}

        <div className="flex gap-2">
          <Button type="button" variante="ghost" onClick={onCerrar} className="flex-1">
            Ahora no
          </Button>
          <Button type="submit" cargando={enviando} className="flex-1">
            Enviar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
