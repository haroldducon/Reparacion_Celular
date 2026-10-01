import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SolicitarReporteIADto } from './dto';
import { ReportesService } from './reportes.service';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class ReportesController {
  constructor(private reportesService: ReportesService) {}

  @Get('resumen-estados')
  resumenEstados(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.reportesService.resumenEstados(usuario);
  }

  @Get('top-modelos')
  topModelos(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.reportesService.topModelos(usuario);
  }

  @Get('clientes-recurrentes')
  clientesRecurrentes(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.reportesService.clientesRecurrentes(usuario);
  }

  @Get('margen')
  margen(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.reportesService.margenPorRango(usuario, desde, hasta);
  }

  @Get('margen-equipos')
  margenEquipos(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.reportesService.margenPorEquipo(usuario, desde, hasta);
  }

  @Get('top-repuestos-usados')
  topRepuestosUsados(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('limite') limite?: string,
  ) {
    const limiteSeguro = Math.min(Math.max(Number(limite) || 10, 1), 50);
    return this.reportesService.topRepuestosUsados(usuario, desde, hasta, limiteSeguro);
  }

  // Cada reporte con IA consume crédito de la API: límite bajo por usuario/IP.
  @Post('ia')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  solicitarReporteIA(@CurrentUser() usuario: UsuarioAutenticado, @Body() body: SolicitarReporteIADto) {
    return this.reportesService.solicitarReporteIA(usuario, body.periodoInicio, body.periodoFin);
  }

  @Get('ia/:id')
  obtenerReporteIA(@CurrentUser() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.reportesService.obtenerReporteIA(usuario, id);
  }
}
