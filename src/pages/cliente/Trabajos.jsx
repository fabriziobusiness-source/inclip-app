import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useDatos } from '../../hooks/useDatos';
import { Encabezado } from '../../components/Layout';
import TrabajoCard from '../../components/TrabajoCard';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Aviso from '../../components/ui/Aviso';
import { SkeletonTarjetas } from '../../components/ui/Skeleton';

const FILTROS = [
  { valor: 'activos', etiqueta: 'Activos' },
  { valor: 'abierto', etiqueta: 'Recibiendo ofertas' },
  { valor: 'completado', etiqueta: 'Completados' },
  { valor: 'todos', etiqueta: 'Todos' },
];

const EN_CURSO = ['abierto', 'asignado', 'en_progreso', 'entregado', 'en_ajustes'];

export default function Trabajos() {
  const { usuario } = useAuth();
  const [filtro, setFiltro] = useState('activos');

  const { datos, cargando, error } = useDatos(async () => {
    // Las ofertas viejas se marcan expiradas al entrar. Con el volumen del MVP
    // alcanza; cuando crezca, esto pasa a pg_cron.
    await supabase.rpc('expirar_postulaciones');

    return supabase
      .from('trabajos')
      .select('*, postulaciones(id, estado)')
      .eq('cliente_id', usuario.id)
      .order('creado_en', { ascending: false });
  }, [usuario.id]);

  const trabajos = (datos || []).filter((t) => {
    if (filtro === 'todos') return true;
    if (filtro === 'activos') return EN_CURSO.includes(t.estado);
    return t.estado === filtro;
  });

  return (
    <>
      <Encabezado
        titulo="Mis trabajos"
        bajada="Todo lo que publicaste, con las ofertas que va recibiendo cada uno."
        accion={
          <Button to="/cliente/publicar" tamano="sm">
            Publicar trabajo
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
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
        <SkeletonTarjetas cantidad={3} />
      ) : trabajos.length === 0 ? (
        <EmptyState
          titulo={datos?.length ? 'Nada en este filtro' : 'Todavía no publicaste nada'}
          mensaje={
            datos?.length
              ? 'Prueba con otro filtro para ver el resto de tus trabajos.'
              : 'Publica cuánto estás dispuesto a pagar por tus clips. Los cliperos aceptan tu precio o te contraofertan, y tú eliges por precio y calificación.'
          }
          accion={datos?.length ? undefined : 'Publicar mi primer trabajo'}
          accionTo="/cliente/publicar"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {trabajos.map((t) => {
            const pendientes = (t.postulaciones || []).filter((p) => p.estado === 'pendiente').length;
            return (
              <TrabajoCard
                key={t.id}
                trabajo={t}
                to={`/cliente/trabajos/${t.id}`}
                mostrarEstado
                pie={
                  t.estado === 'abierto' ? (
                    <span className={`text-[12.5px] ${pendientes ? 'font-medium text-cy' : 'text-mut'}`}>
                      {pendientes === 0
                        ? 'Sin ofertas todavía'
                        : `${pendientes} oferta${pendientes === 1 ? '' : 's'} por revisar`}
                    </span>
                  ) : null
                }
              />
            );
          })}
        </div>
      )}
    </>
  );
}
