import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  ImageIcon,
  PackageCheck,
  Search,
  ShieldCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { api, urlFoto } from '../lib/api';
import { Footer } from '../components/Footer';

interface SeguimientoData {
  id: string;
  numeroReparacion: string;
  marca: string;
  modelo: string;
  estado: string;
  fallaReportada: string;
  fechaRecepcion: string;
  fechaDiagnostico?: string | null;
  fechaReparado?: string | null;
  fechaEntrega?: string | null;
  diagnostico?: string | null;
  presupuestoReparacion?: string | null;
  observaciones?: string | null;
  cliente: { nombre: string };
  repuestos: { nombre: string; cantidad: number }[];
  fotos: { url: string; tipo: string; createdAt: string }[];
  historial: {
    estadoAnterior: string;
    estadoNuevo: string;
    nota?: string | null;
    esComentario?: boolean;
    createdAt: string;
  }[];
}

const PASOS = [
  { estado: 'RECEPCION', etiqueta: 'Recibido', icono: ClipboardList },
  { estado: 'DIAGNOSTICO', etiqueta: 'Diagnóstico', icono: Search },
  { estado: 'EN_REPARACION', etiqueta: 'En reparación', icono: Wrench },
  { estado: 'REPARADO', etiqueta: 'Listo para recoger', icono: PackageCheck },
  { estado: 'ENTREGADO', etiqueta: 'Entregado', icono: CheckCircle2 },
];

const ETIQUETA_ESTADO: Record<string, string> = {
  RECEPCION: 'Recibido',
  DIAGNOSTICO: 'Diagnóstico en curso',
  EN_REPARACION: 'En reparación',
  REPARADO: 'Listo para recoger',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

const PANEL = 'rounded-2xl bg-[#f8f7f5] p-4 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:p-5';
const KICKER = 'text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]';
const DATO_LABEL = 'text-[10px] font-semibold uppercase tracking-wider text-[#817b76]';

function claseEstado(estado: string) {
  if (estado === 'REPARADO' || estado === 'ENTREGADO') return 'bg-[#e6f0e8] text-[#43845b]';
  if (estado === 'CANCELADO') return 'bg-[#f2e8e5] text-[#a74838]';
  if (estado === 'DIAGNOSTICO' || estado === 'EN_REPARACION') return 'bg-[#f6e9df] text-[#975f3c]';
  return 'bg-[#efede9] text-[#716d69]';
}

function fecha(valor?: string | null) {
  return valor ? new Date(valor).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
}

function EncabezadoPanel({ icono, kicker, titulo }: { icono: React.ReactNode; kicker: string; titulo: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 border-b border-[#e7e3de] pb-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#efede9] text-[#716d69]">
        {icono}
      </div>
      <div>
        <p className={KICKER}>{kicker}</p>
        <h2 className="text-base font-semibold">{titulo}</h2>
      </div>
    </div>
  );
}

export function SeguimientoPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery<SeguimientoData>({
    queryKey: ['seguimiento', id],
    queryFn: () => api.get(`/seguimiento/${id}`).then((r) => r.data),
    enabled: !!id,
    retry: false,
  });

  const pasoActualIndex = data ? PASOS.findIndex((p) => p.estado === data.estado) : -1;
  const cancelado = data?.estado === 'CANCELADO';
  const fotos = data?.fotos ?? [];

  const fechasClave = data
    ? [
        { etiqueta: 'Recibido', valor: fecha(data.fechaRecepcion) },
        { etiqueta: 'Diagnóstico', valor: fecha(data.fechaDiagnostico) },
        { etiqueta: 'Reparado', valor: fecha(data.fechaReparado) },
        { etiqueta: 'Entrega', valor: fecha(data.fechaEntrega) },
      ].filter((f) => f.valor)
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-[#211f20]">
      <div className="flex-1 px-3 py-6 sm:px-6 sm:py-10">
      <main className="mx-auto max-w-[760px] rounded-[28px] bg-[#2b292a] p-4 text-white sm:p-6">
        <header className="px-1">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#e7a16a]">Seguimiento de reparación</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Estado de tu equipo</h1>
          <p className="mt-1 text-xs text-white/55">Consulta en tiempo real el avance de tu reparación.</p>
        </header>

        {isLoading && (
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-10 text-center text-sm text-white/60">
            Cargando información de tu equipo…
          </div>
        )}

        {isError && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-2xl bg-[#f8e9e5] p-4 text-sm text-[#a74838]"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>No encontramos un equipo con ese código de seguimiento. Verifica el enlace que te entregaron.</p>
          </div>
        )}

        {data && (
          <div className="mt-5 space-y-4">
            {/* Resumen */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#e7a16a]">
                    Reparación N° {data.numeroReparacion}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    {data.marca} {data.modelo}
                  </h2>
                  <p className="mt-1 text-xs text-white/55">Cliente: {data.cliente.nombre}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${claseEstado(data.estado)}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {ETIQUETA_ESTADO[data.estado] ?? data.estado}
                </span>
              </div>

              {fechasClave.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-4">
                  {fechasClave.map((f) => (
                    <div key={f.etiqueta}>
                      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/45">
                        <Calendar size={11} /> {f.etiqueta}
                      </p>
                      <p className="mt-0.5 text-xs font-medium">{f.valor}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Aviso de estado */}
            {data.estado === 'REPARADO' && (
              <div className="flex items-center gap-3 rounded-2xl bg-[#e6f0e8] px-4 py-3 text-[#43845b]">
                <PackageCheck size={20} className="shrink-0" />
                <p className="text-sm font-semibold">¡Tu equipo ya está listo para recoger!</p>
              </div>
            )}
            {cancelado && (
              <div className="flex items-center gap-3 rounded-2xl bg-[#f2e8e5] px-4 py-3 text-[#a74838]">
                <XCircle size={20} className="shrink-0" />
                <p className="text-sm font-semibold">Esta orden fue cancelada.</p>
              </div>
            )}

            {/* Progreso */}
            {!cancelado && (
              <section className={PANEL}>
                <div className="mb-5">
                  <p className={KICKER}>Progreso</p>
                  <h2 className="mt-0.5 text-base font-semibold">¿En qué etapa va tu equipo?</h2>
                </div>
                <ol className="grid grid-cols-5">
                  {PASOS.map((paso, i) => {
                    const completado = i < pasoActualIndex;
                    const actual = i === pasoActualIndex;
                    const Icono = paso.icono;
                    return (
                      <li key={paso.estado} className="relative flex flex-col items-center text-center">
                        {i > 0 && (
                          <span
                            className={`absolute right-1/2 top-[19px] h-0.5 w-full ${
                              i <= pasoActualIndex ? 'bg-[#43845b]' : 'bg-[#e3dfd9]'
                            }`}
                          />
                        )}
                        <span
                          className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                            completado
                              ? 'border-[#43845b] bg-[#43845b] text-white'
                              : actual
                                ? 'border-[#c77945] bg-[#f6e9df] text-[#b86d3d] ring-4 ring-[#c77945]/15'
                                : 'border-[#e3dfd9] bg-white text-[#aaa39b]'
                          }`}
                        >
                          {completado ? <CheckCircle2 size={18} /> : <Icono size={17} />}
                        </span>
                        <span
                          className={`mt-2 px-0.5 text-[10px] leading-tight sm:text-[11px] ${
                            actual ? 'font-semibold text-[#302d2e]' : completado ? 'font-medium text-[#5f5a55]' : 'text-[#aaa39b]'
                          }`}
                        >
                          {paso.etiqueta}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {/* Falla reportada */}
            <section className={PANEL}>
              <EncabezadoPanel icono={<ClipboardList size={18} />} kicker="Recepción" titulo="Falla reportada" />
              <p className="text-sm leading-relaxed">{data.fallaReportada}</p>
            </section>

            {/* Diagnóstico */}
            {data.diagnostico && (
              <section className={PANEL}>
                <EncabezadoPanel icono={<Search size={18} />} kicker="Evaluación técnica" titulo="Diagnóstico" />
                <p className="text-sm leading-relaxed text-[#5f5a55]">{data.diagnostico}</p>
                {data.presupuestoReparacion != null && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#c77945]/20 bg-[#f6e9df]/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6e9df] text-[#b86d3d]">
                        <ShieldCheck size={17} />
                      </div>
                      <div>
                        <p className={DATO_LABEL}>Valor de reparación</p>
                        <p className="text-[11px] text-[#817b76]">Cotización propuesta</p>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold text-[#975f3c]">
                      ${Number(data.presupuestoReparacion).toLocaleString('es-CO')}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Reparación */}
            {(data.repuestos.length > 0 || data.observaciones) && (
              <section className={PANEL}>
                <EncabezadoPanel icono={<Wrench size={18} />} kicker="Taller" titulo="Reparación" />
                {data.repuestos.length > 0 && (
                  <div>
                    <p className={DATO_LABEL}>Repuestos utilizados</p>
                    <ul className="mt-2 divide-y divide-[#e7e3de] overflow-hidden rounded-xl border border-[#e7e3de] bg-white">
                      {data.repuestos.map((repuesto, index) => (
                        <li key={index} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                          <span>{repuesto.nombre}</span>
                          <span className="rounded-full bg-[#efede9] px-2.5 py-0.5 text-[11px] font-semibold text-[#716d69]">
                            x{repuesto.cantidad}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.observaciones && (
                  <div className={data.repuestos.length > 0 ? 'mt-4' : ''}>
                    <p className={DATO_LABEL}>Observaciones</p>
                    <p className="mt-1 rounded-xl bg-[#f0eeea] px-3 py-2.5 text-sm leading-relaxed text-[#5f5a55]">
                      {data.observaciones}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Fotos */}
            {fotos.length > 0 && (
              <section className={PANEL}>
                <EncabezadoPanel icono={<ImageIcon size={18} />} kicker="Evidencia" titulo="Fotos de tu equipo" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {fotos.map((foto, index) => (
                    <a
                      key={index}
                      href={urlFoto(foto.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative overflow-hidden rounded-xl border border-[#e3dfd9] bg-[#efede9]"
                    >
                      <img
                        src={urlFoto(foto.url)}
                        alt="Foto del equipo"
                        className="h-28 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-32"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                        <ExternalLink size={18} />
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Historial */}
            {data.historial.length > 0 && (
              <section className={PANEL}>
                <EncabezadoPanel icono={<Clock size={18} />} kicker="Trazabilidad" titulo="Historial de la reparación" />
                <ol className="space-y-4">
                  {data.historial.map((evento, index) => (
                    <li key={index} className="relative pl-6">
                      {index < data.historial.length - 1 && (
                        <span className="absolute left-[5px] top-4 h-[calc(100%+0.5rem)] w-px bg-[#e3dfd9]" />
                      )}
                      <span
                        className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 bg-white ${
                          evento.esComentario ? 'border-[#43845b]' : 'border-[#c77945]'
                        }`}
                      />
                      {evento.esComentario ? (
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#43845b]">Mensaje del taller</p>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${claseEstado(evento.estadoNuevo)}`}
                        >
                          {ETIQUETA_ESTADO[evento.estadoNuevo] ?? evento.estadoNuevo.replace('_', ' ')}
                        </span>
                      )}
                      <p className="mt-1 text-[11px] text-[#817b76]">
                        {new Date(evento.createdAt).toLocaleString('es-CO')}
                      </p>
                      {evento.nota && (
                        <p className="mt-1.5 rounded-xl bg-[#f0eeea] px-3 py-2 text-xs leading-relaxed text-[#5f5a55]">
                          {evento.nota}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}
      </main>
      </div>
      <Footer variante="oscuro" fijo />
    </div>
  );
}
