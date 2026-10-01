import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  ImagePlus,
  Link2,
  Package,
  Plus,
  ShieldCheck,
  Trash2,
  Wrench,
} from 'lucide-react';
import { api, urlFoto } from '../lib/api';
import { ComentariosOrden } from '../components/ComentariosOrden';
import type { OrdenReparacion } from '../types';

const CAMPO = 'w-full rounded-xl border border-[#e3dfd9] bg-white px-3 py-2.5 text-sm text-[#302d2e] outline-none transition placeholder:text-[#aaa39b] focus:border-[#c77945] focus:ring-2 focus:ring-[#c77945]/15 disabled:cursor-not-allowed disabled:bg-[#efede9]';
const ETIQUETA = 'mb-1.5 block text-xs font-semibold text-[#5f5a55]';
const PANEL = 'rounded-2xl bg-[#f8f7f5] p-4 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:p-5';

interface RepuestoForm {
  nombre: string;
  costo: string;
  cantidad: string;
}

function dinero(valor: string | number | null | undefined) {
  return `$${Number(valor ?? 0).toLocaleString('es-CO')}`;
}

function EtiquetaEstado({ estado }: { estado: string }) {
  const esFinalizado = estado === 'REPARADO';
  const etiqueta = esFinalizado ? 'Reparado' : estado === 'EN_REPARACION' ? 'En reparación' : 'Presupuesto aceptado';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${esFinalizado ? 'bg-[#e6f0e8] text-[#43845b]' : 'bg-[#f6e9df] text-[#975f3c]'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${esFinalizado ? 'bg-[#43845b]' : 'bg-[#c77945]'}`} />
      {etiqueta}
    </span>
  );
}

export function ReparacionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [repuestos, setRepuestos] = useState<RepuestoForm[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  const { data: orden, isLoading: cargandoOrden, isError: errorOrden } = useQuery<OrdenReparacion>({
    queryKey: ['orden', id],
    queryFn: () => api.get(`/ordenes/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: ordenes, isLoading: cargandoLista, isError: errorLista } = useQuery<OrdenReparacion[]>({
    queryKey: ['ordenes'],
    queryFn: () => api.get('/ordenes').then((r) => r.data),
    enabled: !id,
  });

  useEffect(() => {
    if (!orden) return;
    setRepuestos(
      (orden.repuestos ?? []).map((item) => ({
        nombre: item.nombre,
        costo: String(item.costo),
        cantidad: String(item.cantidad),
      })),
    );
    setObservaciones(orden.observaciones ?? '');
  }, [orden]);

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ['orden', id] });
    queryClient.invalidateQueries({ queryKey: ['ordenes'] });
  }

  const guardarReparacion = useMutation({
    mutationFn: () =>
      api.patch(`/ordenes/${id}/reparacion`, {
        repuestos: repuestos
          .filter((item) => item.nombre.trim() && item.costo !== '')
          .map((item) => ({ nombre: item.nombre.trim(), costo: Number(item.costo), cantidad: Number(item.cantidad) || 1 })),
        observaciones: observaciones.trim() || undefined,
      }),
    onSuccess: () => {
      setError('');
      invalidar();
    },
    onError: (err: any) => setError(err.response?.data?.message ?? 'No se pudo guardar la reparación.'),
  });

  const marcarReparado = useMutation({
    mutationFn: () => api.patch(`/ordenes/${id}/estado`, { estado: 'REPARADO' }),
    onSuccess: () => {
      setError('');
      invalidar();
    },
    onError: (err: any) => setError(err.response?.data?.message ?? 'No se pudo marcar el equipo como reparado.'),
  });

  const subirFoto = useMutation({
    mutationFn: (archivo: File) => {
      const form = new FormData();
      form.append('foto', archivo);
      form.append('tipo', 'REPARACION');
      return api.post(`/ordenes/${id}/fotos`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: invalidar,
    onError: (err: any) => setError(err.response?.data?.message ?? 'No se pudo subir la foto.'),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    guardarReparacion.mutate();
  }

  function onSeleccionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (archivo) subirFoto.mutate(archivo);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const totalRepuestos = repuestos.reduce(
    (total, item) => total + (Number(item.costo) || 0) * (Number(item.cantidad) || 1),
    0,
  );

  function actualizarRepuesto(index: number, campo: keyof RepuestoForm, valor: string) {
    setRepuestos((actuales) => actuales.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  }

  if (!id) {
    const pendientes = (ordenes ?? []).filter(
      (item) => item.estadoPresupuesto === 'ACEPTADO' && ['DIAGNOSTICO', 'EN_REPARACION'].includes(item.estado),
    );

    return (
      <main className="rounded-[28px] bg-[#2b292a] p-4 text-white sm:p-5 lg:p-6">
        <div className="mx-auto max-w-[1500px] space-y-5">
          <header className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#e7a16a]">Área técnica</p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Reparaciones</h1>
              <p className="mt-0.5 text-xs text-white/50">Inicia el trabajo cuando el cliente haya aceptado la cotización.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/45">Pendientes</p>
              <p className="mt-0.5 text-lg font-semibold text-[#e7a16a]">{pendientes.length}</p>
            </div>
          </header>

          <section className="overflow-hidden rounded-2xl bg-[#f8f7f5] text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
            <div className="border-b border-[#e7e3de] px-5 py-4 sm:px-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Cola de trabajo</p>
              <h2 className="mt-0.5 text-lg font-semibold">Presupuestos aceptados</h2>
            </div>

            {cargandoLista ? (
              <p className="px-5 py-12 text-center text-sm text-[#817b76]">Cargando reparaciones pendientes…</p>
            ) : errorLista ? (
              <p role="alert" className="m-4 rounded-xl bg-[#f8e9e5] p-4 text-sm text-[#a74838]">No se pudieron cargar las reparaciones.</p>
            ) : pendientes.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-xs">
                  <thead className="bg-[#f0eeea] text-left text-[#716d69]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Cliente</th>
                      <th className="px-5 py-3 font-semibold">Equipo</th>
                      <th className="px-5 py-3 font-semibold">Cotización</th>
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
                        <td className="whitespace-nowrap px-5 py-3.5 font-semibold">{dinero(item.presupuestoReparacion)}</td>
                        <td className="px-5 py-3.5"><EtiquetaEstado estado={item.estado} /></td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#c77945] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#ad6338]"
                            to={`/reparaciones/${item.id}`}
                          >
                            Abrir reparación <ExternalLink size={13} />
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
                <h3 className="mt-3 text-base font-semibold">No hay reparaciones pendientes</h3>
                <p className="mt-1 text-xs text-[#817b76]">Los presupuestos aceptados aparecerán aquí para iniciar el trabajo.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  if (cargandoOrden) {
    return <div className="rounded-[28px] bg-[#2b292a] p-6 text-sm text-white/60">Cargando reparación…</div>;
  }
  if (errorOrden || !orden) {
    return (
      <div className="rounded-[28px] bg-[#2b292a] p-6 text-sm text-[#ffd4cc]">
        No se pudo cargar esta reparación.
        <Link to="/reparaciones" className="ml-2 underline">Volver al listado</Link>
      </div>
    );
  }

  const bloqueado = orden.estado === 'ENTREGADO' || orden.estado === 'CANCELADO';
  const fotosReparacion = orden.fotos?.filter((foto) => foto.tipo === 'REPARACION') ?? [];
  const ganancia = Number(orden.presupuestoReparacion ?? 0) - totalRepuestos;
  const linkSeguimiento = `${window.location.origin}/seguimiento/${orden.id}`;

  return (
    <main className="rounded-[28px] bg-[#2b292a] p-4 text-white sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1200px] space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-3 px-1">
          <div>
            <Link to="/reparaciones" className="inline-flex items-center gap-1.5 text-xs font-medium text-white/55 transition hover:text-white">
              <ArrowLeft size={14} /> Volver a reparaciones
            </Link>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.15em] text-[#e7a16a]">Orden #{orden.numeroReparacion ?? orden.id.slice(0, 8).toUpperCase()}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{orden.marca} {orden.modelo}</h1>
            <p className="mt-1 text-xs text-white/55">{orden.cliente.nombre} · {orden.cliente.telefono}</p>
          </div>
          <EtiquetaEstado estado={orden.estado} />
        </header>

        {bloqueado && (
          <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-xs text-white/65">
            Esta orden está cerrada; la información se muestra en modo de solo lectura.
          </div>
        )}

        <section className="grid gap-3 md:grid-cols-3">
          <div className={`${PANEL} flex items-center justify-between gap-3`}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ad7049]">Cotización aceptada</p>
              <p className="mt-1 text-xl font-semibold">{dinero(orden.presupuestoReparacion)}</p>
              <Link to={`/diagnosticos/${orden.id}`} className="mt-1 inline-block text-[11px] font-medium text-[#975f3c] hover:underline">Ver diagnóstico</Link>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6e9df] text-[#b86d3d]">
              <ShieldCheck size={19} />
            </div>
          </div>
          <div className={`${PANEL} flex items-center justify-between gap-3`}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#817b76]">Total de repuestos</p>
              <p className="mt-1 text-xl font-semibold">{dinero(totalRepuestos)}</p>
              <p className="mt-1 text-[10px] text-[#99928c]">Costo registrado en la reparación</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#efede9] text-[#716d69]">
              <Package size={19} />
            </div>
          </div>
          <div className={`${PANEL} flex items-center justify-between gap-3`}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#817b76]">Ganancia estimada</p>
              <p className={`mt-1 text-xl font-semibold ${ganancia >= 0 ? 'text-[#43845b]' : 'text-[#a74838]'}`}>{dinero(ganancia)}</p>
              <p className="mt-1 text-[10px] text-[#99928c]">Cotización menos repuestos</p>
            </div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ganancia >= 0 ? 'bg-[#e6f0e8] text-[#43845b]' : 'bg-[#f2e8e5] text-[#a74838]'}`}>
              <Wrench size={19} />
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#e7a16a]">
              <Link2 size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold">Link para el cliente</p>
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

        <form onSubmit={(e) => { e.preventDefault(); setError(''); guardarReparacion.mutate(); }} className={PANEL}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e3de] pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Registro técnico</p>
              <h2 className="mt-0.5 text-lg font-semibold">Ejecución de la reparación</h2>
              <p className="mt-0.5 text-xs text-[#817b76]">Registra repuestos y observaciones. El cobro corresponde a la cotización aceptada.</p>
            </div>
            {orden.estado === 'REPARADO' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f0e8] px-3 py-1.5 text-[11px] font-semibold text-[#43845b]">
                <CheckCircle2 size={14} /> Lista para entrega
              </span>
            )}
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Repuestos utilizados</h3>
                <p className="mt-0.5 text-[11px] text-[#817b76]">Agrega los componentes y costos asociados al trabajo.</p>
              </div>
              <button
                type="button"
                disabled={bloqueado}
                onClick={() => setRepuestos((actuales) => [...actuales, { nombre: '', costo: '', cantidad: '1' }])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#c77945]/40 px-3 py-2 text-xs font-semibold text-[#975f3c] transition hover:bg-[#f6e9df] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={14} /> Agregar repuesto
              </button>
            </div>

            {repuestos.length ? (
              <div className="space-y-2">
                {repuestos.map((item, index) => (
                  <div key={index} className="grid grid-cols-[minmax(0,1fr)_88px_66px_34px] gap-2 sm:grid-cols-[minmax(0,1fr)_130px_85px_38px]">
                    <input
                      aria-label={`Nombre del repuesto ${index + 1}`}
                      placeholder="Nombre del repuesto"
                      value={item.nombre}
                      disabled={bloqueado}
                      onChange={(e) => actualizarRepuesto(index, 'nombre', e.target.value)}
                      className={CAMPO}
                    />
                    <input
                      aria-label={`Costo unitario del repuesto ${index + 1}`}
                      placeholder="Costo"
                      type="number"
                      min="0"
                      step="any"
                      value={item.costo}
                      disabled={bloqueado}
                      onChange={(e) => actualizarRepuesto(index, 'costo', e.target.value)}
                      className={CAMPO}
                    />
                    <input
                      aria-label={`Cantidad del repuesto ${index + 1}`}
                      placeholder="Cant."
                      type="number"
                      min="1"
                      value={item.cantidad}
                      disabled={bloqueado}
                      onChange={(e) => actualizarRepuesto(index, 'cantidad', e.target.value)}
                      className={CAMPO}
                    />
                    <button
                      type="button"
                      disabled={bloqueado}
                      onClick={() => setRepuestos((actuales) => actuales.filter((_, i) => i !== index))}
                      className="flex items-center justify-center rounded-xl text-[#a74838] transition hover:bg-[#f2e8e5] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Eliminar repuesto ${index + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-[#f0eeea] px-3 py-3 text-xs text-[#817b76]">Todavía no hay repuestos registrados.</p>
            )}
            <div className="mt-3 flex justify-end border-t border-[#e7e3de] pt-3 text-xs text-[#716d69]">
              Total de repuestos: <span className="ml-1 font-semibold text-[#302d2e]">{dinero(totalRepuestos)}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#5f5a55]">Cobrado al cliente</label>
              <div className="rounded-xl border border-[#e3dfd9] bg-[#efede9] px-3.5 py-2.5 text-sm font-semibold text-[#302d2e]">
                {dinero(orden.presupuestoReparacion)}
              </div>
              <p className="mt-1 text-[10px] text-[#99928c]">Valor heredado del diagnóstico aprobado.</p>
            </div>
            <div>
              <label htmlFor="observaciones-reparacion" className="mb-1.5 block text-xs font-semibold text-[#5f5a55]">Observaciones de reparación</label>
              <input
                id="observaciones-reparacion"
                value={observaciones}
                disabled={bloqueado}
                onChange={(e) => setObservaciones(e.target.value)}
                className={CAMPO}
                placeholder="Trabajo realizado, pruebas, garantía…"
              />
            </div>
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl bg-[#f8e9e5] px-3 py-2.5 text-xs text-[#a74838]">{error}</p>}

          {!bloqueado && (
            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#e7e3de] pt-4">
              <button
                type="submit"
                disabled={guardarReparacion.isPending || orden.presupuestoReparacion == null}
                className="rounded-xl border border-[#d7d1c9] px-4 py-2.5 text-sm font-semibold text-[#5f5a55] transition hover:bg-[#f0eeea] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardarReparacion.isPending ? 'Guardando…' : 'Guardar reparación'}
              </button>
              <button
                type="button"
                onClick={() => marcarReparado.mutate()}
                disabled={marcarReparado.isPending || !orden.precioCobrado}
                className="inline-flex items-center gap-2 rounded-xl bg-[#43845b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#36734d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {marcarReparado.isPending ? 'Actualizando…' : 'Marcar como reparado'}
              </button>
            </div>
          )}
        </form>

        <section className={PANEL}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#efede9] text-[#716d69]">
                <ImagePlus size={19} />
              </div>
              <div>
                <h2 className="text-base font-semibold">Fotos de la reparación</h2>
                <p className="mt-0.5 text-xs text-[#817b76]">Documenta el trabajo realizado y las pruebas finales.</p>
              </div>
            </div>
            {!bloqueado && (
              <>
                <input
                  ref={fileInputRef}
                  id="foto-reparacion"
                  type="file"
                  accept="image/*"
                  disabled={subirFoto.isPending}
                  onChange={onSeleccionarFoto}
                  className="sr-only"
                />
                <label
                  htmlFor="foto-reparacion"
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#ded9d2] px-3 py-2 text-xs font-semibold text-[#5f5a55] transition hover:border-[#c77945] hover:bg-[#f6e9df] ${subirFoto.isPending ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <Plus size={15} /> {subirFoto.isPending ? 'Subiendo…' : 'Agregar foto'}
                </label>
              </>
            )}
          </div>
          {error && <p role="alert" className="mb-3 rounded-xl bg-[#f8e9e5] px-3 py-2.5 text-xs text-[#a74838]">{error}</p>}
          {fotosReparacion.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {fotosReparacion.map((foto) => (
                <a
                  key={foto.id}
                  href={urlFoto(foto.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative overflow-hidden rounded-xl border border-[#e3dfd9] bg-[#efede9]"
                >
                  <img
                    src={urlFoto(foto.url)}
                    alt="Foto de reparación"
                    className="h-28 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-32"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                    <ExternalLink size={18} />
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-[#f0eeea] px-3 py-5 text-center text-xs text-[#817b76]">Sin fotos de reparación todavía.</p>
          )}
        </section>

        <ComentariosOrden ordenId={orden.id} historial={orden.historial} />
      </div>
    </main>
  );
}
