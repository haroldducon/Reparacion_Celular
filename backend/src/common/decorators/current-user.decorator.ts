import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UsuarioAutenticado {
  sub: string; // usuarioId
  tenantId: string | null;
  rol: 'SUPER_ADMIN' | 'ADMIN' | 'TECNICO' | 'RECEPCION';
  email: string;
  nombre: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);