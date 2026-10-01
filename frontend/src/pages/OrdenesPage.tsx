import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ClipboardList, Plus, Search, X } from 'lucide-react';
import { api } from '../lib/api';
import type { OrdenReparacion } from '../types';

const COLOR_ESTADO: Record<string, string> = {
  RECEPCION: 'bg-[#efede9] text-[#716d69]',
  DIAGNOSTICO: 'bg-[#f6e9df] text-[#975f3c]',
  EN_REPARACION: 'bg-[#f6e9df] text-[#975f3c]',
  REPARADO: 'bg-[#e6f0e8] text-[#43845b]',
  ENTREGADO: 'bg-[#e6f0e8] text-[#43845b]',
  CANCELADO: 'bg-[#f2e8e5] text-[#a74838]',
};

const POR_PAGINA = 10;

interface RespuestaPaginada {
  data: OrdenReparacion[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function etiquetaEstado(estado: string) {
  return estado.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letra) => letra.toUpperCase());
}

export function OrdenesPage() {
  const navigate = useNavigate();
  const [buscar, setBuscar] = useState('');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  // la búsqueda se envía al servidor 350 ms después de dejar de escribir, y siempre vuelve a la página 1
  useEffect(() => {
    const t = setTimeout(() => {
      setTerminoBusqueda(buscar.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [buscar]);

  const { data: respuesta, isLoading, isError, isFetching } = useQuery<RespuestaPaginada>({
    queryKey: ['ordenes', 'pagina', terminoBusqueda, pagina],
    queryFn: () =>
      api
        .get('/ordenes', { params: { buscar: terminoBusqueda || undefined, page: pagina, pageSize: POR_PAGINA } })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const ordenes = respuesta?.data;
  const total = respuesta?.total ?? 0;
  const totalPaginas = respuesta?.totalPages ?? 1;
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);

  return (
    <main className="rounded-[28px] bg-[#2b292a] p-4 text-white sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#e7a16a]">Operación del taller</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Órdenes</h1>
            <p className="mt-0.5 text-xs text-white/50">Busca y consulta el estado de los equipos recibidos.</p>
          </div>
          <Link
            to="/ordenes/nueva"
            className="inline-flex items-center gap-2 rounded-xl bg-[#c77945] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ad6338]"
          >
            <Plus size={17} />
            Recibir equipo
          </Link>
        </header>

        <section className="rounded-2xl bg-[#f8f7f5] p-4 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#efede9] text-[#716d69]">
                <ClipboardList size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Registro de órdenes</h2>
                <p className="text-[11px] text-[#817b76]">{total} {total === 1 ? 'orden' : 'órdenes'} en el historial</p>
              </div>
            </div>

            <div className="relative w-full sm:max-w-md sm:flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#99928c]" />
              <input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                aria-label="Buscar órdenes"
                placeholder="N.º de reparación, cliente, teléfono, marca o modelo"
                className="w-full rounded-xl border border-[#e3dfd9] bg-white py-2.5 pl-9 pr-9 text-xs text-[#302d2e] outline-none transition placeholder:text-[#aaa39b] focus:border-[#c77945] focus:ring-2 focus:ring-[#c77945]/15"
              />
              {buscar && (
                <button
                  type="button"
                  onClick={() => setBuscar('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#817b76] hover:bg-[#efede9]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-[#e7e3de] bg-white">
            <div className="max-h-[min(65vh,680px)] overflow-auto">
              <table className="w-full min-w-[860px] text-xs">
                <thead className="sticky top-0 z-10 bg-[#f0eeea] text-left text-[#716d69]">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Reparación N.º</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Cliente</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Equipo</th>
                    <th className="px-4 py-3 font-semibold">Falla reportada</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Estado</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Recibido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e3de]">
                  {isLoading ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#817b76]">Cargando órdenes…</td></tr>
                  ) : isError ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#a74838]">No se pudieron cargar las órdenes. Intenta nuevamente.</td></tr>
                  ) : ordenes?.length ? (
                    ordenes.map((orden) => (
                      <tr
                        key={orden.id}
                        role="link"
                        tabIndex={0}
                        aria-label={`Abrir orden ${orden.numeroReparacion ?? orden.id.slice(0, 8)}`}
                        onClick={() => navigate(`/diagnosticos/${orden.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/diagnosticos/${orden.id}`);
                          }
                        }}
                        className="cursor-pointer outline-none transition-colors hover:bg-[#f7f5f2] focus-visible:bg-[#f6e9df]"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] font-semibold text-[#975f3c]">
                          #{orden.numeroReparacion ?? orden.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-[#302d2e]">{orden.cliente.nombre}</p>
                          <p className="mt-0.5 text-[10px] text-[#99928c]">{orden.cliente.telefono}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-medium">{orden.marca} {orden.modelo}</td>
                        <td className="max-w-[280px] px-4 py-3.5 text-[#716d69]">
                          <span className="line-clamp-2">{orden.fallaReportada}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${COLOR_ESTADO[orden.estado] ?? 'bg-[#efede9] text-[#716d69]'}`}>
                            {etiquetaEstado(orden.estado)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-[#716d69]">
                          {new Date(orden.fechaRecepcion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#efede9] text-[#817b76]">
                          <Search size={19} />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-[#302d2e]">
                          {terminoBusqueda ? 'No encontramos coincidencias' : 'Todavía no hay equipos recibidos'}
                        </p>
                        <p className="mt-1 text-xs text-[#817b76]">
                          {terminoBusqueda ? 'Prueba con otro nombre, teléfono o número de reparación.' : 'Cuando recibas un equipo, la orden aparecerá aquí.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-[#817b76]">
              {total > 0 ? `Mostrando ${desde}–${hasta} de ${total}` : 'Sin resultados'}
              <span className="ml-2 text-[#aaa39b]">· Selecciona una fila para abrir el detalle.</span>
            </p>
            <nav aria-label="Paginación" className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1 || isFetching}
                className="inline-flex items-center gap-1 rounded-lg border border-[#ded9d2] px-3 py-1.5 text-xs font-semibold text-[#5f5a55] transition hover:border-[#c77945] hover:bg-[#f6e9df] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <span className="min-w-[88px] text-center text-xs font-medium text-[#5f5a55]">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas || isFetching}
                className="inline-flex items-center gap-1 rounded-lg border border-[#ded9d2] px-3 py-1.5 text-xs font-semibold text-[#5f5a55] transition hover:border-[#c77945] hover:bg-[#f6e9df] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </nav>
          </div>
        </section>
      </div>
    </main>
  );
}
