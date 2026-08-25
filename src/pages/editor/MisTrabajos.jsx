import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { dinero, dineroUnitario, fecha, textoPlazo, diasRestantes } from '../../lib/formato';
import { infoEstadoTrabajo, ESTADOS_ACTIVOS } from '../../lib/estados';
import { Encabezado } from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { BadgeInfo, BadgeEstadoTrabajo } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Aviso from '../../components/ui/Aviso';
import { SkeletonFilas } from '../../components/ui/Skeleton';
import ModalCalificar from '../../components/ModalCalificar';

export default function MisTrabajos() {
  const { usuario } = useAuth();
  const [calificando, setCalificando] = useState(null);

  const { datos, cargando, error, recargar } = useDatos(
    () =>
      supabase
        .from('trabajos')
        .select('*, perfiles!trabajos_cliente_id_fkey(nombre), entregas(id, version, estado, revisiones(comentario)), calificaciones(de_perfil_id)')
        .eq('editor_id', usuario.id)
        .order('creado_en', { ascending: false }),
    [usuario.id]
  );

  const lista = datos || [];
  const activos = lista.filter((t) => ESTADOS_ACTIVOS.includes(t.estado));
  const cerrados = lista.filter((t) => !ESTADOS_ACTIVOS.includes(t.estado));

  function Fila({ t }) {
    const info = infoEstadoTrabajo(t.estado);
    const dias = diasRestantes(t.fecha_limite);
    const urgente = dias !== null && dias <= 1;
    const yaCalifique = (t.calificaciones || []).some((c) => c.de_perfil_id === usuario.id);
    const ultimaRevision = (t.entregas || [])
      .flatMap((e) => e.revisiones || [])
      .slice(-1)[0];

    return (
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <BadgeEstadoTrabajo estado={t.estado} />
              {t.requiere_publicacion && (
                <BadgeInfo>Incluye publicación</BadgeInfo>
              )}
            </div>

            <h3 className="truncate text-[15px] font-semibold tight">{t.titulo}</h3>
            <p className="mt-1 text-[12.5px] text-mut">
              {t.perfiles?.nombre || 'Cliente'} · {info.descripcionEditor}
            </p>

            {ESTADOS_ACTIVOS.includes(t.estado) && (
              <p className={`mt-1.5 text-[12.5px] ${urgente ? 'text-flame' : 'text-mut'}`}>
                {textoPlazo(t.fecha_limite)} · entrega {fecha(t.fecha_limite, { corto: true })}
              </p>
            )}

            {t.estado === 'en_ajustes' && ultimaRevision && (
              <p className="mt-2.5 rounded-lg border border-flame/30 bg-flame/[0.07] px-3 py-2 text-[12.5px] leading-relaxed text-mut">
                <strong className="text-paper">Te pidieron: </strong>
                {ultimaRevision.comentario}
              </p>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="num text-[22px] font-extrabold leading-none tight text-cy">
              {dinero(t.precio_acordado || t.precio_total)}
            </p>
            <p className="num mt-1 text-[12px] text-mut">
              {dineroUnitario(t.precio_acordado_clip || t.precio_por_clip)} por clip
            </p>
            {t.comision_monto > 0 && (
              <p className="num mt-1 text-[11.5px] text-mut">
                Recibes {dinero(t.monto_editor)} tras comisión
              </p>
            )}
            {Number(t.comision_monto) === 0 && t.precio_acordado && (
              <p className="mt-1 text-[11.5px] text-paper">Sin comisión</p>
            )}

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {['asignado', 'en_progreso', 'en_ajustes'].includes(t.estado) && (
                <Button tamano="sm" to={`/editor/entregar/${t.id}`}>
                  {t.estado === 'en_ajustes' ? 'Volver a entregar' : 'Entregar'}
                </Button>
              )}
              {t.estado === 'completado' && !yaCalifique && (
                <Button variante="ghost" tamano="sm" onClick={() => setCalificando(t)}>
                  Calificar cliente
                </Button>
              )}
            </div>
          </div>
        </div>

        {t.url_material_fuente && ESTADOS_ACTIVOS.includes(t.estado) && (
          <a
            href={t.url_material_fuente}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block border-t border-line pt-3 text-[13px] text-cy hover:underline"
          >
            Abrir el material en bruto
          </a>
        )}
      </Card>
    );
  }

  return (
    <>
      <Encabezado titulo="Trabajos en curso" bajada="Lo que te asignaron y lo que ya cerraste." />

      {error && <Aviso tipo="error" className="mb-4">{error}</Aviso>}

      {cargando ? (
        <SkeletonFilas cantidad={3} />
      ) : lista.length === 0 ? (
        <EmptyState
          titulo="Todavía no te asignaron nada"
          mensaje="Cuando un cliente acepte una de tus ofertas, el trabajo aparece aquí con el material y la fecha límite."
          accion="Ver trabajos disponibles"
          accionTo="/editor/trabajos"
        />
      ) : (
        <div className="space-y-6">
          {activos.length > 0 && (
            <section>
              <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-mut">
                Activos ({activos.length})
              </h2>
              <div className="space-y-2">
                {activos.map((t) => (
                  <Fila key={t.id} t={t} />
                ))}
              </div>
            </section>
          )}

          {cerrados.length > 0 && (
            <section>
              <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-mut">
                Cerrados ({cerrados.length})
              </h2>
              <div className="space-y-2">
                {cerrados.map((t) => (
                  <Fila key={t.id} t={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <ModalCalificar
        abierto={Boolean(calificando)}
        onCerrar={() => setCalificando(null)}
        trabajoId={calificando?.id}
        nombreDestino={calificando?.perfiles?.nombre}
        onListo={recargar}
      />
    </>
  );
}
