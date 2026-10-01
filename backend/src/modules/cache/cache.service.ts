import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Cache-aside genérico sobre Redis (Upstash u otro proveedor compatible).
 * Todas las claves llevan el tenantId para que invalidar el cache de un
 * taller nunca afecte a otro.
 *
 * El caché es solo una optimización: si Redis falla o se cae, la app sigue
 * funcionando leyendo directamente de la base de datos.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private redis: Redis;
  private logger = new Logger(CacheService.name);
  private ultimoAviso = 0;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    });
    this.redis.on('error', (e) => this.avisar(e));
  }

  private avisar(e: unknown) {
    // como máximo un aviso por minuto para no llenar los logs
    if (Date.now() - this.ultimoAviso > 60_000) {
      this.ultimoAviso = Date.now();
      this.logger.warn(`Redis no disponible, se usa la base de datos directamente: ${(e as Error).message}`);
    }
  }

  private key(tenantId: string, namespace: string, key: string) {
    return `t:${tenantId}:${namespace}:${key}`;
  }

  async getOrSet<T>(
    tenantId: string,
    namespace: string,
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = this.key(tenantId, namespace, key);
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as T;
    } catch (e) {
      this.avisar(e);
    }

    const fresh = await fetcher();
    try {
      await this.redis.set(cacheKey, JSON.stringify(fresh), 'EX', ttlSeconds);
    } catch (e) {
      this.avisar(e);
    }
    return fresh;
  }

  /** Invalida todas las claves de un namespace para un tenant (ej: al crear/actualizar una orden) */
  async invalidateNamespace(tenantId: string, namespace: string) {
    try {
      const pattern = this.key(tenantId, namespace, '*');
      const stream = this.redis.scanStream({ match: pattern, count: 100 });
      const pipeline = this.redis.pipeline();
      let found = false;
      for await (const keys of stream) {
        for (const k of keys as string[]) {
          pipeline.del(k);
          found = true;
        }
      }
      if (found) await pipeline.exec();
    } catch (e) {
      this.avisar(e);
    }
  }

  /** Contadores con vencimiento (bloqueo de login). Si Redis falla, no bloquea a nadie. */
  async contar(clave: string): Promise<number> {
    try {
      return Number(await this.redis.get(`rl:${clave}`)) || 0;
    } catch (e) {
      this.avisar(e);
      return 0;
    }
  }

  async incrementar(clave: string, ttlSegundos: number): Promise<number> {
    try {
      const k = `rl:${clave}`;
      const n = await this.redis.incr(k);
      if (n === 1) await this.redis.expire(k, ttlSegundos);
      return n;
    } catch (e) {
      this.avisar(e);
      return 0;
    }
  }

  async limpiar(clave: string) {
    try {
      await this.redis.del(`rl:${clave}`);
    } catch (e) {
      this.avisar(e);
    }
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
