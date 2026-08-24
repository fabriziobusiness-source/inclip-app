import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase, mensajeDeError } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { TIPOS_TRABAJO, PLATAFORMAS_PUBLICACION, REGLAS } from '../../config';
import { dinero, dineroUnitario, normalizarUrl } from '../../lib/formato';
import { Encabezado } from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { Textarea, Select, Checkbox } from '../../components/ui/Input';
import Aviso from '../../components/ui/Aviso';

/* ══════════════════════════════════════════════════════════════
   El cliente pone el TOTAL que está dispuesto a pagar.
   La app deriva el precio por clip y se lo muestra mientras
   escribe. Nunca al revés: pensar "1.400 por el proyecto" es más
   fácil que pensar "70 por clip", y el total es lo que engancha
   al clipero cuando ve la tarjeta.
   ══════════════════════════════════════════════════════════════ */

function enNDias(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function Publicar() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const toast = useToast();

  const [f, setF] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'clips',
    cantidad_clips: '20',
    precio_total: '',
    fecha_limite: enNDias(7),
    requiere_publicacion: false,
    plataformas_publicacion: [],
    url_material_fuente: '',
    url_referencias: '',
  });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const set = (campo) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((prev) => ({ ...prev, [campo]: v }));
  };

  const cantidad = Math.max(0, parseInt(f.cantidad_clips, 10) || 0);
  const total = Math.max(0, parseFloat(f.precio_total) || 0);
  const porClip = cantidad > 0 && total > 0 ? total / cantidad : null;

  const hoy = new Date().toISOString().slice(0, 10);

  const togglePlataforma = (p) => {
    setF((prev) => ({
      ...prev,
      plataformas_publicacion: prev.plataformas_publicacion.includes(p)
        ? prev.plataformas_publicacion.filter((x) => x !== p)
        : [...prev.plataformas_publicacion, p],
    }));
  };

  const problemas = useMemo(() => {
    const p = [];
    if (f.titulo.trim().length < 5) p.push('El título necesita al menos 5 caracteres.');
    if (f.descripcion.trim().length < 20) p.push('Describe el trabajo con al menos 20 caracteres.');
    if (cantidad < 1) p.push('Indica cuántos clips necesitas.');
    if (total <= 0) p.push('Indica cuánto estás dispuesto a pagar en total.');
    if (!f.fecha_limite || f.fecha_limite < hoy) p.push('La fecha límite tiene que ser de hoy en adelante.');
    if (f.requiere_publicacion && f.plataformas_publicacion.length === 0) {
      p.push('Elige en qué plataformas quieres que publique.');
    }
    if (f.url_material_fuente.trim() && !normalizarUrl(f.url_material_fuente)) {
      p.push('El link del material no parece una dirección válida.');
    }
    if (f.url_referencias.trim() && !normalizarUrl(f.url_referencias)) {
      p.push('El link de referencias no parece una dirección válida.');
    }
    return p;
  }, [f, cantidad, total, hoy]);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (problemas.length) {
      setError(problemas[0]);
      return;
    }

    setEnviando(true);
    try {
      const { data, error: err } = await supabase
        .from('trabajos')
        .insert({
          cliente_id: usuario.id,
          titulo: f.titulo.trim(),
          descripcion: f.descripcion.trim(),
          tipo: f.tipo,
          cantidad_clips: cantidad,
          precio_total: total,
          fecha_limite: f.fecha_limite,
          requiere_publicacion: f.requiere_publicacion,
          plataformas_publicacion: f.requiere_publicacion ? f.plataformas_publicacion : [],
          url_material_fuente: normalizarUrl(f.url_material_fuente),
          url_referencias: normalizarUrl(f.url_referencias),
        })
        .select('id')
        .single();

      if (err) throw err;
      toast.exito('Tu trabajo ya está publicado. Los cliperos empiezan a ofertar.');
      navegar(`/cliente/trabajos/${data.id}`, { replace: true });
    } catch (err) {
      setError(mensajeDeError(err));
      setEnviando(false);
    }
  }

  return (
    <>
      <Encabezado
        titulo="Publicar un trabajo"
        bajada="Di cuánto pagas por todo el proyecto. Los cliperos aceptan tu precio o te contraofertan, y tú eliges."
      />

      <form onSubmit={enviar} className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start" noValidate>
        <div className="space-y-4">
          {/* ── Qué necesitas ── */}
          <Card className="space-y-4 p-5">
            <h2 className="text-[15px] font-semibold tight">Qué necesitas</h2>

            <Input
              etiqueta="Título"
              requerido
              value={f.titulo}
              onChange={set('titulo')}
              maxLength={120}
              placeholder="20 clips verticales de mi podcast de negocios"
            />

            <Textarea
              etiqueta="Descripción"
              requerido
              rows={5}
              value={f.descripcion}
              onChange={set('descripcion')}
              maxLength={4000}
              placeholder="Duración de cada clip, estilo de subtítulos, si quieres hook al inicio, qué NO quieres…"
              ayuda="Mientras más claro seas, menos ajustes vas a pedir después."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select etiqueta="Tipo" value={f.tipo} onChange={set('tipo')} opciones={TIPOS_TRABAJO} />
              <Input
                etiqueta="Fecha límite"
                type="date"
                requerido
                min={hoy}
                value={f.fecha_limite}
                onChange={set('fecha_limite')}
                ayuda={`Los cliperos suelen entregar en ${REGLAS.PLAZO_ENTREGA_HORAS} horas.`}
              />
            </div>
          </Card>

          {/* ── Precio ── */}
          <Card className="space-y-4 p-5">
            <h2 className="text-[15px] font-semibold tight">Cuánto pagas</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                etiqueta="Cantidad de clips"
                type="number"
                inputMode="numeric"
                requerido
                min={1}
                max={500}
                value={f.cantidad_clips}
                onChange={set('cantidad_clips')}
              />
              <Input
                etiqueta="Precio total del proyecto"
                type="number"
                inputMode="decimal"
                requerido
                min={1}
                step="1"
                value={f.precio_total}
                onChange={set('precio_total')}
                placeholder="1400"
                ayuda="En bolivianos, por todo el proyecto."
              />
            </div>

            {/* Cálculo en vivo: el número por clip aparece mientras escribe. */}
            <div
              className="rounded-xl border border-line bg-paper/[0.02] px-4 py-4"
              aria-live="polite"
            >
              {porClip ? (
                <>
                  <p className="num text-[30px] font-extrabold leading-none tight text-cy">{dinero(total)}</p>
                  <p className="num mt-1.5 text-[13px] text-mut">
                    {dineroUnitario(Math.round(porClip * 100) / 100)} por clip · {cantidad} clips
                  </p>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-mut">
                    Así lo verá el clipero. El número grande es lo que mira primero.
                  </p>
                </>
              ) : (
                <p className="text-[13px] text-mut">
                  Escribe la cantidad y el total, y aquí te mostramos cuánto sale cada clip.
                </p>
              )}
            </div>
          </Card>

          {/* ── Publicación en cuentas del clipero ── */}
          <Card className="space-y-4 p-5">
            <h2 className="text-[15px] font-semibold tight">Publicación</h2>

            <Checkbox
              etiqueta="¿Quieres que el clipero también publique los clips en sus propias cuentas?"
              ayuda="Por defecto no: el clipero solo te entrega los archivos y tú publicas."
              checked={f.requiere_publicacion}
              onChange={set('requiere_publicacion')}
            />

            {f.requiere_publicacion && (
              <div className="rise">
                <p className="mb-2 text-[13px] font-medium">¿En cuáles?</p>
                <div className="flex flex-wrap gap-2">
                  {PLATAFORMAS_PUBLICACION.map((p) => {
                    const activa = f.plataformas_publicacion.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlataforma(p)}
                        aria-pressed={activa}
                        className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
                          activa
                            ? 'border-cy/45 bg-cy/[0.09] text-cy'
                            : 'border-line bg-paper/[0.02] text-mut hover:border-line2 hover:text-paper'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-mut">
                  Este trabajo llevará un badge de <strong className="text-paper">Incluye publicación</strong>. Cambia
                  el alcance, así que el clipero debe verlo antes de ofertar.
                </p>
              </div>
            )}
          </Card>

          {/* ── Material ── */}
          <Card className="space-y-4 p-5">
            <h2 className="text-[15px] font-semibold tight">Material</h2>
            {/* FUTURO: migrar a hosting de video propio. Hoy se guarda el link,
                no los archivos: alojar video es el costo más alto de la app. */}
            <Input
              etiqueta="Link del material en bruto"
              value={f.url_material_fuente}
              onChange={set('url_material_fuente')}
              placeholder="drive.google.com/…"
              ayuda="Una carpeta de Drive, Dropbox o WeTransfer. Deja el acceso abierto para quien tenga el link."
            />
            <Input
              etiqueta="Link de referencias"
              value={f.url_referencias}
              onChange={set('url_referencias')}
              placeholder="Un video de ejemplo del estilo que buscas"
              ayuda="Opcional, pero es lo que más reduce los ajustes."
            />
          </Card>
        </div>

        {/* ── Resumen pegajoso ── */}
        <div className="lg:sticky lg:top-8">
          <Card className="space-y-4 p-5">
            <h2 className="text-[15px] font-semibold tight">Antes de publicar</h2>
            <ul className="space-y-2 text-[13px] text-mut">
              <li className="flex gap-2">
                <span className="text-cy" aria-hidden="true">·</span>
                Las ofertas expiran a las {REGLAS.HORAS_EXPIRACION_OFERTA} horas si no respondes.
              </li>
              <li className="flex gap-2">
                <span className="text-cy" aria-hidden="true">·</span>
                Cada clipero puede ofertar una sola vez.
              </li>
              <li className="flex gap-2">
                <span className="text-cy" aria-hidden="true">·</span>
                Al aceptar una oferta, ese precio queda congelado.
              </li>
              <li className="flex gap-2">
                <span className="text-cy" aria-hidden="true">·</span>
                Tienes {REGLAS.RONDAS_AJUSTE} ronda de ajustes sobre la entrega.
              </li>
              <li className="flex gap-2">
                <span className="text-cy" aria-hidden="true">·</span>
                Puedes cerrar el trabajo sin elegir a nadie.
              </li>
            </ul>

            {error && <Aviso tipo="error">{error}</Aviso>}

            <Button type="submit" cargando={enviando} className="w-full">
              Publicar trabajo
            </Button>
            <p className="text-center text-[12px] text-mut">Publicar es gratis. Pagas cuando aceptas una oferta.</p>
          </Card>
        </div>
      </form>
    </>
  );
}
