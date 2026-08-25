import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, mensajeDeError } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { useToast } from '../../components/ui/Toast';
import { fecha, dominioDe } from '../../lib/formato';
import { ESTADOS_EDITOR } from '../../lib/estados';

import { Encabezado } from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import StarRating from '../../components/ui/StarRating';
import { BadgeEstadoEditor } from '../../components/ui/Badge';
import Aviso from '../../components/ui/Aviso';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonFilas } from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import { Textarea, Checkbox } from '../../components/ui/Input';
import { SelloVerificado, SelloIA, ChipModalidad } from '../../components/Distintivos';

/* Dos colas distintas que conviven en esta pantalla:
   · APROBAR deja ofertar. Es el filtro de entrada.
   · VERIFICAR pone el check, y sale de una videollamada por WhatsApp.
   No son lo mismo y no dependen una de otra. */
const FILTROS = [
  { valor: 'verificacion', etiqueta: 'Piden verificación' },
  { valor: 'en_revision', etiqueta: 'Por aprobar' },
  { valor: 'aprobado', etiqueta: 'Aprobados' },
  { valor: 'pendiente', etiqueta: 'Perfil incompleto' },
  { valor: 'pausado', etiqueta: 'Pausados' },
  { valor: '', etiqueta: 'Todos' },
];

export default function Editores() {
  const toast = useToast();
  const [filtro, setFiltro] = useState('verificacion');
  const [ocupado, setOcupado] = useState(null);
  const [verificando, setVerificando] = useState(null);

  const { datos, cargando, error, recargar } = useDatos(
    () =>
      supabase
        .from('editores')
        .select('*, perfiles(nombre, foto_url, ciudad, descripcion, handle_redes, creado_en), portafolio(id)')
        .order('creado_en', { ascending: false }),
    []
  );

  const lista = (datos || []).filter((c) => {
    if (!filtro) return true;
    if (filtro === 'verificacion') return c.estado_verificacion === 'solicitada';
    return c.estado === filtro;
  });

  async function cambiarEstado(perfilId, estado) {
    setOcupado(perfilId);
    try {
      const { error: err } = await supabase.rpc('admin_estado_editor', {
        p_editor: perfilId,
        p_estado: estado,
      });
      if (err) throw err;
      toast.exito(`Editor marcado como ${ESTADOS_EDITOR[estado].etiqueta.toLowerCase()}.`);
      await recargar();
    } catch (err) {
      toast.error(mensajeDeError(err));
    } finally {
      setOcupado(null);
    }
  }

  const porRevisar = (datos || []).filter((c) => c.estado === 'en_revision').length;
  const pidenVerificacion = (datos || []).filter((c) => c.estado_verificacion === 'solicitada').length;

  return (
    <>
      <Encabezado
        titulo="Editores"
        bajada="Aprobar es lo que hace que del otro lado sepan que hay alguien real. Mira su portafolio antes de decidir."
      />

      {pidenVerificacion > 0 && filtro !== 'verificacion' && (
        <Aviso tipo="warn" className="mb-4">
          {pidenVerificacion} editor{pidenVerificacion === 1 ? '' : 'es'}{' '}
          {pidenVerificacion === 1 ? 'pide' : 'piden'} verificación. Cada uno espera tu videollamada.{' '}
          <button type="button" onClick={() => setFiltro('verificacion')} className="font-bold text-flame hover:underline">
            Ver
          </button>
        </Aviso>
      )}

      {porRevisar > 0 && filtro !== 'en_revision' && (
        <Aviso tipo="warn" className="mb-4">
          Tienes {porRevisar} editor{porRevisar === 1 ? '' : 'es'} esperando aprobación para poder ofertar.{' '}
          <button type="button" onClick={() => setFiltro('en_revision')} className="font-bold text-flame hover:underline">
            Ver
          </button>
        </Aviso>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor || 'todos'}
            type="button"
            onClick={() => setFiltro(f.valor)}
            aria-pressed={filtro === f.valor}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
              filtro === f.valor
                ? 'border-cy/45 bg-cy/[0.09] text-cy'
                : 'border-line bg-paper/[0.02] text-mut hover:border-line2 hover:text-paper'
            }`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {error && <Aviso tipo="error" className="mb-4">{error}</Aviso>}

      {cargando ? (
        <SkeletonFilas cantidad={4} />
      ) : lista.length === 0 ? (
        <EmptyState titulo="Nada por aquí" mensaje="No hay editores en este estado." />
      ) : (
        <div className="space-y-2">
          {lista.map((c) => {
            const p = c.perfiles;
            const puntual =
              c.trabajos_completados > 0
                ? Math.round((c.entregas_a_tiempo / c.trabajos_completados) * 100)
                : null;

            return (
              <Card key={c.perfil_id} className="p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar url={p?.foto_url} nombre={p?.nombre} tamano="md" />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[14.5px] font-semibold">{p?.nombre || 'Sin nombre'}</p>
                      {c.verificado && <SelloVerificado tamano={15} />}
                      <BadgeEstadoEditor estado={c.estado} />
                      {c.certificado_ia && <SelloIA />}
                      {(c.modalidades || []).map((m) => (
                        <ChipModalidad key={m} valor={m} conApodo />
                      ))}
                    </div>

                    <p className="mt-1 text-[12.5px] text-mut">
                      {[p?.ciudad, p?.handle_redes].filter(Boolean).join(' · ') || 'Sin datos'} · registrado{' '}
                      {fecha(p?.creado_en)}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-mut">
                      <StarRating valor={c.calificacion_promedio} total={c.total_calificaciones} tamano={13} />
                      <span>{c.trabajos_completados} completados</span>
                      {puntual !== null && <span>{puntual}% a tiempo</span>}
                      <span>{c.portafolio?.length ?? 0} piezas</span>
                      <span>capacidad {c.capacidad_semanal}</span>
                    </div>

                    {c.especialidad && (
                      <p className="mt-1.5 text-[12.5px] text-mut">
                        {c.especialidad}
                        {c.herramientas_ia ? ` · ${c.herramientas_ia}` : ''}
                      </p>
                    )}

                    {c.link_portafolio && (
                      <a
                        href={c.link_portafolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 block text-[12.5px] text-flame hover:underline"
                      >
                        Portafolio externo · {dominioDe(c.link_portafolio)}
                      </a>
                    )}

                    {/* Solicitud de verificación pendiente: el WhatsApp es lo
                        único que necesitas para arrancar la llamada. */}
                    {c.estado_verificacion === 'solicitada' && (
                      <div className="mt-3 border border-flame/35 bg-flame/[0.08] px-3 py-2.5">
                        <p className="text-[12.5px] font-bold text-flame">
                          Pide verificación · solicitó {fecha(c.solicitada_en)}
                        </p>
                        {c.whatsapp && (
                          <a
                            href={`https://wa.me/${String(c.whatsapp).replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="num mt-1 block text-[12.5px] text-paper hover:underline"
                          >
                            {c.whatsapp} · abrir WhatsApp
                          </a>
                        )}
                      </div>
                    )}

                    {c.estado_verificacion === 'rechazada' && (
                      <p className="mt-2 text-[12.5px] text-muted">
                        Verificación rechazada {fecha(c.resuelta_en)}
                        {c.nota_verificacion ? `: ${c.nota_verificacion}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:flex-col">
                    <Button variante="ghost" tamano="sm" to={`/editor/perfil/${c.perfil_id}`}>
                      Ver perfil
                    </Button>

                    {c.estado !== 'aprobado' && (
                      <Button
                        tamano="sm"
                        cargando={ocupado === c.perfil_id}
                        disabled={Boolean(ocupado)}
                        onClick={() => cambiarEstado(c.perfil_id, 'aprobado')}
                      >
                        Aprobar
                      </Button>
                    )}

                    {(c.estado_verificacion === 'solicitada' || c.verificado) && (
                      <Button
                        variante={c.verificado ? 'ghost' : 'primary'}
                        tamano="sm"
                        disabled={Boolean(ocupado)}
                        onClick={() => setVerificando(c)}
                      >
                        {c.verificado ? 'Editar check' : 'Resolver check'}
                      </Button>
                    )}

                    {c.estado === 'aprobado' && (
                      <Button
                        variante="danger"
                        tamano="sm"
                        cargando={ocupado === c.perfil_id}
                        disabled={Boolean(ocupado)}
                        onClick={() => cambiarEstado(c.perfil_id, 'pausado')}
                      >
                        Pausar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ModalVerificar
        editor={verificando}
        onCerrar={() => setVerificando(null)}
        onListo={recargar}
      />
    </>
  );
}

/* ── Resolver la verificación ───────────────────────────────────
   Se abre DESPUÉS de la videollamada, no antes. Los dos distintivos
   salen de la misma llamada pero se dan por separado: alguien puede
   ser quien dice ser sin dominar IA.                               */
function ModalVerificar({ editor, onCerrar, onListo }) {
  const toast = useToast();
  const [verificado, setVerificado] = useState(true);
  const [certificadoIa, setCertificadoIa] = useState(false);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  // Cada vez que se abre con otro editor, arranca desde su estado real.
  const [ultimoId, setUltimoId] = useState(null);
  if (editor && editor.perfil_id !== ultimoId) {
    setUltimoId(editor.perfil_id);
    setVerificado(editor.verificado ?? true);
    setCertificadoIa(editor.certificado_ia ?? false);
    setNota(editor.nota_verificacion || '');
    setError('');
  }

  async function enviar(e) {
    e.preventDefault();
    setError('');

    if (!verificado && nota.trim().length < 5) {
      setError('Si rechazas, explica por qué: el editor lo va a leer en su perfil.');
      return;
    }

    setEnviando(true);
    try {
      const { error: err } = await supabase.rpc('admin_resolver_verificacion', {
        p_editor: editor.perfil_id,
        p_verificado: verificado,
        p_certificado_ia: certificadoIa,
        p_nota: nota.trim() || null,
      });
      if (err) throw err;
      toast.exito(verificado ? 'Editor verificado.' : 'Verificación rechazada.');
      onListo();
      onCerrar();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto={Boolean(editor)}
      onCerrar={onCerrar}
      titulo={`Verificación de ${editor?.perfiles?.nombre || 'este editor'}`}
      descripcion="Resuélvelo después de la videollamada, no antes."
    >
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Checkbox
          etiqueta="Confirmo que es quien dice ser y que edita él mismo"
          ayuda="Es lo único que promete el check. Si terceriza sin decirlo, no se verifica."
          checked={verificado}
          onChange={(e) => setVerificado(e.target.checked)}
        />

        <Checkbox
          etiqueta="Domina herramientas de IA en su flujo"
          ayuda="Distintivo aparte. Solo se puede dar junto con la verificación."
          checked={certificadoIa}
          disabled={!verificado}
          onChange={(e) => setCertificadoIa(e.target.checked)}
        />

        <Textarea
          etiqueta="Nota para el editor"
          rows={3}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder={
            verificado
              ? 'Todo bien en la llamada.'
              : 'No pudimos confirmar que edites tú. Podemos repetir la llamada cuando quieras.'
          }
          ayuda={verificado ? 'Opcional.' : 'Obligatoria al rechazar: la lee en su perfil.'}
        />

        {error && <Aviso tipo="error">{error}</Aviso>}

        <div className="flex gap-2">
          <Button type="button" variante="ghost" className="flex-1" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" cargando={enviando}>
            {verificado ? 'Dar el check' : 'Rechazar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
