import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { filtroTenant } from '../../common/tenant.util';
import { PrismaService } from '../../prisma/prisma.service';
import { ActualizarUsuarioDto, CrearUsuarioDto, ResetearPasswordDto } from './dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async crear(quienCrea: UsuarioAutenticado, dto: CrearUsuarioDto) {
    // ADMIN solo puede crear usuarios dentro de su propio taller, y nunca
    // puede crear otro super_admin (evita escalar privilegios).
    if (quienCrea.rol === 'ADMIN' && dto.rol === 'SUPER_ADMIN') {
      throw new ForbiddenException('Un admin no puede crear usuarios super_admin');
    }

    // SUPER_ADMIN puede crear para cualquier tenant (o ninguno, si crea otro super_admin)
    const tenantId =
      quienCrea.rol === 'SUPER_ADMIN' ? (dto.rol === 'SUPER_ADMIN' ? null : dto.tenantId ?? null) : quienCrea.tenantId;

    if (quienCrea.rol === 'SUPER_ADMIN' && dto.rol !== 'SUPER_ADMIN' && !tenantId) {
      throw new ForbiddenException('Debes indicar a qué taller (tenantId) pertenece este usuario');
    }
    if (tenantId) {
      const taller = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
      if (!taller) throw new BadRequestException('El taller indicado no existe');
    }

    const email = dto.email.trim().toLowerCase();
    const existente = await this.prisma.usuario.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existente) throw new ConflictException('Ya existe un usuario con ese correo');

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    return this.prisma.forTenant({ tenantId: quienCrea.tenantId, rol: quienCrea.rol }, (tx) =>
      tx.usuario.create({
        data: {
          email,
          nombre: dto.nombre,
          rol: dto.rol as any,
          passwordHash,
          tenantId,
        },
        select: { id: true, email: true, nombre: true, rol: true, activo: true, tenantId: true },
      }),
    );
  }

  listar(quien: UsuarioAutenticado) {
    return this.prisma.forTenant({ tenantId: quien.tenantId, rol: quien.rol }, (tx) =>
      tx.usuario.findMany({
        where: filtroTenant(quien),
        select: { id: true, email: true, nombre: true, rol: true, activo: true, ultimoLogin: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  cambiarActivo(quien: UsuarioAutenticado, usuarioId: string, activo: boolean) {
    if (usuarioId === quien.sub && !activo) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    return this.prisma.forTenant({ tenantId: quien.tenantId, rol: quien.rol }, async (tx) => {
      const existente = await tx.usuario.findFirst({
        where: { id: usuarioId, ...filtroTenant(quien) },
        select: { id: true },
      });
      if (!existente) throw new NotFoundException('Usuario no encontrado');

      return tx.usuario.update({
        where: { id: usuarioId },
        data: { activo },
        select: { id: true, activo: true },
      });
    });
  }

  async actualizar(quien: UsuarioAutenticado, usuarioId: string, dto: ActualizarUsuarioDto) {
    // Un admin no puede ascender a nadie (ni a sí mismo) a super_admin.
    if (quien.rol === 'ADMIN' && dto.rol === 'SUPER_ADMIN') {
      throw new ForbiddenException('Un admin no puede asignar el rol super_admin');
    }
    // Evita quedarse sin administrador por accidente.
    if (usuarioId === quien.sub && dto.rol && dto.rol !== quien.rol) {
      throw new BadRequestException('No puedes cambiar tu propio rol');
    }

    return this.prisma.forTenant({ tenantId: quien.tenantId, rol: quien.rol }, async (tx) => {
      const existente = await tx.usuario.findFirst({
        where: { id: usuarioId, ...filtroTenant(quien) },
        select: { id: true },
      });
      if (!existente) throw new NotFoundException('Usuario no encontrado');

      return tx.usuario.update({
        where: { id: usuarioId },
        data: { nombre: dto.nombre, rol: dto.rol as any },
        select: { id: true, email: true, nombre: true, rol: true, activo: true },
      });
    });
  }

  async resetearPassword(quien: UsuarioAutenticado, usuarioId: string, dto: ResetearPasswordDto) {
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    return this.prisma.forTenant({ tenantId: quien.tenantId, rol: quien.rol }, async (tx) => {
      const existente = await tx.usuario.findFirst({
        where: { id: usuarioId, ...filtroTenant(quien) },
        select: { id: true },
      });
      if (!existente) throw new NotFoundException('Usuario no encontrado');

      await tx.usuario.update({ where: { id: usuarioId }, data: { passwordHash } });
      return { ok: true };
    });
  }
}
