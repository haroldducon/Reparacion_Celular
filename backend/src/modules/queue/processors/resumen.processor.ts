import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { COLA_RESUMEN_DIARIO } from '../queue.constants';

@Processor(COLA_RESUMEN_DIARIO)
export class ResumenProcessor extends WorkerHost {
  constructor(private prisma: PrismaService) {
    super();
  }

  async process() {
    const tenants = await this.prisma.tenant.findMany({ where: { activo: true } });
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    ayer.setHours(0, 0, 0, 0);
    const hoy = new Date(ayer);
    hoy.setDate(hoy.getDate() + 1);

    for (const tenant of tenants) {
      const ordenesDelDia = await this.prisma.ordenReparacion.findMany({
        where: { tenantId: tenant.id, fechaRecepcion: { gte: ayer, lt: hoy } },
      });

      const entregadasDelDia = await this.prisma.ordenReparacion.findMany({
        where: { tenantId: tenant.id, fechaEntrega: { gte: ayer, lt: hoy } },
      });

      const ingresoTotal = entregadasDelDia.reduce(
        (sum, o) => sum + Number(o.precioCobrado ?? 0),
        0,
      );
      const costoTotal = entregadasDelDia.reduce(
        (sum, o) => sum + Number(o.costoRepuestos),
        0,
      );

      await this.prisma.resumenDiario.upsert({
        where: { tenantId_fecha: { tenantId: tenant.id, fecha: ayer } },
        create: {
          tenantId: tenant.id,
          fecha: ayer,
          equiposRecibidos: ordenesDelDia.length,
          equiposDiagnosticados: ordenesDelDia.filter((o) => o.diagnostico).length,
          equiposReparados: ordenesDelDia.filter((o) => o.estado === 'REPARADO').length,
          equiposEntregados: entregadasDelDia.length,
          ingresoTotal,
          costoTotal,
          margenTotal: ingresoTotal - costoTotal,
        },
        update: {
          equiposRecibidos: ordenesDelDia.length,
          equiposDiagnosticados: ordenesDelDia.filter((o) => o.diagnostico).length,
          equiposReparados: ordenesDelDia.filter((o) => o.estado === 'REPARADO').length,
          equiposEntregados: entregadasDelDia.length,
          ingresoTotal,
          costoTotal,
          margenTotal: ingresoTotal - costoTotal,
        },
      });
    }
  }
}
