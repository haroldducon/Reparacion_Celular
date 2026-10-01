import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type RolPermitido = 'SUPER_ADMIN' | 'ADMIN' | 'TECNICO' | 'RECEPCION';

/**
 * Uso: @Roles('ADMIN', 'TECNICO')
 * Se combina con RolesGuard (ver common/guards/roles.guard.ts).
 */
export const Roles = (...roles: RolPermitido[]) => SetMetadata(ROLES_KEY, roles);
