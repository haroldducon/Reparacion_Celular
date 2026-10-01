import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { CacheModule } from './modules/cache/cache.module';
import { OrdenesModule } from './modules/ordenes/ordenes.module';
import { PublicModule } from './modules/public/public.module';
import { QueueModule } from './modules/queue/queue.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]), // límite global por IP
    CacheModule,
    QueueModule,
    AuthModule,
    OrdenesModule,
    ReportesModule,
    UsuariosModule,
    PublicModule,
    TenantModule,
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // rate limit global
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }, // audit log global
  ],
})
export class AppModule {}