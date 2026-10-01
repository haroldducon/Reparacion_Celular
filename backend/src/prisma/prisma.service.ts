import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService centraliza la conexión y expone `forTenant`, que ejecuta
 * un callback dentro de una transacción con las variables de sesión de
 * Postgres seteadas (app.current_tenant / app.current_role), para que las
 * políticas de Row-Level Security (ver prisma/rls-policies.sql) filtren
 * automáticamente los datos del tenant correcto.
 *
 * Nunca se debe usar `this.$queryRaw` fuera de este mecanismo para tablas
 * multi-tenant: si se hace, se pierde el filtro de seguridad.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Ejecuta `fn` dentro de una transacción con el contexto de tenant/rol
   * seteado a nivel de sesión Postgres. Úsalo en cada operación de negocio
   * que toque tablas con datos de un tenant.
   */
  async forTenant<T>(
    context: { tenantId: string | null; rol: string },
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // set_config con is_local=true limita el efecto a esta transacción
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_role', $1, true)`, context.rol);
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant', $1, true)`,
        context.tenantId ?? '',
      );
      return fn(tx);
    });
  }
}
