import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  CheckCircle2,
  Phone,
  Plus,
  ShieldCheck,
  Upload,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { OrdenReparacion } from '../types';

const CAMPO = 'w-full rounded-xl border border-[#e3dfd9] bg-white px-3 py-2.5 text-sm text-[#302d2e] outline-none transition placeholder:text-[#aaa39b] focus:border-[#c77945] focus:ring-2 focus:ring-[#c77945]/15';
const ETIQUETA = 'mb-1.5 block text-xs font-semibold text-[#5f5a55]';

export function EntregasPage() {
  const queryClient = useQueryClient();
  const [expandidaId, setExpandidaId] = useState<string | null>(null);
  const [fotos, setFotos] = useState<File[]>([]);
  const [repuestos, setRepuestos] = useState<{ nombre: string; costo: string; cantidad: string }[]>([]);
  const [precioCobrado, setPrecioCobrado] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { data: pendientes, isLoading, isError } = useQuery<OrdenReparacion[]>({
    queryKey: ['entregas-pendientes'],
    queryFn: () => api.get('/ordenes', { params: { estado: 'REPARADO' } }).then((r) => r.data),
    refetchOnMount: 'always',
  });

  const registrarEntrega = useMutation({
    mutationFn: async (ordenId: string) => {
      const orden = pendientes?.find((item) => item.id === ordenId);
      const repuestosActuales = (orden?.repuestos ?? []).map((repuesto) => ({
        nombre: repuesto.nombre,
        costo: Number(repuesto.costo),
        cantidad: repuesto.cantidad,
      }));
      const repuestosNuevos = repuestos
        .filter((repuesto) => repuesto.nombre && repuesto.costo)
        .map((repuesto) => ({
          nombre: repuesto.nombre,
          costo: Number(repuesto.costo),
          cantidad: Number(repuesto.cantidad) || 1,
        }));
      const cambioValores = Number(precioCobrado) !== Number(orden?.precioCobrado ?? 0)
        || JSON.stringify(repuestosNuevos) !== JSON.stringify(repuestosActuales);
      if (cambioValores) {
        await api.post(`/ordenes/${ordenId}/entrega/autorizacion`, { password });
      }
      for (const foto of fotos) {
        const fd = new FormData();
        fd.append('foto', foto);
        fd.append('tipo', 'ENTREGA');
        await api.post(`/ordenes/${ordenId}/fotos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      await api.patch(`/ordenes/${ordenId}/entrega`, {
        precioCobrado: Number(precioCobrado),
        password,
        repuestos: repuestosNuevos,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
      queryClient.invalidateQueries({ queryKey: ['entregas-pendientes'] });
      setExpandidaId(null);
      setFotos([]);
      setRepuestos([]);
      setPrecioCobrado('');
      setPassword('');
      setError('');
    },
    onError: (err: any) => setError(err.response?.data?.message ?? 'No se pudo registrar la entrega.'),
  });

  function abrirFormulario(ordenId: string) {
    setExpandidaId(ordenId);
    setFotos([]);
    const orden = pendientes?.find((item) => item.id === ordenId);
    setPrecioCobrado(orden?.precioCobrado ?? '');
    setRepuestos(
      (orden?.repuestos ?? []).map((repuesto) => ({
        nombre: repuesto.nombre,
        costo: repuesto.costo,
        cantidad: String(repuesto.cantidad),
      })),
    );
    setPassword('');
    setError('');
  }

  function cancelarFormulario() {
    setExpandidaId(null);
    setFotos([]);
    setRepuestos([]);
    setPrecioCobrado('');
    setPassword('');
    setError('');
  }

  return (
    <main className="rounded-[28px] bg-[#2b292a] p-4 text-white sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1200px] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#e7a16a]">Cierre del servicio</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Entregas</h1>
            <p className="mt-0.5 text-xs text-white/50">Equipos reparados, listos para volver con sus clientes.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-white/45">Pendientes de entrega</p>
            <p className="mt-0.5 text-right text-lg font-semibold text-[#e7a16a]">{pendientes?.length ?? 0}</p>
          </div>
        </header>

        {isLoading && (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-white/10" />)}
          </div>
        )}
        {isError && (
          <div role="alert" className="rounded-2xl border border-[#a74838]/30 bg-[#a74838]/10 p-4 text-sm text-[#ffd4cc]">
            No se pudieron cargar los equipos reparados. Intenta actualizar la página.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="space-y-3">
            {pendientes?.map((orden) => {
              const abierta = expandidaId === orden.id;
              return (
                <article key={orden.id} className="overflow-hidden rounded-2xl bg-[#f8f7f5] text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e6f0e8] text-[#43845b]">
                        <Wrench size={21} />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-base font-semibold">{orden.marca} {orden.modelo}</h2>
                          <span className="rounded-full bg-[#e6f0e8] px-2 py-0.5 text-[10px] font-semibold text-[#43845b]">LISTO PARA ENTREGA</span>
                        </div>
                        <p className="text-xs text-[#716d69]">Orden #{orden.id.slice(0, 8).toUpperCase()}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#817b76]">
                          <span className="inline-flex items-center gap-1.5"><UserRound size={13} />{orden.cliente.nombre}</span>
                          <span className="inline-flex items-center gap-1.5"><Phone size={13} />{orden.cliente.telefono}</span>
                        </div>
                      </div>
                    </div>

                    {!abierta && (
                      <button
                        type="button"
                        onClick={() => abrirFormulario(orden.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#43845b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#36734d]"
                      >
                        <CheckCircle2 size={16} />
                        Registrar entrega
                      </button>
                    )}
                  </div>

                  {abierta && (
                    <section className="border-t border-[#e7e3de] bg-[#f0eeea] p-4 sm:p-5">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Confirmación de salida</p>
                          <h3 className="mt-0.5 text-base font-semibold">Completar entrega</h3>
                        </div>
                        <button
                          type="button"
                          onClick={cancelarFormulario}
                          aria-label="Cerrar formulario"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#716d69] transition hover:bg-white hover:text-[#302d2e]"
                        >
                          <X size={17} />
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`precio-${orden.id}`} className={ETIQUETA}>Total cobrado al cliente</label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#817b76]">$</span>
                            <input
                              id={`precio-${orden.id}`}
                              type="number"
                              min="0"
                              step="any"
                              value={precioCobrado}
                              onChange={(e) => setPrecioCobrado(e.target.value)}
                              className={`${CAMPO} pl-7`}
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border border-[#e3dfd9] bg-white p-3">
                          <div className="mb-1 flex items-center gap-2 text-[#975f3c]">
                            <ShieldCheck size={16} />
                            <p className="text-xs font-semibold">Autorización de administrador</p>
                          </div>
                          <p className="text-[11px] leading-relaxed text-[#817b76]">
                            Solo se solicita si cambias el cobro o los repuestos originales.
                          </p>
                          <input
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña del administrador"
                            className={`${CAMPO} mt-2`}
                          />
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-[#e3dfd9] bg-white p-3 sm:p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold">Repuestos utilizados</h4>
                            <p className="mt-0.5 text-[11px] text-[#817b76]">Revisa o ajusta el costo y la cantidad antes de cerrar la orden.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setRepuestos((items) => [...items, { nombre: '', costo: '', cantidad: '1' }])}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#c77945]/40 px-3 py-2 text-xs font-semibold text-[#975f3c] transition hover:bg-[#f6e9df]"
                          >
                            <Plus size={14} /> Agregar repuesto
                          </button>
                        </div>

                        {repuestos.length ? (
                          <div className="space-y-2">
                            {repuestos.map((repuesto, index) => (
                              <div key={index} className="grid grid-cols-[minmax(0,1fr)_100px_76px] gap-2">
                                <input
                                  aria-label={`Nombre del repuesto ${index + 1}`}
                                  placeholder="Nombre del repuesto"
                                  value={repuesto.nombre}
                                  onChange={(e) => setRepuestos((items) => items.map((item, i) => i === index ? { ...item, nombre: e.target.value } : item))}
                                  className={CAMPO}
                                />
                                <input
                                  aria-label={`Costo del repuesto ${index + 1}`}
                                  placeholder="Costo"
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={repuesto.costo}
                                  onChange={(e) => setRepuestos((items) => items.map((item, i) => i === index ? { ...item, costo: e.target.value } : item))}
                                  className={CAMPO}
                                />
                                <input
                                  aria-label={`Cantidad del repuesto ${index + 1}`}
                                  placeholder="Cant."
                                  type="number"
                                  min="1"
                                  value={repuesto.cantidad}
                                  onChange={(e) => setRepuestos((items) => items.map((item, i) => i === index ? { ...item, cantidad: e.target.value } : item))}
                                  className={CAMPO}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-lg bg-[#f7f5f2] px-3 py-3 text-xs text-[#817b76]">No hay repuestos registrados para esta reparación.</p>
                        )}
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-[#e3dfd9] bg-white p-3">
                          <label htmlFor={`fotos-${orden.id}`} className="mb-2 block text-xs font-semibold text-[#5f5a55]">Fotos de la entrega <span className="font-normal text-[#99928c]">(opcional)</span></label>
                          <label
                            htmlFor={`fotos-${orden.id}`}
                            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#d7d1c9] bg-[#faf9f7] px-3 py-3 text-xs font-medium text-[#716d69] transition hover:border-[#c77945] hover:bg-[#f6e9df]"
                          >
                            <Upload size={15} /> Seleccionar fotos
                          </label>
                          <input
                            id={`fotos-${orden.id}`}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => setFotos(Array.from(e.target.files ?? []))}
                            className="sr-only"
                          />
                          {fotos.length > 0 && <p className="mt-2 text-[11px] text-[#43845b]">{fotos.length} foto(s) seleccionada(s)</p>}
                        </div>
                        <div className="flex flex-col justify-end rounded-xl bg-white p-3">
                          <p className="text-[11px] leading-relaxed text-[#817b76]">
                            Antes de confirmar, verifica el valor cobrado y que los repuestos correspondan a la reparación.
                          </p>
                        </div>
                      </div>

                      {error && <p role="alert" className="mt-4 rounded-xl bg-[#f8e9e5] px-3 py-2.5 text-xs text-[#a74838]">{error}</p>}

                      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#ded9d2] pt-4">
                        <button
                          type="button"
                          onClick={cancelarFormulario}
                          className="rounded-xl border border-[#d7d1c9] bg-white px-4 py-2.5 text-sm font-semibold text-[#5f5a55] transition hover:bg-[#f7f5f2]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => registrarEntrega.mutate(orden.id)}
                          disabled={registrarEntrega.isPending || !precioCobrado}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#43845b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#36734d] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCircle2 size={16} />
                          {registrarEntrega.isPending ? 'Guardando…' : 'Confirmar entrega'}
                        </button>
                      </div>
                    </section>
                  )}
                </article>
              );
            })}

            {pendientes?.length === 0 && (
              <div className="rounded-2xl bg-[#f8f7f5] px-5 py-10 text-center text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f0e8] text-[#43845b]">
                  <CheckCircle2 size={23} />
                </span>
                <h2 className="mt-3 text-base font-semibold">Todo al día</h2>
                <p className="mt-1 text-sm text-[#716d69]">No hay equipos pendientes de entrega.</p>
                <p className="mt-1 text-xs text-[#99928c]">Cuando una reparación esté lista, aparecerá aquí para cerrar el servicio.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
