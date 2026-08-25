import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { dinero, dineroUnitario, fecha, tiempoRelativo } from '../../lib/formato';
import { Encabezado } from '../../components/Layout';
import Card from '../../components/ui/Card';
import { BadgeEstadoPostulacion } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Aviso from '../../components/ui/Aviso';
import { SkeletonFilas } from '../../components/ui/Skeleton';

export default function Postulaciones() {
  const { usuario } = useAuth();

  const { datos, cargando, error } = useDatos(async () => {
    await supabase.rpc('expirar_postulaciones');
    return supabase
      .from('postulaciones')
      .select('*, trabajos(id, titulo, estado, cantidad_clips, precio_total, fecha_limite)')
      .eq('editor_id', usuario.id)
      .order('creado_en', { ascending: false });
  }, [usuario.id]);

  const lista = datos || [];

  return (
    <>
      <Encabezado titulo="Mis ofertas" bajada="Todo lo que enviaste, con su estado." />

      {error && <Aviso tipo="error" className="mb-4">{error}</Aviso>}

      {cargando ? (
        <SkeletonFilas cantidad={4} />
      ) : lista.length === 0 ? (
        <EmptyState
          titulo="Todavía no ofertaste"
          mensaje="Mira los trabajos abiertos: el presupuesto está a la vista antes de que decidas nada."
          accion="Ver trabajos disponibles"
          accionTo="/editor/trabajos"
        />
      ) : (
        <div className="space-y-2">
          {lista.map((p) => {
            const t = p.trabajos;
            const ganada = p.estado === 'aceptada';
            return (
              <Card key={p.id} hover={Boolean(t)} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <BadgeEstadoPostulacion estado={p.estado} />
                      {p.tipo === 'contraoferta' && (
                        <span className="text-[12px] text-mut">Contraoferta</span>
                      )}
                    </div>

                    {t ? (
                      <Link
                        to={ganada ? '/editor/mis-trabajos' : `/editor/trabajos/${t.id}`}
                        className="block truncate text-[14.5px] font-semibold hover:text-cy"
                      >
                        {t.titulo}
                      </Link>
                    ) : (
                      <p className="text-[14.5px] font-semibold text-mut">Trabajo no disponible</p>
                    )}

                    <p className="mt-1 text-[12.5px] text-mut">
                      Ofertaste {tiempoRelativo(p.creado_en)}
                      {p.estado === 'pendiente' && ` · expira ${fecha(p.expira_en)}`}
                    </p>

                    {p.mensaje && (
                      <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-mut">{p.mensaje}</p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className={`num text-[20px] font-extrabold leading-none tight ${ganada ? 'text-flame' : 'text-paper'}`}>
                      {dinero(p.precio_total)}
                    </p>
                    <p className="num mt-1 text-[12px] text-mut">{dineroUnitario(p.precio_por_clip)} por clip</p>
                  </div>
                </div>

                {ganada && (
                  <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-flame">
                    Te eligieron. Está en <Link to="/editor/mis-trabajos" className="underline">En curso</Link>.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
