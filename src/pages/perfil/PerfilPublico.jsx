import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { fecha, dominioDe } from '../../lib/formato';
import { ESPECIALIDADES, REGLAS } from '../../config';

import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import StarRating from '../../components/ui/StarRating';
import { BadgeAcento, BadgeEstadoEditor } from '../../components/ui/Badge';
import { SelloVerificado, SelloIA, ChipModalidad } from '../../components/Distintivos';
import Aviso from '../../components/ui/Aviso';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonFilas, SkeletonEncabezado } from '../../components/ui/Skeleton';

/* Perfil público del editor. Se abre desde cualquier oferta.
   Es la pantalla con la que el cliente decide, así que lo primero
   que se ve son las tres cosas que pesan: calificación, trabajos
   completados y puntualidad. */

export default function PerfilPublico() {
  const { id } = useParams();
  const navegar = useNavigate();

  const { datos, cargando, error } = useDatos(async () => {
    const [ficha, resenas] = await Promise.all([
      supabase
        .from('editores')
        .select('*, perfiles(nombre, foto_url, descripcion, ciudad, pais, handle_redes, creado_en), portafolio(*)')
        .eq('perfil_id', id)
        .maybeSingle(),
      // Solo llegan las calificaciones ya destapadas: la regla anti-represalia
      // vive en la política RLS, no en este filtro.
      supabase
        .from('calificaciones')
        .select('*, autor:perfiles!calificaciones_de_perfil_id_fkey(nombre, foto_url)')
        .eq('para_perfil_id', id)
        .order('creado_en', { ascending: false })
        .limit(10),
    ]);

    if (ficha.error) return { data: null, error: ficha.error };
    return { data: { ficha: ficha.data, resenas: resenas.data || [] }, error: null };
  }, [id]);

  if (cargando) {
    return (
      <>
        <div className="skeleton mb-5 h-24 w-full rounded-2xl" />
        <SkeletonFilas cantidad={3} />
      </>
    );
  }

  const c = datos?.ficha;
  if (error || !c) {
    return (
      <EmptyState
        titulo="No encontramos ese perfil"
        mensaje={error || 'Puede que la cuenta ya no exista.'}
        accion="Volver"
        accionOnClick={() => navegar(-1)}
      />
    );
  }

  const p = c.perfiles;
  const piezas = [...(c.portafolio || [])].sort((a, b) => a.orden - b.orden);
  const resenas = datos.resenas;

  const puntual =
    c.trabajos_completados > 0 ? Math.round((c.entregas_a_tiempo / c.trabajos_completados) * 100) : null;

  const especialidad = ESPECIALIDADES.find((e) => e.valor === c.especialidad)?.etiqueta;

  return (
    <>
      <button
        type="button"
        onClick={() => navegar(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-mut hover:text-paper"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Volver
      </button>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="space-y-4">
          {/* ── Cabecera ── */}
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start gap-5">
              <Avatar url={p?.foto_url} nombre={p?.nombre} tamano="xl" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[24px] font-bold leading-tight tight">{p?.nombre || 'Editor'}</h1>
                  {c.verificado && <SelloVerificado tamano={20} />}
                </div>

                {c.verificado && (
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                    Confirmamos en videollamada que edita él mismo y no terceriza el trabajo.
                  </p>
                )}

                <p className="mt-1 text-[13.5px] text-mut">
                  {[p?.ciudad, p?.pais].filter(Boolean).join(', ') || 'Ubicación no indicada'}
                  {p?.handle_redes ? ` · ${p.handle_redes}` : ''}
                </p>

                <div className="mt-3">
                  <StarRating valor={c.calificacion_promedio} total={c.total_calificaciones} tamano={17} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(c.modalidades || []).map((m) => (
                    <ChipModalidad key={m} valor={m} conApodo />
                  ))}
                  {especialidad && <BadgeAcento>{especialidad}</BadgeAcento>}
                  {c.certificado_ia && <SelloIA />}
                  {c.estado === 'aprobado' && <BadgeEstadoEditor estado="aprobado" />}
                </div>
              </div>
            </div>

            {p?.descripcion && (
              <p className="mt-5 whitespace-pre-wrap border-t border-line pt-5 text-[13.5px] leading-relaxed text-mut">
                {p.descripcion}
              </p>
            )}
          </Card>

          {/* ── Portafolio ── */}
          <Card className="p-5">
            <h2 className="mb-4 text-[15px] font-semibold tight">Portafolio</h2>

            {piezas.length === 0 ? (
              <EmptyState
                variante="plano"
                titulo="Todavía no subió piezas"
                mensaje={
                  c.link_portafolio
                    ? 'No cargó clips en Inclip, pero dejó un portafolio externo con su trabajo.'
                    : 'Aún no cargó clips aquí. Mira sus calificaciones y su historial para decidir, o pregúntale por su trabajo antes de aceptar su oferta.'
                }
                accion={c.link_portafolio ? 'Ver portafolio externo' : undefined}
                accionHref={c.link_portafolio || undefined}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {piezas.map((pieza) => (
                  <a
                    key={pieza.id}
                    href={pieza.url_externa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-xl border border-line bg-surf2 transition-colors hover:border-cy/40"
                  >
                    {pieza.miniatura_url ? (
                      <img
                        src={pieza.miniatura_url}
                        alt={pieza.titulo}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[9/16] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[9/16] items-center justify-center px-3 text-center text-[12px] text-mut">
                        {dominioDe(pieza.url_externa)}
                      </div>
                    )}
                    <p className="truncate px-2.5 py-2 text-[12.5px]">{pieza.titulo}</p>
                  </a>
                ))}
              </div>
            )}
          </Card>

          {/* ── Reseñas ── */}
          <Card className="p-5">
            <h2 className="mb-4 text-[15px] font-semibold tight">Reseñas</h2>

            {resenas.length === 0 ? (
              <EmptyState
                variante="plano"
                titulo="Todavía sin reseñas visibles"
                mensaje={`Las calificaciones se destapan cuando ambas partes califican o pasan ${REGLAS.DIAS_HASTA_DESTAPAR_CALIFICACION} días. Así nadie escribe pensando en la represalia. Si tiene trabajos cerrados, aquí van a aparecer.`}
              />
            ) : (
              <div className="space-y-3">
                {resenas.map((r) => (
                  <div key={r.id} className="rounded-xl border border-line bg-paper/[0.02] p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar url={r.autor?.foto_url} nombre={r.autor?.nombre} tamano="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium">{r.autor?.nombre || 'Cliente'}</p>
                        <p className="text-[11.5px] text-mut">{fecha(r.creado_en)}</p>
                      </div>
                      <StarRating valor={r.estrellas} tamano={13} />
                    </div>
                    {r.comentario && (
                      <p className="mt-3 text-[13px] leading-relaxed text-mut">{r.comentario}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Métricas ── */}
        <div className="space-y-4 lg:sticky lg:top-8">
          <Card className="p-5">
            <h2 className="mb-4 text-[15px] font-semibold tight">Su historial</h2>

            <dl className="space-y-4">
              <div>
                <dt className="text-[12px] uppercase tracking-wide text-mut">Trabajos completados</dt>
                <dd className="num mt-0.5 text-[26px] font-extrabold leading-none tight">
                  {c.trabajos_completados ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] uppercase tracking-wide text-mut">Entregas a tiempo</dt>
                <dd className="num mt-0.5 text-[26px] font-extrabold leading-none tight">
                  {puntual === null ? '-' : `${puntual}%`}
                </dd>
                {puntual === null && (
                  <p className="mt-1 text-[12px] text-mut">Sin trabajos cerrados todavía</p>
                )}
              </div>
              <div>
                <dt className="text-[12px] uppercase tracking-wide text-mut">Calificaciones</dt>
                <dd className="num mt-0.5 text-[26px] font-extrabold leading-none tight">
                  {c.total_calificaciones ?? 0}
                </dd>
              </div>
            </dl>

            {c.herramientas_ia && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-[12px] uppercase tracking-wide text-mut">Herramientas de IA</p>
                <p className="mt-1.5 text-[13px] leading-relaxed">{c.herramientas_ia}</p>
              </div>
            )}

            {c.link_portafolio && piezas.length > 0 && (
              <Button variante="ghost" tamano="sm" className="mt-5 w-full" href={c.link_portafolio}>
                Portafolio externo
              </Button>
            )}

            <p className="mt-5 border-t border-line pt-4 text-[12px] text-mut">
              En Inclip desde {fecha(p?.creado_en)}
            </p>
          </Card>

          {c.trabajos_completados === 0 && (
            <Aviso tipo="info">
              Es su primer trabajo en Inclip. Todavía no tiene historial, pero su portafolio sí muestra lo que
              sabe hacer.
            </Aviso>
          )}
        </div>
      </div>
    </>
  );
}
