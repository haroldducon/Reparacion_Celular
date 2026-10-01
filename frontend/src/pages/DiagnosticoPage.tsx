import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  ImagePlus,
  Link2,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { api, urlFoto } from '../lib/api';
import { ComentariosOrden } from '../components/ComentariosOrden';
import { ReabrirOrden } from '../components/ReabrirOrden';
import type { OrdenReparacion } from '../types';

const CAMPO = 'w-full rounded-xl border border-[#e3dfd9] bg-white px-3 py-2.5 text-sm text-[#302d2e] outline-none transition placeholder:text-[#aaa39b] focus:border-[#c77945] focus:ring-2 focus:ring-[#c77945]/15 disabled:cursor-not-allowed disabled:bg-[#efede9]';
const PANEL = 'rounded-2xl bg-[#f8f7f5] p-4 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:p-5';

type EstadoPresupuesto = 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';
type OrdenDiagnostico = OrdenReparacion & {
  estadoPresupuesto?: EstadoPresupuesto;
  presupuestoReparacion?: string | number | null;
  numeroReparacion?: string | number | null;
};

const ETIQUETA_ESTADO: Record<string, string> = {
  RECEPCION: 'Pendiente de diagnóstico',
  DIAGNOSTICO: 'Diagnóstico en curso',
  EN_REPARACION: 'En reparación',
  REPARADO: 'Reparado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

const ETIQUETA_PRESUPUESTO: Record<EstadoPresupuesto, string> = {
  PENDIENTE: 'Pendiente de respuesta',
  ACEPTADO: 'Aceptado por el cliente',
  RECHAZADO: 'No aceptado',
};

function dinero(valor: string | number | null | undefined) {
  return `$${Number(valor ?? 0).toLocaleString('es-CO')}`;
}

function claseEstado(estado: string) {
  if (estado === 'REPARADO' || estado === 'ENTREGADO') return 'bg-[#e6f0e8] text-[#43845b]';
  if (estado === 'CANCELADO') return 'bg-[#f2e8e5] text-[#a74838]';
  if (estado === 'DIAGNOSTICO' || estado === 'EN_REPARACION') return 'bg-[#f6e9df] text-[#975f3c]';
  return 'bg-[#efede9] text-[#716d69]';
}

function clasePresupuesto(estado: EstadoPresupuesto) {
  if (estado === 'ACEPTADO') return 'bg-[#e6f0e8] text-[#43845b]';
  if (estado === 'RECHAZADO') return 'bg-[#f2e8e5] text-[#a74838]';
  return 'bg-[#efede9] text-[#716d69]';
}

export function DiagnosticoPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [diagnostico, setDiagnostico] = useState('');
  const [presupuesto, setPresupuesto] = useState('');
  const [error, setError] = useState('');
  const tipoFotoSubiendo = 'DIAGNOSTICO' as const;
  const [copiado, setCopiado] = useState(false);

  const { data: orden, isLoading: cargandoOrden, isError: errorOrden } = useQuery<OrdenDiagnostico>({
    queryKey: ['orden', id],
    queryFn: () => api.get(`/ordenes/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: ordenes, isLoading: cargandoLista, isError: errorLista } = useQuery<OrdenDiagnostico[]>({
    queryKey: ['ordenes'],
    queryFn: () => api.get('/ordenes').then((r) => r.data),
    enabled: !id,
  });

  useEffect(() => {
    if (!orden) return;
    setDiagnostico(orden.diagnostico ?? '');
    setPresupuesto(String(orden.presupuestoReparacion ?? ''));
  }, [orden]);

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ['orden', id] });
    queryClient.invalidateQueries({ queryKey: ['ordenes'] });
  }

  const guardarDiagnostico = useMutation({
    mutationFn: () =>
      api.patch(`/ordenes/${id}/diagnostico`, {
        diagnostico: diagnostico.trim(),
        presupuestoReparacion: Number(presupuesto),
      }),
    onSuccess: () => {
      setError('');
      invalidar();
    },
    onError: (err: any) => setError(err.response?.data?.message ?? 'No se pudo guardar el diagnóstico.'),
  });

  const marcarPresupuesto = useMutation({
    mutationFn: (estado: 'ACEPTADO' | 'RECHAZADO') => api.patch(`/ordenes/${id}/presupuesto`, { estado }),
    onSuccess: () => {
      setError('');
      invalidar();
    },
    onError: (err: any) => setError(err.response?.data?.message ?? 'No se pudo actualizar el presupuesto.'),
  });

  const subirFoto = useMutation({
    mutationFn: (archivo: File) => {
      const form = new FormData();
      form.append('foto', archivo);
      form.append('tipo', tipoFotoSubiendo);
      return api.post(`/ordenes/${id}/fotos`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: invalidar,
    onError: (err: any) => setError(err.response?.data?.message ?? 'No se pudo subir la foto.'),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    guardarDiagnostico.mutate();
  }

  function onSeleccionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (archivo) subirFoto.mutate(archivo);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  if (!id) {
    const pendientes = (ordenes ?? []).filter(
      (item) => ['RECEPCION', 'DIAGNOSTICO'].includes(item.estado) && item.estadoPresupuesto !== 'ACEPTADO',
    );

    return (
      <main className="rounded-[28px] bg-[#2b292a] p-4 text-white sm:p-5 lg:p-6">
        <div className="mx-auto max-w-[1500px] space-y-5">
          <header className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#e7a16a]">Área técnica</p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Diagnósticos</h1>
              <p className="mt-0.5 text-xs text-white/50">Revisa la falla y prepara la cotización para el cliente.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/45">Por diagnosticar</p>
              <p className="mt-0.5 text-lg font-semibold text-[#e7a16a]">{pendientes.length}</p>
            </div>
          </header>

          <section className="overflow-hidden rounded-2xl bg-[#f8f7f5] text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
            <div className="border-b border-[#e7e3de] px-5 py-4 sm:px-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Cola de diagnóstico</p>
              <h2 className="mt-0.5 text-lg font-semibold">Equipos pendientes</h2>
            </div>
            {cargandoLista ? (
              <p className="px-5 py-12 text-center text-sm text-[#817b76]">Cargando equipos pendientes…</p>
            ) : errorLista ? (
              <p role="alert" className="m-4 rounded-xl bg-[#f8e9e5] p-4 text-sm text-[#a74838]">No se pudieron cargar los equipos pendientes.</p>
            ) : pendientes.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-xs">
                  <thead className="bg-[#f0eeea] text-left text-[#716d69]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Cliente</th>
                      <th className="px-5 py-3 font-semibold">Equipo</th>
                      <th className="px-5 py-3 font-semibold">Falla reportada</th>
                      <th className="px-5 py-3 font-semibold">Estado</th>
                      <th className="px-5 py-3 text-right font-semibold">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e7e3de]">
                    {pendientes.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-[#f7f5f2]">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold">{item.cliente.nombre}</p>
                          <p className="mt-0.5 text-[10px] text-[#99928c]">{item.cliente.telefono}</p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 font-medium">{item.marca} {item.modelo}</td>
                        <td className="max-w-[300px] px-5 py-3.5 text-[#716d69]">
                          <span className="line-clamp-2">{item.fallaReportada}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${claseEstado(item.estado)}`}>
                            {ETIQUETA_ESTADO[item.estado] ?? item.estado}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#c77945] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#ad6338]"
                            to={`/diagnosticos/${item.id}`}
                          >
                            Abrir diagnóstico <ExternalLink size={13} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-12 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f0e8] text-[#43845b]">
                  <CheckCircle2 size={23} />
                </span>
                <h3 className="mt-3 text-base font-semibold">No hay equipos pendientes</h3>
                <p className="mt-1 text-xs text-[#817b76]">Las nuevas recepciones aparecerán aquí para ser revisadas.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  if (cargandoOrden) {
    return <div className="rounded-[28px] bg-[#2b292a] p-6 text-sm text-white/60">Cargando diagnóstico…</div>;
  }
  if (errorOrden || !orden) {
    return (
      <div className="rounded-[28px] bg-[#2b292a] p-6 text-sm text-[#ffd4cc]">
        No se pudo cargar este diagnóstico.
        <Link to="/diagnosticos" className="ml-2 underline">Volver al listado</Link>
      </div>
    );
  }

  const estadoPresupuesto = orden.estadoPresupuesto ?? 'PENDIENTE';
  const bloqueado = orden.estado === 'CANCELADO' || orden.estado === 'ENTREGADO';
  const fotosDiagnostico = orden.fotos?.filter((foto) => foto.tipo === 'DIAGNOSTICO') ?? [];
  const linkSeguimiento = `${window.location.origin}/seguimiento/${orden.id}`;

  return (
    <main className="rounded-[28px] bg-[#2b292a] p-4 text-white sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1200px] space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-3 px-1">
          <div>
            <Link to="/diagnosticos" className="inline-flex items-center gap-1.5 text-xs font-medium text-white/55 transition hover:text-white">
              <ArrowLeft size={14} /> Volver a diagnósticos
            </Link>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.15em] text-[#e7a16a]">Orden #{orden.numeroReparacion ?? orden.id.slice(0, 8).toUpperCase()}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Diagnóstico · {orden.marca} {orden.modelo}</h1>
            <p className="mt-1 text-xs text-white/55">
              {orden.cliente.nombre} · {orden.cliente.telefono} · Recibido el {new Date(orden.fechaRecepcion).toLocaleDateString('es-CO')}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${claseEstado(orden.estado)}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {ETIQUETA_ESTADO[orden.estado] ?? orden.estado}
          </span>
        </header>

        {bloqueado && (
          <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-xs text-white/65">
            Esta orden está cerrada; el diagnóstico se muestra en modo de solo lectura.
            <ReabrirOrden ordenId={orden.id} estado={orden.estado} />
          </div>
        )}

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#e7a16a]"><Link2 size={17} /></div>
            <div className="min-w-0">
              <p className="text-xs font-semibold">Link de seguimiento para el cliente</p>
              <p className="mt-0.5 break-all text-[10px] text-white/45">{linkSeguimiento}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(linkSeguimiento);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <Copy size={14} /> {copiado ? 'Copiado' : 'Copiar link'}
          </button>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className={PANEL}>
            <div className="mb-4 flex items-center gap-3 border-b border-[#e7e3de] pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#efede9] text-[#716d69]"><Search size={18} /></div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Recepción</p>
                <h2 className="text-base font-semibold">Información del equipo</h2>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#817b76]">Falla reportada</p>
                <p className="mt-1 text-sm leading-relaxed">{orden.fallaReportada}</p>
              </div>
              <div className="grid gap-3 border-t border-[#e7e3de] pt-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#817b76]">Equipo recibido</p>
                  <p className="mt-1 text-sm font-medium">{orden.marca} {orden.modelo}{orden.color ? ` · ${orden.color}` : ''}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#817b76]">Accesorios</p>
                  <p className="mt-1 text-sm">{orden.accesoriosRecibidos || 'No se registraron accesorios'}</p>
                </div>
              </div>
            </div>
          </article>

          <article className="flex flex-col justify-between rounded-2xl border border-[#c77945]/20 bg-[#f8f7f5] p-5 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6e9df] text-[#b86d3d]"><ShieldCheck size={19} /></div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Propuesta al cliente</p>
              <h2 className="mt-1 text-base font-semibold">Cotización de reparación</h2>
              <p className="mt-3 font-display text-3xl font-semibold text-[#975f3c]">
                {orden.presupuestoReparacion != null ? dinero(orden.presupuestoReparacion) : 'Sin definir'}
              </p>
            </div>
            <p className="mt-4 border-t border-[#e7e3de] pt-3 text-[11px] leading-relaxed text-[#817b76]">
              Es el presupuesto para que el cliente decida; no es el costo real ni el cobro final.
            </p>
          </article>
        </section>

        <form onSubmit={(e) => { e.preventDefault(); setError(''); guardarDiagnostico.mutate(); }} className={PANEL}>
          <div className="mb-4 border-b border-[#e7e3de] pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Evaluación técnica</p>
            <h2 className="mt-0.5 text-lg font-semibold">Diagnóstico y cotización</h2>
            <p className="mt-0.5 text-xs text-[#817b76]">Describe la evaluación y define el valor propuesto al cliente.</p>
          </div>

          <div>
            <label htmlFor="diagnostico-tecnico" className="mb-1.5 block text-xs font-semibold text-[#5f5a55]">Diagnóstico técnico</label>
            <textarea
              id="diagnostico-tecnico"
              required
              rows={4}
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              disabled={bloqueado}
              placeholder="Ej.: El equipo presenta daño en el módulo de pantalla y requiere cambio completo…"
              className={`${CAMPO} resize-y leading-relaxed`}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,320px)_1fr] md:items-end">
            <div>
              <label htmlFor="presupuesto-reparacion" className="mb-1.5 block text-xs font-semibold text-[#5f5a55]">Valor de reparación para cotizar</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#817b76]">$</span>
                <input
                  id="presupuesto-reparacion"
                  required
                  min="0"
                  type="number"
                  step="any"
                  value={presupuesto}
                  onChange={(e) => setPresupuesto(e.target.value)}
                  disabled={bloqueado}
                  className={`${CAMPO} pl-7`}
                  placeholder="0"
                />
              </div>
            </div>
            <p className="rounded-xl bg-[#f0eeea] px-3 py-2.5 text-[11px] leading-relaxed text-[#817b76]">
              El cliente debe aceptar esta cotización antes de iniciar la reparación.
            </p>
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl bg-[#f8e9e5] px-3 py-2.5 text-xs text-[#a74838]">{error}</p>}
          {!bloqueado && (
            <div className="mt-5 flex justify-end border-t border-[#e7e3de] pt-4">
              <button
                type="submit"
                disabled={guardarDiagnostico.isPending || !diagnostico.trim() || !presupuesto}
                className="rounded-xl bg-[#c77945] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ad6338] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardarDiagnostico.isPending ? 'Guardando…' : 'Guardar diagnóstico y cotización'}
              </button>
            </div>
          )}
        </form>

        <section className={PANEL}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#e7e3de] pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Decisión del cliente</p>
              <h2 className="mt-0.5 text-lg font-semibold">Respuesta a la cotización</h2>
              <p className="mt-0.5 text-xs text-[#817b76]">Registra su decisión antes de pasar el equipo a reparación.</p>
            </div>
            <span className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold ${clasePresupuesto(estadoPresupuesto)}`}>
              {ETIQUETA_PRESUPUESTO[estadoPresupuesto]}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f0eeea] px-4 py-3">
            <div className={`flex items-center gap-2 ${estadoPresupuesto === 'ACEPTADO' ? 'text-[#43845b]' : estadoPresupuesto === 'RECHAZADO' ? 'text-[#a74838]' : 'text-[#716d69]'}`}>
              {estadoPresupuesto === 'ACEPTADO' ? <CheckCircle2 size={18} /> : estadoPresupuesto === 'RECHAZADO' ? <XCircle size={18} /> : <ShieldCheck size={18} />}
              <p className="text-xs font-semibold">
                {estadoPresupuesto === 'ACEPTADO'
                  ? 'Cotización aceptada; el equipo puede pasar a reparación.'
                  : estadoPresupuesto === 'RECHAZADO'
                    ? 'El cliente no aceptó la cotización.'
                    : 'Registra la decisión del cliente para continuar.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {estadoPresupuesto === 'ACEPTADO' && (
                <Link to={`/reparaciones/${orden.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#43845b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#36734d]">
                  Ir a reparación <ExternalLink size={13} />
                </Link>
              )}
              {estadoPresupuesto !== 'RECHAZADO' && (
                <button
                  type="button"
                  onClick={() => marcarPresupuesto.mutate('RECHAZADO')}
                  disabled={bloqueado || marcarPresupuesto.isPending || orden.presupuestoReparacion == null}
                  className="rounded-lg border border-[#a74838]/30 px-3 py-2 text-xs font-semibold text-[#a74838] transition hover:bg-[#f2e8e5] disabled:opacity-50"
                >
                  Cliente no acepta
                </button>
              )}
              {estadoPresupuesto !== 'ACEPTADO' && (
                <button
                  type="button"
                  onClick={() => marcarPresupuesto.mutate('ACEPTADO')}
                  disabled={bloqueado || marcarPresupuesto.isPending || orden.presupuestoReparacion == null}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#43845b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#36734d] disabled:opacity-50"
                >
                  <CheckCircle2 size={14} /> Marcar como aceptado
                </button>
              )}
            </div>
          </div>
        </section>

        <section className={PANEL}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Evidencia técnica</p>
              <h2 className="mt-0.5 text-base font-semibold">Fotos del diagnóstico</h2>
              <p className="mt-0.5 text-xs text-[#817b76]">Documenta la falla sin mezclarla con los repuestos o el cobro.</p>
            </div>
            {!bloqueado && (
              <>
                <input
                  ref={fileInputRef}
                  id="foto-diagnostico"
                  type="file"
                  accept="image/*"
                  disabled={subirFoto.isPending}
                  onChange={onSeleccionarFoto}
                  className="sr-only"
                />
                <label
                  htmlFor="foto-diagnostico"
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#ded9d2] px-3 py-2 text-xs font-semibold text-[#5f5a55] transition hover:border-[#c77945] hover:bg-[#f6e9df] ${subirFoto.isPending ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <ImagePlus size={15} /> {subirFoto.isPending ? 'Subiendo…' : 'Agregar foto'}
                </label>
              </>
            )}
          </div>
          {error && <p role="alert" className="mb-3 rounded-xl bg-[#f8e9e5] px-3 py-2.5 text-xs text-[#a74838]">{error}</p>}
          {fotosDiagnostico.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {fotosDiagnostico.map((foto) => (
                <a
                  key={foto.id}
                  href={urlFoto(foto.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative overflow-hidden rounded-xl border border-[#e3dfd9] bg-[#efede9]"
                >
                  <img
                    src={urlFoto(foto.url)}
                    alt="Foto de diagnóstico"
                    className="h-28 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-32"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                    <ExternalLink size={18} />
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-[#f0eeea] px-3 py-5 text-center text-xs text-[#817b76]">Sin fotos de diagnóstico todavía.</p>
          )}
        </section>

        <ComentariosOrden ordenId={orden.id} historial={orden.historial} />
      </div>
    </main>
  );
}
