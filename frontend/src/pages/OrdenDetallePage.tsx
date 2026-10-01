import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { OrdenReparacion } from '../types';

const ETIQUETA_TIPO_FOTO: Record<string, string> = {
  RECEPCION: 'Recepción',
  DIAGNOSTICO: 'Diagnóstico',
  REPARACION: 'Reparación',
  ENTREGA: 'Entrega',
};

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace('/api', '');

interface RepuestoForm {
  nombre: string;
  costo: string;
  cantidad: string;
}

export function OrdenDetallePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: orden, isLoading } = useQuery<OrdenReparacion>({
    queryKey: ['orden', id],
    queryFn: () => api.get(`/ordenes/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const [diagnostico, setDiagnostico] = useState('');
  const [presupuestoReparacion, setPresupuestoReparacion] = useState('');
  const [repuestos, setRepuestos] = useState<RepuestoForm[]>([]);
  const [tipoFotoSubiendo, setTipoFotoSubiendo] = useState<string>('RECEPCION');

  useEffect(() => {
    if (!orden) return;
    setDiagnostico(orden.diagnostico ?? '');
    setPresupuestoReparacion(orden.presupuestoReparacion ?? '');
    setRepuestos((orden.repuestos ?? []).map((repuesto) => ({
      nombre: repuesto.nombre,
      costo: repuesto.costo,
      cantidad: String(repuesto.cantidad),
    })));
  }, [orden]);

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ['orden', id] });
    queryClient.invalidateQueries({ queryKey: ['ordenes'] });
  }

  const guardarDiagnostico = useMutation({
    mutationFn: () =>
      api.patch(`/ordenes/${id}/diagnostico`, {
        diagnostico,
        presupuestoReparacion: Number(presupuestoReparacion),
      }),
    onSuccess: invalidar,
  });

  const marcarPresupuesto = useMutation({
    mutationFn: (estado: 'ACEPTADO' | 'RECHAZADO') => api.patch(`/ordenes/${id}/presupuesto`, { estado }),
    onSuccess: invalidar,
  });

  const guardarReparacion = useMutation({
    mutationFn: () => api.patch(`/ordenes/${id}/reparacion`, {
      repuestos: repuestos.filter((r) => r.nombre && r.costo).map((r) => ({
        nombre: r.nombre,
        costo: Number(r.costo),
        cantidad: Number(r.cantidad) || 1,
      })),
    }),
    onSuccess: invalidar,
  });

  const cambiarEstado = useMutation({
    mutationFn: (estado: string) => api.patch(`/ordenes/${id}/estado`, { estado }),
    onSuccess: invalidar,
  });

  const subirFoto = useMutation({
    mutationFn: (archivo: File) => {
      const form = new FormData();
      form.append('foto', archivo);
      form.append('tipo', tipoFotoSubiendo);
      return api.post(`/ordenes/${id}/fotos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: invalidar,
  });

  function onSubmitDiagnostico(e: FormEvent) {
    e.preventDefault();
    guardarDiagnostico.mutate();
  }

  function onSeleccionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (archivo) subirFoto.mutate(archivo);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  if (isLoading || !orden) return <p className="text-grafito/60">Cargando orden...</p>;

  const margen =
    orden.precioCobrado != null
      ? Number(orden.precioCobrado) - Number(orden.costoRepuestos)
      : null;

  const linkSeguimiento = `${window.location.origin}/seguimiento/${orden.id}`;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          {orden.marca} {orden.modelo}
        </h1>
        <p className="text-grafito/60 text-sm mt-1">
          Cliente: {orden.cliente.nombre} · {orden.cliente.telefono}
          {orden.cliente.email ? ` · ${orden.cliente.email}` : ' · sin correo registrado'}
        </p>
        <p className="text-sm mt-2">
          Estado actual: <span className="font-medium">{orden.estado.replace('_', ' ')}</span>
        </p>
      </div>

      {/* Acciones rápidas de estado */}
      <div className="flex gap-2 flex-wrap">
        {['EN_REPARACION', 'REPARADO', 'CANCELADO'].map((estado) => (
          <button
            key={estado}
            onClick={() => cambiarEstado.mutate(estado)}
            disabled={cambiarEstado.isPending || orden.estado === estado}
            className="rounded-md border border-borde px-3 py-1.5 text-sm hover:bg-superficie disabled:opacity-40"
          >
            Marcar {estado.replace('_', ' ').toLowerCase()}
          </button>
        ))}
      </div>

      {/* Diagnóstico y cotización */}
      <form onSubmit={onSubmitDiagnostico} className="bg-white rounded-lg border border-borde p-6 space-y-4">
        <h2 className="text-lg font-semibold">Diagnóstico y cotización</h2>
        <textarea
          rows={3}
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
          placeholder="Describe el diagnóstico técnico..."
          className="w-full rounded-md border border-borde px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobre"
        />

        <div>
          <label className="block text-sm font-medium mb-1">Valor de la reparación</label>
          <input
            type="number"
            min="0"
            value={presupuestoReparacion}
            onChange={(e) => setPresupuestoReparacion(e.target.value)}
            className="w-40 rounded-md border border-borde px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={guardarDiagnostico.isPending}
          className="rounded-md bg-cobre hover:bg-cobre-oscuro transition-colors text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
        >
          {guardarDiagnostico.isPending ? 'Guardando...' : 'Guardar diagnóstico'}
        </button>
      </form>

      {orden.estadoPresupuesto === 'PENDIENTE' && orden.presupuestoReparacion != null && (
        <div className="bg-white rounded-lg border border-borde p-6 space-y-3">
          <h2 className="text-lg font-semibold">Aprobación del cliente</h2>
          <p className="text-sm text-grafito/60">Presupuesto: ${Number(orden.presupuestoReparacion).toLocaleString('es-CO')}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => marcarPresupuesto.mutate('ACEPTADO')} className="rounded-md bg-circuito text-white text-sm px-4 py-2">Cliente acepta</button>
            <button type="button" onClick={() => marcarPresupuesto.mutate('RECHAZADO')} className="rounded-md border border-borde text-sm px-4 py-2">Cliente rechaza</button>
          </div>
        </div>
      )}

      {orden.estadoPresupuesto === 'ACEPTADO' && (
        <form onSubmit={(e) => { e.preventDefault(); guardarReparacion.mutate(); }} className="bg-white rounded-lg border border-borde p-6 space-y-4">
          <h2 className="text-lg font-semibold">Reparación</h2>
          <p className="text-sm text-grafito/60">Cobrado al cliente: ${Number(orden.presupuestoReparacion ?? 0).toLocaleString('es-CO')} (valor aprobado en diagnóstico)</p>
          {repuestos.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input placeholder="Repuesto usado" value={r.nombre} onChange={(e) => setRepuestos((rs) => rs.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} className="flex-1 rounded-md border border-borde px-3 py-1.5 text-sm" />
              <input placeholder="Valor" type="number" min="0" value={r.costo} onChange={(e) => setRepuestos((rs) => rs.map((x, j) => j === i ? { ...x, costo: e.target.value } : x))} className="w-28 rounded-md border border-borde px-3 py-1.5 text-sm" />
              <input placeholder="Cant." type="number" min="1" value={r.cantidad} onChange={(e) => setRepuestos((rs) => rs.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))} className="w-20 rounded-md border border-borde px-3 py-1.5 text-sm" />
            </div>
          ))}
          <button type="button" onClick={() => setRepuestos((rs) => [...rs, { nombre: '', costo: '', cantidad: '1' }])} className="text-sm text-cobre hover:underline">+ agregar repuesto</button>
          <div><button type="submit" disabled={guardarReparacion.isPending} className="rounded-md bg-cobre text-white text-sm px-4 py-2 disabled:opacity-60">{guardarReparacion.isPending ? 'Guardando...' : 'Guardar repuestos y comenzar reparación'}</button></div>
        </form>
      )}

      {/* Fotos */}
      <div className="bg-white rounded-lg border border-borde p-6 space-y-4">
        <h2 className="text-lg font-semibold">Fotos</h2>
        <div className="flex items-center gap-3">
          <select
            value={tipoFotoSubiendo}
            onChange={(e) => setTipoFotoSubiendo(e.target.value)}
            className="rounded-md border border-borde px-3 py-2 text-sm"
          >
            {Object.entries(ETIQUETA_TIPO_FOTO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onSeleccionarFoto} className="text-sm" />
          {subirFoto.isPending && <span className="text-sm text-grafito/50">Subiendo...</span>}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {orden.fotos?.map((foto) => (
            <a key={foto.id} href={`${API_BASE}${foto.url}`} target="_blank" rel="noreferrer" className="block">
              <img
                src={`${API_BASE}${foto.url}`}
                alt={ETIQUETA_TIPO_FOTO[foto.tipo]}
                className="w-full h-24 object-cover rounded-md border border-borde"
              />
              <p className="text-xs text-grafito/50 mt-1">{ETIQUETA_TIPO_FOTO[foto.tipo]}</p>
            </a>
          ))}
          {!orden.fotos?.length && <p className="text-sm text-grafito/50 col-span-full">Sin fotos todavía.</p>}
        </div>
      </div>

      {/* Entrega y margen — el registro de la entrega en sí se hace desde "Entregas" */}
      <div className="bg-white rounded-lg border border-borde p-6 space-y-2">
        <h2 className="text-lg font-semibold">Entrega</h2>
        {orden.precioCobrado != null ? (
          <p className="text-sm">
            Cobrado: <span className="font-medium">${Number(orden.precioCobrado).toLocaleString('es-CO')}</span>
            {margen != null && (
              <span className="text-grafito/60"> · margen: ${margen.toLocaleString('es-CO')}</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-grafito/50">
            Todavía no se ha entregado. Cuando el equipo quede en estado "Reparado", regístralo desde la
            sección <span className="font-medium text-grafito">Entregas</span> del menú.
          </p>
        )}
      </div>

      {/* Link público de seguimiento */}
      <div className="bg-superficie/60 rounded-lg border border-borde p-4 text-sm">
        <p className="text-grafito/60 mb-1">Link de seguimiento para el cliente (sin login):</p>
        <code className="break-all">{linkSeguimiento}</code>
      </div>
    </div>
  );
}
