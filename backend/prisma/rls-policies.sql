-- ============================================================================
-- ADVERTENCIA — LEER ANTES DE EJECUTAR
-- La aplicación YA aísla los datos por taller en el código (filtro tenantId en
-- todas las consultas). Este archivo es una segunda barrera OPCIONAL.
-- No lo ejecutes tal cual en producción: con FORCE ROW LEVEL SECURITY y un rol
-- sin BYPASSRLS, el login, el refresh de tokens, la validación del JWT y los
-- workers de colas consultan `usuarios`/`email_logs` sin contexto de taller y
-- dejarían de funcionar. Para activarlo hay que adaptar esas rutas primero y
-- probarlo en una rama de Neon.
-- ============================================================================

-- ============================================================================
-- Row-Level Security por tenant
-- Ejecutar DESPUÉS de `prisma migrate deploy`.
-- El backend debe hacer, en cada conexión/transacción de un request autenticado:
--   SET app.current_tenant = '<tenantId>';
--   SET app.current_role   = '<rol>';
-- (ver prisma.service.ts / tenant.interceptor.ts)
--
-- SUPER_ADMIN no setea app.current_tenant -> las policies lo detectan y
-- lo dejan pasar sin restricción (bypass explícito, no accidental).
-- ============================================================================

-- Rol de aplicación sin BYPASSRLS (nunca usar el rol owner/superuser desde la app)
-- CREATE ROLE app_user LOGIN PASSWORD '...' NOSUPERUSER NOBYPASSRLS;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;

ALTER TABLE clientes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_reparacion  ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_repuesto      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_orden         ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_estados   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_ia         ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios            ENABLE ROW LEVEL SECURITY;

-- Forzar RLS incluso para el owner de la tabla (evita bypass accidental)
ALTER TABLE clientes            FORCE ROW LEVEL SECURITY;
ALTER TABLE ordenes_reparacion  FORCE ROW LEVEL SECURITY;
ALTER TABLE items_repuesto      FORCE ROW LEVEL SECURITY;
ALTER TABLE fotos_orden         FORCE ROW LEVEL SECURITY;
ALTER TABLE historial_estados   FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          FORCE ROW LEVEL SECURITY;
ALTER TABLE reportes_ia         FORCE ROW LEVEL SECURITY;
ALTER TABLE email_logs          FORCE ROW LEVEL SECURITY;
ALTER TABLE usuarios            FORCE ROW LEVEL SECURITY;

-- Tablas con tenantId directo
CREATE POLICY tenant_isolation_clientes ON clientes
  USING (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR "tenantId" = current_setting('app.current_tenant', true)::text
  );

CREATE POLICY tenant_isolation_ordenes ON ordenes_reparacion
  USING (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR "tenantId" = current_setting('app.current_tenant', true)::text
  );

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR "tenantId" = current_setting('app.current_tenant', true)::text
    OR "tenantId" IS NULL
  );

  USING (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR "tenantId" = current_setting('app.current_tenant', true)::text
  );

CREATE POLICY tenant_isolation_reportes_ia ON reportes_ia
  USING (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR "tenantId" = current_setting('app.current_tenant', true)::text
  );

CREATE POLICY tenant_isolation_email_logs ON email_logs
  USING (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR "tenantId" = current_setting('app.current_tenant', true)::text
    OR "tenantId" IS NULL
  );

CREATE POLICY tenant_isolation_usuarios ON usuarios
  USING (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR "tenantId" = current_setting('app.current_tenant', true)::text
  );

-- Tablas sin tenantId propio: se filtran por join contra la orden padre
CREATE POLICY tenant_isolation_items_repuesto ON items_repuesto
  USING (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM ordenes_reparacion o
      WHERE o.id = items_repuesto."ordenId"
        AND o."tenantId" = current_setting('app.current_tenant', true)::text
    )
  );

CREATE POLICY tenant_isolation_fotos_orden ON fotos_orden
  USING (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM ordenes_reparacion o
      WHERE o.id = fotos_orden."ordenId"
        AND o."tenantId" = current_setting('app.current_tenant', true)::text
    )
  );

CREATE POLICY tenant_isolation_historial ON historial_estados
  USING (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM ordenes_reparacion o
      WHERE o.id = historial_estados."ordenId"
        AND o."tenantId" = current_setting('app.current_tenant', true)::text
    )
  );
