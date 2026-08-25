import { supabase } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { dinero, numero } from '../../lib/formato';
import { ESTADOS_TRABAJO, ESTADOS_EDITOR } from '../../lib/estados';
import { COMISION } from '../../config';

import { Encabezado } from '../../components/Layout';
import Card from '../../components/ui/Card';
import Aviso from '../../components/ui/Aviso';
import Skeleton from '../../components/ui/Skeleton';

function Cifra({ etiqueta, valor, detalle, acento = false }) {
  return (
    <Card className="p-5">
      <p className="text-[11.5px] uppercase tracking-wide text-mut">{etiqueta}</p>
      <p className={`num mt-1.5 text-[28px] font-extrabold leading-none tight ${acento ? 'text-cy' : 'text-paper'}`}>
        {valor}
      </p>
      {detalle && <p className="mt-2 text-[12.5px] text-mut">{detalle}</p>}
    </Card>
  );
}

/* Las cifras salen de admin_metricas(), una sola consulta en el servidor.
   Traer todas las tablas al navegador para contarlas aquí sería lento y,
   con RLS de por medio, además incorrecto. */

export default function Metricas() {
  const { datos, cargando, error } = useDatos(() => supabase.rpc('admin_metricas'), []);

  const m = datos || {};
  const porEstado = m.trabajos_por_estado || {};
  const editores = m.editores_por_estado || {};
  const totalTrabajos = Object.values(porEstado).reduce((a, b) => a + Number(b), 0);

  return (
    <>
      <Encabezado titulo="Métricas" bajada="El estado real de la plataforma, sin cifras inventadas." />

      {error && <Aviso tipo="error" className="mb-4">{error}</Aviso>}

      {cargando ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Cifra etiqueta="Trabajos publicados" valor={numero(totalTrabajos)} acento />
            <Cifra
              etiqueta="Clips entregados"
              valor={numero(m.clips_entregados || 0)}
              detalle="De trabajos completados"
            />
            <Cifra
              etiqueta="Precio promedio por clip"
              valor={dinero(m.precio_clip_promedio || 0)}
              detalle="Sobre precios ya acordados"
            />
            <Cifra
              etiqueta="Entregas a tiempo"
              valor={`${m.entregas_a_tiempo_pct ?? 0}%`}
              detalle="Sobre trabajos completados"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Cifra etiqueta="Editores aprobados" valor={numero(editores.aprobado || 0)} />
            <Cifra
              etiqueta="Esperando revisión"
              valor={numero(editores.en_revision || 0)}
              detalle={editores.en_revision ? 'Tienes editores por aprobar' : 'Nada pendiente'}
            />
            <Cifra etiqueta="Emprendedores" valor={numero(m.clientes || 0)} />
            <Cifra
              etiqueta="Retiros pendientes"
              valor={numero(m.retiros_pendientes || 0)}
              detalle={m.retiros_pendientes ? 'Hay transferencias por hacer' : 'Nada pendiente'}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-[15px] font-semibold tight">Trabajos por estado</h2>
              {totalTrabajos === 0 ? (
                <p className="text-[13px] text-mut">Todavía no se publicó ningún trabajo.</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(ESTADOS_TRABAJO).map(([clave, info]) => {
                    const n = Number(porEstado[clave] || 0);
                    if (!n) return null;
                    const pct = Math.round((n / totalTrabajos) * 100);
                    return (
                      <div key={clave}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-[13px]">
                          <span>{info.etiqueta}</span>
                          <span className="num text-mut">
                            {n} · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-paper/[0.06]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: '#FF5A1F',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-[15px] font-semibold tight">Editores por estado</h2>
              <dl className="space-y-2.5 text-[13px]">
                {Object.entries(ESTADOS_EDITOR).map(([clave, info]) => (
                  <div key={clave} className="flex justify-between gap-3">
                    <dt className="text-mut">{info.etiqueta}</dt>
                    <dd className="num">{numero(editores[clave] || 0)}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 border-t border-line pt-4">
                <p className="text-[11.5px] uppercase tracking-wide text-mut">Comisión acumulada</p>
                <p className="num mt-1 text-[22px] font-extrabold leading-none tight text-cy">
                  {dinero(m.comision_acumulada || 0)}
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-mut">
                  {COMISION.PORCENTAJE}% por trabajo completado
                  {COMISION.PRIMER_TRABAJO_GRATIS && ', sin cobrar el primero de cada editor'}.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
