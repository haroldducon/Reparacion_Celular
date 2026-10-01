import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuarioAutenticado } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

function obtenerSecretoJwt(): string {
  const secreto = process.env.JWT_ACCESS_SECRET;
  if (!secreto) {
    throw new Error('JWT_ACCESS_SECRET no está definido en las variables de entorno');
  }
  return secreto;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: obtenerSecretoJwt(),
      algorithms: ['HS256'],
    });
  }

  // Lo que retorna aquí queda disponible como request.user.
  // Se consulta la BD para que desactivar a un usuario o cambiarle el rol/taller
  // surta efecto de inmediato y no tras los 15 min de vida del token.
  async validate(payload: UsuarioAutenticado): Promise<UsuarioAutenticado> {
    const u = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, activo: true, rol: true, tenantId: true, email: true, nombre: true },
    });
    if (!u || !u.activo) throw new UnauthorizedException();
    return { ...payload, rol: u.rol, tenantId: u.tenantId, email: u.email, nombre: u.nombre };
  }
}