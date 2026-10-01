-- Separar la cotización del diagnóstico de los costos reales de reparación.
CREATE TYPE "EstadoPresupuesto" AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO');

ALTER TABLE "ordenes_reparacion"
  ADD COLUMN "presupuestoReparacion" DECIMAL(10,2),
  ADD COLUMN "estadoPresupuesto" "EstadoPresupuesto" NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN "fechaAceptacionPresupuesto" TIMESTAMP(3);

ALTER TABLE "ordenes_reparacion" DROP COLUMN "costoManoObra";
