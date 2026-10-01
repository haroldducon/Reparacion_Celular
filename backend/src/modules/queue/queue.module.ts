import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { conexionRedis } from '../../config/redis';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailProcessor } from './processors/email.processor';
import { ReportesProcessor } from './processors/reportes.processor';
import { QueueService } from './queue.service';
import { COLA_EMAILS, COLA_REPORTES_IA } from './queue.constants';

@Module({
  imports: [
    BullModule.forRoot({
      connection: conexionRedis(),
    }),
    BullModule.registerQueue(
      { name: COLA_EMAILS },
      { name: COLA_REPORTES_IA },
    ),
  ],
  providers: [QueueService, EmailProcessor, ReportesProcessor, PrismaService],
  exports: [QueueService],
})
export class QueueModule {}
