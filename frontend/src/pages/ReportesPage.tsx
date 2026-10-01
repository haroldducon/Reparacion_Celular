import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { X } from 'lucide-react';
import { api } from '../lib/api';
import { InformeIA } from '../components/InformeIA';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function isoLocal(fecha: Date) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function dinero(valor: string | number | null | undefined) {
  return `$${Number(valor ?? 0).toLocaleString('es-CO')}`;
}

function fechaCorta(fecha: Date) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(fecha);
}

function fechaLarga(fecha: Date) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long' }).format(fecha);
}

function parseFechaLocal(fecha: string) {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

function TooltipSemana({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-[#242223] px-3 py-2 text-xs text-white shadow-xl">
      <p className="font-semibold">{item.periodoCompleto}</p>
      <p className="mt-1 text-[#e7a16a]">Ganancia: {dinero(item.ganancia)}</p>
      <p className="text-white/65">Reparaciones entregadas: {item.reparaciones}</p>
    </div>
  );
}

function TooltipMensual({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-[#242223] px-3 py-2 text-xs text-white shadow-xl">
      <p className="font-semibold">{item.mes} {item.anio}</p>
      <p className="mt-1 text-[#78bd91]">Ganancia: {dinero(item.ganancia)}</p>
      <p className="text-white/65">Reparaciones entregadas: {item.reparaciones}</p>
    </div>
  );
}

function TooltipRepuesto({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-[#242223] px-3 py-2 text-xs text-white shadow-xl">
      <p className="font-semibold">{item.nombre}</p>
      <p className="mt-1 text-[#e7a16a]">Unidades registradas: {item.cantidad}</p>
    </div>
  );
}

function TooltipOrden({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-[#242223] px-3 py-2 text-xs text-white shadow-xl">
      <p className="font-semibold">{item.marca} {item.modelo}</p>
      <p className="text-white/65">Orden #{item.numeroReparacion}</p>
      <p className="mt-1 text-[#78bd91]">Ganancia: {dinero(item.ganancia)}</p>
    </div>
  );
}

type PeriodoDetalle = { titulo: string; desde: string; hasta: string };

function ReparacionesModal({
  periodo,
  ordenes,
  cargando,
  error,
  onCerrar,
}: {
  periodo: PeriodoDetalle;
  ordenes: any[] | undefined;
  cargando: boolean;
  error: boolean;
  onCerrar: () => void;
}) {
  useEffect(() => {
    const alPresionarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', alPresionarTecla);
    return () => window.removeEventListener('keydown', alPresionarTecla);
  }, [onCerrar]);

  const lista = (ordenes ?? []).slice().sort(
    (a, b) => new Date(b.fechaEntrega).getTime() - new Date(a.fechaEntrega).getTime(),
  );
  const gananciaTotal = lista.reduce((total, orden) => total + Number(orden.ganancia ?? 0), 0);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCerrar();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reparaciones-periodo-titulo"
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-[#f8f7f5] text-[#302d2e] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#e7e3de] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Detalle del periodo</p>
            <h2 id="reparaciones-periodo-titulo" className="mt-1 text-lg font-semibold sm:text-xl">{periodo.titulo}</h2>
            <p className="mt-0.5 text-xs text-[#817b76]">Reparaciones entregadas en este rango</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar ventana"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#716d69] transition-colors hover:bg-[#e9e6e1] hover:text-[#302d2e]"
          >
            <X size={19} />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3 px-5 pt-4 sm:px-6">
          <div className="rounded-xl bg-white px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-[#817b76]">Reparaciones</p>
            <p className="mt-1 text-lg font-semibold">{cargando ? '…' : lista.length}</p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-[#817b76]">Ganancia total</p>
            <p className="mt-1 text-lg font-semibold text-[#43845b]">{cargando ? '…' : dinero(gananciaTotal)}</p>
          </div>
        </div>

        <div className="min-h-0 overflow-auto p-5 sm:p-6">
          {cargando ? (
            <p className="py-10 text-center text-sm text-[#817b76]">Cargando reparaciones…</p>
          ) : error ? (
            <p className="rounded-xl bg-[#f8e9e5] p-4 text-sm text-[#a74838]">No se pudieron cargar las reparaciones de este periodo.</p>
          ) : lista.length ? (
            <div className="overflow-x-auto rounded-xl border border-[#e7e3de] bg-white">
              <table className="w-full min-w-[760px] text-xs">
                <thead className="bg-[#f0eeea] text-left text-[#716d69]">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-3 font-semibold">Orden</th>
                    <th className="whitespace-nowrap px-3 py-3 font-semibold">Equipo</th>
                    <th className="whitespace-nowrap px-3 py-3 font-semibold">Cliente</th>
                    <th className="whitespace-nowrap px-3 py-3 font-semibold">Entregado</th>
                    <th className="whitespace-nowrap px-3 py-3 text-right font-semibold">Cobrado</th>
                    <th className="whitespace-nowrap px-3 py-3 text-right font-semibold">Repuestos</th>
                    <th className="whitespace-nowrap px-3 py-3 text-right font-semibold">Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e3de]">
                  {lista.map((orden) => (
                    <tr key={orden.id} className="hover:bg-[#faf9f7]">
                      <td className="whitespace-nowrap px-3 py-3 font-medium">#{orden.numeroReparacion}</td>
                      <td className="whitespace-nowrap px-3 py-3">{orden.marca} {orden.modelo}</td>
                      <td className="max-w-44 truncate px-3 py-3 text-[#716d69]">{orden.cliente?.nombre ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-[#716d69]">
                        {new Date(orden.fechaEntrega).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">{dinero(orden.precioCobrado)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">{dinero(orden.costoRepuestos)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-[#43845b]">{dinero(orden.ganancia)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-xl bg-white py-10 text-center text-sm text-[#817b76]">No hubo reparaciones entregadas en este periodo.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export function ReportesPage() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<PeriodoDetalle | null>(null);
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const inicioMes = new Date(anio, hoy.getMonth(), 1);
  const inicioAnio = new Date(anio, 0, 1);
  const finAnio = new Date(anio, 11, 31);
  const desdeMes = isoLocal(inicioMes);
  const hastaHoy = isoLocal(hoy);
  const desdeAnio = isoLocal(inicioAnio);
  const hastaAnio = isoLocal(finAnio);

  const { data: margenMes } = useQuery({
    queryKey: ['reporte-margen-mes', desdeMes, hastaHoy],
    queryFn: () => api.get('/reportes/margen', { params: { desde: desdeMes, hasta: hastaHoy } }).then((r) => r.data),
  });

  const { data: margenAnio } = useQuery({
    queryKey: ['reporte-margen-anio', desdeAnio, hastaAnio],
    queryFn: () => api.get('/reportes/margen', { params: { desde: desdeAnio, hasta: hastaAnio } }).then((r) => r.data),
  });

  const { data: repuestos } = useQuery({
    queryKey: ['reporte-top-repuestos', desdeMes, hastaHoy],
    queryFn: () =>
      api.get('/reportes/top-repuestos-usados', {
        params: { desde: desdeMes, hasta: hastaHoy, limite: 10 },
      }).then((r) => r.data),
  });

  const { data: ordenesAnio } = useQuery({
    queryKey: ['reporte-ordenes-anio', desdeAnio, hastaAnio],
    queryFn: () =>
      api.get('/reportes/margen-equipos', { params: { desde: desdeAnio, hasta: hastaAnio } }).then((r) => r.data),
  });

  const detallePeriodo = useQuery({
    queryKey: ['reporte-detalle-periodo', periodoSeleccionado?.desde, periodoSeleccionado?.hasta],
    queryFn: () =>
      api.get('/reportes/margen-equipos', {
        params: { desde: periodoSeleccionado!.desde, hasta: periodoSeleccionado!.hasta },
      }).then((r) => r.data),
    enabled: !!periodoSeleccionado,
  });

  const mapaDiarioMes = new Map<string, any>(
    (margenMes ?? []).map((dia: any) => [dia.fecha.slice(0, 10), dia]),
  );

  // Agrupa lunes-domingo. La primera y última semana del mes pueden ser parciales;
  // el rango mostrado coincide exactamente con los días que entran en el cálculo.
  const semanas: any[] = [];
  let cursor = new Date(inicioMes);
  while (cursor <= hoy) {
    const diasHastaDomingo = 6 - ((cursor.getDay() + 6) % 7);
    const domingo = new Date(cursor);
    domingo.setDate(domingo.getDate() + diasHastaDomingo);
    const finSemana = domingo < hoy ? domingo : new Date(hoy);
    let ganancia = 0;
    let reparaciones = 0;
    const diaIterado = new Date(cursor);
    while (diaIterado <= finSemana) {
      const dato = mapaDiarioMes.get(isoLocal(diaIterado));
      ganancia += Number(dato?.margenTotal ?? 0);
      reparaciones += Number(dato?.equiposEntregados ?? 0);
      diaIterado.setDate(diaIterado.getDate() + 1);
    }
    semanas.push({
      etiqueta: `${cursor.getDate()}–${finSemana.getDate()} ${MESES_CORTOS[finSemana.getMonth()]}`,
      periodoCompleto: `Semana del ${fechaLarga(cursor)} al ${fechaLarga(finSemana)}`,
      desde: isoLocal(cursor),
      hasta: isoLocal(finSemana),
      ganancia,
      reparaciones,
    });
    cursor = new Date(finSemana);
    cursor.setDate(cursor.getDate() + 1);
  }

  const mapaDiarioAnio = new Map<string, any>(
    (margenAnio ?? []).map((dia: any) => [dia.fecha.slice(0, 10), dia]),
  );
  const meses = MESES.map((nombre, indice) => {
    const prefijo = `${anio}-${String(indice + 1).padStart(2, '0')}-`;
    const dias = Array.from(mapaDiarioAnio.entries())
      .filter(([fecha]) => fecha.startsWith(prefijo))
      .map(([, dato]) => dato);
    return {
      mes: nombre,
      etiqueta: MESES_CORTOS[indice],
      anio,
      desde: isoLocal(new Date(anio, indice, 1)),
      hasta: isoLocal(new Date(anio, indice + 1, 0)),
      ganancia: dias.reduce((total: number, dia: any) => total + Number(dia.margenTotal ?? 0), 0),
      reparaciones: dias.reduce((total: number, dia: any) => total + Number(dia.equiposEntregados ?? 0), 0),
    };
  });
  const gananciaMaximaMes = Math.max(0, ...meses.map((item) => item.ganancia));
  const mejorMes = meses.find((item) => item.ganancia === gananciaMaximaMes && gananciaMaximaMes > 0);

  const topOrdenes = (ordenesAnio ?? [])
    .slice()
    .sort((a: any, b: any) => Number(b.ganancia) - Number(a.ganancia))
    .slice(0, 5)
    .map((orden: any) => ({
      ...orden,
      etiqueta: `${orden.marca} ${orden.modelo}`,
      ganancia: Number(orden.ganancia),
    }));

  const topRepuestos = (repuestos ?? []).map((repuesto: any) => ({
    ...repuesto,
    cantidad: Number(repuesto.cantidad),
  }));
  const mejorSemana = semanas.reduce<any | null>(
    (mejor, actual) => (!mejor || actual.ganancia > mejor.ganancia ? actual : mejor),
    null,
  );

  return (
    <main className="rounded-[28px] bg-[#2b292a] p-4 text-white sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#e7a16a]">Rendimiento del taller · {anio}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Reportes</h1>
            <p className="mt-0.5 text-xs text-white/50">Rentabilidad semanal, repuestos y órdenes destacadas</p>
          </div>
          {mejorSemana && (
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/45">Mejor semana del mes</p>
              <p className="text-sm font-semibold text-[#e7a16a]">{mejorSemana.etiqueta}</p>
              <p className="text-xs text-white/65">{dinero(mejorSemana.ganancia)} · {mejorSemana.reparaciones} reparaciones</p>
            </div>
          )}
        </header>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="flex h-[250px] min-w-0 flex-col rounded-2xl bg-[#f8f7f5] p-4 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:p-5">
            <div className="mb-2 flex items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">{MESES[hoy.getMonth()]} {anio}</p>
                <h2 className="mt-0.5 text-lg font-semibold">Ganancia por semana</h2>
              </div>
              <span className="text-[10px] text-[#817b76]">Ganancia · órdenes entregadas</span>
            </div>
            {semanas.some((semana) => semana.ganancia !== 0 || semana.reparaciones !== 0) ? (
              <div className="h-[145px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={semanas}
                    margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
                    onClick={(state: any) => {
                      const semana = state?.activePayload?.[0]?.payload;
                      if (semana) setPeriodoSeleccionado({ titulo: semana.periodoCompleto, desde: semana.desde, hasta: semana.hasta });
                    }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="4 6" stroke="#e7e3de" />
                    <XAxis dataKey="etiqueta" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#817b76' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#817b76' }} width={42} />
                    <Tooltip content={<TooltipSemana />} />
                    <Bar dataKey="ganancia" name="Ganancia" fill="#c77945" radius={[6, 6, 2, 2]} maxBarSize={58} cursor="pointer" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="rounded-xl bg-[#f0eeea] py-12 text-center text-xs text-[#817b76]">
                Aún no hay reparaciones entregadas este mes.
              </p>
            )}
            <p className="mt-1 text-[10px] text-[#817b76]">Haz clic en una barra para ver las reparaciones del periodo.</p>
          </article>

          <article className="flex h-[250px] min-w-0 flex-col rounded-2xl bg-[#f8f7f5] p-4 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:p-5">
            <div className="mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">{MESES[hoy.getMonth()]} {anio}</p>
              <h2 className="mt-0.5 text-lg font-semibold">Top 10 repuestos registrados</h2>
              <p className="text-[10px] text-[#817b76]">Unidades asociadas a reparaciones entregadas</p>
            </div>
            {topRepuestos.length ? (
              <div className="h-[145px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topRepuestos} layout="vertical" margin={{ top: 2, right: 10, left: 2, bottom: 0 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="4 6" stroke="#e7e3de" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#817b76' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="nombre" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#716d69' }} width={118} />
                    <Tooltip content={<TooltipRepuesto />} />
                    <Bar dataKey="cantidad" name="Unidades" fill="#43845b" radius={[0, 5, 5, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="rounded-xl bg-[#f0eeea] py-12 text-center text-xs text-[#817b76]">
                No hay repuestos registrados en reparaciones entregadas este mes.
              </p>
            )}
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="flex h-[250px] min-w-0 flex-col rounded-2xl bg-[#f8f7f5] p-4 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:p-5">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Enero–diciembre · {anio}</p>
                <h2 className="mt-0.5 text-lg font-semibold">Ganancia por mes</h2>
              </div>
              {mejorMes && (
                <span className="rounded-full bg-[#e6f0e8] px-2.5 py-1 text-[10px] font-semibold text-[#43845b]">
                  Mayor: {mejorMes.mes} · {dinero(mejorMes.ganancia)}
                </span>
              )}
            </div>
            <div className="h-[145px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={meses}
                  margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
                  onClick={(state: any) => {
                    const mes = state?.activePayload?.[0]?.payload;
                    if (mes) setPeriodoSeleccionado({ titulo: `${mes.mes} ${mes.anio}`, desde: mes.desde, hasta: mes.hasta });
                  }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="4 6" stroke="#e7e3de" />
                  <XAxis dataKey="etiqueta" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#817b76' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#817b76' }} width={42} />
                  <Tooltip content={<TooltipMensual />} />
                  <Bar dataKey="ganancia" name="Ganancia" radius={[5, 5, 0, 0]} maxBarSize={30} cursor="pointer">
                    {meses.map((item, index) => (
                      <Cell
                        key={`mes-${index}`}
                        fill={item.ganancia > 0 && item.ganancia === gananciaMaximaMes ? '#43845b' : '#c77945'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="flex h-[250px] min-w-0 flex-col rounded-2xl bg-[#f8f7f5] p-4 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:p-5">
            <div className="mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Órdenes entregadas · {anio}</p>
              <h2 className="mt-0.5 text-lg font-semibold">Top 5 órdenes con mayor ganancia</h2>
            </div>
            {topOrdenes.length ? (
              <div className="h-[145px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topOrdenes} layout="vertical" margin={{ top: 2, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="4 6" stroke="#e7e3de" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#817b76' }} />
                    <YAxis type="category" dataKey="etiqueta" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#716d69' }} width={125} />
                    <Tooltip content={<TooltipOrden />} />
                    <Bar dataKey="ganancia" name="Ganancia" fill="#43845b" radius={[0, 5, 5, 0]} maxBarSize={22}>
                      {topOrdenes.map((orden: any, index: number) => (
                        <Cell key={`orden-${orden.id}-${index}`} fill={index === 0 ? '#43845b' : '#79a789'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="rounded-xl bg-[#f0eeea] py-12 text-center text-xs text-[#817b76]">
                No hay órdenes entregadas este año.
              </p>
            )}
          </article>
        </section>
        {periodoSeleccionado && (
          <ReparacionesModal
            periodo={periodoSeleccionado}
            ordenes={detallePeriodo.data}
            cargando={detallePeriodo.isLoading}
            error={detallePeriodo.isError}
            onCerrar={() => setPeriodoSeleccionado(null)}
          />
        )}

        <InformeIA
          periodos={[
            { id: 'mes', etiqueta: 'Este mes', desde: desdeMes, hasta: hastaHoy },
            { id: 'anio', etiqueta: 'Este año (hasta hoy)', desde: desdeAnio, hasta: hastaHoy },
          ]}
        />
      </div>
    </main>
  );
}
