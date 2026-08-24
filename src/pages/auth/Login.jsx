import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { mensajeDeError, supabase, URL_APP } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Aviso from '../../components/ui/Aviso';
import MarcoAuth from './MarcoAuth';

export default function Login() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [enviadoReset, setEnviadoReset] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await entrar({ email: email.trim(), password });
      // El enrutador decide a dónde va según su rol y qué le falta del perfil.
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  async function recuperar() {
    setError('');
    if (!email.trim()) {
      setError('Escribe tu correo y volvemos a intentarlo.');
      return;
    }
    setRecuperando(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${URL_APP}/nueva-clave`,
      });
      if (err) throw err;
      setEnviadoReset(true);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setRecuperando(false);
    }
  }

  return (
    <MarcoAuth titulo="Entra a tu cuenta" bajada="Tus trabajos, ofertas y entregas te esperan.">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Input
          etiqueta="Correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
        />
        <Input
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Tu contraseña"
        />

        {enviadoReset && (
          <Aviso tipo="ok">Te enviamos un link para crear una contraseña nueva.</Aviso>
        )}
        {error && <Aviso tipo="error">{error}</Aviso>}

        <Button type="submit" cargando={enviando} className="w-full">
          Entrar
        </Button>
      </form>

      <div className="mt-5 space-y-2 text-center text-[13.5px] text-mut">
        <p>
          <button type="button" onClick={recuperar} disabled={recuperando} className="hover:text-paper hover:underline">
            {recuperando ? 'Enviando…' : 'Olvidé mi contraseña'}
          </button>
        </p>
        <p>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-medium text-cy hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </MarcoAuth>
  );
}
