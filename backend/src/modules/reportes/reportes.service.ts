import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { claveTenant, filtroTenant } from '../../common/tenant.util';
import { diasDelRango, claveDia, limitesRango, parseRango } from '../../common/fechas.util';
import { CacheService } from '../cache/cache.service';
import { QueueService } from '../queue/queue.service';

const NS_REPORTES = 'reportes';
const MAX_INFORMES_IA_DIA = 10;

@Injectable()
export class ReportesService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private queue: QueueService,
  ) {}

  /** Conteo de equipos por estado (para las tarjetas del dashboard) */
  resumenEstados(usuario: UsuarioAutenticado) {
    return this.cache.getOrSet(claveTenant(usuario), NS_REPORTES, 'resumen-estados', 60, () =>
      this.prisma.forTenant({ tenantId: usuario.tenantId, rol: usuario.rol }, async (tx) => {
        const grupos = await tx.ordenReparacion.groupBy({
          by: ['estado'],
          where: filtroTenant(usuario),
          _count: { _all: true },
        });
        return Object.fromEntries(grupos.map((g) => [g.estado, g._count._all]));
      }),
    );
  }

  /** Modelos de teléfono más reparados */
  topModelos(usuario: UsuarioAutenticado, limite = 5) {
    return this.cache.getOrSet(claveTenant(usuario), NS_REPORTES, `top-modelos:${limite}`, 300, () =>
      this.prisma.forTenant({ tenantId: usuario.tenantId, rol: usuario.rol }, async (tx) => {
        const grupos = await tx.ordenReparacion.groupBy({
          by: ['marca', 'modelo'],
          where: filtroTenant(usuario),
          _count: { _all: true },
          orderBy: { _count: { id: 'desc' } },
          take: limite,
        });
        return grupos.map((g) => ({ marca: g.marca, modelo: g.modelo, total: g._count._all }));
      }),
    );
  }

  /** Clientes recurrentes (más de una orden) */
  clientesRecurrentes(usuario: UsuarioAutenticado) {
    return this.cache.getOrSet(claveTenant(usuario), NS_REPORTES, 'clientes-recurrentes', 300, () =>
      this.prisma.forTenant({ tenantId: usuario.tenantId, rol: usuario.rol }, async (tx) => {
        const grupos = await tx.ordenReparacion.groupBy({
          by: ['clienteId'],
          where: filtroTenant(usuario),
          _count: { _all: true },
          having: { clienteId: { _count: { gt: 1 } } },
        });
        const ids = grupos.map((g) => g.clienteId);
        const clientes = await tx.cliente.findMany({ where: { id: { in: ids }, ...filtroTenant(usuario) } });
        return grupos.map((g) => ({
          cliente: clientes.find((c) => c.id === g.clienteId),
          totalOrdenes: g._count._all,
        }));
      }),
    );
  }

  /**
   * Margen de entregas reales en el rango, con TODOS los días del rango
   * presentes (en 0 si no hubo entregas). Los días se calculan en la zona
   * horaria del negocio, no en UTC.
   */
  margenPorRango(usuario: UsuarioAutenticado, desdeEntrada: string, hastaEntrada: string) {
    const [desde, hasta] = parseRango(desdeEntrada, hastaEntrada);
    const { inicio, fin } = limitesRango(desde, hasta);

    return this.prisma.forTenant({ tenantId: usuario.tenantId, rol: usuario.rol }, async (tx) => {
      const entregas = await tx.ordenReparacion.findMany({
        where: { ...filtroTenant(usuario), fechaEntrega: { gte: inicio, lte: fin }, estado: 'ENTREGADO' },
        select: { fechaEntrega: true, precioCobrado: true, costoRepuestos: true },
        orderBy: { fechaEntrega: 'asc' },
      });

      const porFecha = new Map<string, { ingresoTotal: number; costoTotal: number; equiposEntregados: number }>();
      for (const entrega of entregas) {
        const fecha = claveDia(entrega.fechaEntrega!);
        const actual = porFecha.get(fecha) ?? { ingresoTotal: 0, costoTotal: 0, equiposEntregados: 0 };
        actual.ingresoTotal += Number(entrega.precioCobrado ?? 0);
        actual.costoTotal += Number(entrega.costoRepuestos ?? 0);
        actual.equiposEntregados += 1;
        porFecha.set(fecha, actual);
      }

      return diasDelRango(desde, hasta).map((fecha) => {
        const datos = porFecha.get(fecha) ?? { ingresoTotal: 0, costoTotal: 0, equiposEntregados: 0 };
        return { fecha, ...datos, margenTotal: datos.ingresoTotal - datos.costoTotal };
      });
    });
  }

  margenPorEquipo(usuario: UsuarioAutenticado, desdeEntrada: string, hastaEntrada: string) {
    const [desde, hasta] = parseRango(desdeEntrada, hastaEntrada);
    const { inicio, fin } = limitesRango(desde, hasta);

    return this.prisma.forTenant({ tenantId: usuario.tenantId, rol: usuario.rol }, (tx) =>
      tx.ordenReparacion
        .findMany({
          where: { ...filtroTenant(usuario), estado: 'ENTREGADO', fechaEntrega: { gte: inicio, lte: fin } },
          orderBy: { fechaEntrega: 'asc' },
          select: {
            id: true,
            marca: true,
            modelo: true,
            diagnostico: true,
            observaciones: true,
            precioCobrado: true,
            costoRepuestos: true,
            fechaEntrega: true,
            cliente: { select: { nombre: true } },
            tecnico: { select: { nombre: true } },
            repuestos: { select: { nombre: true, costo: true, cantidad: true } },
          },
        })
        .then((ordenes) =>
          ordenes.map((orden) => ({
            ...orden,
            numeroReparacion: orden.id.slice(0, 8).toUpperCase(),
            ganancia: Number(orden.precioCobrado ?? 0) - Number(orden.costoRepuestos),
          })),
        ),
    );
  }

  /**
   * Top de repuestos registrados en órdenes entregadas durante el rango.
   * Suma cantidades por nombre; no representa compras a proveedores si esas
   * compras se almacenan en una tabla independiente del detalle de la orden.
   */
  topRepuestosUsados(usuario: UsuarioAutenticado, desdeEntrada: string, hastaEntrada: string, limite = 10) {
    const [desde, hasta] = parseRango(desdeEntrada, hastaEntrada);
    const { inicio, fin } = limitesRango(desde, hasta);
    const clave = `top-repuestos-usados:${desde}:${hasta}:${limite}`;

    return this.cache.getOrSet(claveTenant(usuario), NS_REPORTES, clave, 60, () =>
      this.prisma.forTenant({ tenantId: usuario.tenantId, rol: usuario.rol }, async (tx) => {
        const ordenes = await tx.ordenReparacion.findMany({
          where: { ...filtroTenant(usuario), estado: 'ENTREGADO', fechaEntrega: { gte: inicio, lte: fin } },
          select: { repuestos: { select: { nombre: true, cantidad: true } } },
        });

        const cantidades = new Map<string, number>();
        for (const orden of ordenes) {
          for (const repuesto of orden.repuestos) {
            const nombre = repuesto.nombre?.trim();
            const cantidad = Number(repuesto.cantidad ?? 0);
            if (!nombre || cantidad <= 0) continue;
            cantidades.set(nombre, (cantidades.get(nombre) ?? 0) + cantidad);
          }
        }

        return Array.from(cantidades, ([nombre, cantidad]) => ({ nombre, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, limite);
      }),
    );
  }

  /**
   * Métricas AGREGADAS para el informe con IA. Nunca incluye nombres, teléfonos ni correos de clientes:
   * solo cifras y nombres de equipos/repuestos.
   */
  private async construirMetricasIA(usuario: UsuarioAutenticado, desde: string, hasta: string) {
    const { inicio, fin } = limitesRango(desde, hasta);
    const dias = diasDelRango(desde, hasta);

    // período anterior de la misma duración, para comparar
    const dia = 86_400_000;
    const hastaAnt = new Date(Date.parse(`${desde}T00:00:00Z`) - dia).toISOString().slice(0, 10);
    const desdeAnt = new Date(Date.parse(`${hastaAnt}T00:00:00Z`) - (dias.length - 1) * dia).toISOString().slice(0, 10);

    const [porDia, porDiaAnterior, repuestos] = await Promise.all([
      this.margenPorRango(usuario, desde, hasta),
      this.margenPorRango(usuario, desdeAnt, hastaAnt).catch(() => []),
      this.topRepuestosUsados(usuario, desde, hasta, 8),
    ]);

    const tenant = filtroTenant(usuario);
    const datos = await this.prisma.forTenant({ tenantId: usuario.tenantId, rol: usuario.rol }, async (tx) => {
      const entregadas = await tx.ordenReparacion.findMany({
        where: { ...tenant, estado: 'ENTREGADO', fechaEntrega: { gte: inicio, lte: fin } },
        select: { marca: true, modelo: true, precioCobrado: true, costoRepuestos: true, fechaRecepcion: true, fechaEntrega: true },
      });
      const recibidas = await tx.ordenReparacion.count({ where: { ...tenant, fechaRecepcion: { gte: inicio, lte: fin } } });
      const canceladas = await tx.historialEstado.count({
        where: { estadoNuevo: 'CANCELADO', createdAt: { gte: inicio, lte: fin }, orden: tenant },
      });
      const enCurso = await tx.ordenReparacion.groupBy({
        by: ['estado'],
        where: { ...tenant, estado: { notIn: ['ENTREGADO', 'CANCELADO'] } },
        _count: { _all: true },
      });
      return { entregadas, recibidas, canceladas, enCurso };
    });

    const suma = (f: { ingresoTotal: number; costoTotal: number; equiposEntregados: number }[]) =>
      f.reduce(
        (a, d) => ({ ingreso: a.ingreso + d.ingresoTotal, costo: a.costo + d.costoTotal, entregas: a.entregas + d.equiposEntregados }),
        { ingreso: 0, costo: 0, entregas: 0 },
      );
    const actual = suma(porDia);
    const anterior = suma(porDiaAnterior as any);
    const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : null);

    // por modelo
    const modelos = new Map<string, { equipos: number; ingreso: number; costo: number }>();
    let sumaDias = 0;
    for (const o of datos.entregadas) {
      const k = `${o.marca} ${o.modelo}`.trim();
      const m = modelos.get(k) ?? { equipos: 0, ingreso: 0, costo: 0 };
      m.equipos += 1;
      m.ingreso += Number(o.precioCobrado ?? 0);
      m.costo += Number(o.costoRepuestos ?? 0);
      modelos.set(k, m);
      if (o.fechaEntrega) sumaDias += (o.fechaEntrega.getTime() - o.fechaRecepcion.getTime()) / dia;
    }
    const porModelo = Array.from(modelos, ([modelo, m]) => ({
      modelo,
      equipos: m.equipos,
      ingreso: Math.round(m.ingreso),
      ganancia: Math.round(m.ingreso - m.costo),
      margenPorcentaje: pct(m.ingreso - m.costo, m.ingreso),
    })).sort((a, b) => b.equipos - a.equipos);

    return {
      periodo: { desde, hasta, dias: dias.length },
      totales: {
        equiposEntregados: actual.entregas,
        ingresoCobrado: Math.round(actual.ingreso),
        costoRepuestos: Math.round(actual.costo),
        ganancia: Math.round(actual.ingreso - actual.costo),
        margenPorcentaje: pct(actual.ingreso - actual.costo, actual.ingreso),
        ticketPromedio: actual.entregas ? Math.round(actual.ingreso / actual.entregas) : 0,
        diasPromedioRecepcionAEntrega: datos.entregadas.length ? Math.round((sumaDias / datos.entregadas.length) * 10) / 10 : null,
        diasConEntregas: porDia.filter((d) => d.equiposEntregados > 0).length,
      },
      periodoAnterior: {
        desde: desdeAnt,
        hasta: hastaAnt,
        equiposEntregados: anterior.entregas,
        ingresoCobrado: Math.round(anterior.ingreso),
        ganancia: Math.round(anterior.ingreso - anterior.costo),
      },
      flujo: { equiposRecibidos: datos.recibidas, cancelaciones: datos.canceladas },
      enCursoAhora: Object.fromEntries(datos.enCurso.map((g) => [g.estado, g._count._all])),
      modelosEntregados: porModelo.slice(0, 8),
      repuestosMasUsados: repuestos,
      gananciaPorDia: porDia.filter((d) => d.equiposEntregados > 0).map((d) => ({ fecha: d.fecha, entregas: d.equiposEntregados, ganancia: Math.round(d.margenTotal) })),
    };
  }

  /** Encola un informe con IA (Gemini) con insights a partir de métricas agregadas del período. */
  async solicitarReporteIA(usuario: UsuarioAutenticado, periodoInicio: string, periodoFin: string) {
    if (!usuario.tenantId) throw new NotFoundException('Tu usuario no pertenece a un taller');
    const tenantId = usuario.tenantId;
    const [desde, hasta] = parseRango(periodoInicio, periodoFin);
    const { inicio, fin } = limitesRango(desde, hasta);

    // tope diario por taller: cuida la cuota de la API de IA
    const ultimas24h = await this.prisma.forTenant({ tenantId, rol: usuario.rol }, (tx) =>
      tx.reporteIA.count({ where: { tenantId, createdAt: { gte: new Date(Date.now() - 24 * 3_600_000) } } }),
    );
    if (ultimas24h >= MAX_INFORMES_IA_DIA) {
      throw new HttpException(
        `Alcanzaste el máximo de ${MAX_INFORMES_IA_DIA} informes con IA por día. Intenta mañana.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const metricas = await this.construirMetricasIA(usuario, desde, hasta);

    const reporte = await this.prisma.forTenant({ tenantId, rol: usuario.rol }, (tx) =>
      tx.reporteIA.create({
        data: {
          tenantId,
          periodoInicio: inicio,
          periodoFin: fin,
          solicitadoPorId: usuario.sub,
          metricasInput: metricas as any,
        },
      }),
    );

    await this.queue.encolarReporteIA(reporte.id);
    // el frontend consulta el estado con GET /reportes/ia/:id; no se devuelven las métricas
    return { id: reporte.id, estado: reporte.estado };
  }

  async obtenerReporteIA(usuario: UsuarioAutenticado, id: string) {
    const reporte = await this.prisma.forTenant({ tenantId: usuario.tenantId, rol: usuario.rol }, (tx) =>
      tx.reporteIA.findFirst({
        where: { id, ...filtroTenant(usuario) },
        select: { id: true, estado: true, resumenTexto: true, error: true, periodoInicio: true, periodoFin: true, createdAt: true, completadoAt: true },
      }),
    );
    if (!reporte) throw new NotFoundException('Reporte no encontrado');
    return reporte;
  }
}
