import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase, mensajeDeError } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { useToast } from '../../components/ui/Toast';
import { dinero, dineroUnitario, fecha, textoPlazo, dominioDe, normalizarUrl } from '../../lib/formato';
import { infoEstadoTrabajo } from '../../lib/estados';
import { REGLAS } from '../../config';

import { Encabezado } from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { BadgeInfo, BadgeEstadoTrabajo } from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import StarRating from '../../components/ui/StarRating';
import PriceDisplay from '../../components/ui/PriceDisplay';
import Modal from '../../components/ui/Modal';
import Input, { Textarea } from '../../components/ui/Input';
import Aviso from '../../components/ui/Aviso';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonFilas } from '../../components/ui/Skeleton';
import ListaPostulaciones from '../../components/ListaPostulaciones';
import ModalCalificar from '../../components/ModalCalificar';

export default function DetalleTrabajo() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const toast = useToast();

  const [aceptando, setAceptando] = useState(null);
  const [accion, setAccion] = useState(null); // 'ajustes' | 'cancelar' | 'calificar' | 'editar'
  const [comentario, setComentario] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');
  const [edicion, setEdicion] = useState({ precio_total: '', url_material_fuente: '' });

  const { datos, cargando, error, recargar } = useDatos(
    () =>
      supabase
        .from('trabajos')
        .select(
          `*,
           clipero:cliperos!trabajos_clipero_id_fkey(
             perfil_id, calificacion_promedio, total_calificaciones, trabajos_completados,
             perfiles(nombre, foto_url, ciudad)
           ),
           postulaciones(
             *, cliperos(perfil_id, calificacion_promedio, total_calificaciones, trabajos_completados,
                         perfiles(nombre, foto_url, ciudad))
           ),
           entregas(*, revisiones(*)),
           calificaciones(*)`
        )
        .eq('id', id)
        .maybeSingle(),
    [id]
  );

  const t = datos;

  async function aceptarOferta(p) {
    setAceptando(p.id);
    try {
      const { error: err } = await supabase.rpc('aceptar_postulacion', { p_postulacion: p.id });
      if (err) throw err;
      toast.exito(`Oferta aceptada. El precio quedó congelado en ${dinero(p.precio_total)}.`);
      await recargar();
    } catch (err) {
      toast.error(mensajeDeError(err));
    } finally {
      setAceptando(null);
    }
  }

  async function aprobar(entregaId) {
    setOcupado(true);
    try {
      const { error: err } = await supabase.rpc('aprobar_entrega', { p_entrega: entregaId });
      if (err) throw err;
      toast.exito('Trabajo aprobado. El monto pasó al saldo del clipero.');
      await recargar();
      setAccion('calificar');
    } catch (err) {
      toast.error(mensajeDeError(err));
    } finally {
      setOcupado(false);
    }
  }

  async function pedirAjustes(entregaId) {
    setErrorAccion('');
    if (comentario.trim().length < 5) {
      setErrorAccion('Explica qué hay que ajustar.');
      return;
    }
    setOcupado(true);
    try {
      const { error: err } = await supabase.rpc('solicitar_ajustes', {
        p_entrega: entregaId,
        p_comentario: comentario.trim(),
      });
      if (err) throw err;
      toast.exito('Le pedimos los ajustes al clipero.');
      setAccion(null);
      setComentario('');
      await recargar();
    } catch (err) {
      setErrorAccion(mensajeDeError(err));
    } finally {
      setOcupado(false);
    }
  }

  /* Mientras el trabajo sigue abierto, el cliente puede corregir las dos cosas
     que explican casi todas las publicaciones sin ofertas: el precio y la falta
     de material. La política RLS solo permite editar en estado `abierto`, que es
     exactamente hasta donde nadie se comprometió con un precio. */
  function abrirEdicion() {
    setErrorAccion('');
    setEdicion({
      precio_total: String(t.precio_total ?? ''),
      url_material_fuente: t.url_material_fuente || '',
    });
    setAccion('editar');
  }

  async function guardarEdicion() {
    setErrorAccion('');
    const nuevoPrecio = parseFloat(edicion.precio_total);
    if (!nuevoPrecio || nuevoPrecio <= 0) {
      setErrorAccion('Escribe cuánto estás dispuesto a pagar por todo el proyecto.');
      return;
    }
    if (edicion.url_material_fuente.trim() && !normalizarUrl(edicion.url_material_fuente)) {
      setErrorAccion('El link del material no parece una dirección válida.');
      return;
    }

    setOcupado(true);
    try {
      const { error: err } = await supabase
        .from('trabajos')
        .update({
          precio_total: nuevoPrecio,
          url_material_fuente: normalizarUrl(edicion.url_material_fuente),
        })
        .eq('id', id);
      if (err) throw err;
      toast.exito('Trabajo actualizado.');
      setAccion(null);
      await recargar();
    } catch (err) {
      setErrorAccion(mensajeDeError(err));
    } finally {
      setOcupado(false);
    }
  }

  async function cancelar() {
    setOcupado(true);
    try {
      const { error: err } = await supabase.rpc('cancelar_trabajo', { p_trabajo: id });
      if (err) throw err;
      toast.info('Trabajo cerrado.');
      navegar('/cliente/trabajos', { replace: true });
    } catch (err) {
      toast.error(mensajeDeError(err));
      setOcupado(false);
      setAccion(null);
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

  if (error || !t) {
    return (
      <EmptyState
        titulo="No encontramos ese trabajo"
        mensaje={error || 'Puede que lo hayas borrado o que el link esté mal.'}
        accion="Volver a mis trabajos"
        accionTo="/cliente/trabajos"
      />
    );
  }

  const pendientes = (t.postulaciones || []).filter((p) => p.estado === 'pendiente');
  const entregas = [...(t.entregas || [])].sort((a, b) => b.version - a.version);
  const ultimaEntrega = entregas[0];
  const yaCalifique = (t.calificaciones || []).some((c) => c.de_perfil_id === usuario.id);
  const clipero = t.clipero;
  const info = infoEstadoTrabajo(t.estado);

  return (
    <>
      <Link to="/cliente/trabajos" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-mut hover:text-paper">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Mis trabajos
      </Link>

      <Encabezado
        titulo={t.titulo}
        bajada={info.descripcionCliente}
        accion={
          t.estado === 'abierto' ? (
            <div className="flex flex-wrap gap-2">
              <Button variante="ghost" tamano="sm" onClick={abrirEdicion}>
                Ajustar
              </Button>
              <Button variante="danger" tamano="sm" onClick={() => setAccion('cancelar')}>
                Cerrar trabajo
              </Button>
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-4">
          {/* ── Entrega pendiente de revisar ── */}
          {t.estado === 'entregado' && ultimaEntrega && (
            <Card className="border-flame/35 p-5">
              <h2 className="text-[15px] font-semibold tight">Tienes una entrega para revisar</h2>
              <p className="mt-1 text-[13px] text-mut">
                Versión {ultimaEntrega.version} · {fecha(ultimaEntrega.creado_en)}
              </p>

              <div className="mt-4 space-y-3">
                <a
                  href={ultimaEntrega.url_entrega}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper/[0.02] px-4 py-3 transition-colors hover:border-cy/40"
                >
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium">Abrir la carpeta con los clips</span>
                    <span className="block truncate text-[12px] text-mut">{dominioDe(ultimaEntrega.url_entrega)}</span>
                  </span>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-cy" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17L17 7M17 7H8M17 7v9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>

                {ultimaEntrega.nota && (
                  <p className="rounded-xl border border-line bg-paper/[0.02] px-4 py-3 text-[13px] leading-relaxed text-mut">
                    {ultimaEntrega.nota}
                  </p>
                )}

                {ultimaEntrega.links_publicaciones?.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[13px] font-medium">Publicaciones</p>
                    <ul className="space-y-1">
                      {ultimaEntrega.links_publicaciones.map((l) => (
                        <li key={l}>
                          <a
                            href={l}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] text-cy hover:underline"
                          >
                            {l}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={() => aprobar(ultimaEntrega.id)} cargando={ocupado}>
                  Aprobar y liberar pago
                </Button>
                {t.rondas_ajuste < REGLAS.RONDAS_AJUSTE && (
                  <Button variante="ghost" onClick={() => setAccion('ajustes')}>
                    Pedir ajustes
                  </Button>
                )}
              </div>
              <p className="mt-3 text-[12.5px] text-mut">
                {t.rondas_ajuste < REGLAS.RONDAS_AJUSTE
                  ? `Tienes ${REGLAS.RONDAS_AJUSTE} ronda de ajustes. Úsala bien: junta todo lo que quieras cambiar en un solo pedido.`
                  : 'Ya usaste tu ronda de ajustes en este trabajo.'}
              </p>
            </Card>
          )}

          {/* ── Ofertas recibidas ── */}
          {t.estado === 'abierto' && (
            <Card className="p-5">
              <h2 className="mb-4 text-[15px] font-semibold tight">
                Ofertas recibidas{pendientes.length > 0 && <span className="ml-2 text-cy">{pendientes.length}</span>}
              </h2>

              {pendientes.length === 0 ? (
                <EmptyState
                  variante="plano"
                  titulo="Todavía nadie ofertó"
                  mensaje="Los cliperos ven tu trabajo en su listado apenas lo publicas. Si en un día no llega nada, casi siempre es el precio o que falta el link del material."
                  accion={t.url_material_fuente ? 'Ajustar el precio' : 'Agregar el material'}
                  accionOnClick={abrirEdicion}
                />
              ) : (
                <ListaPostulaciones
                  postulaciones={pendientes}
                  presupuesto={t.precio_total}
                  onAceptar={aceptarOferta}
                  aceptando={aceptando}
                />
              )}
            </Card>
          )}

          {/* ── Sin entregas todavía ── */}
          {entregas.length === 0 && ['asignado', 'en_progreso'].includes(t.estado) && (
            <Card className="p-5">
              <h2 className="mb-4 text-[15px] font-semibold tight">Entregas</h2>
              <EmptyState
                variante="plano"
                titulo="Todavía no hay entregas"
                mensaje={`${clipero?.perfiles?.nombre || 'Tu clipero'} está editando. Cuando suba los clips los vas a ver aquí y podrás aprobarlos o pedir ajustes. La fecha límite es el ${fecha(t.fecha_limite)}.`}
                accion={t.url_material_fuente ? 'Revisar el material que enviaste' : undefined}
                accionHref={t.url_material_fuente || undefined}
              />
            </Card>
          )}

          {/* ── Historial de entregas ── */}
          {entregas.length > 0 && t.estado !== 'entregado' && (
            <Card className="p-5">
              <h2 className="mb-4 text-[15px] font-semibold tight">Entregas</h2>
              <div className="space-y-3">
                {entregas.map((e) => (
                  <div key={e.id} className="rounded-xl border border-line bg-paper/[0.02] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[13.5px] font-medium">Versión {e.version}</span>
                      <span className="text-[12px] text-mut">{fecha(e.creado_en)}</span>
                    </div>
                    <a
                      href={e.url_entrega}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block truncate text-[13px] text-cy hover:underline"
                    >
                      {e.url_entrega}
                    </a>
                    {e.nota && <p className="mt-2 text-[13px] leading-relaxed text-mut">{e.nota}</p>}
                    {e.revisiones?.map((r) => (
                      <p
                        key={r.id}
                        className="mt-2 rounded-lg border border-flame/30 bg-flame/[0.07] px-3 py-2 text-[12.5px] leading-relaxed text-mut"
                      >
                        <strong className="text-paper">Ajustes que pediste: </strong>
                        {r.comentario}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Descripción ── */}
          <Card className="p-5">
            <h2 className="mb-3 text-[15px] font-semibold tight">Lo que pediste</h2>
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-mut">{t.descripcion}</p>

            {(t.url_material_fuente || t.url_referencias) && (
              <div className="mt-4 space-y-2 border-t border-line pt-4">
                {t.url_material_fuente && (
                  <a
                    href={t.url_material_fuente}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[13px] text-cy hover:underline"
                  >
                    Material en bruto · {dominioDe(t.url_material_fuente)}
                  </a>
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
        </div>

        {/* ── Columna lateral ── */}
        <div className="space-y-4 lg:sticky lg:top-8">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <BadgeEstadoTrabajo estado={t.estado} />
              {t.requiere_publicacion && (
                <BadgeInfo>Incluye publicación</BadgeInfo>
              )}
            </div>

            <PriceDisplay
              etiqueta={t.precio_acordado ? 'Precio acordado' : 'Tu presupuesto'}
              total={t.precio_acordado || t.precio_total}
              cantidadClips={t.cantidad_clips}
              porClip={t.precio_acordado_clip || t.precio_por_clip}
            />

            {t.precio_acordado && Number(t.precio_acordado) !== Number(t.precio_total) && (
              <p className="num mt-2 text-[12.5px] text-mut">
                Tu presupuesto era {dinero(t.precio_total)}
              </p>
            )}

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
                <dt className="text-mut">Publicado</dt>
                <dd className="text-right">{fecha(t.creado_en)}</dd>
              </div>
              {t.requiere_publicacion && t.plataformas_publicacion?.length > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-mut">Publicar en</dt>
                  <dd className="text-right">{t.plataformas_publicacion.join(', ')}</dd>
                </div>
              )}
              {t.precio_acordado && (
                <div className="flex justify-between gap-3">
                  <dt className="text-mut">Depósito</dt>
                  <dd className={`text-right ${t.deposito_confirmado ? 'text-paper' : 'text-flame'}`}>
                    {t.deposito_confirmado ? 'Confirmado' : 'Pendiente'}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {/* ── Clipero asignado ── */}
          {clipero && (
            <Card className="p-5">
              <h2 className="mb-3 text-[15px] font-semibold tight">Tu clipero</h2>
              <Link to={`/clipero/perfil/${clipero.perfil_id}`} className="flex items-center gap-3">
                <Avatar url={clipero.perfiles?.foto_url} nombre={clipero.perfiles?.nombre} tamano="md" />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold">{clipero.perfiles?.nombre}</p>
                  <StarRating
                    valor={clipero.calificacion_promedio}
                    total={clipero.total_calificaciones}
                    className="mt-0.5"
                  />
                </div>
              </Link>
              <Button variante="ghost" tamano="sm" to={`/clipero/perfil/${clipero.perfil_id}`} className="mt-4 w-full">
                Ver su perfil
              </Button>
            </Card>
          )}

          {/* ── Calificación ── */}
          {t.estado === 'completado' && (
            <Card className="p-5">
              <h2 className="text-[15px] font-semibold tight">Calificación</h2>
              {yaCalifique ? (
                <p className="mt-2 text-[13px] leading-relaxed text-mut">
                  Ya calificaste. Se destapa cuando el clipero también lo haga o pasen{' '}
                  {REGLAS.DIAS_HASTA_DESTAPAR_CALIFICACION} días.
                </p>
              ) : (
                <>
                  <p className="mt-2 text-[13px] leading-relaxed text-mut">
                    Cuenta cómo te fue. Es lo que ayuda al próximo emprendedor a elegir.
                  </p>
                  <Button tamano="sm" className="mt-4 w-full" onClick={() => setAccion('calificar')}>
                    Calificar al clipero
                  </Button>
                </>
              )}
            </Card>
          )}

          {t.estado === 'abierto' && (
            <Aviso tipo="info">
              Las ofertas expiran a las {REGLAS.HORAS_EXPIRACION_OFERTA} horas si no respondes. Si ninguna te
              convence, puedes cerrar el trabajo sin elegir a nadie.
            </Aviso>
          )}
        </div>
      </div>

      {/* ── Modales ── */}
      <Modal
        abierto={accion === 'ajustes'}
        onCerrar={() => {
          setAccion(null);
          setErrorAccion('');
        }}
        titulo="Pedir ajustes"
        descripcion={`Es tu única ronda. Junta todo lo que quieras cambiar en un solo pedido.`}
      >
        <div className="space-y-4">
          <Textarea
            etiqueta="Qué hay que ajustar"
            rows={5}
            maxLength={1000}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Los clips 3 y 7 necesitan otro corte al inicio. Los subtítulos van más arriba."
            autoFocus
          />
          {errorAccion && <Aviso tipo="error">{errorAccion}</Aviso>}
          <div className="flex gap-2">
            <Button variante="ghost" className="flex-1" onClick={() => setAccion(null)}>
              Cancelar
            </Button>
            <Button className="flex-1" cargando={ocupado} onClick={() => pedirAjustes(ultimaEntrega.id)}>
              Enviar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        abierto={accion === 'editar'}
        onCerrar={() => {
          setAccion(null);
          setErrorAccion('');
        }}
        titulo="Ajustar el trabajo"
        descripcion="Puedes cambiarlo mientras siga abierto. Una vez que aceptes una oferta, el precio queda congelado."
      >
        <div className="space-y-4">
          <Input
            etiqueta="Precio total del proyecto"
            type="number"
            inputMode="decimal"
            min={1}
            step="1"
            value={edicion.precio_total}
            onChange={(e) => setEdicion((p) => ({ ...p, precio_total: e.target.value }))}
            requerido
            autoFocus
          />

          <div className="border border-line bg-paper/[0.03] px-4 py-3" aria-live="polite">
            {parseFloat(edicion.precio_total) > 0 ? (
              <p className="num text-[0.875rem] text-muted">
                Queda en{' '}
                <strong className="font-bold text-paper">
                  {dineroUnitario(Math.round((parseFloat(edicion.precio_total) / t.cantidad_clips) * 100) / 100)}
                </strong>{' '}
                por clip, sobre {t.cantidad_clips} clips.
              </p>
            ) : (
              <p className="text-[0.875rem] text-muted">Escribe el total y te decimos cuánto sale cada clip.</p>
            )}
          </div>

          <Input
            etiqueta="Link del material en bruto"
            value={edicion.url_material_fuente}
            onChange={(e) => setEdicion((p) => ({ ...p, url_material_fuente: e.target.value }))}
            placeholder="drive.google.com/…"
            ayuda="Deja el acceso abierto para quien tenga el link. Un trabajo sin material recibe muchas menos ofertas."
          />

          {errorAccion && <Aviso tipo="error">{errorAccion}</Aviso>}

          <div className="flex gap-2">
            <Button variante="ghost" className="flex-1" onClick={() => setAccion(null)}>
              Cancelar
            </Button>
            <Button className="flex-1" cargando={ocupado} onClick={guardarEdicion}>
              Guardar cambios
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        abierto={accion === 'cancelar'}
        onCerrar={() => setAccion(null)}
        titulo="¿Cerrar este trabajo?"
        descripcion="Se rechazan las ofertas que hayas recibido y el trabajo deja de aparecer. No se puede reabrir."
      >
        <div className="flex gap-2">
          <Button variante="ghost" className="flex-1" onClick={() => setAccion(null)}>
            Mejor no
          </Button>
          <Button variante="danger" className="flex-1" cargando={ocupado} onClick={cancelar}>
            Sí, cerrar
          </Button>
        </div>
      </Modal>

      <ModalCalificar
        abierto={accion === 'calificar'}
        onCerrar={() => setAccion(null)}
        trabajoId={t.id}
        nombreDestino={clipero?.perfiles?.nombre}
        onListo={recargar}
      />
    </>
  );
}
