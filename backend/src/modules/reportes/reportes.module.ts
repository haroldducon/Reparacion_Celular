import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueModule } from '../queue/queue.module';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

@Module({
  imports: [QueueModule],
  controllers: [ReportesController],
  providers: [ReportesService, PrismaService],
})
export class ReportesModule {}
