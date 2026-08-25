import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { TIPOS_TRABAJO, MODALIDADES, infoModalidad } from '../../config';
import { Encabezado } from '../../components/Layout';
import TrabajoCard from '../../components/TrabajoCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import Aviso from '../../components/ui/Aviso';
import { SkeletonTarjetas } from '../../components/ui/Skeleton';
import AvisoPerfil from '../../components/AvisoPerfil';

const ORDENES = [
  { valor: 'reciente', etiqueta: 'Más recientes' },
  { valor: 'total_desc', etiqueta: 'Mejor pagados' },
  { valor: 'clip_desc', etiqueta: 'Mejor por clip' },
  { valor: 'plazo', etiqueta: 'Vencen antes' },
];

export default function Trabajos() {
  const { usuario, editor } = useAuth();
  const [tipo, setTipo] = useState('');
  const [orden, setOrden] = useState('reciente');
  const [publicacion, setPublicacion] = useState('');
  const [modalidad, setModalidad] = useState('');

  // Las modalidades que este editor declaró trabajar. La base rechaza ofertar
  // fuera de ellas, así que mostrarle esos trabajos solo sería hacerle perder
  // el tiempo. Si todavía no tiene ficha, se asume volumen para no dejarlo
  // ante una pantalla vacía sin explicación.
  const misModalidades = editor?.modalidades?.length ? editor.modalidades : ['volumen'];

  const { datos, cargando, error } = useDatos(async () => {
    await supabase.rpc('expirar_postulaciones');
    return supabase
      .from('trabajos')
      .select('*, postulaciones(id, editor_id)')
      .eq('estado', 'abierto')
      .in('modalidad', misModalidades)
      .order('creado_en', { ascending: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [misModalidades.join(',')]);

  const trabajos = useMemo(() => {
    let lista = datos || [];
    if (tipo) lista = lista.filter((t) => t.tipo === tipo);
    if (modalidad) lista = lista.filter((t) => t.modalidad === modalidad);
    if (publicacion === 'si') lista = lista.filter((t) => t.requiere_publicacion);
    if (publicacion === 'no') lista = lista.filter((t) => !t.requiere_publicacion);

    return [...lista].sort((a, b) => {
      if (orden === 'total_desc') return Number(b.precio_total) - Number(a.precio_total);
      if (orden === 'clip_desc') return Number(b.precio_por_clip) - Number(a.precio_por_clip);
      if (orden === 'plazo') return new Date(a.fecha_limite) - new Date(b.fecha_limite);
      return new Date(b.creado_en) - new Date(a.creado_en);
    });
  }, [datos, tipo, orden, publicacion, modalidad]);

  return (
    <>
      <Encabezado
        titulo="Trabajos disponibles"
        bajada="El presupuesto está a la vista. Acepta el precio o pon el tuyo."
      />

      <AvisoPerfil className="mb-5" />

      <Card className={`mb-5 grid gap-3 p-4 ${misModalidades.length > 1 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {/* Este filtro solo aparece si de verdad hay algo que filtrar: con una
            sola modalidad activa sería un desplegable de una opción. */}
        {misModalidades.length > 1 && (
          <Select etiqueta="Modalidad" value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
            <option value="">Todas</option>
            {MODALIDADES.filter((m) => misModalidades.includes(m.valor)).map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
          </Select>
        )}

        <Select etiqueta="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos</option>
          {TIPOS_TRABAJO.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.etiqueta}
            </option>
          ))}
        </Select>

        <Select etiqueta="Publicación" value={publicacion} onChange={(e) => setPublicacion(e.target.value)}>
          <option value="">Todos</option>
          <option value="no">Solo entregar archivos</option>
          <option value="si">Incluye publicación</option>
        </Select>

        <Select etiqueta="Ordenar por" value={orden} onChange={(e) => setOrden(e.target.value)} opciones={ORDENES} />
      </Card>

      {error && <Aviso tipo="error" className="mb-4">{error}</Aviso>}

      {cargando ? (
        <SkeletonTarjetas cantidad={6} />
      ) : trabajos.length === 0 ? (
        <EmptyState
          titulo={datos?.length ? 'Nada con esos filtros' : 'Todavía no hay trabajos abiertos'}
          mensaje={
            datos?.length
              ? 'Quita algún filtro para ver el resto.'
              : misModalidades.length === 1
                ? `Solo estás viendo trabajos de ${infoModalidad(misModalidades[0]).etiqueta.toLowerCase()}, que es la única modalidad que tienes activa. Si también trabajas la otra, actívala y verás el doble.`
                : 'Los emprendedores publican a lo largo del día. Vuelve en un rato o deja tu perfil completo para que te elijan apenas ofertes.'
          }
          accion={datos?.length ? undefined : misModalidades.length === 1 ? 'Revisar mis modalidades' : 'Completar mi perfil'}
          accionTo="/editor/perfil"
        />
      ) : (
        <>
          <p className="mb-3 text-[13px] text-mut">
            {trabajos.length} trabajo{trabajos.length === 1 ? '' : 's'} abierto
            {trabajos.length === 1 ? '' : 's'}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {trabajos.map((t) => {
              const yaOferte = (t.postulaciones || []).some((p) => p.editor_id === usuario.id);
              return (
                <TrabajoCard
                  key={t.id}
                  trabajo={t}
                  to={`/editor/trabajos/${t.id}`}
                  pie={
                    yaOferte ? (
                      <span className="text-[12.5px] font-medium text-cy">Ya ofertaste aquí</span>
                    ) : null
                  }
                />
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
