import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { UsuarioSesion } from '../types';

interface AuthContextValue {
  usuario: UsuarioSesion | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  cargando: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Decodifica el payload del JWT en el navegador (sin verificar firma —
// la verificación real siempre ocurre en el backend en cada request).
function decodificarToken(token: string): UsuarioSesion {
  const payload = token.split('.')[1];
  const binario = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  // decodificar como UTF-8: con atob() a secas, nombres con tildes o ñ salen rotos ("JosÃ©")
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        setUsuario(decodificarToken(token));
      } catch {
        localStorage.removeItem('accessToken');
      }
    }
    setCargando(false);
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUsuario(decodificarToken(data.accessToken));
  }

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
