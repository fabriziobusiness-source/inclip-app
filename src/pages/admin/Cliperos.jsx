import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, mensajeDeError } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { useToast } from '../../components/ui/Toast';
import { fecha, dominioDe } from '../../lib/formato';
import { ESTADOS_CLIPERO } from '../../lib/estados';

import { Encabezado } from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import StarRating from '../../components/ui/StarRating';
import { BadgeEstadoClipero } from '../../components/ui/Badge';
import Aviso from '../../components/ui/Aviso';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonFilas } from '../../components/ui/Skeleton';

const FILTROS = [
  { valor: 'en_revision', etiqueta: 'Por revisar' },
  { valor: 'aprobado', etiqueta: 'Aprobados' },
  { valor: 'pendiente', etiqueta: 'Perfil incompleto' },
  { valor: 'pausado', etiqueta: 'Pausados' },
  { valor: '', etiqueta: 'Todos' },
];

export default function Cliperos() {
  const toast = useToast();
  const [filtro, setFiltro] = useState('en_revision');
  const [ocupado, setOcupado] = useState(null);

  const { datos, cargando, error, recargar } = useDatos(
    () =>
      supabase
        .from('cliperos')
        .select('*, perfiles(nombre, foto_url, ciudad, descripcion, handle_redes, creado_en), portafolio(id)')
        .order('creado_en', { ascending: false }),
    []
  );

  const lista = (datos || []).filter((c) => !filtro || c.estado === filtro);

  async function cambiarEstado(perfilId, estado) {
    setOcupado(perfilId);
    try {
      const { error: err } = await supabase.rpc('admin_estado_clipero', {
        p_clipero: perfilId,
        p_estado: estado,
      });
      if (err) throw err;
      toast.exito(`Clipero marcado como ${ESTADOS_CLIPERO[estado].etiqueta.toLowerCase()}.`);
      await recargar();
    } catch (err) {
      toast.error(mensajeDeError(err));
    } finally {
      setOcupado(null);
    }
  }

  const porRevisar = (datos || []).filter((c) => c.estado === 'en_revision').length;

  return (
    <>
      <Encabezado
        titulo="Cliperos"
        bajada="Aprobar es lo que hace que del otro lado sepan que hay alguien real. Mira su portafolio antes de decidir."
      />

      {porRevisar > 0 && filtro !== 'en_revision' && (
        <Aviso tipo="warn" className="mb-4">
          Tienes {porRevisar} clipero{porRevisar === 1 ? '' : 's'} esperando revisión.{' '}
          <button type="button" onClick={() => setFiltro('en_revision')} className="font-medium text-cy hover:underline">
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
        <EmptyState titulo="Nada por aquí" mensaje="No hay cliperos en este estado." />
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
                      <BadgeEstadoClipero estado={c.estado} />
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
                        className="mt-1.5 block text-[12.5px] text-cy hover:underline"
                      >
                        Portafolio externo · {dominioDe(c.link_portafolio)}
                      </a>
                    )}
                  </div>

                  <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:flex-col">
                    <Button variante="ghost" tamano="sm" to={`/clipero/perfil/${c.perfil_id}`}>
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
    </>
  );
}
