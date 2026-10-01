import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueModule } from '../queue/queue.module';
import { OrdenesController } from './ordenes.controller';
import { OrdenesService } from './ordenes.service';
import { StorageService } from './storage.service';

@Module({
  imports: [QueueModule],
  controllers: [OrdenesController],
  providers: [OrdenesService, StorageService, PrismaService],
})
export class OrdenesModule {}
