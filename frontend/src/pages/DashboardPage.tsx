import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Inbox, Search, Wrench, CheckCircle2, Truck, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../lib/auth-context';

function ModelTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-[#242223] px-3 py-2 text-xs text-white shadow-xl">
      <p className="font-semibold">{item.marca} {item.modelo}</p>
      <p className="mt-1 text-white/65">{item.total} reparación{item.total === 1 ? '' : 'es'}</p>
    </div>
  );
}

function TendenciaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#242223] px-3 py-2 text-xs text-white shadow-xl">
      <p className="text-white/60">
        {new Date(label).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}
      </p>
      <p className="mt-1 text-base font-semibold text-[#db8a4e]">
        ${Number(payload[0].value).toLocaleString('es-CO')}
      </p>
    </div>
  );
}

function hace(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function abreviarDinero(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `${+(v / 1000).toFixed(0)}k`;
  return String(v);
}

const ESTADOS = [
  { clave: 'RECEPCION', etiqueta: 'En recepción', icon: Inbox, acento: 'cobre' as const },
  { clave: 'DIAGNOSTICO', etiqueta: 'En diagnóstico', icon: Search, acento: 'cobre' as const },
  { clave: 'EN_REPARACION', etiqueta: 'En reparación', icon: Wrench, acento: 'cobre' as const },
  { clave: 'REPARADO', etiqueta: 'Reparados', icon: CheckCircle2, acento: 'cobre' as const },
  { clave: 'ENTREGADO', etiqueta: 'Entregados', icon: Truck, acento: 'circuito' as const },
  { clave: 'CANCELADO', etiqueta: 'Cancelados', icon: XCircle, acento: 'oxido' as const },
];

export function DashboardPage() {
  const { usuario } = useAuth();
  const puedeVerReportes = usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPER_ADMIN';
  // Primer nombre del usuario (usa el nombre completo si prefieres: usuario?.nombre ?? '')
  const nombreCorto = usuario?.nombre?.split(' ')[0] ?? '';
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  const { data: estados } = useQuery({
    queryKey: ['resumen-estados'],
    queryFn: () => api.get('/reportes/resumen-estados').then((r) => r.data),
    enabled: puedeVerReportes,
  });

  const { data: topModelos } = useQuery({
    queryKey: ['top-modelos'],
    queryFn: () => api.get('/reportes/top-modelos').then((r) => r.data),
    enabled: puedeVerReportes,
  });

  const { data: margenMes } = useQuery({
    queryKey: ['margen-mes'],
    queryFn: () =>
      api.get('/reportes/margen', { params: { desde: hace(29), hasta: hace(0) } }).then((r) => r.data),
    enabled: puedeVerReportes,
  });

  const gananciaMes: number = margenMes?.reduce(
    (acc: number, dia: any) => acc + Number(dia.margenTotal),
    0,
  ) ?? 0;
  const ultimaSemana = margenMes?.slice(-7) ?? [];

  if (!puedeVerReportes) {
    return (
      <div className="rounded-3xl bg-[#2b292a] p-6 text-white">
        <h1 className="mb-2 text-2xl font-semibold">Bienvenido</h1>
        <p className="text-white/60">Usa el menú para recibir un equipo o revisar las órdenes en curso.</p>
      </div>
    );
  }

  return (
    <main className="rounded-[28px] bg-[#2b292a] p-4 text-white sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1500px] space-y-4">
        {/* Encabezado */}
        <header className="flex flex-wrap items-center justify-between gap-3 px-1 pb-1">
          <div>
            <p className="text-sm font-medium text-white/55">{saludo}{nombreCorto ? `, ${nombreCorto}` : ''}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Panel del taller</h1>
            <p className="mt-0.5 text-xs text-white/45">Resumen de reparaciones y ganancias</p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Ganancia · 30 días</p>
              <p className="font-display text-xl font-semibold leading-tight text-[#e7a16a]">
                ${gananciaMes.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="h-9 w-20" aria-label="Tendencia de ganancia de los últimos 7 días">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ultimaSemana}>
                  <Line
                    type="monotone"
                    dataKey="margenTotal"
                    stroke="#78bd91"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </header>

        {/* Tarjetas claras sobre fondo oscuro, como en la referencia */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {ESTADOS.map(({ clave, etiqueta, icon, acento }) => (
            <StatCard key={clave} label={etiqueta} value={estados?.[clave] ?? 0} acento={acento} icon={icon} />
          ))}
        </section>

        {/* Paneles de gráficos en una misma fila en escritorio */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.45fr_1fr]">
          <article className="min-w-0 rounded-2xl bg-[#f8f7f5] p-4 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:p-5">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Este mes</p>
                <h2 className="mt-0.5 text-lg font-semibold">Tendencia de ganancia</h2>
              </div>
              <span className="shrink-0 rounded-full bg-[#efede9] px-2.5 py-1 text-[10px] text-[#716d69]">Últimos 30 días</span>
            </div>
            <div className="h-52 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={margenMes ?? []} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGanancia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c77945" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#c77945" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="4 6" stroke="#e7e3de" />
                  <XAxis
                    dataKey="fecha"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#817b76' }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    interval={6}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#817b76' }}
                    width={48}
                    tickFormatter={abreviarDinero}
                  />
                  <Tooltip content={<TendenciaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="margenTotal"
                    stroke="#c77945"
                    strokeWidth={2.5}
                    fill="url(#areaGanancia)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="min-w-0 rounded-2xl bg-[#f8f7f5] p-4 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:p-5">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Rendimiento del taller</p>
                <h2 className="mt-0.5 text-lg font-semibold">Modelos más reparados</h2>
              </div>
              <span className="shrink-0 rounded-full bg-[#efede9] px-2.5 py-1 text-[10px] text-[#716d69]">Histórico</span>
            </div>
            <div className="h-52 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topModelos ?? []} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barCobre" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e49a63" />
                      <stop offset="100%" stopColor="#bf7042" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="4 6" stroke="#e7e3de" />
                  <XAxis
                    dataKey="modelo"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#817b76' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#817b76' }}
                    width={36}
                  />
                  <Tooltip cursor={{ fill: 'rgba(194,121,59,0.06)' }} content={<ModelTooltip />} />
                  <Bar dataKey="total" fill="url(#barCobre)" radius={[6, 6, 2, 2]} maxBarSize={64} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
