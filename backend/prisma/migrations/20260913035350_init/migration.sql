-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'TECNICO', 'RECEPCION');

-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('RECEPCION', 'DIAGNOSTICO', 'EN_REPARACION', 'REPARADO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoFoto" AS ENUM ('RECEPCION', 'DIAGNOSTICO', 'REPARACION', 'ENTREGA');

-- CreateEnum
CREATE TYPE "EstadoReporteIA" AS ENUM ('PENDIENTE', 'PROCESANDO', 'COMPLETADO', 'ERROR');

-- CreateEnum
CREATE TYPE "EstadoEmail" AS ENUM ('PENDIENTE', 'ENVIADO', 'ERROR');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'local',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "documento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_reparacion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "imei" TEXT,
    "color" TEXT,
    "accesoriosRecibidos" TEXT,
    "fallaReportada" TEXT NOT NULL,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'RECEPCION',
    "diagnostico" TEXT,
    "observaciones" TEXT,
    "costoRepuestos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costoManoObra" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "precioCobrado" DECIMAL(10,2),
    "fechaRecepcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaDiagnostico" TIMESTAMP(3),
    "fechaReparado" TIMESTAMP(3),
    "fechaEntrega" TIMESTAMP(3),
    "tecnicoId" TEXT,
    "recepcionistaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_reparacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_repuesto" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "costo" DECIMAL(10,2) NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "items_repuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotos_orden" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" "TipoFoto" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_estados" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "estadoAnterior" TEXT NOT NULL,
    "estadoNuevo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT,
    "entidadId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumenes_diarios" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "equiposRecibidos" INTEGER NOT NULL DEFAULT 0,
    "equiposDiagnosticados" INTEGER NOT NULL DEFAULT 0,
    "equiposReparados" INTEGER NOT NULL DEFAULT 0,
    "equiposEntregados" INTEGER NOT NULL DEFAULT 0,
    "ingresoTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costoTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "margenTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resumenes_diarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes_ia" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoReporteIA" NOT NULL DEFAULT 'PENDIENTE',
    "resumenTexto" TEXT,
    "metricasInput" JSONB,
    "solicitadoPorId" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completadoAt" TIMESTAMP(3),

    CONSTRAINT "reportes_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "destinatario" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "estado" "EstadoEmail" NOT NULL DEFAULT 'PENDIENTE',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadoAt" TIMESTAMP(3),

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_tenantId_idx" ON "usuarios"("tenantId");

-- CreateIndex
CREATE INDEX "clientes_tenantId_idx" ON "clientes"("tenantId");

-- CreateIndex
CREATE INDEX "clientes_tenantId_telefono_idx" ON "clientes"("tenantId", "telefono");

-- CreateIndex
CREATE INDEX "ordenes_reparacion_tenantId_idx" ON "ordenes_reparacion"("tenantId");

-- CreateIndex
CREATE INDEX "ordenes_reparacion_tenantId_estado_idx" ON "ordenes_reparacion"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "ordenes_reparacion_tenantId_marca_modelo_idx" ON "ordenes_reparacion"("tenantId", "marca", "modelo");

-- CreateIndex
CREATE INDEX "ordenes_reparacion_tenantId_fechaRecepcion_idx" ON "ordenes_reparacion"("tenantId", "fechaRecepcion");

-- CreateIndex
CREATE INDEX "items_repuesto_ordenId_idx" ON "items_repuesto"("ordenId");

-- CreateIndex
CREATE INDEX "fotos_orden_ordenId_idx" ON "fotos_orden"("ordenId");

-- CreateIndex
CREATE INDEX "historial_estados_ordenId_idx" ON "historial_estados"("ordenId");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "resumenes_diarios_tenantId_fecha_key" ON "resumenes_diarios"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "reportes_ia_tenantId_createdAt_idx" ON "reportes_ia"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "email_logs_tenantId_estado_idx" ON "email_logs"("tenantId", "estado");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_reparacion" ADD CONSTRAINT "ordenes_reparacion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_reparacion" ADD CONSTRAINT "ordenes_reparacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_reparacion" ADD CONSTRAINT "ordenes_reparacion_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_reparacion" ADD CONSTRAINT "ordenes_reparacion_recepcionistaId_fkey" FOREIGN KEY ("recepcionistaId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_repuesto" ADD CONSTRAINT "items_repuesto_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_reparacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos_orden" ADD CONSTRAINT "fotos_orden_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_reparacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_reparacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumenes_diarios" ADD CONSTRAINT "resumenes_diarios_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_ia" ADD CONSTRAINT "reportes_ia_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_ia" ADD CONSTRAINT "reportes_ia_solicitadoPorId_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
