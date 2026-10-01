import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async seguimiento(ordenId: string) {
    // Consulta de sistema: usamos el bypass de SUPER_ADMIN a propósito, porque
    // no hay un usuario autenticado con tenant — el ID de la orden (UUID) es
    // el único "código" que el cliente tiene, igual que un link de rastreo.
    const orden = await this.prisma.forTenant({ tenantId: null, rol: 'SUPER_ADMIN' }, (tx) =>
      tx.ordenReparacion.findUnique({
        where: { id: ordenId },
        select: {
          id: true,
          marca: true,
          modelo: true,
          estado: true,
          fallaReportada: true,
          fechaRecepcion: true,
          fechaDiagnostico: true,
          fechaReparado: true,
          fechaEntrega: true,
          diagnostico: true,
          presupuestoReparacion: true,
          observaciones: true,
          cliente: { select: { nombre: true } },
          repuestos: { select: { nombre: true, cantidad: true } },
          fotos: { select: { url: true, tipo: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
          historial: {
            // sin nombres del personal; las notas internas se filtran más abajo
            select: { estadoAnterior: true, estadoNuevo: true, nota: true, visibleCliente: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    );

    if (!orden) throw new NotFoundException('No encontramos una orden con ese código');

    // El cliente ve: cambios de estado y los comentarios que el taller marcó como visibles.
    // Las notas internas (visibleCliente = false) NUNCA salen de aquí.
    const historial = orden.historial
      .filter((h) => h.visibleCliente || h.estadoAnterior !== h.estadoNuevo)
      .map((h) => ({
        estadoAnterior: h.estadoAnterior,
        estadoNuevo: h.estadoNuevo,
        nota: h.visibleCliente ? h.nota : null,
        esComentario: h.estadoAnterior === h.estadoNuevo,
        createdAt: h.createdAt,
      }));

    // nunca exponer costos, IMEI completo, ni datos de contacto del cliente
    return { ...orden, historial, numeroReparacion: orden.id.slice(0, 8).toUpperCase() };
  }
}
