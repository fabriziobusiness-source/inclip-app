import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase, mensajeDeError } from '../../lib/supabase';
import { subirImagen } from '../../lib/imagenes';
import { useToast } from '../../components/ui/Toast';
import { PAIS, MARCA } from '../../config';
import { Encabezado } from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { Textarea, Select } from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import Aviso from '../../components/ui/Aviso';

export default function Perfil() {
  const { perfil, usuario, refrescar, salir } = useAuth();
  const toast = useToast();

  const [f, setF] = useState({
    nombre: perfil?.nombre || '',
    tipo_negocio: perfil?.tipo_negocio || '',
    descripcion: perfil?.descripcion || '',
    ciudad: perfil?.ciudad || '',
  });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const set = (campo) => (e) => setF((p) => ({ ...p, [campo]: e.target.value }));

  async function guardar(e) {
    e.preventDefault();
    setError('');
    if (f.nombre.trim().length < 2) {
      setError('Escribe tu nombre.');
      return;
    }

    setGuardando(true);
    try {
      const { error: err } = await supabase
        .from('perfiles')
        .update({
          nombre: f.nombre.trim(),
          tipo_negocio: f.tipo_negocio.trim() || null,
          descripcion: f.descripcion.trim() || null,
          ciudad: f.ciudad || null,
        })
        .eq('id', usuario.id);
      if (err) throw err;
      await refrescar();
      toast.exito('Perfil actualizado.');
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

  return (
    <>
      <Encabezado titulo="Mi perfil" bajada="Lo que ve el editor cuando le llega tu trabajo." />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <form onSubmit={guardar} className="space-y-4" noValidate>
          <Card className="space-y-5 p-5">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar url={perfil?.foto_url} nombre={perfil?.nombre} tamano="lg" />
              <div>
                <label className="btn btn-ghost btn-sm cursor-pointer">
                  {subiendo ? 'Subiendo…' : 'Cambiar foto'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={cambiarFoto}
                    disabled={subiendo}
                  />
                </label>
                <p className="mt-1.5 text-[12px] text-mut">JPG o PNG. La comprimimos antes de subirla.</p>
              </div>
            </div>

            <Input etiqueta="Nombre" requerido value={f.nombre} onChange={set('nombre')} maxLength={60} />

            <Input
              etiqueta="Tipo de negocio"
              value={f.tipo_negocio}
              onChange={set('tipo_negocio')}
              placeholder="Agencia de marketing, podcast, tienda online…"
              ayuda="Ayuda al editor a entender el contexto antes de ofertar."
            />

            <Select etiqueta="Ciudad" value={f.ciudad} onChange={set('ciudad')}>
              <option value="">Sin especificar</option>
              {PAIS.CIUDADES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>

            <Textarea
              etiqueta="Sobre ti"
              rows={3}
              maxLength={400}
              value={f.descripcion}
              onChange={set('descripcion')}
              placeholder="Qué haces y qué tipo de contenido publicas."
            />

            {error && <Aviso tipo="error">{error}</Aviso>}

            <Button type="submit" cargando={guardando}>
              Guardar cambios
            </Button>
          </Card>
        </form>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold tight">Tu cuenta</h2>
            <p className="mt-2 break-all text-[13px] text-mut">{usuario?.email}</p>
            <Button variante="ghost" tamano="sm" className="mt-4 w-full" onClick={salir}>
              Cerrar sesión
            </Button>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-semibold tight">¿Algo no cuadra?</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-mut">
              Escríbenos y lo revisamos: problemas con una entrega, un pago o un editor.
            </p>
            <Button
              variante="ghost"
              tamano="sm"
              className="mt-4 w-full"
              href={`https://wa.me/${MARCA.WHATSAPP}`}
            >
              Escribir por WhatsApp
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
