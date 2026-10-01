import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  Stethoscope,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { Footer } from './Footer';

const NAV_ITEMS = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, roles: ['ADMIN', 'TECNICO', 'RECEPCION', 'SUPER_ADMIN'] },
  { to: '/ordenes', label: 'Órdenes', icon: ClipboardList, roles: ['ADMIN', 'TECNICO', 'RECEPCION', 'SUPER_ADMIN'] },
  { to: '/ordenes/nueva', label: 'Recibir equipo', icon: PackagePlus, roles: ['ADMIN', 'TECNICO', 'RECEPCION', 'SUPER_ADMIN'] },
  { to: '/diagnosticos', label: 'Diagnósticos', icon: Stethoscope, roles: ['ADMIN', 'TECNICO', 'SUPER_ADMIN'] },
  { to: '/reparaciones', label: 'Reparaciones', icon: Wrench, roles: ['ADMIN', 'TECNICO', 'SUPER_ADMIN'] },
  { to: '/entregas', label: 'Entregas', icon: Truck, roles: ['ADMIN', 'TECNICO', 'RECEPCION', 'SUPER_ADMIN'] },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { to: '/usuarios', label: 'Usuarios', icon: Users, roles: ['ADMIN', 'SUPER_ADMIN'] },
];

export function Layout() {
  const { usuario, logout } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => api.get('/tenant').then((r) => r.data),
    enabled: !!usuario?.tenantId,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#e8e5e0] sm:flex-row">
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocusCapture={() => setExpanded(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false);
        }}
        className={`z-20 flex w-full shrink-0 flex-row items-center bg-[#242223] text-white shadow-[0_8px_24px_rgba(20,18,18,0.18)] transition-[width] duration-300 ease-in-out sm:min-h-screen sm:flex-col sm:overflow-hidden sm:shadow-[8px_0_28px_rgba(20,18,18,0.16)] ${
          expanded ? 'sm:w-60' : 'sm:w-[72px]'
        }`}
      >
        {/* Marca del taller */}
        <div className={`flex shrink-0 items-center px-2 py-2 sm:w-full sm:py-4 ${expanded ? 'sm:justify-start sm:px-4' : 'sm:justify-center sm:px-0'}`}>
          <div
            title={tenant?.nombre ?? 'Taller'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e77835] text-white shadow-[0_5px_14px_rgba(231,120,53,0.24)]"
          >
            <Wrench size={20} strokeWidth={2.2} />
            <span className="sr-only">{tenant?.nombre ?? 'Taller'}</span>
          </div>
          {expanded && (
            <div className="ml-3 hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold">{tenant?.nombre ?? 'Taller'}</p>
              <p className="text-[10px] text-white/45">Flujo de reparación</p>
            </div>
          )}
        </div>

        <nav aria-label="Navegación principal" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 py-2 sm:w-full sm:flex-col sm:items-stretch sm:gap-2 sm:overflow-x-visible sm:overflow-y-auto sm:px-2 sm:py-3">
          {NAV_ITEMS.filter((item) => usuario && item.roles.includes(usuario.rol)).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/' || item.to === '/ordenes'}
                aria-label={item.label}
                title={!expanded ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-[background-color,color,width,padding] duration-300 sm:h-11 ${
                    expanded ? 'sm:mx-0 sm:w-full sm:justify-start sm:px-3' : 'sm:mx-auto sm:w-11 sm:justify-center sm:px-0'
                  } ${
                    isActive
                      ? 'bg-[#e77835] text-white shadow-[0_5px_14px_rgba(231,120,53,0.22)]'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={19} strokeWidth={2} className="shrink-0" aria-hidden="true" />
                {expanded && <span className="hidden truncate text-sm sm:ml-3 sm:block">{item.label}</span>}
                {!expanded && (
                  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#171617] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg sm:group-hover:block sm:group-focus-visible:block">
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className={`flex shrink-0 items-center px-2 py-2 sm:w-full sm:py-4 ${expanded ? 'sm:flex-col sm:items-stretch sm:px-2' : 'sm:flex-col sm:px-0'}`}>
          <button
            onClick={logout}
            aria-label="Cerrar sesión"
            title={!expanded ? 'Cerrar sesión' : undefined}
            className={`group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white/55 transition-colors hover:bg-white/10 hover:text-white sm:h-11 ${
              expanded ? 'sm:w-full sm:justify-start sm:px-3' : 'sm:mx-auto sm:w-11'
            }`}
          >
            <LogOut size={19} strokeWidth={2} className="shrink-0" aria-hidden="true" />
            {expanded && <span className="hidden text-sm sm:ml-3 sm:block">Cerrar sesión</span>}
            {!expanded && (
              <span className="pointer-events-none absolute right-full top-1/2 z-50 mr-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#171617] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg sm:group-hover:block sm:group-focus-visible:block">
                Cerrar sesión
              </span>
            )}
          </button>
          {expanded && (
            <p className="hidden truncate px-3 pt-2 text-[10px] text-white/40 sm:block" title={usuario?.nombre ?? usuario?.email}>
              {usuario?.nombre ?? usuario?.email}
            </p>
          )}
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-3 sm:p-4 lg:p-5">
        <div className="flex-1">
          <Outlet />
        </div>
        <Footer />
      </main>
    </div>
  );
}
