import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../modules/cache/cache.service';

// Bloqueo temporal por cuenta: tras 5 contraseñas incorrectas, 15 minutos sin poder intentar.
const MAX_FALLOS = 5;
const BLOQUEO_SEGUNDOS = 15 * 60;

@Injectable()
export class AuthService {
  // Hash falso con parámetros por defecto de argon2id: se usa para gastar el mismo tiempo
  // cuando el correo no existe y evitar que el tiempo de respuesta revele qué correos están registrados.
  private hashFalso: Promise<string>;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private cache: CacheService,
  ) {
    this.hashFalso = argon2.hash('contraseña-falsa-de-relleno', { type: argon2.argon2id });
  }

  async login(emailEntrada: string, password: string, ip?: string) {
    const email = emailEntrada.trim().toLowerCase();
    const claveFallos = `login:${email}`;
    if ((await this.cache.contar(claveFallos)) >= MAX_FALLOS) {
      throw new HttpException(
        'Demasiados intentos fallidos. Por seguridad, espera 15 minutos antes de volver a intentar.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const usuario = await this.prisma.usuario.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!usuario || !usuario.activo) {
      await argon2.verify(await this.hashFalso, password).catch(() => false);
      await this.cache.incrementar(claveFallos, BLOQUEO_SEGUNDOS);
      await this.registrarIntento(null, email, ip, false);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await argon2.verify(usuario.passwordHash, password).catch(() => false);
    if (!passwordValida) {
      await this.cache.incrementar(claveFallos, BLOQUEO_SEGUNDOS);
      await this.registrarIntento(usuario.id, email, ip, false);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.cache.limpiar(claveFallos);
    await this.registrarIntento(usuario.id, email, ip, true);
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    });

    return this.emitirTokens(usuario);
  }

  async refrescarToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
        algorithms: ['HS256'],
      });
      const usuario = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
      if (!usuario || !usuario.activo) throw new UnauthorizedException();
      return this.emitirTokens(usuario);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async hashPassword(password: string) {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  private emitirTokens(usuario: {
    id: string;
    tenantId: string | null;
    rol: string;
    email: string;
    nombre: string;
  }) {
    const payload = {
      sub: usuario.id,
      tenantId: usuario.tenantId,
      rol: usuario.rol,
      email: usuario.email,
      nombre: usuario.nombre,
    };
    return {
      accessToken: this.jwt.sign(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
        algorithm: 'HS256',
      }),
      refreshToken: this.jwt.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
        algorithm: 'HS256',
      }),
    };
  }

  private async registrarIntento(
    usuarioId: string | null,
    email: string,
    ip: string | undefined,
    exito: boolean,
  ) {
    await this.prisma.auditLog
      .create({
        data: {
          usuarioId: usuarioId ?? undefined,
          accion: exito ? 'LOGIN_OK' : 'LOGIN_FAIL',
          entidad: 'usuario',
          entidadId: usuarioId ?? undefined,
          ip,
          // se recorta: el campo de correo a veces recibe contraseñas escritas por error
          metadata: { email: email.slice(0, 100) },
        },
      })
      .catch(() => {});
  }
}
