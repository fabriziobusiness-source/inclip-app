import { useState } from 'react';
import { supabase, mensajeDeError } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { useToast } from '../../components/ui/Toast';
import { dinero, fecha } from '../../lib/formato';

import { Encabezado } from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Input';
import { BadgeEstadoRetiro } from '../../components/ui/Badge';
import Aviso from '../../components/ui/Aviso';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonFilas } from '../../components/ui/Skeleton';

/* Marcar un retiro como pagado escribe el movimiento negativo en el libro del
   clipero. Por eso solo se marca DESPUÉS de que la transferencia salió: al
   revés, el saldo mentiría. */

export default function Retiros() {
  const toast = useToast();
  const [filtro, setFiltro] = useState('pendientes');
  const [accion, setAccion] = useState(null);
  const [nota, setNota] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const { datos, cargando, error, recargar } = useDatos(
    () =>
      supabase
        .from('retiros')
        .select('*, cliperos(perfiles(nombre, foto_url))')
        .order('creado_en', { ascending: false }),
    []
  );

  const lista = (datos || []).filter((r) => {
    if (filtro === 'pendientes') return ['solicitado', 'procesando'].includes(r.estado);
    if (filtro === 'pagados') return r.estado === 'pagado';
    return true;
  });

  async function resolver(retiro, estado) {
    setOcupado(true);
    try {
      const { error: err } = await supabase.rpc('admin_resolver_retiro', {
        p_retiro: retiro.id,
        p_estado: estado,
        p_nota: nota.trim() || null,
      });
      if (err) throw err;
      toast.exito(
        estado === 'pagado' ? 'Retiro marcado como pagado y descontado del saldo.' : 'Retiro actualizado.'
      );
      setAccion(null);
      setNota('');
      await recargar();
    } catch (err) {
      toast.error(mensajeDeError(err));
    } finally {
      setOcupado(false);
    }
  }

  const pendientes = (datos || []).filter((r) => ['solicitado', 'procesando'].includes(r.estado));
  const totalPendiente = pendientes.reduce((a, r) => a + Number(r.monto), 0);

  return (
    <>
      <Encabezado
        titulo="Retiros"
        bajada="Haz la transferencia primero y márcala aquí después. Marcar antes deja el saldo mintiendo."
      />

      {pendientes.length > 0 && (
        <Aviso tipo="warn" className="mb-4">
          {pendientes.length} retiro{pendientes.length === 1 ? '' : 's'} por transferir, {dinero(totalPendiente)}{' '}
          en total.
        </Aviso>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { valor: 'pendientes', etiqueta: 'Pendientes' },
          { valor: 'pagados', etiqueta: 'Pagados' },
          { valor: 'todos', etiqueta: 'Todos' },
        ].map((f) => (
          <button
            key={f.valor}
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
        <SkeletonFilas cantidad={3} />
      ) : lista.length === 0 ? (
        <EmptyState titulo="Nada por aquí" mensaje="No hay retiros en este estado." />
      ) : (
        <div className="space-y-2">
          {lista.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <p className="text-[14.5px] font-semibold">{r.cliperos?.perfiles?.nombre || 'Clipero'}</p>
                    <BadgeEstadoRetiro estado={r.estado} />
                  </div>

                  <p className="text-[12.5px] text-mut">
                    {r.metodo} · solicitado {fecha(r.creado_en)}
                    {r.procesado_en && ` · resuelto ${fecha(r.procesado_en)}`}
                  </p>

                  <p className="mt-2 whitespace-pre-wrap rounded-lg border border-line bg-paper/[0.02] px-3 py-2 text-[12.5px] leading-relaxed text-mut">
                    {r.datos_cobro}
                  </p>

                  {r.nota_admin && <p className="mt-2 text-[12.5px] text-mut">Nota: {r.nota_admin}</p>}
                </div>

                <div className="shrink-0 text-right">
                  <p className="num text-[22px] font-extrabold leading-none tight text-cy">{dinero(r.monto)}</p>

                  {['solicitado', 'procesando'].includes(r.estado) && (
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        tamano="sm"
                        onClick={() => setAccion({ retiro: r, estado: 'pagado' })}
                        disabled={ocupado}
                      >
                        Marcar pagado
                      </Button>
                      <Button
                        variante="danger"
                        tamano="sm"
                        onClick={() => setAccion({ retiro: r, estado: 'rechazado' })}
                        disabled={ocupado}
                      >
                        Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        abierto={Boolean(accion)}
        onCerrar={() => {
          setAccion(null);
          setNota('');
        }}
        titulo={accion?.estado === 'pagado' ? '¿Ya hiciste la transferencia?' : 'Rechazar retiro'}
        descripcion={
          accion?.estado === 'pagado'
            ? `Se descuentan ${dinero(accion?.retiro?.monto || 0)} del saldo del clipero. Solo marca esto si el dinero ya salió.`
            : 'El monto vuelve a quedar disponible en su saldo.'
        }
      >
        <div className="space-y-4">
          <Textarea
            etiqueta="Nota para el clipero"
            rows={3}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder={
              accion?.estado === 'pagado'
                ? 'Transferencia enviada el martes, comprobante por WhatsApp.'
                : 'El número de cuenta no coincide con tu nombre.'
            }
            ayuda="Opcional, pero evita que te escriba preguntando."
          />

          <div className="flex gap-2">
            <Button
              variante="ghost"
              className="flex-1"
              onClick={() => {
                setAccion(null);
                setNota('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variante={accion?.estado === 'pagado' ? 'primary' : 'danger'}
              className="flex-1"
              cargando={ocupado}
              onClick={() => resolver(accion.retiro, accion.estado)}
            >
              {accion?.estado === 'pagado' ? 'Sí, ya transferí' : 'Rechazar'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
