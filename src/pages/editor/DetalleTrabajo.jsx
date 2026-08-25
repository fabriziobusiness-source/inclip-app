import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase, mensajeDeError } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { useToast } from '../../components/ui/Toast';
import { dinero, dineroUnitario, fecha, textoPlazo, dominioDe } from '../../lib/formato';
import { REGLAS, COMISION, TIPOS_TRABAJO } from '../../config';

import { Encabezado } from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { BadgeInfo } from '../../components/ui/Badge';
import PriceDisplay from '../../components/ui/PriceDisplay';
import Modal from '../../components/ui/Modal';
import Input, { Textarea } from '../../components/ui/Input';
import Aviso from '../../components/ui/Aviso';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonFilas } from '../../components/ui/Skeleton';
import { BadgeEstadoPostulacion } from '../../components/ui/Badge';

/* ══════════════════════════════════════════════════════════════
   La pantalla que define la app.

   Dos botones, no un formulario:
     · "Aceptar precio"       → se postula al precio publicado
     · "Hacer contraoferta"   → escribe SU precio por clip, y mientras
                                escribe ve en vivo cuánto cobraría en total
   ══════════════════════════════════════════════════════════════ */

export default function DetalleTrabajo() {
  const { id } = useParams();
  const { usuario, perfilEditorListo, editor } = useAuth();
  const navegar = useNavigate();
  const toast = useToast();

  const [modal, setModal] = useState(null); // 'aceptar' | 'contraoferta' | 'perfil'
  const [precioClip, setPrecioClip] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [plazo, setPlazo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const { datos: t, cargando, error: errorCarga, recargar } = useDatos(
    () =>
      supabase
        .from('trabajos')
        .select('*, perfiles!trabajos_cliente_id_fkey(nombre, foto_url, tipo_negocio, ciudad), postulaciones(*)')
        .eq('id', id)
        .maybeSingle(),
    [id]
  );

  const miPostulacion = (t?.postulaciones || []).find((p) => p.editor_id === usuario.id);

  // Previsualización en vivo de la contraoferta.
  const precioNum = Math.max(0, parseFloat(precioClip) || 0);
  const totalContra = t && precioNum > 0 ? precioNum * t.cantidad_clips : 0;

  const puedeOfertar = perfilEditorListo && editor?.estado === 'aprobado';

  function abrirOferta(tipo) {
    setError('');
    if (!puedeOfertar) {
      setModal('perfil');
      return;
    }
    setModal(tipo);
  }

  async function enviarOferta(tipo) {
    setError('');
    if (tipo === 'contraoferta' && precioNum <= 0) {
      setError('Escribe tu precio por clip.');
      return;
    }

    setEnviando(true);
    try {
      const { error: err } = await supabase.rpc('postular', {
        p_trabajo: id,
        p_tipo: tipo,
        p_precio_por_clip: tipo === 'contraoferta' ? precioNum : null,
        p_mensaje: mensaje.trim() || null,
        p_plazo_dias: plazo ? parseInt(plazo, 10) : null,
      });
      if (err) throw err;

      toast.exito('Oferta enviada. Te avisamos si el cliente la acepta.');
      setModal(null);
      setPrecioClip('');
      setMensaje('');
      setPlazo('');
      await recargar();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <>
        <div className="skeleton mb-5 h-8 w-64" />
        <SkeletonFilas cantidad={3} />
      </>
    );
  }

  if (errorCarga || !t) {
    return (
      <EmptyState
        titulo="Este trabajo ya no está disponible"
        mensaje="Puede que el cliente lo haya cerrado o que ya se lo hayan asignado a alguien."
        accion="Ver trabajos abiertos"
        accionTo="/editor/trabajos"
      />
    );
  }

  const cliente = t.perfiles;
  const tipoEtiqueta = TIPOS_TRABAJO.find((x) => x.valor === t.tipo)?.etiqueta || t.tipo;
  const cerrado = t.estado !== 'abierto';

  return (
    <>
      <Link to="/editor/trabajos" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-mut hover:text-paper">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Trabajos
      </Link>

      <Encabezado titulo={t.titulo} />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <BadgeInfo>{tipoEtiqueta}</BadgeInfo>
              {t.requiere_publicacion && (
                <BadgeInfo>Incluye publicación</BadgeInfo>
              )}
              {cerrado && <BadgeInfo>Ya no recibe ofertas</BadgeInfo>}
            </div>

            <h2 className="mb-3 text-[15px] font-semibold tight">Lo que pide el cliente</h2>
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-mut">{t.descripcion}</p>

            {t.requiere_publicacion && t.plataformas_publicacion?.length > 0 && (
              <div className="mt-4 rounded-xl border border-line2 bg-paper/[0.03] px-4 py-3">
                <p className="text-[13px] font-medium">Además de entregar, publicas en sus cuentas</p>
                <p className="mt-1 text-[12.5px] text-mut">
                  {t.plataformas_publicacion.join(', ')}. Tendrás que pegar los links de los posts en tu entrega.
                  Tenlo en cuenta al poner tu precio.
                </p>
              </div>
            )}

            {(t.url_material_fuente || t.url_referencias) && (
              <div className="mt-4 space-y-2 border-t border-line pt-4">
                <h3 className="text-[13px] font-medium">Material</h3>
                {t.url_material_fuente ? (
                  <a
                    href={t.url_material_fuente}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[13px] text-cy hover:underline"
                  >
                    Material en bruto · {dominioDe(t.url_material_fuente)}
                  </a>
                ) : (
                  <p className="text-[13px] text-mut">
                    El cliente no dejó link del material. Pídeselo en tu mensaje antes de comprometerte con un plazo.
                  </p>
                )}
                {t.url_referencias && (
                  <a
                    href={t.url_referencias}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[13px] text-cy hover:underline"
                  >
                    Referencias · {dominioDe(t.url_referencias)}
                  </a>
                )}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-[15px] font-semibold tight">Quién publica</h2>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surf2 text-[13px] font-semibold text-mut">
                {(cliente?.nombre || '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{cliente?.nombre || 'Emprendedor'}</p>
                <p className="truncate text-[12.5px] text-mut">
                  {[cliente?.tipo_negocio, cliente?.ciudad].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Panel de oferta ── */}
        <div className="space-y-4 lg:sticky lg:top-8">
          <Card className="p-5">
            <PriceDisplay
              etiqueta="El cliente paga"
              total={t.precio_total}
              cantidadClips={t.cantidad_clips}
              porClip={t.precio_por_clip}
              tamano="lg"
            />

            <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-mut">Fecha límite</dt>
                <dd className="text-right">{fecha(t.fecha_limite)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mut">Plazo</dt>
                <dd className="text-right">{textoPlazo(t.fecha_limite)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mut">Clips</dt>
                <dd className="num text-right">{t.cantidad_clips}</dd>
              </div>
            </dl>

            {miPostulacion ? (
              <div className="mt-5 rounded-xl border border-line bg-paper/[0.02] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium">Tu oferta</span>
                  <BadgeEstadoPostulacion estado={miPostulacion.estado} />
                </div>
                <p className="num mt-2 text-[22px] font-extrabold leading-none tight text-cy">
                  {dinero(miPostulacion.precio_total)}
                </p>
                <p className="num mt-1 text-[12.5px] text-mut">
                  {dineroUnitario(miPostulacion.precio_por_clip)} por clip
                </p>
                {miPostulacion.estado === 'pendiente' && (
                  <p className="mt-3 text-[12.5px] leading-relaxed text-mut">
                    Expira {fecha(miPostulacion.expira_en)} si el cliente no responde. Se permite una sola
                    oferta por trabajo, así que no puedes cambiarla.
                  </p>
                )}
              </div>
            ) : cerrado ? (
              <Aviso tipo="info" className="mt-5">
                Este trabajo ya no recibe ofertas.
              </Aviso>
            ) : (
              <div className="mt-5 space-y-2">
                <Button className="w-full" onClick={() => abrirOferta('aceptar')}>
                  Aceptar precio
                </Button>
                <Button variante="ghost" className="w-full" onClick={() => abrirOferta('contraoferta')}>
                  Hacer contraoferta
                </Button>
                <p className="pt-1 text-center text-[12px] leading-relaxed text-mut">
                  Una oferta por trabajo. Expira a las {REGLAS.HORAS_EXPIRACION_OFERTA} horas si no te responden.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Aceptar el precio publicado ── */}
      <Modal
        abierto={modal === 'aceptar'}
        onCerrar={() => setModal(null)}
        titulo="Aceptar el precio publicado"
        descripcion="Te postulas al precio que puso el cliente."
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-paper/[0.02] px-4 py-4">
            <p className="text-[12.5px] text-mut">Si te eligen cobrarás</p>
            <p className="num mt-1.5 text-[32px] font-extrabold leading-none tight text-cy">
              {dinero(t.precio_total)}
            </p>
            <p className="num mt-1.5 text-[13px] text-mut">
              {dineroUnitario(t.precio_por_clip)} × {t.cantidad_clips} clips
            </p>
          </div>

          <Textarea
            etiqueta="Mensaje para el cliente"
            rows={3}
            maxLength={REGLAS.MAX_CARACTERES_MENSAJE}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Trabajo podcast a diario. Te entrego con subtítulos y reencuadre vertical."
            ayuda={`Opcional · ${mensaje.length}/${REGLAS.MAX_CARACTERES_MENSAJE}`}
          />

          <Input
            etiqueta="¿En cuántos días entregas?"
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            value={plazo}
            onChange={(e) => setPlazo(e.target.value)}
            placeholder="2"
            ayuda="Opcional. Un plazo corto es lo que más te diferencia cuando el precio es el mismo."
          />

          {error && <Aviso tipo="error">{error}</Aviso>}

          <div className="flex gap-2">
            <Button variante="ghost" className="flex-1" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button className="flex-1" cargando={enviando} onClick={() => enviarOferta('acepta_precio')}>
              Enviar oferta
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Contraoferta con previsualización en vivo ── */}
      <Modal
        abierto={modal === 'contraoferta'}
        onCerrar={() => setModal(null)}
        titulo="Hacer contraoferta"
        descripcion="Pon tu precio por clip. Te mostramos cuánto cobrarías en total."
      >
        <div className="space-y-4">
          <Input
            etiqueta="Tu precio por clip"
            type="number"
            inputMode="decimal"
            min={1}
            step="1"
            value={precioClip}
            onChange={(e) => setPrecioClip(e.target.value)}
            placeholder={String(Math.round(t.precio_por_clip))}
            autoFocus
            ayuda={`El cliente publicó ${dineroUnitario(t.precio_por_clip)} por clip.`}
          />

          {/* El bloque que se actualiza mientras escribe. Es el corazón de la
              mecánica: pensar por clip, decidir por total. */}
          <div
            className="rounded-xl border border-line bg-paper/[0.02] px-4 py-4"
            aria-live="polite"
          >
            {precioNum > 0 ? (
              <>
                <p className="text-[12.5px] text-mut">Si aceptan tu oferta cobrarás</p>
                <p className="num mt-1.5 text-[32px] font-extrabold leading-none tight text-cy">
                  {dinero(totalContra)}
                </p>
                <p className="num mt-1.5 text-[13px] text-mut">
                  {dineroUnitario(precioNum)} × {t.cantidad_clips} clips
                </p>
                {totalContra > Number(t.precio_total) && (
                  <p className="num mt-3 text-[12.5px] text-ambar">
                    Estás pidiendo {dinero(totalContra - Number(t.precio_total))} más que su presupuesto.
                  </p>
                )}
                {totalContra < Number(t.precio_total) && (
                  <p className="num mt-3 text-[12.5px] text-verde">
                    Estás pidiendo {dinero(Number(t.precio_total) - totalContra)} menos que su presupuesto.
                  </p>
                )}
              </>
            ) : (
              <p className="text-[13px] text-mut">Escribe tu precio y aquí ves cuánto cobrarías en total.</p>
            )}
          </div>

          <Textarea
            etiqueta="Por qué tu precio"
            rows={3}
            maxLength={REGLAS.MAX_CARACTERES_MENSAJE}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Incluyo subtítulos, reencuadre y limpieza de audio. Entrego en 48 h."
            ayuda={`Opcional, pero sube mucho tus chances · ${mensaje.length}/${REGLAS.MAX_CARACTERES_MENSAJE}`}
          />

          <Input
            etiqueta="¿En cuántos días entregas?"
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            value={plazo}
            onChange={(e) => setPlazo(e.target.value)}
            placeholder="2"
          />

          <Aviso tipo="info">
            Solo puedes ofertar una vez en cada trabajo. Piensa bien tu número antes de enviarlo.
          </Aviso>

          {error && <Aviso tipo="error">{error}</Aviso>}

          <div className="flex gap-2">
            <Button variante="ghost" className="flex-1" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button className="flex-1" cargando={enviando} onClick={() => enviarOferta('contraoferta')}>
              Enviar contraoferta
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Muro del perfilado progresivo ── */}
      <Modal
        abierto={modal === 'perfil'}
        onCerrar={() => setModal(null)}
        titulo={
          editor?.estado === 'en_revision'
            ? 'Tu perfil está en revisión'
            : editor?.estado === 'pausado'
              ? 'Tu cuenta está pausada'
              : 'Completa tu perfil para ofertar'
        }
        descripcion={
          editor?.estado === 'en_revision'
            ? 'Lo revisamos a mano. Te avisamos apenas quede aprobado.'
            : editor?.estado === 'pausado'
              ? 'Escríbenos y lo revisamos contigo.'
              : 'Los clientes eligen viendo tu portafolio y tus calificaciones. Sin eso, tu oferta compite en desventaja.'
        }
      >
        <div className="flex gap-2">
          <Button variante="ghost" className="flex-1" onClick={() => setModal(null)}>
            Seguir mirando
          </Button>
          {editor?.estado !== 'pausado' && (
            <Button className="flex-1" to="/editor/perfil">
              {editor?.estado === 'en_revision' ? 'Ver mi perfil' : 'Completar perfil'}
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
}
