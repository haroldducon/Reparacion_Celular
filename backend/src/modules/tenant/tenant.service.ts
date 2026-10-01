import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { ActualizarTenantDto } from './dto';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async obtener(usuario: UsuarioAutenticado) {
    if (!usuario.tenantId) throw new BadRequestException('Este usuario no pertenece a un taller');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: usuario.tenantId },
      select: { id: true, nombre: true },
    });
    if (!tenant) throw new NotFoundException('Taller no encontrado');
    return tenant;
  }

  async actualizar(usuario: UsuarioAutenticado, dto: ActualizarTenantDto) {
    if (!usuario.tenantId) throw new BadRequestException('Este usuario no pertenece a un taller');

    // ADMIN solo puede editar SU PROPIO taller — se filtra explícitamente por
    // tenantId porque la tabla tenants no tiene Row-Level Security (es la
    // raíz del aislamiento, no un dato que cuelgue de un tenant).
    return this.prisma.tenant.update({
      where: { id: usuario.tenantId },
      data: { nombre: dto.nombre },
      select: { id: true, nombre: true },
    });
  }
}