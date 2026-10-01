import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ActualizarUsuarioDto, CambiarActivoDto, CrearUsuarioDto, ResetearPasswordDto } from './dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Post()
  crear(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crear(usuario, dto);
  }

  @Get()
  listar(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.usuariosService.listar(usuario);
  }

  @Patch(':id')
  actualizar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.usuariosService.actualizar(usuario, id, dto);
  }

  @Patch(':id/password')
  resetearPassword(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetearPasswordDto,
  ) {
    return this.usuariosService.resetearPassword(usuario, id, dto);
  }

  @Patch(':id/activo')
  cambiarActivo(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarActivoDto,
  ) {
    return this.usuariosService.cambiarActivo(usuario, id, dto.activo);
  }
}