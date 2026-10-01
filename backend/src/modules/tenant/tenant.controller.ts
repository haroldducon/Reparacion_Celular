import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser, UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ActualizarTenantDto } from './dto';
import { TenantService } from './tenant.service';

@Controller('tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Get()
  @Roles('ADMIN', 'TECNICO', 'RECEPCION', 'SUPER_ADMIN') // cualquiera del taller puede ver el nombre (para el sidebar)
  obtener(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.tenantService.obtener(usuario);
  }

  @Patch()
  @Roles('ADMIN', 'SUPER_ADMIN') // solo el admin puede cambiar el nombre del negocio
  actualizar(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: ActualizarTenantDto) {
    return this.tenantService.actualizar(usuario, dto);
  }
}