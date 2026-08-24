import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase, mensajeDeError } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { subirImagen } from '../../lib/imagenes';
import { useToast } from '../../components/ui/Toast';
import { PAIS, ESPECIALIDADES, PLATAFORMAS_PORTAFOLIO, MARCA } from '../../config';
import { normalizarUrl, dominioDe } from '../../lib/formato';

import { Encabezado } from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { Textarea, Select } from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import Aviso from '../../components/ui/Aviso';
import Modal from '../../components/ui/Modal';
import StarRating from '../../components/ui/StarRating';
import { BadgeEstadoClipero } from '../../components/ui/Badge';
import AvisoPerfil from '../../components/AvisoPerfil';

export default function Perfil() {
  const { perfil, clipero, usuario, refrescar, salir, perfilCliperoListo } = useAuth();
  const toast = useToast();

  const [f, setF] = useState({
    nombre: perfil?.nombre || '',
    descripcion: perfil?.descripcion || '',
    ciudad: perfil?.ciudad || '',
    handle_redes: perfil?.handle_redes || '',
    especialidad: clipero?.especialidad || '',
    herramientas_ia: clipero?.herramientas_ia || '',
    link_portafolio: clipero?.link_portafolio || '',
    capacidad_semanal: clipero?.capacidad_semanal ?? 3,
  });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [modalPieza, setModalPieza] = useState(false);

  const set = (campo) => (e) => setF((p) => ({ ...p, [campo]: e.target.value }));

  const { datos: piezas, recargar: recargarPortafolio } = useDatos(
    () => supabase.from('portafolio').select('*').eq('clipero_id', usuario.id).order('orden'),
    [usuario.id]
  );

  async function guardar(e) {
    e.preventDefault();
    setError('');

    if (f.nombre.trim().length < 2) {
      setError('Escribe tu nombre.');
      return;
    }
    if (!perfil?.foto_url) {
      setError('Sube una foto de perfil: es lo primero que mira el cliente.');
      return;
    }
    if (f.link_portafolio.trim() && !normalizarUrl(f.link_portafolio)) {
      setError('El link de portafolio no parece una dirección válida.');
      return;
    }

    setGuardando(true);
    try {
      // Un solo RPC: actualiza perfil y ficha, y mueve el estado a `en_revision`
      // la primera vez. El clipero no puede escribir su propio estado — si
      // pudiera, se aprobaría solo.
      const { error: err } = await supabase.rpc('completar_perfil_clipero', {
        p_foto_url: perfil.foto_url,
        p_descripcion: f.descripcion.trim() || null,
        p_ciudad: f.ciudad || null,
        p_handle: f.handle_redes.trim() || null,
        p_especialidad: f.especialidad || null,
        p_herramientas: f.herramientas_ia.trim() || null,
        p_link_portafolio: normalizarUrl(f.link_portafolio),
        p_capacidad: parseInt(f.capacidad_semanal, 10) || null,
      });
      if (err) throw err;

      // El nombre no va en ese RPC porque se fija en el paso 2; aquí se permite
      // corregirlo.
      if (f.nombre.trim() !== perfil.nombre) {
        const { error: err2 } = await supabase
          .from('perfiles')
          .update({ nombre: f.nombre.trim() })
          .eq('id', usuario.id);
        if (err2) throw err2;
      }

      await refrescar();
      toast.exito('Perfil guardado.');
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarFoto(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    try {
      const url = await subirImagen('avatares', usuario.id, archivo);
      const { error: err } = await supabase.from('perfiles').update({ foto_url: url }).eq('id', usuario.id);
      if (err) throw err;
      await refrescar();
      toast.exito('Foto actualizada.');
    } catch (err) {
      toast.error(mensajeDeError(err));
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  }

  async function borrarPieza(id) {
    const { error: err } = await supabase.from('portafolio').delete().eq('id', id);
    if (err) toast.error(mensajeDeError(err));
    else {
      toast.info('Pieza eliminada.');
      recargarPortafolio();
    }
  }

  const puntual =
    clipero?.trabajos_completados > 0
      ? Math.round((clipero.entregas_a_tiempo / clipero.trabajos_completados) * 100)
      : null;

  return (
    <>
      <Encabezado
        titulo="Mi perfil"
        bajada="Esto es lo que ve el cliente al recibir tu oferta. Es lo que decide si te elige."
        accion={
          perfilCliperoListo ? (
            <Button variante="ghost" tamano="sm" to={`/clipero/perfil/${usuario.id}`}>
              Ver como lo ve el cliente
            </Button>
          ) : null
        }
      />

      <AvisoPerfil className="mb-5" />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <Card className="space-y-5 p-5">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar url={perfil?.foto_url} nombre={perfil?.nombre} tamano="lg" />
              <div>
                <label className="btn btn-ghost btn-sm cursor-pointer">
                  {subiendo ? 'Subiendo…' : perfil?.foto_url ? 'Cambiar foto' : 'Subir foto'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={cambiarFoto}
                    disabled={subiendo}
                  />
                </label>
                <p className="mt-1.5 max-w-[220px] text-[12px] leading-relaxed text-mut">
                  Con cara se contrata más que con un logo. La comprimimos antes de subirla.
                </p>
              </div>
            </div>

            <Input etiqueta="Nombre" requerido value={f.nombre} onChange={set('nombre')} maxLength={60} />

            <Textarea
              etiqueta="Sobre ti"
              rows={3}
              maxLength={400}
              value={f.descripcion}
              onChange={set('descripcion')}
              placeholder="Edito podcasts de negocios desde hace 2 años. Entrego en 48 h con subtítulos y reencuadre."
              ayuda="Dos frases concretas valen más que un párrafo genérico."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select etiqueta="Ciudad" value={f.ciudad} onChange={set('ciudad')}>
                <option value="">Sin especificar</option>
                {PAIS.CIUDADES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>

              <Input
                etiqueta="Handle de redes"
                value={f.handle_redes}
                onChange={set('handle_redes')}
                placeholder="@tucuenta"
              />
            </div>
          </Card>

          <Card className="space-y-5 p-5">
            <h2 className="text-[15px] font-semibold tight">Cómo trabajas</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select etiqueta="Especialidad" value={f.especialidad} onChange={set('especialidad')}>
                <option value="">Sin especificar</option>
                {ESPECIALIDADES.map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.etiqueta}
                  </option>
                ))}
              </Select>

              <Input
                etiqueta="Trabajos a la vez"
                type="number"
                min={1}
                max={50}
                value={f.capacidad_semanal}
                onChange={set('capacidad_semanal')}
                ayuda="No podrás ofertar si ya llegaste a este número."
              />
            </div>

            <Input
              etiqueta="Herramientas de IA que usas"
              value={f.herramientas_ia}
              onChange={set('herramientas_ia')}
              placeholder="Opus, Descript, CapCut, Adobe Podcast"
              ayuda="Es tu diferencial: entregas rápido porque tu flujo lo permite."
            />

            <Input
              etiqueta="Link de portafolio"
              value={f.link_portafolio}
              onChange={set('link_portafolio')}
              placeholder="behance.net/tu, drive.google.com/…"
              ayuda="Opcional si ya subiste piezas abajo."
            />

            {error && <Aviso tipo="error">{error}</Aviso>}

            <Button type="submit" cargando={guardando}>
              Guardar perfil
            </Button>
          </Card>

          {/* ── Portafolio ── */}
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold tight">Portafolio</h2>
                <p className="mt-1 text-[13px] text-mut">
                  Pega links de tus mejores clips. No alojamos video: solo el link y una miniatura.
                </p>
              </div>
              <Button variante="ghost" tamano="sm" type="button" onClick={() => setModalPieza(true)}>
                Agregar pieza
              </Button>
            </div>

            {piezas?.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {piezas.map((p) => (
                  <div key={p.id} className="group relative">
                    <a
                      href={p.url_externa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-xl border border-line bg-surf2 transition-colors hover:border-cy/40"
                    >
                      {p.miniatura_url ? (
                        <img
                          src={p.miniatura_url}
                          alt={p.titulo}
                          loading="lazy"
                          decoding="async"
                          className="aspect-[9/16] w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[9/16] items-center justify-center px-3 text-center text-[12px] text-mut">
                          {dominioDe(p.url_externa)}
                        </div>
                      )}
                      <p className="truncate px-2.5 py-2 text-[12.5px]">{p.titulo}</p>
                    </a>
                    <button
                      type="button"
                      onClick={() => borrarPieza(p.id)}
                      aria-label={`Eliminar ${p.titulo}`}
                      className="absolute right-1.5 top-1.5 rounded-lg bg-ink/80 p-1.5 text-paper opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                variante="plano"
                titulo="Sin piezas todavía"
                mensaje="Tres clips buenos convencen más que diez regulares. Es lo primero que abre el cliente cuando compara tu oferta con las otras."
                accion="Agregar mi primera pieza"
                accionOnClick={() => setModalPieza(true)}
              />
            )}
          </Card>
        </form>

        {/* ── Columna lateral ── */}
        <div className="space-y-4 lg:sticky lg:top-8">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold tight">Tus métricas</h2>
              <BadgeEstadoClipero estado={clipero?.estado || 'pendiente'} />
            </div>

            <StarRating
              valor={clipero?.calificacion_promedio}
              total={clipero?.total_calificaciones}
              tamano={16}
            />

            <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-mut">Trabajos completados</dt>
                <dd className="num">{clipero?.trabajos_completados ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mut">Entregas a tiempo</dt>
                <dd className="num">{puntual === null ? '-' : `${puntual}%`}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-semibold tight">Tu cuenta</h2>
            <p className="mt-2 break-all text-[13px] text-mut">{usuario?.email}</p>
            <Button variante="ghost" tamano="sm" className="mt-4 w-full" onClick={salir}>
              Cerrar sesión
            </Button>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-semibold tight">¿Dudas?</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-mut">
              Escríbenos si algo no cuadra con un trabajo, un pago o tu aprobación.
            </p>
            <Button variante="ghost" tamano="sm" className="mt-4 w-full" href={`https://wa.me/${MARCA.WHATSAPP}`}>
              Escribir por WhatsApp
            </Button>
          </Card>
        </div>
      </div>

      <ModalPieza
        abierto={modalPieza}
        onCerrar={() => setModalPieza(false)}
        usuarioId={usuario.id}
        orden={piezas?.length ?? 0}
        onListo={recargarPortafolio}
      />
    </>
  );
}

/* ── Alta de pieza de portafolio ────────────────────────────────
   Link externo + miniatura en imagen. Cero video alojado.
   FUTURO: migrar a hosting de video propio.                      */
function ModalPieza({ abierto, onCerrar, usuarioId, orden, onListo }) {
  const toast = useToast();
  const [titulo, setTitulo] = useState('');
  const [url, setUrl] = useState('');
  const [plataforma, setPlataforma] = useState('tiktok');
  const [miniatura, setMiniatura] = useState(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError('');

    const urlLimpia = normalizarUrl(url);
    if (titulo.trim().length < 2) {
      setError('Ponle un título a la pieza.');
      return;
    }
    if (!urlLimpia) {
      setError('Pega el link del clip.');
      return;
    }

    setEnviando(true);
    try {
      let miniaturaUrl = null;
      if (miniatura) miniaturaUrl = await subirImagen('miniaturas', usuarioId, miniatura);

      const { error: err } = await supabase.from('portafolio').insert({
        clipero_id: usuarioId,
        titulo: titulo.trim(),
        url_externa: urlLimpia,
        miniatura_url: miniaturaUrl,
        plataforma,
        orden,
      });
      if (err) throw err;

      toast.exito('Pieza agregada.');
      setTitulo('');
      setUrl('');
      setMiniatura(null);
      onListo();
      onCerrar();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Agregar pieza al portafolio"
      descripcion="Pega el link del clip y, si quieres, sube una miniatura."
    >
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Input
          etiqueta="Título"
          requerido
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Clip de podcast, 1.2M de vistas"
          maxLength={100}
          autoFocus
        />

        <Input
          etiqueta="Link del clip"
          requerido
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="tiktok.com/@tucuenta/video/…"
        />

        <Select
          etiqueta="Plataforma"
          value={plataforma}
          onChange={(e) => setPlataforma(e.target.value)}
          opciones={PLATAFORMAS_PORTAFOLIO}
        />

        <div>
          <span className="mb-1.5 block text-[13px] font-medium">Miniatura</span>
          <label className="btn btn-ghost btn-sm cursor-pointer">
            {miniatura ? 'Cambiar imagen' : 'Elegir imagen'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => setMiniatura(e.target.files?.[0] || null)}
            />
          </label>
          <p className="mt-1.5 text-[12.5px] text-mut">
            {miniatura ? miniatura.name : 'Opcional. Sin miniatura mostramos solo el link.'}
          </p>
        </div>

        {error && <Aviso tipo="error">{error}</Aviso>}

        <div className="flex gap-2">
          <Button type="button" variante="ghost" className="flex-1" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" cargando={enviando}>
            Agregar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
