-- Comentarios dirigidos al cliente: las notas son internas salvo que se marquen como visibles.
ALTER TABLE "historial_estados" ADD COLUMN "visibleCliente" BOOLEAN NOT NULL DEFAULT false;

-- Se elimina la tabla de resúmenes diarios: nunca se programaba ni la usaba ningún reporte.
DROP TABLE IF EXISTS "resumenes_diarios";
