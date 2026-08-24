import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { mensajeDeError } from '../../lib/supabase';
import { MARCA, REGLAS } from '../../config';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Aviso from '../../components/ui/Aviso';
import MarcoAuth, { BotonGoogle, Separador } from './MarcoAuth';

/* ══════════════════════════════════════════════════════════════
   PASO 1 del perfilado progresivo: correo y contraseña. Nada más.

   Contrato con la landing:
     /registro?tipo=cliente   → emprendedor
     /registro?tipo=clipero   → clipero
   Si el parámetro viene, no se vuelve a preguntar: la persona ya
   lo dijo con el clic. Si falta o es inválido, se pregunta aquí.
   ══════════════════════════════════════════════════════════════ */

const TIPOS_VALIDOS = ['cliente', 'clipero'];

const COPY = {
  cliente: {
    titulo: 'Publica tu primer trabajo',
    bajada: 'Dices cuánto pagas, los cliperos ofertan y tú eliges. Sin cotizaciones por WhatsApp.',
  },
  clipero: {
    titulo: 'Empieza a recibir trabajos',
    bajada: 'Ves el presupuesto antes de ofertar. Aceptas el precio o pones el tuyo.',
  },
};

export default function Registro() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const { registrar, entrarConGoogle } = useAuth();

  const tipoUrl = params.get('tipo');
  const [tipo, setTipo] = useState(TIPOS_VALIDOS.includes(tipoUrl) ? tipoUrl : null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña necesita al menos 8 caracteres.');
      return;
    }

    setEnviando(true);
    try {
      const data = await registrar({ email: email.trim(), password, tipo });
      // Con confirmación de correo desactivada, Supabase devuelve sesión al
      // instante y el enrutador ya lleva al paso 2.
      if (data.session) navegar('/bienvenida', { replace: true });
      else setListo(true);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  async function google() {
    setError('');
    try {
      await entrarConGoogle(tipo);
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }

  if (listo) {
    return (
      <MarcoAuth titulo="Revisa tu correo" bajada={`Te enviamos un link a ${email} para confirmar tu cuenta.`}>
        <Aviso tipo="info">
          Si no lo ves en unos minutos, mira la carpeta de spam. El link te trae de vuelta aquí y sigues
          desde donde quedaste.
        </Aviso>
        <p className="mt-6 text-center text-[13.5px] text-mut">
          <Link to="/entrar" className="font-medium text-cy hover:underline">
            Ya confirmé, quiero entrar
          </Link>
        </p>
      </MarcoAuth>
    );
  }

  /* Sin `?tipo=` válido: se elige el rol como primer paso. */
  if (!tipo) {
    return (
      <MarcoAuth titulo={`Crea tu cuenta en ${MARCA.NOMBRE}`} bajada="¿Qué vienes a hacer?">
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setTipo('cliente')}
            className="card card-hover p-5 text-left"
          >
            <p className="text-[15px] font-semibold">Necesito clips</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-mut">
              Publicas tu presupuesto, recibes ofertas y eliges. Entregas en {REGLAS.PLAZO_ENTREGA_HORAS} horas.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setTipo('clipero')}
            className="card card-hover p-5 text-left"
          >
            <p className="text-[15px] font-semibold">Edito video</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-mut">
              Ves trabajos con el presupuesto a la vista. Aceptas el precio o contraofertas con el tuyo.
            </p>
          </button>
        </div>

        <p className="mt-6 text-center text-[13.5px] text-mut">
          ¿Ya tienes cuenta?{' '}
          <Link to="/entrar" className="font-medium text-cy hover:underline">
            Inicia sesión
          </Link>
        </p>
      </MarcoAuth>
    );
  }

  const copy = COPY[tipo];

  return (
    <MarcoAuth titulo={copy.titulo} bajada={copy.bajada}>
      <BotonGoogle onClick={google}>Continuar con Google</BotonGoogle>
      <Separador />

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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          ayuda="Con esto entras. El resto de tu perfil lo completas después."
        />

        {error && <Aviso tipo="error">{error}</Aviso>}

        <Button type="submit" cargando={enviando} className="w-full">
          Crear cuenta
        </Button>
      </form>

      <p className="mt-5 text-center text-[13.5px] text-mut">
        ¿Ya tienes cuenta?{' '}
        <Link to="/entrar" className="font-medium text-cy hover:underline">
          Inicia sesión
        </Link>
      </p>

      {!TIPOS_VALIDOS.includes(tipoUrl) && (
        <p className="mt-3 text-center text-[12.5px] text-mut">
          <button type="button" onClick={() => setTipo(null)} className="hover:text-paper hover:underline">
            Me equivoqué, quiero la otra opción
          </button>
        </p>
      )}
    </MarcoAuth>
  );
}
