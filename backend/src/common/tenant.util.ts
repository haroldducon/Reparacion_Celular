import type { UsuarioAutenticado } from './decorators/current-user.decorator';

/**
 * Filtro explícito por taller. Se aplica en TODAS las consultas como defensa en
 * profundidad: el aislamiento no depende solo de RLS en Postgres.
 * Un usuario sin taller (que no sea SUPER_ADMIN) no coincide con ninguna fila.
 */
export function filtroTenant(u: UsuarioAutenticado): { tenantId?: string } {
  if (u.rol === 'SUPER_ADMIN') return {};
  return { tenantId: u.tenantId ?? '__sin_taller__' };
}

export const claveTenant = (u: UsuarioAutenticado) => u.tenantId ?? 'global';

export function escapeHtml(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** URL base del frontend (para enlaces de seguimiento en los correos). */
export function urlFrontend(): string {
  const explicita = process.env.FRONTEND_URL?.trim();
  const primeraOrigen = (process.env.CORS_ORIGINS ?? '').split(',')[0]?.trim();
  return (explicita || primeraOrigen || '').replace(/\/+$/, '');
}
