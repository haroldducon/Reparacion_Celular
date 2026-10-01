import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import type { Rol } from '../types';

interface Props {
  children: React.ReactNode;
  /** Si se indica, solo esos roles pueden ver la ruta (el backend también lo exige). */
  roles?: Rol[];
}

export function RutaProtegida({ children, roles }: Props) {
  const { usuario, cargando } = useAuth();

  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
