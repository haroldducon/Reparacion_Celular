import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { COLA_EMAILS } from '../queue.constants';

interface EmailJobData {
  tenantId: string | null;
  destinatario: string;
  asunto: string;
  html: string;
}

/**
 * Envío con Resend (https://resend.com). Variables:
 *   RESEND_API_KEY  clave de la API
 *   EMAIL_FROM      remitente, ej: "Tech Tinker <notificaciones@tudominio.com>" (dominio verificado en Resend)
 *   EMAIL_REPLY_TO  (opcional) correo al que responderá el cliente
 * Sin RESEND_API_KEY el correo queda registrado como ERROR ("no configurado"); nunca como enviado.
 */
@Processor(COLA_EMAILS)
export class EmailProcessor extends WorkerHost {
  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<EmailJobData>) {
    const { tenantId, destinatario, asunto, html } = job.data;

    const log = await this.prisma.emailLog.create({
      data: { tenantId, destinatario, asunto, estado: 'PENDIENTE' },
    });

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { estado: 'ERROR', error: 'Correo no configurado (faltan RESEND_API_KEY / EMAIL_FROM)' },
      });
      return; // no se reintenta: reintentar no arreglaría la configuración
    }

    try {
      const respuesta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(20_000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': log.id, // evita duplicados si BullMQ reintenta
        },
        body: JSON.stringify({
          from,
          to: [destinatario],
          subject: asunto,
          html: plantilla(html),
          ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
        }),
      });

      if (!respuesta.ok) {
        const detalle = await respuesta.text().catch(() => '');
        const error = new Error(`Resend respondió ${respuesta.status}: ${detalle.slice(0, 200)}`);
        // 4xx (excepto 429) = problema permanente (dominio sin verificar, correo inválido...): no reintentar
        if (respuesta.status >= 400 && respuesta.status < 500 && respuesta.status !== 429) {
          await this.prisma.emailLog.update({
            where: { id: log.id },
            data: { estado: 'ERROR', error: error.message },
          });
          return;
        }
        throw error;
      }

      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { estado: 'ENVIADO', enviadoAt: new Date() },
      });
    } catch (err: any) {
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { estado: 'ERROR', error: String(err?.message ?? err).slice(0, 300) },
      });
      throw err; // deja que BullMQ reintente según la política de backoff
    }
  }
}

function plantilla(contenido: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f1ed;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#302d2e">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">
<div style="background:#2b292a;color:#fff;padding:18px 24px;font-size:16px;font-weight:bold">Tech Tinker</div>
<div style="padding:24px;font-size:15px;line-height:1.55">${contenido}</div>
<div style="padding:14px 24px;font-size:12px;color:#817b76;background:#f8f7f5">Este es un mensaje automático del taller.</div>
</div></body></html>`;
}
