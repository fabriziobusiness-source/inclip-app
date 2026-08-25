import { useState } from 'react';
import { supabase, mensajeDeError } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { useToast } from '../../components/ui/Toast';
import { dinero, dineroUnitario, fecha } from '../../lib/formato';
import { ESTADOS_TRABAJO } from '../../lib/estados';

import { Encabezado } from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { BadgeInfo, BadgeEstadoTrabajo } from '../../components/ui/Badge';
import Aviso from '../../components/ui/Aviso';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonFilas } from '../../components/ui/Skeleton';

/* El depósito del cliente se confirma a mano: en el MVP el dinero se mueve
   por fuera de la app y aquí solo se registra. El modelo de datos ya está
   listo para automatizarlo cuando entre una pasarela. */

export default function Trabajos() {
  const toast = useToast();
  const [filtro, setFiltro] = useState('');
  const [ocupado, setOcupado] = useState(null);

  const { datos, cargando, error, recargar } = useDatos(
    () =>
      supabase
        .from('trabajos')
        .select(
          `*,
           cliente:perfiles!trabajos_cliente_id_fkey(nombre),
           editor:editores!trabajos_editor_id_fkey(perfiles(nombre)),
           postulaciones(id)`
        )
        .order('creado_en', { ascending: false }),
    []
  );

  const lista = (datos || []).filter((t) => !filtro || t.estado === filtro);

  async function marcarDeposito(id, valor) {
    setOcupado(id);
    try {
      const { error: err } = await supabase.rpc('admin_marcar_deposito', { p_trabajo: id, p_valor: valor });
      if (err) throw err;
      toast.exito(valor ? 'Depósito confirmado.' : 'Depósito desmarcado.');
      await recargar();
    } catch (err) {
      toast.error(mensajeDeError(err));
    } finally {
      setOcupado(null);
    }
  }

  const sinDeposito = (datos || []).filter(
    (t) => t.precio_acordado && !t.deposito_confirmado && !['cancelado'].includes(t.estado)
  ).length;

  return (
    <>
      <Encabezado titulo="Trabajos" bajada="Todo lo publicado, con el estado del depósito de cada uno." />

      {sinDeposito > 0 && (
        <Aviso tipo="warn" className="mb-4">
          {sinDeposito} trabajo{sinDeposito === 1 ? '' : 's'} asignado{sinDeposito === 1 ? '' : 's'} sin depósito
          confirmado.
        </Aviso>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFiltro('')}
          aria-pressed={filtro === ''}
          className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
            filtro === ''
              ? 'border-cy/45 bg-cy/[0.09] text-cy'
              : 'border-line bg-paper/[0.02] text-mut hover:border-line2 hover:text-paper'
          }`}
        >
          Todos
        </button>
        {Object.entries(ESTADOS_TRABAJO).map(([clave, info]) => (
          <button
            key={clave}
            type="button"
            onClick={() => setFiltro(clave)}
            aria-pressed={filtro === clave}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
              filtro === clave
                ? 'border-cy/45 bg-cy/[0.09] text-cy'
                : 'border-line bg-paper/[0.02] text-mut hover:border-line2 hover:text-paper'
            }`}
          >
            {info.etiqueta}
          </button>
        ))}
      </div>

      {error && <Aviso tipo="error" className="mb-4">{error}</Aviso>}

      {cargando ? (
        <SkeletonFilas cantidad={5} />
      ) : lista.length === 0 ? (
        <EmptyState titulo="Nada por aquí" mensaje="No hay trabajos en este estado." />
      ) : (
        <div className="space-y-2">
          {lista.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <BadgeEstadoTrabajo estado={t.estado} />
                    {t.requiere_publicacion && (
                      <BadgeInfo>Publicación</BadgeInfo>
                    )}
                    {t.precio_acordado && (
                      <Badge
                        className={
                          t.deposito_confirmado
                            ? 'border-line2 text-muted'
                            : 'border-flame/35 bg-flame/10 text-flame'
                        }
                      >
                        {t.deposito_confirmado ? 'Depósito confirmado' : 'Sin depósito'}
                      </Badge>
                    )}
                  </div>

                  <h3 className="truncate text-[14.5px] font-semibold">{t.titulo}</h3>

                  <p className="mt-1 text-[12.5px] text-mut">
                    {t.cliente?.nombre || 'Cliente'}
                    {t.editor?.perfiles?.nombre ? ` → ${t.editor.perfiles.nombre}` : ''} · publicado{' '}
                    {fecha(t.creado_en)} · límite {fecha(t.fecha_limite)}
                  </p>

                  <p className="mt-1 text-[12.5px] text-mut">
                    {t.cantidad_clips} clips · {(t.postulaciones || []).length} oferta
                    {(t.postulaciones || []).length === 1 ? '' : 's'}
                    {t.comision_monto > 0 && ` · comisión ${dinero(t.comision_monto)} (${t.comision_porcentaje}%)`}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="num text-[20px] font-extrabold leading-none tight text-cy">
                    {dinero(t.precio_acordado || t.precio_total)}
                  </p>
                  <p className="num mt-1 text-[12px] text-mut">
                    {dineroUnitario(t.precio_acordado_clip || t.precio_por_clip)} por clip
                  </p>
                  {t.precio_acordado && Number(t.precio_acordado) !== Number(t.precio_total) && (
                    <p className="num mt-0.5 text-[11.5px] text-mut">
                      presupuesto {dinero(t.precio_total)}
                    </p>
                  )}

                  {t.precio_acordado && (
                    <Button
                      variante={t.deposito_confirmado ? 'ghost' : 'primary'}
                      tamano="sm"
                      className="mt-3"
                      cargando={ocupado === t.id}
                      disabled={Boolean(ocupado)}
                      onClick={() => marcarDeposito(t.id, !t.deposito_confirmado)}
                    >
                      {t.deposito_confirmado ? 'Desmarcar depósito' : 'Confirmar depósito'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
