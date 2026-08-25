import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Aviso from './ui/Aviso';

/* ══════════════════════════════════════════════════════════════
   Perfilado progresivo, paso 3a.

   Este aviso informa; no bloquea. El editor puede navegar todos
   los trabajos con el perfil a medias — es justamente lo que lo
   convence de completarlo. El muro aparece recién al ofertar, y
   con el porqué escrito: los clientes eligen mirando portafolio y
   calificaciones.
   ══════════════════════════════════════════════════════════════ */

export default function AvisoPerfil({ className = '' }) {
  const { perfil, editor, perfilEditorListo } = useAuth();

  if (!editor) return null;

  if (!perfilEditorListo) {
    return (
      <Aviso tipo="warn" titulo="Te falta el perfil para poder ofertar" className={className}>
        Mira los trabajos con calma. Cuando quieras enviar tu primera oferta te vamos a pedir foto y
        portafolio: los clientes eligen viendo eso y tus calificaciones.{' '}
        <Link to="/editor/perfil" className="font-medium text-cy hover:underline">
          Completar ahora
        </Link>
      </Aviso>
    );
  }

  if (editor.estado === 'en_revision') {
    return (
      <Aviso tipo="info" titulo="Tu perfil está en revisión" className={className}>
        Lo revisamos a mano para que del otro lado sepan que hay alguien real. Te avisamos apenas quede
        aprobado y ahí puedes ofertar.
      </Aviso>
    );
  }

  if (editor.estado === 'pausado') {
    return (
      <Aviso tipo="error" titulo="Tu cuenta está pausada" className={className}>
        No puedes ofertar por ahora. Escríbenos para revisarlo.
      </Aviso>
    );
  }

  return null;
}
