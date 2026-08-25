import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase, mensajeDeError } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { useToast } from '../../components/ui/Toast';
import { dinero, fecha } from '../../lib/formato';
import { METODOS_COBRO, MARCA } from '../../config';

import { Encabezado } from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Select, Textarea } from '../../components/ui/Input';
import Aviso from '../../components/ui/Aviso';
import EmptyState from '../../components/ui/EmptyState';
import { BadgeEstadoRetiro } from '../../components/ui/Badge';
import { SkeletonFilas } from '../../components/ui/Skeleton';

/* ══════════════════════════════════════════════════════════════
   Escrow modelado en base de datos desde el día uno; la salida
   real del dinero la hace el admin a mano y la marca aquí.

   Las tres cifras dicen cosas distintas y por eso van separadas:
     · Disponible → ya es suyo, puede pedirlo
     · En trámite → ya lo pidió, estamos transfiriendo
     · Retenido   → hay trabajo en curso, todavía no es suyo
   ══════════════════════════════════════════════════════════════ */

export default function Saldo() {
  const { usuario } = useAuth();
  const toast = useToast();

  const [modal, setModal] = useState(false);
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState(METODOS_COBRO[0]);
  const [datosCobro, setDatosCobro] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const { datos, cargando, error: errorCarga, recargar } = useDatos(async () => {
    const [saldo, movimientos, retiros] = await Promise.all([
      supabase.rpc('mi_saldo'),
      supabase
        .from('movimientos')
        .select('*, trabajos(titulo)')
        .eq('perfil_id', usuario.id)
        .order('creado_en', { ascending: false })
        .limit(50),
      supabase
        .from('retiros')
        .select('*')
        .eq('editor_id', usuario.id)
        .order('creado_en', { ascending: false }),
    ]);

    const err = saldo.error || movimientos.error || retiros.error;
    if (err) return { data: null, error: err };

    return {
      data: {
        saldo: saldo.data?.[0] || { disponible: 0, en_tramite: 0, retenido: 0 },
        movimientos: movimientos.data || [],
        retiros: retiros.data || [],
      },
      error: null,
    };
  }, [usuario.id]);

  const s = datos?.saldo || { disponible: 0, en_tramite: 0, retenido: 0 };
  const retirable = Math.max(0, Number(s.disponible) - Number(s.en_tramite));

  async function pedirRetiro(e) {
    e.preventDefault();
    setError('');
    const m = parseFloat(monto);
    if (!m || m <= 0) {
      setError('Escribe cuánto quieres retirar.');
      return;
    }
    if (m > retirable) {
      setError(`Solo tienes ${dinero(retirable)} disponibles.`);
      return;
    }
    if (datosCobro.trim().length < 5) {
      setError('Escribe a qué cuenta te transferimos.');
      return;
    }

    setEnviando(true);
    try {
      const { error: err } = await supabase.rpc('solicitar_retiro', {
        p_monto: m,
        p_metodo: metodo,
        p_datos: datosCobro.trim(),
      });
      if (err) throw err;
      toast.exito('Retiro solicitado. Te transferimos y lo marcamos aquí.');
      setModal(false);
      setMonto('');
      setDatosCobro('');
      await recargar();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Encabezado titulo="Mi saldo" bajada="Lo que ganaste, lo que está en camino y lo que todavía está en curso." />

      {errorCarga && <Aviso tipo="error" className="mb-4">{errorCarga}</Aviso>}

      {cargando ? (
        <SkeletonFilas cantidad={3} />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-[11.5px] uppercase tracking-wide text-mut">Disponible</p>
              <p className="num mt-1.5 text-[30px] font-extrabold leading-none tight text-cy">
                {dinero(retirable)}
              </p>
              <p className="mt-2 text-[12.5px] text-mut">Ya es tuyo. Puedes pedirlo cuando quieras.</p>
            </Card>

            <Card className="p-5">
              <p className="text-[11.5px] uppercase tracking-wide text-mut">En trámite</p>
              <p className="num mt-1.5 text-[30px] font-extrabold leading-none tight text-paper">
                {dinero(s.en_tramite)}
              </p>
              <p className="mt-2 text-[12.5px] text-mut">Ya lo pediste. Estamos transfiriendo.</p>
            </Card>

            <Card className="p-5">
              <p className="text-[11.5px] uppercase tracking-wide text-mut">Retenido</p>
              <p className="num mt-1.5 text-[30px] font-extrabold leading-none tight text-paper">
                {dinero(s.retenido)}
              </p>
              <p className="mt-2 text-[12.5px] text-mut">
                De trabajos en curso. Se libera cuando el cliente aprueba.
              </p>
            </Card>
          </div>

          <div className="mb-6">
            <Button onClick={() => setModal(true)} disabled={retirable <= 0}>
              Solicitar retiro
            </Button>
            {retirable <= 0 && (
              <p className="mt-2 text-[12.5px] text-mut">
                Todavía no tienes saldo disponible. Aparece cuando un cliente aprueba tu entrega.
              </p>
            )}
          </div>

          {/* ── Retiros ── */}
          {datos?.retiros?.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-mut">Retiros</h2>
              <div className="space-y-2">
                {datos.retiros.map((r) => (
                  <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="num text-[16px] font-semibold">{dinero(r.monto)}</p>
                      <p className="mt-0.5 text-[12.5px] text-mut">
                        {r.metodo} · solicitado {fecha(r.creado_en)}
                      </p>
                      {r.nota_admin && <p className="mt-1 text-[12.5px] text-mut">{r.nota_admin}</p>}
                    </div>
                    <BadgeEstadoRetiro estado={r.estado} />
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* ── Movimientos ── */}
          <section>
            <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-mut">Movimientos</h2>
            {datos?.movimientos?.length ? (
              <Card className="divide-y divide-white/[0.06]">
                {datos.movimientos.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px]">{m.detalle || m.tipo}</p>
                      <p className="mt-0.5 text-[12px] text-mut">{fecha(m.creado_en)}</p>
                    </div>
                    <p
                      className={`num shrink-0 text-[14.5px] font-semibold ${
                        Number(m.monto) < 0 ? 'text-muted' : 'text-paper'
                      }`}
                    >
                      {Number(m.monto) < 0 ? '−' : '+'}
                      {dinero(Math.abs(Number(m.monto)), { conSimbolo: false })}
                    </p>
                  </div>
                ))}
              </Card>
            ) : (
              <EmptyState
                titulo="Sin movimientos todavía"
                mensaje="Aquí aparece cada pago liberado y cada retiro, con su fecha. Es tu libro de cuentas."
                accion="Ver trabajos disponibles"
                accionTo="/editor/trabajos"
              />
            )}
          </section>
        </>
      )}

      <Modal
        abierto={modal}
        onCerrar={() => setModal(false)}
        titulo="Solicitar retiro"
        descripcion={`Tienes ${dinero(retirable)} disponibles.`}
      >
        <form onSubmit={pedirRetiro} className="space-y-4" noValidate>
          <Input
            etiqueta="Monto"
            type="number"
            inputMode="decimal"
            min={1}
            step="1"
            max={retirable}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder={String(Math.floor(retirable))}
            requerido
            autoFocus
          />

          <Select
            etiqueta="Método"
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
            opciones={METODOS_COBRO}
          />

          <Textarea
            etiqueta="¿A dónde te transferimos?"
            rows={3}
            requerido
            value={datosCobro}
            onChange={(e) => setDatosCobro(e.target.value)}
            placeholder="Banco, número de cuenta y nombre del titular tal como figura."
            ayuda="Copia el dato exacto: un número mal escrito nos hace devolver la transferencia."
          />

          <Aviso tipo="info">
            Las transferencias las hacemos a mano. Si algo no llega, escríbenos por WhatsApp al{' '}
            {MARCA.WHATSAPP}.
          </Aviso>

          {error && <Aviso tipo="error">{error}</Aviso>}

          <div className="flex gap-2">
            <Button type="button" variante="ghost" className="flex-1" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" cargando={enviando}>
              Solicitar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
