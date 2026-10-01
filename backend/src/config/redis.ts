/**
 * Convierte REDIS_URL (redis:// o rediss:// para Upstash/TLS) en opciones de conexión
 * explícitas, que es lo que BullMQ/ioredis entienden de forma fiable.
 */
export function conexionRedis() {
  const raw = process.env.REDIS_URL;
  if (!raw) return { host: '127.0.0.1', port: 6379 }; // validarEntorno() avisa al arrancar
  const u = new URL(raw);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
  };
}
