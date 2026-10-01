import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { filtroImagen, firmaImagenValida } from '../../common/upload.util';
import {
  ActualizarDiagnosticoDto,
  AutorizarEntregaDto,
  CambiarEstadoDto,
  CrearOrdenDto,
  ComentarioDto,
  MarcarPresupuestoDto,
  ReabrirOrdenDto,
  RegistrarEntregaDto,
  RegistrarReparacionDto,
  SubirFotoDto,
} from './dto';
import { OrdenesService } from './ordenes.service';
import { StorageService } from './storage.service';

@Controller('ordenes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdenesController {
  constructor(
    private ordenesService: OrdenesService,
    private storage: StorageService,
  ) {}

  @Post()
  @Roles('ADMIN', 'TECNICO', 'RECEPCION')
  crear(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: CrearOrdenDto) {
    return this.ordenesService.crear(usuario, dto);
  }

  @Get()
  @Roles('ADMIN', 'TECNICO', 'RECEPCION')
  listar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('estado') estado?: string,
    @Query('buscar') buscar?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    // Con ?page= se devuelve { data, total, ... } paginado (historial completo).
    // Sin ?page= se devuelve el arreglo de siempre (colas de trabajo: pendientes, en reparación, por entregar).
    return this.ordenesService.listar(usuario, estado, buscar, page ? Number(page) : undefined, Number(pageSize) || 10);
  }

  @Get(':id')
  @Roles('ADMIN', 'TECNICO', 'RECEPCION')
  obtenerPorId(@CurrentUser() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordenesService.obtenerPorId(usuario, id);
  }

  @Patch(':id/diagnostico')
  @Roles('ADMIN', 'TECNICO')
  cargarDiagnostico(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarDiagnosticoDto,
  ) {
    return this.ordenesService.cargarDiagnostico(usuario, id, dto);
  }

  @Patch(':id/presupuesto')
  @Roles('ADMIN', 'TECNICO')
  marcarPresupuesto(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarcarPresupuestoDto,
  ) {
    return this.ordenesService.marcarPresupuesto(usuario, id, dto);
  }

  @Patch(':id/reparacion')
  @Roles('ADMIN', 'TECNICO')
  registrarReparacion(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrarReparacionDto,
  ) {
    return this.ordenesService.registrarReparacion(usuario, id, dto);
  }

  @Patch(':id/estado')
  @Roles('ADMIN', 'TECNICO')
  cambiarEstado(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarEstadoDto,
  ) {
    return this.ordenesService.cambiarEstado(usuario, id, dto);
  }

  @Patch(':id/entrega')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Roles('ADMIN', 'TECNICO', 'RECEPCION', 'SUPER_ADMIN')
  registrarEntrega(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrarEntregaDto,
  ) {
    return this.ordenesService.registrarEntrega(usuario, id, dto);
  }

  @Post(':id/entrega/autorizacion')
  // verifica la contraseña del admin: límite bajo para frenar fuerza bruta con un token robado
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Roles('ADMIN', 'SUPER_ADMIN')
  autorizarEntrega(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AutorizarEntregaDto,
  ) {
    return this.ordenesService.autorizarEntrega(usuario, id, dto.password);
  }

  @Post(':id/fotos')
  @Roles('ADMIN', 'TECNICO', 'RECEPCION')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: memoryStorage(), // se valida en memoria y luego se guarda en Cloudinary (o disco en desarrollo)
      limits: { fileSize: 8 * 1024 * 1024, files: 1 }, // 8MB
      fileFilter: filtroImagen,
    }),
  )
  async subirFoto(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubirFotoDto,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    if (!archivo?.buffer) throw new BadRequestException('Adjunta una imagen en el campo "foto".');
    if (!firmaImagenValida(archivo.buffer)) {
      throw new BadRequestException('El archivo no es una imagen válida.');
    }
    const guardada = await this.storage.guardar(archivo.buffer, archivo.mimetype);
    try {
      return await this.ordenesService.agregarFoto(usuario, id, dto.tipo, guardada.url);
    } catch (e) {
      await this.storage.eliminar(guardada.ref); // no dejar archivos huérfanos si la orden no existe o no es tuya
      throw e;
    }
  }

  @Post(':id/comentarios')
  @Roles('ADMIN', 'TECNICO', 'RECEPCION')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  comentar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ComentarioDto,
  ) {
    return this.ordenesService.comentar(usuario, id, dto);
  }

  /** Reabrir una orden cerrada: solo administradores y con su contraseña. */
  @Post(':id/reabrir')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  reabrir(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReabrirOrdenDto,
  ) {
    return this.ordenesService.reabrir(usuario, id, dto);
  }
}
