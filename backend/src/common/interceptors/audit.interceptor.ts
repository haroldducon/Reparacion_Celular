import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Registra en audit_logs las mutaciones (POST/PATCH/PUT/DELETE) exitosas.
 * No bloquea la respuesta: el registro se hace "fire and forget" pero
 * está pensado para moverse a la cola si el volumen crece.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, user, ip, headers } = request;

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) || !user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.prisma.auditLog
          .create({
            data: {
              tenantId: user.tenantId,
              usuarioId: user.sub,
              accion: `${method} ${request.route?.path ?? request.url}`,
              ip,
              userAgent: headers?.['user-agent'],
            },
          })
          .catch(() => {
            // el audit log nunca debe romper la respuesta al usuario
          });
      }),
    );
  }
}
