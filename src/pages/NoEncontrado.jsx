import { useAuth } from '../hooks/useAuth';
import { inicioDe } from '../App';
import Button from '../components/ui/Button';

export default function NoEncontrado() {
  const { rol, sesion } = useAuth();
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 text-center">
      <div>
        <p className="num text-[52px] font-extrabold leading-none tight text-cy">404</p>
        <h1 className="mt-3 text-[20px] font-bold tight">Esta página no existe</h1>
        <p className="mt-2 text-[13.5px] text-mut">Puede que el link esté mal o que la hayamos movido.</p>
        <div className="mt-6">
          <Button to={sesion ? inicioDe(rol) : '/entrar'} tamano="sm">
            Volver al inicio
          </Button>
        </div>
      </div>
    </main>
  );
}
