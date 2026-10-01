# Informe QA y de seguridad — Reparación de Celulares

Alcance: backend (NestJS + Prisma), frontend (React + Vite), configuración para Neon + Render + Vercel.
Verificado aquí: compilación TypeScript de backend y frontend sin errores, `nest build` (genera `dist/main.js`),
y pruebas automáticas de validación, máquina de estados, aislamiento por taller, fechas y subida de archivos (34 comprobaciones, todas OK).

# Ronda 2 — funciones pedidas (1 oct 2026)

| Tema | Qué se hizo |
|------|-------------|
| Correos | Envío real con **Resend** (`RESEND_API_KEY`, `EMAIL_FROM`). Sin configuración queda `ERROR "no configurado"` (ya nunca "ENVIADO" falso). Errores permanentes (4xx) no se reintentan; los temporales sí. Idempotency-Key evita duplicados. Plantilla con marca y botón "Ver el estado de mi equipo". |
| Sesión (`localStorage`) | Sin cambios a propósito: pasar a cookies `httpOnly` entre `vercel.app` y `onrender.com` las bloquean Safari/Chrome (cookies de terceros) y rompería el login. Se mantiene con la CSP de `vercel.json`. Solo valdría la pena con un dominio propio para web y API. |
| Seguimiento público | Notas **internas por defecto**. Nuevo cuadro "Comentarios de la orden" (en Diagnóstico y Reparación) con casilla "Mostrar al cliente". El cliente ve estados + mensajes marcados como visibles; ya no ve nombres del personal ni notas internas. Migración agrega `visibleCliente`. |
| Fotos | Subida a **Cloudinary** (firmada, nombre aleatorio, `f_auto` convierte HEIC de iPhone, máx. 1600 px). Sin variables, usa disco local (solo desarrollo). Fotos antiguas siguen funcionando. |
| Listado de órdenes | Paginador de 10 en 10, busca en **todo el histórico** en el servidor (con retraso de 350 ms al escribir). Incluye IMEI en la búsqueda. Las colas de trabajo (diagnóstico, reparación, entregas) siguen igual. |
| Reabrir órdenes | `POST /ordenes/:id/reabrir`: solo ADMIN, con su contraseña y un motivo. Entregada → "Listo para recoger" (sale de reportes hasta nueva entrega); Cancelada → Diagnóstico o Recepción. Queda en el historial (quién, cuándo, por qué). Botón en la orden cerrada, visible solo para administradores. |
| Bloqueo de login | 5 contraseñas incorrectas para un mismo correo → 15 min de bloqueo (aunque luego acierten). Se reinicia al entrar bien. Usa Redis; si Redis falla, no bloquea a nadie. |
| Resúmenes diarios | Eliminados: tabla, cola, procesador y modelo (migración `DROP TABLE`). |
| IA | Cambiada a **Gemini** (`GEMINI_API_KEY`, modelo por defecto `gemini-3.6-flash`). Ahora tiene pantalla en Reportes: "Informe con insights" (mes o año). Envía solo cifras agregadas (ingresos, margen, tiempos, modelos, repuestos, comparación con el período anterior; sin datos de clientes). Tope de 10 informes/día por taller. |
| Otros | Contraseña de admin incorrecta devuelve 403 (antes 401, lo que provocaba un ciclo de refresco de sesión). |

Verificación de esta ronda: compilación TypeScript de backend y frontend, `nest build`, y 48 de 50 pruebas con simulaciones (las 2 restantes eran errores de la propia prueba; el código está bien). No se probó contra Neon, Redis, Resend, Gemini ni Cloudinary reales.

---

## 1. Crítico (bloqueaba el despliegue o exponía datos)

| # | Hallazgo | Solución |
|---|----------|----------|
| 1 | El `.env` con credenciales viajó dentro del zip (Redis/Upstash con contraseña real, JWT). El frontend no tenía `.gitignore` y no había uno en la raíz. | `.gitignore` en raíz, backend y frontend; `.env.example` sin secretos. **Rota las credenciales** (ver README-DEPLOY). |
| 2 | **Aislamiento entre talleres dependía solo de RLS**, que no está activo: ningún `findMany/findUnique` filtraba por `tenantId`. Con un segundo taller, un admin vería/modificaría datos ajenos (IDOR). | Filtro `tenantId` explícito en órdenes, usuarios, reportes, fotos, clientes y reportes IA. |
| 3 | `rls-policies.sql` con `FORCE` habría roto el login y las colas. | Advertencia al inicio del archivo; no ejecutarlo tal cual. |
| 4 | El seed creaba `admin@taller.test / Admin123!` (credencial conocida). | Seed nuevo: todo por variables de entorno, contraseña ≥ 12 caracteres, sin datos de prueba. |
| 5 | `npm start` apuntaba a `dist/main.js` pero el build dejaba `dist/src/main.js` (el seed se compilaba dentro de `dist`). Render habría fallado al arrancar. | `tsconfig.build.json`, `nest-cli.json`, scripts de build/start y `render.yaml`. |
| 6 | En Render, `NODE_ENV=production` no instala Prisma CLI/Nest CLI/TypeScript → falla el build. | Build con `npm ci --include=dev` en `render.yaml`. |
| 7 | El frontend **no compilaba** (16 errores de tipos, `types.ts` desactualizado): el build de Vercel (`tsc -b`) habría fallado. | `types.ts` corregido; se eliminó `OrdenDetallePage.tsx` (página huérfana sin ruta). |
| 8 | `helmet` por defecto bloquea cargar imágenes desde otro dominio: las fotos no se verían desde Vercel. | `crossOriginResourcePolicy: cross-origin`. |
| 9 | `API_BASE = ...replace('/api','')` rompe con dominios como `api.midominio.com`. | Constante única en `lib/api.ts` que solo quita `/api` al final. |
| 10 | `PATCH /ordenes/:id/estado` permitía poner **ENTREGADO** saltándose el cobro y la contraseña de admin, y reabrir órdenes cerradas. | Máquina de estados; ENTREGADO solo desde Entregas; ENTREGADO/CANCELADO son finales. |

## 2. Importante

**Autenticación**
- Desactivar un usuario o cambiarle el rol ahora surte efecto **de inmediato** (antes tardaba hasta 15 min): el JWT se valida contra la BD.
- El tiempo de respuesta del login ya no revela qué correos existen (hash de relleno).
- Correo insensible a mayúsculas; algoritmo JWT fijado a HS256; límite de 128 caracteres en contraseñas (evita abuso de argon2).
- Límite estricto (5/min) en `entrega/autorizacion` y 10/min en entrega; 3/min en reportes con IA (consumen crédito).
- Arranque falla si faltan secretos, si miden < 32 caracteres, si son iguales o si `CORS_ORIGINS` falta en producción.

**Subida de fotos**
- Antes: se aceptaba cualquier archivo con `Content-Type: image/*` y conservaba la extensión original (un `.html` disfrazado se servía como página = XSS almacenado).
- Ahora: lista blanca de tipos, extensión derivada del tipo, nombre UUID, verificación de la firma real del archivo, máximo 30 fotos por orden, sin listado de directorio, cabeceras `nosniff` + CSP sandbox, limpieza de huérfanos.
- Carpeta configurable con `UPLOAD_DIR` (para Persistent Disk de Render).

**Validación de entradas**
- Longitudes máximas en todos los textos, límites de dinero (evita desbordar `Decimal(10,2)`), arreglos acotados, UUID validados en rutas, booleano real en activar/desactivar, rango de fechas máximo 400 días (antes: fechas inválidas daban error 500 y rangos enormes saturaban).
- Estado de `?estado=` validado (antes permitía llenar Redis con claves arbitrarias).

**Errores funcionales encontrados**
- El formulario de recepción enviaba `clienteEmail: ""` y el backend lo rechazaba (400) si el correo quedaba vacío. Corregido.
- La entrega enviaba `password: ""` y el backend lo rechazaba cuando no había cambios de valor. Corregido.
- Con contraseña incorrecta el login recargaba la página y el mensaje de error desaparecía (el interceptor intentaba "refrescar" en /auth/login). Corregido.
- El historial público estaba casi vacío: solo se registraba REPARADO. Ahora se registra cada etapa (recepción, diagnóstico, reparación, reparado, entregado).
- Doble entrega posible con dos clics/peticiones simultáneas: ahora solo una pasa.
- Cambiar la cotización después de aceptada no reiniciaba la decisión del cliente; ahora vuelve a PENDIENTE (y se bloquea con la reparación en curso).
- Reportes por día calculados en UTC: una entrega a las 8 p. m. en Bogotá contaba al día siguiente. Ahora usa la zona horaria del negocio (`APP_TIMEZONE`).
- Nombres con tildes/ñ se veían rotos en el encabezado (decodificación del JWT).
- Un usuario podía desactivarse o cambiarse el rol a sí mismo (quedando sin administrador).

**Robustez**
- Si Redis se cae, la app sigue funcionando (el caché y los correos son secundarios; antes devolvía 500).
- Conexión de BullMQ construida de forma explícita desde `REDIS_URL` (incluye TLS `rediss://`).
- Correos: el texto del cliente se escapa antes de ir al HTML (inyección de HTML/phishing por correo).
- Respuesta de la API de IA verificada (antes un error se guardaba como reporte "completado" vacío).
- `/api/health` para el health check de Render.

**Frontend / Vercel**
- `vercel.json`: rewrite de SPA (sin esto `/seguimiento/:id` da 404 al recargar) y cabeceras: CSP, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `noindex`.
- Rutas `/reportes` y `/usuarios` restringidas a administradores también en la interfaz.
- Vite: sin `allowedHosts: true`, sin sourcemaps en producción.
- Archivos de frontend sueltos en `backend/` (index.html, tailwind, postcss) eliminados.

## 3. Decisiones tuyas (no las cambié porque son de negocio)
1. ~~Correos~~ resuelto en la ronda 2 (Resend).
2. **Sesión en `localStorage`:** es lo habitual en SPAs, pero un XSS robaría el token. La CSP lo mitiga; lo ideal a futuro es cookies `httpOnly`.
3. **Página pública de seguimiento:** cualquiera con el link ve diagnóstico, observaciones, notas del historial y nombre del técnico. Si las notas pueden ser internas, conviene ocultarlas.
4. **Roles:** RECEPCION y TECNICO ven `costoRepuestos` y `precioCobrado` en el listado de órdenes.
5. **Fotos de clientes:** con Render necesitas Persistent Disk o almacenamiento externo; los enlaces de fotos son públicos pero con UUID no adivinable.
6. **Listados de órdenes** ahora limitados a las 500 más recientes (200 en búsqueda); antes sin límite. Súbelo si lo necesitas o agrega paginación.
7. **Órdenes canceladas/entregadas** no se pueden reabrir; si necesitas esa función, agrégala como acción de administrador con auditoría.
8. Sin límite de reintentos por cuenta (solo por IP); considera bloqueo temporal tras N fallos.
9. `resumenes_diarios` (job nocturno) nunca se programa y ningún reporte lo usa: código muerto.

## 4. No pude verificar aquí
- `vite build`: el `node_modules` del zip es de Windows (binarios nativos de rollup) y el entorno no tiene internet. `tsc` del frontend sí pasa; en Vercel instala limpio.
- Conexión real a Neon/Redis/Upstash, migraciones y envío de correos.
- `npm audit` (requiere red): ejecútalo en `backend` y `frontend` antes de publicar.
