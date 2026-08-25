import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase, mensajeDeError } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { useToast } from '../../components/ui/Toast';
import { dinero, fecha, textoPlazo, normalizarUrl } from '../../lib/formato';

import { Encabezado } from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { Textarea } from '../../components/ui/Input';
import Aviso from '../../components/ui/Aviso';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonFilas } from '../../components/ui/Skeleton';

/* La entrega es un LINK, no archivos.
   FUTURO: migrar a hosting de video propio. Hoy alojar el video sería el
   gasto más grande de la app y no aporta nada que Drive no resuelva. */

export default function Entregar() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const toast = useToast();

  const [url, setUrl] = useState('');
  const [nota, setNota] = useState('');
  const [links, setLinks] = useState(['']);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const { datos: t, cargando } = useDatos(
    () =>
      supabase
        .from('trabajos')
        .select('*, perfiles!trabajos_cliente_id_fkey(nombre), entregas(id, version, revisiones(comentario))')
        .eq('id', id)
        .eq('editor_id', usuario.id)
        .maybeSingle(),
    [id, usuario.id]
  );

  const ultimaRevision = (t?.entregas || []).flatMap((e) => e.revisiones || []).slice(-1)[0];

  function cambiarLink(i, valor) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? valor : l)));
  }

  async function enviar(e) {
    e.preventDefault();
    setError('');

    const urlLimpia = normalizarUrl(url);
    if (!urlLimpia) {
      setError('Pega el link de la carpeta con los clips.');
      return;
    }

    const publicaciones = links.map((l) => normalizarUrl(l)).filter(Boolean);
    if (t.requiere_publicacion && publicaciones.length === 0) {
      setError('Este trabajo incluye publicación: pega también los links de los posts.');
      return;
    }

    setEnviando(true);
    try {
      const { error: err } = await supabase.rpc('enviar_entrega', {
        p_trabajo: id,
        p_url: urlLimpia,
        p_nota: nota.trim() || null,
        p_links: publicaciones,
      });
      if (err) throw err;
      toast.exito('Entrega enviada. El cliente la revisa y aprueba.');
      navegar('/editor/mis-trabajos', { replace: true });
    } catch (err) {
      setError(mensajeDeError(err));
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <>
        <div className="skeleton mb-5 h-8 w-64" />
        <SkeletonFilas cantidad={2} />
      </>
    );
  }

  if (!t) {
    return (
      <EmptyState
        titulo="Este trabajo no es tuyo"
        mensaje="O ya no está asignado a tu cuenta."
        accion="Ver mis trabajos"
        accionTo="/editor/mis-trabajos"
      />
    );
  }

  return (
    <>
      <Link
        to="/editor/mis-trabajos"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-mut hover:text-paper"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Mis trabajos
      </Link>

      <Encabezado
        titulo={t.estado === 'en_ajustes' ? 'Volver a entregar' : 'Entregar trabajo'}
        bajada={t.titulo}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
        <form onSubmit={enviar} className="space-y-4" noValidate>
          {t.estado === 'en_ajustes' && ultimaRevision && (
            <Aviso tipo="warn" titulo="Lo que te pidió el cliente">
              {ultimaRevision.comentario}
            </Aviso>
          )}

          <Card className="space-y-4 p-5">
            <Input
              etiqueta="Link de la carpeta con los clips"
              requerido
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="drive.google.com/…"
              ayuda="Drive, Dropbox o WeTransfer. Deja el acceso abierto para quien tenga el link, o el cliente no podrá abrirlo."
              autoFocus
            />

            <Textarea
              etiqueta="Nota para el cliente"
              rows={4}
              maxLength={1000}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Van numerados del 1 al 20. Los 3 primeros tienen dos versiones de hook por si quieres elegir."
              ayuda="Opcional. Explicar el orden de los archivos evita la mitad de los pedidos de ajuste."
            />
          </Card>

          {t.requiere_publicacion && (
            <Card className="space-y-4 p-5">
              <div>
                <h2 className="text-[15px] font-semibold tight">Links de las publicaciones</h2>
                <p className="mt-1 text-[13px] text-mut">
                  Este trabajo incluye publicación en{' '}
                  {t.plataformas_publicacion?.length ? t.plataformas_publicacion.join(', ') : 'tus cuentas'}. Pega
                  el link de cada post.
                </p>
              </div>

              <div className="space-y-2">
                {links.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="field"
                      value={l}
                      onChange={(e) => cambiarLink(i, e.target.value)}
                      placeholder="tiktok.com/@tucuenta/video/…"
                      aria-label={`Link de publicación ${i + 1}`}
                    />
                    {links.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label={`Quitar link ${i + 1}`}
                        className="shrink-0 rounded-xl border border-line px-3 text-mut transition-colors hover:border-rojo/40 hover:text-rojo"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variante="ghost"
                tamano="sm"
                onClick={() => setLinks((prev) => [...prev, ''])}
              >
                Agregar otro link
              </Button>
            </Card>
          )}

          {error && <Aviso tipo="error">{error}</Aviso>}

          <Button type="submit" cargando={enviando}>
            Enviar entrega
          </Button>
        </form>

        <div className="space-y-4 lg:sticky lg:top-8">
          <Card className="p-5">
            <p className="text-[11.5px] uppercase tracking-wide text-mut">Cobrarás</p>
            <p className="num mt-1 text-[30px] font-extrabold leading-none tight text-cy">
              {dinero(t.monto_editor || t.precio_acordado)}
            </p>
            {t.comision_monto > 0 && (
              <p className="num mt-1.5 text-[12.5px] text-mut">
                {dinero(t.precio_acordado)} menos {dinero(t.comision_monto)} de comisión ({t.comision_porcentaje}%)
              </p>
            )}
            {Number(t.comision_monto) === 0 && (
              <p className="mt-1.5 text-[12.5px] text-paper">Sin comisión en este trabajo</p>
            )}

            <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-mut">Cliente</dt>
                <dd className="text-right">{t.perfiles?.nombre || '-'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mut">Clips</dt>
                <dd className="num text-right">{t.cantidad_clips}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mut">Fecha límite</dt>
                <dd className="text-right">{fecha(t.fecha_limite)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mut">Plazo</dt>
                <dd className="text-right">{textoPlazo(t.fecha_limite)}</dd>
              </div>
            </dl>
          </Card>

          <Aviso tipo="info">
            Entregar a tiempo cuenta para tu porcentaje de entregas puntuales, que es lo primero que mira el
            cliente después del precio.
          </Aviso>
        </div>
      </div>
    </>
  );
}
