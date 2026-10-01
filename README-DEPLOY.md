# Despliegue: Neon (BD) + Render (API) + Vercel (web)

## 0. Antes de subir a Git
1. **Rota estas credenciales** (estuvieron en un `.env` que viajó en un zip): contraseña de Redis/Upstash, `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` (no reutilices los de desarrollo en producción) y, si alguna vez la usaste fuera de tu PC, la contraseña de la base de datos. Genera secretos nuevos con:
   `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
2. Repositorio **privado**. Comprueba que `git status` NO muestre ningún `.env` ni la carpeta `uploads/`.
3. No subas `node_modules`, `dist` ni `.env` (el `.gitignore` incluido ya lo evita).

## 1. Neon (Postgres)
- Crea el proyecto y copia la cadena de conexión **directa** (sin `-pooler`) con `?sslmode=require`.
- Es `DATABASE_URL` en Render. Las migraciones se aplican solas al arrancar (`prisma migrate deploy`).
- Base nueva y vacía: crea el administrador con el seed (paso 4).

## 2. Render (backend)
- New > Blueprint y apunta al repo (usa `render.yaml`), o crea un Web Service con:
  - Root Directory: `backend`
  - Build: `npm ci --include=dev && npm run build`
  - Start: `npm start`
  - Health check: `/api/health`
- Variables de entorno obligatorias: `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
  `CORS_ORIGINS` (= URL de Vercel, sin `/` final), `NODE_ENV=production`.
- Variables de los servicios opcionales (ver secciones 6, 7 y 8): `RESEND_API_KEY` + `EMAIL_FROM`,
  `GEMINI_API_KEY`, `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`, `FRONTEND_URL`.
- El plan gratuito "duerme" tras inactividad: la primera petición puede tardar ~1 min.

## 3. Vercel (frontend)
- Root Directory: `frontend`. Framework: Vite.
- Variable: `VITE_API_URL` = `https://TU-API.onrender.com/api`
- `vercel.json` ya incluye el rewrite para rutas como `/seguimiento/:id` y las cabeceras de seguridad.
  Si usas dominio propio para la API, agrégalo en `connect-src` de la CSP.
- Después, vuelve a Render y pon la URL final de Vercel en `CORS_ORIGINS`.

## 4. Crear (o recuperar) el administrador
Desde `backend/` con la `DATABASE_URL` de Neon en tu `.env` local (PowerShell):
```
$env:ADMIN_EMAIL="haduconab@gmail.com"; $env:ADMIN_PASSWORD="UnaClaveLargaYUnica"; $env:ADMIN_NAME="Harold Ducon"; $env:TENANT_NAME="Tech Tinker"
npm run db:seed
```
Si el usuario ya existe y quieres cambiar su contraseña: añade `$env:ADMIN_RESET_PASSWORD="true"`.

## 5. Prueba final
- `https://TU-API.onrender.com/api/health` responde `{"status":"ok"}`
- Inicia sesión, crea una orden con foto, abre el link de seguimiento y entrégala.
- En DevTools > Network confirma que no hay errores de CORS.

## Notas de seguridad
- Correos: `email.processor.ts` todavía NO envía correos (está el proveedor por integrar). Se registran como enviados sin salir.
- `prisma/rls-policies.sql` es opcional y NO debe ejecutarse tal cual (ver advertencia en el archivo).
- Ejecuta `npm audit` en backend y frontend periódicamente.

## 6. Fotos en Cloudinary (necesario en Render)
1. Crea una cuenta gratuita en cloudinary.com. En el Dashboard copia *Cloud name*, *API Key* y *API Secret*.
2. Ponlos en Render como `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. Listo: las fotos nuevas se suben a Cloudinary (carpeta `tech-tinker`), con nombre aleatorio. Las fotos que ya estaban en
   el servidor local siguen funcionando mientras existan, pero en Render se pierden en cada despliegue.

## 7. Correos con Resend
1. Crea cuenta en resend.com y una API Key (*API Keys*).
2. **Verifica un dominio tuyo** en *Domains* (agregas unos registros DNS). Sin dominio verificado, Resend solo permite enviar
   a tu propio correo, así que los clientes no recibirían nada.
3. En Render: `RESEND_API_KEY`, `EMAIL_FROM` (ej. `Tech Tinker <notificaciones@tudominio.com>`), opcional `EMAIL_REPLY_TO`.
4. Se envían correos al recibir el equipo, al tener el diagnóstico, al quedar reparado y al entregarlo, con un botón al seguimiento.
   En la tabla `email_logs` queda el estado de cada envío (ENVIADO / ERROR y el motivo).

## 8. Informe con IA (Google Gemini)
1. Crea una clave gratuita en aistudio.google.com/apikey.
2. En Render: `GEMINI_API_KEY` (y opcional `GEMINI_MODEL`, por defecto `gemini-3.6-flash`).
3. En *Reportes* aparece el bloque "Informe con insights". Solo se envían cifras agregadas (sin nombres, teléfonos ni correos).
4. Ojo: en el plan gratuito, Google puede usar lo enviado para mejorar sus productos. Si no quieres eso, activa facturación en tu proyecto de Google.
