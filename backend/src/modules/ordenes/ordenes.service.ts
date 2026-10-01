import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { claveTenant, escapeHtml, filtroTenant, urlFrontend } from '../../common/tenant.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { QueueService } from '../queue/queue.service';
import {
  ActualizarDiagnosticoDto,
  CambiarEstadoDto,
  ComentarioDto,
  CrearOrdenDto,
  MarcarPresupuestoDto,
  ReabrirOrdenDto,
  RegistrarEntregaDto,
  RegistrarReparacionDto,
} from './dto';

const NS_ORDENES = 'ordenes';
const MAX_FOTOS_POR_ORDEN = 30;
const ESTADOS_VALIDOS = ['RECEPCION', 'DIAGNOSTICO', 'EN_REPARACION', 'REPARADO', 'ENTREGADO', 'CANCELADO'];

/**
 * Máquina de estados. ENTREGADO solo se alcanza desde el módulo de Entregas
 * (registrarEntrega) y las órdenes cerradas no se pueden reabrir, para que nadie
 * altere cobros o reportes ya cerrados con un simple cambio de estado.
 */
const TRANSICIONES: Record<string, string[]> = {
  RECEPCION: ['DIAGNOSTICO', 'CANCELADO'],
  DIAGNOSTICO: ['EN_REPARACION', 'CANCELADO'],
  EN_REPARACION: ['REPARADO', 'DIAGNOSTICO', 'CANCELADO'],
  REPARADO: ['EN_REPARACION', 'CANCELADO'],
  ENTREGADO: [],
  CANCELADO: [],
};

type Tx = Parameters<Parameters<PrismaService['forTenant']>[1]>[0];

@Injectable()
export class OrdenesService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private queue: QueueService,
  ) {}

  private ctx(u: UsuarioAutenticado) {
    return { tenantId: u.tenantId, rol: u.rol };
  }

  /** Los correos son secundarios: si la cola (Redis) falla, la operación principal no debe fallar. */
  private async notificar(data: { tenantId: string | null; destinatario: string; asunto: string; html: string }) {
    try {
      await this.queue.encolarEmail(data);
    } catch (e) {
      console.warn('[ordenes] No se pudo encolar el correo:', (e as Error).message);
    }
  }

  private enlaceSeguimiento(ordenId: string) {
    const base = urlFrontend();
    if (!base) return '';
    const url = `${base}/seguimiento/${ordenId}`;
    return `<p style="margin-top:18px"><a href="${escapeHtml(url)}" style="background:#c77945;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Ver el estado de mi equipo</a></p>`;
  }

  private registrarHistorial(
    tx: Tx,
    ordenId: string,
    anterior: string,
    nuevo: string,
    usuarioId: string,
    nota?: string,
    visibleCliente = false,
  ) {
    return tx.historialEstado.create({
      data: { ordenId, estadoAnterior: anterior, estadoNuevo: nuevo, usuarioId, nota, visibleCliente },
    });
  }

  async crear(usuario: UsuarioAutenticado, dto: CrearOrdenDto) {
    if (!usuario.tenantId) {
      throw new ForbiddenException('Tu usuario no pertenece a un taller; no puede crear órdenes');
    }
    const tenantId = usuario.tenantId;

    const orden = await this.prisma.forTenant(this.ctx(usuario), async (tx) => {
      let clienteId = dto.clienteId;

      if (!clienteId) {
        if (!dto.clienteNombre || !dto.clienteTelefono) {
          throw new BadRequestException(
            'Indica clienteId de un cliente existente, o clienteNombre + clienteTelefono para crear uno nuevo',
          );
        }
        const clienteNuevo = await tx.cliente.create({
          data: {
            tenantId,
            nombre: dto.clienteNombre,
            telefono: dto.clienteTelefono,
            email: dto.clienteEmail,
          },
        });
        clienteId = clienteNuevo.id;
      } else {
        // el cliente debe pertenecer a ESTE taller (evita enlazar órdenes a clientes ajenos)
        const cliente = await tx.cliente.findFirst({ where: { id: clienteId, tenantId }, select: { id: true } });
        if (!cliente) throw new NotFoundException('El cliente indicado no existe');
        if (dto.clienteEmail) {
          await tx.cliente.updateMany({
            where: { id: clienteId, tenantId, email: null },
            data: { email: dto.clienteEmail },
          });
        }
      }

      const nueva = await tx.ordenReparacion.create({
        data: {
          tenantId,
          clienteId,
          recepcionistaId: usuario.sub,
          estado: 'RECEPCION',
          marca: dto.marca,
          modelo: dto.modelo,
          imei: dto.imei,
          color: dto.color,
          accesoriosRecibidos: dto.accesoriosRecibidos,
          fallaReportada: dto.fallaReportada,
        },
        include: { cliente: true },
      });
      await this.registrarHistorial(tx, nueva.id, 'INICIO', 'RECEPCION', usuario.sub, 'Equipo recibido', true);
      return nueva;
    });

    await this.cache.invalidateNamespace(tenantId, NS_ORDENES);

    if (orden.cliente.email) {
      await this.notificar({
        tenantId,
        destinatario: orden.cliente.email,
        asunto: `Recibimos tu ${orden.marca} ${orden.modelo}`,
        html: `<p>Hola ${escapeHtml(orden.cliente.nombre)}, confirmamos la recepción de tu equipo. Falla reportada: "${escapeHtml(orden.fallaReportada)}". Te avisaremos cuando esté listo el diagnóstico.</p>${this.enlaceSeguimiento(orden.id)}`,
      });
    }

    return orden;
  }

  listar(usuario: UsuarioAutenticado, estado?: string, buscar?: string, page?: number, pageSize = 10) {
    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      throw new BadRequestException('Estado inválido');
    }
    const filtro = buscar?.trim().slice(0, 100);
    const base = filtroTenant(usuario);
    const include = { cliente: true, fotos: true, repuestos: true, tecnico: { select: { nombre: true } } };
    const where = {
      ...base,
      ...(estado ? { estado: estado as any } : {}),
      ...(filtro
        ? {
            OR: [
              { id: { startsWith: filtro, mode: 'insensitive' as const } },
              { marca: { contains: filtro, mode: 'insensitive' as const } },
              { modelo: { contains: filtro, mode: 'insensitive' as const } },
              { imei: { contains: filtro, mode: 'insensitive' as const } },
              { cliente: { nombre: { contains: filtro, mode: 'insensitive' as const } } },
              { cliente: { telefono: { contains: filtro, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    // Modo paginado: busca en TODO el histórico y devuelve una página.
    if (page !== undefined) {
      const tamano = Math.min(Math.max(Math.floor(pageSize) || 10, 1), 50);
      const pagina = Math.max(Math.floor(page) || 1, 1);
      return this.prisma.forTenant(this.ctx(usuario), async (tx) => {
        const total = await tx.ordenReparacion.count({ where });
        const data = await tx.ordenReparacion.findMany({
          where,
          include,
          orderBy: { fechaRecepcion: 'desc' },
          skip: (pagina - 1) * tamano,
          take: tamano,
        });
        return { data, total, page: pagina, pageSize: tamano, totalPages: Math.max(1, Math.ceil(total / tamano)) };
      });
    }

    // Modo cola de trabajo (sin página): arreglo con las más recientes, con caché de 30 s.
    if (filtro) {
      return this.prisma.forTenant(this.ctx(usuario), (tx) =>
        tx.ordenReparacion.findMany({ where, include, orderBy: { fechaRecepcion: 'desc' }, take: 200 }),
      );
    }
    return this.cache.getOrSet(claveTenant(usuario), NS_ORDENES, `lista:${estado ?? 'todas'}`, 30, () =>
      this.prisma.forTenant(this.ctx(usuario), (tx) =>
        tx.ordenReparacion.findMany({ where, include, orderBy: { fechaRecepcion: 'desc' }, take: 500 }),
      ),
    );
  }

  async obtenerPorId(usuario: UsuarioAutenticado, ordenId: string) {
    const orden = await this.prisma.forTenant(this.ctx(usuario), (tx) =>
      tx.ordenReparacion.findFirst({
        where: { id: ordenId, ...filtroTenant(usuario) },
        include: {
          cliente: true,
          fotos: { orderBy: { createdAt: 'asc' } },
          repuestos: true,
          historial: { orderBy: { createdAt: 'asc' } },
        },
      }),
    );
    if (!orden) throw new NotFoundException('Orden no encontrada');
    return orden;
  }

  /** Guarda únicamente el diagnóstico y la cotización de la reparación. */
  async cargarDiagnostico(usuario: UsuarioAutenticado, ordenId: string, dto: ActualizarDiagnosticoDto) {
    const orden = await this.prisma.forTenant(this.ctx(usuario), async (tx) => {
      const existente = await tx.ordenReparacion.findFirst({
        where: { id: ordenId, ...filtroTenant(usuario) },
        include: { cliente: true },
      });
      if (!existente) throw new NotFoundException('Orden no encontrada');
      if (existente.estado === 'CANCELADO' || existente.estado === 'ENTREGADO') {
        throw new BadRequestException('No se puede editar el diagnóstico de una orden cerrada');
      }

      // Si se cambia la cotización, el cliente debe volver a decidir.
      const cambioCotizacion =
        existente.presupuestoReparacion == null ||
        Number(existente.presupuestoReparacion) !== Number(dto.presupuestoReparacion);
      if (cambioCotizacion && existente.estado === 'EN_REPARACION') {
        throw new BadRequestException('No puedes cambiar la cotización con la reparación en curso');
      }

      const pasaADiagnostico = existente.estado === 'RECEPCION';
      const actualizada = await tx.ordenReparacion.update({
        where: { id: ordenId },
        data: {
          diagnostico: dto.diagnostico,
          presupuestoReparacion: dto.presupuestoReparacion,
          fechaDiagnostico: new Date(),
          estado: pasaADiagnostico ? 'DIAGNOSTICO' : existente.estado,
          ...(cambioCotizacion && existente.estadoPresupuesto !== 'PENDIENTE'
            ? { estadoPresupuesto: 'PENDIENTE' as const, fechaAceptacionPresupuesto: null }
            : {}),
        },
        include: { cliente: true },
      });
      if (pasaADiagnostico) {
        await this.registrarHistorial(tx, ordenId, 'RECEPCION', 'DIAGNOSTICO', usuario.sub, 'Diagnóstico registrado', true);
      }
      return actualizada;
    });

    await this.cache.invalidateNamespace(claveTenant(usuario), NS_ORDENES);

    if (orden.cliente.email) {
      await this.notificar({
        tenantId: usuario.tenantId,
        destinatario: orden.cliente.email,
        asunto: `Diagnóstico listo: ${orden.marca} ${orden.modelo}`,
        html: `<p>Hola ${escapeHtml(orden.cliente.nombre)}, ya tenemos el diagnóstico de tu equipo: "${escapeHtml(orden.diagnostico)}". El valor estimado de la reparación es $${escapeHtml(Number(orden.presupuestoReparacion ?? 0).toLocaleString('es-CO'))}. Pronto te contactaremos para confirmar si deseas continuar.</p>${this.enlaceSeguimiento(orden.id)}`,
      });
    }

    return orden;
  }

  /** Registra si el cliente acepta la cotización, sin agregar costos de ejecución al diagnóstico. */
  async marcarPresupuesto(usuario: UsuarioAutenticado, ordenId: string, dto: MarcarPresupuestoDto) {
    const orden = await this.prisma.forTenant(this.ctx(usuario), async (tx) => {
      const existente = await tx.ordenReparacion.findFirst({
        where: { id: ordenId, ...filtroTenant(usuario) },
        include: { cliente: true },
      });
      if (!existente) throw new NotFoundException('Orden no encontrada');
      if (existente.diagnostico == null || existente.presupuestoReparacion == null) {
        throw new BadRequestException('Primero guarda el diagnóstico y el valor de la reparación');
      }
      if (existente.estado === 'CANCELADO' || existente.estado === 'ENTREGADO') {
        throw new BadRequestException('No se puede cambiar el presupuesto de una orden cerrada');
      }
      if (existente.estado === 'EN_REPARACION' || existente.estado === 'REPARADO') {
        throw new BadRequestException('La reparación ya está en curso: el presupuesto no se puede modificar');
      }

      return tx.ordenReparacion.update({
        where: { id: ordenId },
        data: {
          estadoPresupuesto: dto.estado as any,
          fechaAceptacionPresupuesto: dto.estado === 'ACEPTADO' ? new Date() : null,
        },
        include: { cliente: true },
      });
    });

    await this.cache.invalidateNamespace(claveTenant(usuario), NS_ORDENES);
    return orden;
  }

  /** Guarda repuestos reales, valor cobrado y observaciones de ejecución. */
  async registrarReparacion(usuario: UsuarioAutenticado, ordenId: string, dto: RegistrarReparacionDto) {
    const orden = await this.prisma.forTenant(this.ctx(usuario), async (tx) => {
      const existente = await tx.ordenReparacion.findFirst({
        where: { id: ordenId, ...filtroTenant(usuario) },
        include: { cliente: true },
      });
      if (!existente) throw new NotFoundException('Orden no encontrada');
      if (existente.estadoPresupuesto !== 'ACEPTADO') {
        throw new BadRequestException('El cliente debe aceptar el presupuesto antes de iniciar la reparación');
      }
      if (existente.estado === 'CANCELADO' || existente.estado === 'ENTREGADO') {
        throw new BadRequestException('No se puede editar una reparación cerrada');
      }
      if (existente.presupuestoReparacion == null) {
        throw new BadRequestException('La orden no tiene un presupuesto aprobado');
      }

      const repuestos = dto.repuestos ?? [];
      const costoRepuestos = repuestos.reduce((sum, r) => sum + r.costo * (r.cantidad ?? 1), 0);

      await tx.itemRepuesto.deleteMany({ where: { ordenId } });
      if (repuestos.length) {
        await tx.itemRepuesto.createMany({
          data: repuestos.map((r) => ({ ordenId, nombre: r.nombre, costo: r.costo, cantidad: r.cantidad ?? 1 })),
        });
      }

      const inicia = existente.estado === 'DIAGNOSTICO';
      const actualizada = await tx.ordenReparacion.update({
        where: { id: ordenId },
        data: {
          costoRepuestos,
          precioCobrado: existente.presupuestoReparacion,
          observaciones: dto.observaciones,
          tecnicoId: usuario.sub,
          estado: inicia ? 'EN_REPARACION' : existente.estado,
        },
        include: { cliente: true, repuestos: true },
      });
      if (inicia) {
        await this.registrarHistorial(tx, ordenId, 'DIAGNOSTICO', 'EN_REPARACION', usuario.sub, 'Reparación iniciada', true);
      }
      return actualizada;
    });

    await this.cache.invalidateNamespace(claveTenant(usuario), NS_ORDENES);
    return orden;
  }

  async cambiarEstado(usuario: UsuarioAutenticado, ordenId: string, dto: CambiarEstadoDto) {
    if (dto.estado === 'ENTREGADO') {
      throw new BadRequestException('La entrega se registra desde el módulo de Entregas');
    }

    const orden = await this.prisma.forTenant(this.ctx(usuario), async (tx) => {
      const existente = await tx.ordenReparacion.findFirst({
        where: { id: ordenId, ...filtroTenant(usuario) },
        include: { cliente: true },
      });
      if (!existente) throw new NotFoundException('Orden no encontrada');

      // mismo estado: no hay nada que hacer
      if (existente.estado === dto.estado) return existente;

      if (!TRANSICIONES[existente.estado]?.includes(dto.estado)) {
        throw new BadRequestException(`No se puede pasar de "${existente.estado}" a "${dto.estado}"`);
      }
      if (dto.estado === 'EN_REPARACION' && existente.estadoPresupuesto !== 'ACEPTADO') {
        throw new BadRequestException('El cliente debe aceptar el presupuesto antes de iniciar la reparación');
      }
      if (dto.estado === 'REPARADO' && existente.precioCobrado == null) {
        throw new BadRequestException('Registra primero el valor cobrado y los repuestos de la reparación');
      }

      const actualizada = await tx.ordenReparacion.update({
        where: { id: ordenId },
        data: {
          estado: dto.estado as any,
          tecnicoId: dto.estado === 'REPARADO' && !existente.tecnicoId ? usuario.sub : existente.tecnicoId,
          fechaReparado: dto.estado === 'REPARADO' ? new Date() : existente.fechaReparado,
        },
        include: { cliente: true },
      });

      await this.registrarHistorial(tx, ordenId, existente.estado, dto.estado, usuario.sub, dto.nota);
      return actualizada;
    });

    await this.cache.invalidateNamespace(claveTenant(usuario), NS_ORDENES);

    if (dto.estado === 'REPARADO' && orden.cliente.email) {
      await this.notificar({
        tenantId: usuario.tenantId,
        destinatario: orden.cliente.email,
        asunto: `¡Tu ${orden.marca} ${orden.modelo} está listo!`,
        html: `<p>Hola ${escapeHtml(orden.cliente.nombre)}, tu equipo ya está reparado y listo para que lo recojas en el taller.</p>${this.enlaceSeguimiento(orden.id)}`,
      });
    }

    return orden;
  }

  async registrarEntrega(usuario: UsuarioAutenticado, ordenId: string, dto: RegistrarEntregaDto) {
    const orden = await this.prisma.forTenant(this.ctx(usuario), async (tx) => {
      const existente = await tx.ordenReparacion.findFirst({
        where: { id: ordenId, ...filtroTenant(usuario) },
        include: { cliente: true, repuestos: true },
      });
      if (!existente) throw new NotFoundException('Orden no encontrada');
      if (existente.estado !== 'REPARADO') {
        throw new BadRequestException('Solo puedes entregar equipos marcados como reparados');
      }

      const actuales = existente.repuestos.map((r) => ({
        nombre: r.nombre,
        costo: Number(r.costo),
        cantidad: r.cantidad,
      }));
      const repuestos = dto.repuestos
        ? dto.repuestos.map((r) => ({ nombre: r.nombre, costo: r.costo, cantidad: r.cantidad ?? 1 }))
        : actuales;
      const repuestosCambiaron = dto.repuestos ? JSON.stringify(repuestos) !== JSON.stringify(actuales) : false;
      const precioCambio = Number(dto.precioCobrado) !== Number(existente.precioCobrado ?? 0);
      if (precioCambio || repuestosCambiaron) {
        await this.verificarPasswordAdministrador(usuario, dto.password);
      }

      // Bloqueo optimista: solo una petición puede pasar de REPARADO a ENTREGADO
      // (evita doble entrega si se pulsa dos veces o llegan dos peticiones a la vez).
      const costoRepuestos = repuestos.reduce((total, r) => total + r.costo * (r.cantidad ?? 1), 0);
      const { count } = await tx.ordenReparacion.updateMany({
        where: { id: ordenId, estado: 'REPARADO', ...filtroTenant(usuario) },
        data: {
          costoRepuestos,
          precioCobrado: dto.precioCobrado,
          estado: 'ENTREGADO',
          fechaEntrega: new Date(),
        },
      });
      if (count === 0) throw new BadRequestException('Este equipo ya fue entregado');

      await tx.itemRepuesto.deleteMany({ where: { ordenId } });
      if (repuestos.length) {
        await tx.itemRepuesto.createMany({
          data: repuestos.map((r) => ({ ordenId, nombre: r.nombre, costo: r.costo, cantidad: r.cantidad ?? 1 })),
        });
      }
      await this.registrarHistorial(tx, ordenId, 'REPARADO', 'ENTREGADO', usuario.sub, 'Equipo entregado al cliente', true);

      return tx.ordenReparacion.findFirstOrThrow({ where: { id: ordenId }, include: { cliente: true } });
    });

    await this.cache.invalidateNamespace(claveTenant(usuario), NS_ORDENES);

    if (orden.cliente.email) {
      await this.notificar({
        tenantId: usuario.tenantId,
        destinatario: orden.cliente.email,
        asunto: `Tu ${orden.marca} ${orden.modelo} ha sido entregado`,
        html: `<p>Hola ${escapeHtml(orden.cliente.nombre)}, tu equipo fue entregado con éxito. ¡Gracias por tu confianza!</p>`,
      });
    }

    return orden;
  }

  async autorizarEntrega(usuario: UsuarioAutenticado, ordenId: string, password?: string) {
    await this.verificarPasswordAdministrador(usuario, password);

    const orden = await this.prisma.forTenant(this.ctx(usuario), (tx) =>
      tx.ordenReparacion.findFirst({
        where: { id: ordenId, ...filtroTenant(usuario) },
        select: { id: true, estado: true },
      }),
    );
    if (!orden) throw new NotFoundException('Orden no encontrada');
    if (orden.estado !== 'REPARADO') {
      throw new BadRequestException('Solo puedes entregar equipos marcados como reparados');
    }

    return { autorizado: true };
  }

  private async verificarPasswordAdministrador(usuario: UsuarioAutenticado, password?: string) {
    if (usuario.rol !== 'ADMIN' && usuario.rol !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Solo un administrador puede autorizar la entrega');
    }

    const administrador = await this.prisma.usuario.findUnique({ where: { id: usuario.sub } });
    const valida =
      !!administrador && !!password && (await argon2.verify(administrador.passwordHash, password).catch(() => false));
    if (!valida) throw new ForbiddenException('La contraseña del administrador no es válida');
  }

  /** Comentario sobre la orden. Si visibleCliente = true, aparece en la página pública de seguimiento. */
  async comentar(usuario: UsuarioAutenticado, ordenId: string, dto: ComentarioDto) {
    return this.prisma.forTenant(this.ctx(usuario), async (tx) => {
      const orden = await tx.ordenReparacion.findFirst({
        where: { id: ordenId, ...filtroTenant(usuario) },
        select: { id: true, estado: true },
      });
      if (!orden) throw new NotFoundException('Orden no encontrada');
      return this.registrarHistorial(tx, ordenId, orden.estado, orden.estado, usuario.sub, dto.texto, dto.visibleCliente);
    });
  }

  /**
   * Reabre una orden CANCELADA o ENTREGADA. Solo un administrador y con su contraseña.
   * Queda registrado en el historial (quién, cuándo y por qué). Una entrega reabierta vuelve a
   * REPARADO y deja de contar en los reportes hasta que se entregue de nuevo.
   */
  async reabrir(usuario: UsuarioAutenticado, ordenId: string, dto: ReabrirOrdenDto) {
    await this.verificarPasswordAdministrador(usuario, dto.password);

    const orden = await this.prisma.forTenant(this.ctx(usuario), async (tx) => {
      const existente = await tx.ordenReparacion.findFirst({
        where: { id: ordenId, ...filtroTenant(usuario) },
      });
      if (!existente) throw new NotFoundException('Orden no encontrada');
      if (existente.estado !== 'CANCELADO' && existente.estado !== 'ENTREGADO') {
        throw new BadRequestException('Solo se pueden reabrir órdenes canceladas o entregadas');
      }

      const destino = existente.estado === 'ENTREGADO' ? 'REPARADO' : existente.diagnostico ? 'DIAGNOSTICO' : 'RECEPCION';
      const { count } = await tx.ordenReparacion.updateMany({
        where: { id: ordenId, estado: existente.estado, ...filtroTenant(usuario) },
        data: { estado: destino, ...(existente.estado === 'ENTREGADO' ? { fechaEntrega: null } : {}) },
      });
      if (count === 0) throw new BadRequestException('La orden cambió mientras la reabrías. Intenta de nuevo.');

      await this.registrarHistorial(
        tx,
        ordenId,
        existente.estado,
        destino,
        usuario.sub,
        `Orden reabierta por el administrador. Motivo: ${dto.motivo}`,
      );
      return tx.ordenReparacion.findFirstOrThrow({ where: { id: ordenId }, include: { cliente: true } });
    });

    await this.cache.invalidateNamespace(claveTenant(usuario), NS_ORDENES);
    return orden;
  }

  async agregarFoto(usuario: UsuarioAutenticado, ordenId: string, tipo: string, urlRelativa: string) {
    const foto = await this.prisma.forTenant(this.ctx(usuario), async (tx) => {
      const existente = await tx.ordenReparacion.findFirst({
        where: { id: ordenId, ...filtroTenant(usuario) },
        select: { id: true },
      });
      if (!existente) throw new NotFoundException('Orden no encontrada');

      const total = await tx.fotoOrden.count({ where: { ordenId } });
      if (total >= MAX_FOTOS_POR_ORDEN) {
        throw new BadRequestException(`Cada orden admite hasta ${MAX_FOTOS_POR_ORDEN} fotos`);
      }

      return tx.fotoOrden.create({
        data: { ordenId, tipo: tipo as any, url: urlRelativa },
      });
    });

    await this.cache.invalidateNamespace(claveTenant(usuario), NS_ORDENES);
    return foto;
  }
}
