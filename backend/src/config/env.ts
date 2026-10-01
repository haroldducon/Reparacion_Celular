/** Falla al arrancar si falta configuración crítica (mejor caer al inicio que correr inseguro). */
export function validarEntorno() {
  const errores: string[] = [];
  const produccion = process.env.NODE_ENV === 'production';

  for (const k of ['DATABASE_URL', 'REDIS_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (!process.env[k]) errores.push(`Falta la variable ${k}`);
  }
  const a = process.env.JWT_ACCESS_SECRET ?? '';
  const r = process.env.JWT_REFRESH_SECRET ?? '';
  if (a && a.length < 32) errores.push('JWT_ACCESS_SECRET debe tener al menos 32 caracteres');
  if (r && r.length < 32) errores.push('JWT_REFRESH_SECRET debe tener al menos 32 caracteres');
  if (a && a === r) errores.push('JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser distintos');
  if (produccion && !process.env.CORS_ORIGINS) errores.push('Falta CORS_ORIGINS (URL de tu frontend en Vercel)');
  if (produccion && /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '')) {
    errores.push('DATABASE_URL apunta a localhost en producción');
  }

  if (errores.length) {
    throw new Error('Configuración inválida:\n - ' + errores.join('\n - '));
  }
  const avisos: string[] = [];
  if (!process.env.GEMINI_API_KEY) avisos.push('GEMINI_API_KEY no definida: el informe con IA no funcionará.');
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    avisos.push('RESEND_API_KEY / EMAIL_FROM no definidas: no se enviarán correos a los clientes.');
  }
  if (produccion && !(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) {
    avisos.push('Cloudinary no configurado: las fotos se guardarán en disco y se perderán en cada despliegue.');
  }
  if (produccion && !process.env.FRONTEND_URL && !process.env.CORS_ORIGINS) {
    avisos.push('Sin FRONTEND_URL: los correos no llevarán el enlace de seguimiento.');
  }
  avisos.forEach((a) => console.warn(`[config] ${a}`));
}
