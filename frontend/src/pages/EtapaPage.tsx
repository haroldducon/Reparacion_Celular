import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ClipboardList, Clock3, Wrench } from 'lucide-react';
import { api } from '../lib/api';
import type { EstadoOrden, OrdenReparacion } from '../types';

const CONFIG = {
  diagnostico: {
    titulo: 'Diagnóstico',
    descripcion: 'Equipos pendientes de diagnóstico o de respuesta al presupuesto.',
    etiqueta: 'Evaluación técnica',
    estados: ['DIAGNOSTICO', 'PRESUPUESTO_PENDIENTE', 'PRESUPUESTO_RECHAZADO'] as EstadoOrden[],
    colorIcono: 'bg-[#f6e9df] text-[#b86d3d]',
    colorEstado: 'bg-[#f6e9df] text-[#975f3c]',
  },
  reparacion: {
    titulo: 'Reparación',
    descripcion: 'Equipos con presupuesto aceptado o en proceso de reparación.',
    etiqueta: 'Trabajo técnico',
    estados: ['PRESUPUESTO_ACEPTADO', 'EN_REPARACION', 'REPARADO'] as EstadoOrden[],
    colorIcono: 'bg-[#e6f0e8] text-[#43845b]',
    colorEstado: 'bg-[#e6f0e8] text-[#43845b]',
  },
} as const;

type Modo = keyof typeof CONFIG;

function nombreEstado(estado: string) {
  return estado.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letra) => letra.toUpperCase());
}

export function EtapaPage({ modo }: { modo: Modo }) {
  const config = CONFIG[modo];
  const { data: ordenes, isLoading, isError } = useQuery<OrdenReparacion[]>({
    queryKey: ['ordenes', modo],
    queryFn: async () => {
      const respuestas = await Promise.all(
        config.estados.map((estado) => api.get('/ordenes', { params: { estado } }).then((respuesta) => respuesta.data)),
      );
      return respuestas.flat();
    },
  });

  return (
    <main className="rounded-[28px] bg-[#2b292a] p-4 text-white sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#e7a16a]">{config.etiqueta}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{config.titulo}</h1>
            <p className="mt-0.5 text-xs text-white/50">{config.descripcion}</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
            <ClipboardList size={16} className={modo === 'reparacion' ? 'text-[#78ad89]' : 'text-[#e7a16a]'} />
            <span className="text-xs text-white/70">{ordenes?.length ?? 0} {ordenes?.length === 1 ? 'equipo' : 'equipos'}</span>
          </div>
        </header>

        {isLoading && (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-white/10" />)}
          </div>
        )}

        {isError && (
          <div role="alert" className="rounded-2xl border border-[#a74838]/30 bg-[#a74838]/10 p-4 text-sm text-[#ffd4cc]">
            No se pudieron cargar los equipos de esta etapa. Intenta actualizar la página.
          </div>
        )}

        {!isLoading && !isError && ordenes?.length ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ordenes.map((orden) => (
              <Link
                key={orden.id}
                to={`/ordenes/${orden.id}`}
                className="group flex min-h-[190px] flex-col rounded-2xl bg-[#f8f7f5] p-4 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.18)] focus:outline-none focus:ring-2 focus:ring-[#e7a16a] sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.colorIcono}`}>
                      {modo === 'reparacion' ? <Wrench size={19} /> : <Clock3 size={19} />}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">{orden.marca} {orden.modelo}</h2>
                      <p className="mt-0.5 truncate text-[11px] text-[#817b76]">{orden.cliente.nombre}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${config.colorEstado}`}>
                    {nombreEstado(orden.estado)}
                  </span>
                </div>

                <div className="mt-4 flex-1 rounded-xl bg-[#f0eeea] px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#99928c]">Falla reportada</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#5f5a55]">
                    {orden.fallaReportada || 'Sin descripción registrada.'}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="truncate text-[10px] text-[#817b76]">{orden.cliente.telefono}</p>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold transition group-hover:gap-2 ${modo === 'reparacion' ? 'text-[#43845b]' : 'text-[#975f3c]'}`}>
                    Abrir orden <ArrowUpRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </section>
        ) : null}

        {!isLoading && !isError && ordenes?.length === 0 && (
          <section className="rounded-2xl bg-[#f8f7f5] px-5 py-12 text-center text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efede9] text-[#716d69]">
              <ClipboardList size={22} />
            </span>
            <h2 className="mt-3 text-base font-semibold">No hay equipos en esta etapa</h2>
            <p className="mt-1 text-xs text-[#817b76]">Las órdenes correspondientes aparecerán aquí cuando avancen en el proceso.</p>
          </section>
        )}
      </div>
    </main>
  );
}
