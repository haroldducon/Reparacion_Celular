import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { COLA_EMAILS, COLA_REPORTES_IA } from './queue.constants';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(COLA_EMAILS) private emailsQueue: Queue,
    @InjectQueue(COLA_REPORTES_IA) private reportesQueue: Queue,
  ) {}

  encolarEmail(data: { tenantId: string | null; destinatario: string; asunto: string; html: string }) {
    return this.emailsQueue.add('enviar', data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: true,
      removeOnFail: 1000,
    });
  }

  encolarReporteIA(reporteId: string) {
    return this.reportesQueue.add(
      'generar',
      { reporteId },
      { attempts: 3, backoff: { type: 'exponential', delay: 10_000 } },
    );
  }
}
