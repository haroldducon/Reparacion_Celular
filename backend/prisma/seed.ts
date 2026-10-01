/**
 * Crea (o recupera) el taller y el usuario administrador inicial.
 * NO crea datos de prueba ni contraseñas conocidas: todo viene de variables de entorno.
 *
 * Uso (PowerShell):
 *   $env:ADMIN_EMAIL="tu@correo.com"; $env:ADMIN_PASSWORD="UnaClaveLargaYUnica"; $env:ADMIN_NAME="Tu Nombre"
 *   npm run db:seed
 *
 * Variables:
 *   ADMIN_EMAIL (obligatoria), ADMIN_PASSWORD (obligatoria, mínimo 12 caracteres)
 *   ADMIN_NAME (opcional), TENANT_NAME (opcional, nombre del taller si hay que crearlo)
 *   ADMIN_RESET_PASSWORD=true  -> si el usuario ya existe, le cambia la contraseña
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const nombre = process.env.ADMIN_NAME?.trim() || 'Administrador';
  const tallerNombre = process.env.TENANT_NAME?.trim() || 'Mi taller';
  const resetear = process.env.ADMIN_RESET_PASSWORD === 'true';

  if (!email || !password) {
    throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres) antes de ejecutar el seed.');
  }
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 12 caracteres.');
  }

  const existente = await prisma.usuario.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });

  if (existente) {
    if (resetear) {
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      await prisma.usuario.update({ where: { id: existente.id }, data: { passwordHash, activo: true } });
      console.log(`Contraseña actualizada para ${existente.email}.`);
    } else {
      console.log(`El usuario ${existente.email} ya existe. No se cambió nada (usa ADMIN_RESET_PASSWORD=true para cambiar la contraseña).`);
    }
    return;
  }

  const tenant =
    (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } })) ??
    (await prisma.tenant.create({ data: { nombre: tallerNombre, plan: 'local' } }));

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const admin = await prisma.usuario.create({
    data: { tenantId: tenant.id, email, passwordHash, nombre, rol: 'ADMIN' },
  });

  console.log('Listo:');
  console.log(`  taller: ${tenant.nombre} (${tenant.id})`);
  console.log(`  administrador: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
