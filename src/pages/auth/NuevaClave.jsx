import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, mensajeDeError } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Aviso from '../../components/ui/Aviso';
import MarcoAuth from './MarcoAuth';

export default function NuevaClave() {
  const navegar = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('La contraseña necesita al menos 8 caracteres.');
      return;
    }
    setEnviando(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      navegar('/', { replace: true });
    } catch (err) {
      setError(mensajeDeError(err));
      setEnviando(false);
    }
  }

  return (
    <MarcoAuth titulo="Crea una contraseña nueva" bajada="Con esta entrarás desde ahora.">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Input
          etiqueta="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          autoFocus
        />
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Button type="submit" cargando={enviando} className="w-full">
          Guardar
        </Button>
      </form>
    </MarcoAuth>
  );
}
