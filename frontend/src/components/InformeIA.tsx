import { useMutation, useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api';

interface Periodo {
  id: string;
  etiqueta: string;
  desde: string;
  hasta: string;
}

interface Informe {
  id: string;
  estado: 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADO' | 'ERROR';
  resumenTexto?: string | null;
  error?: string | null;
}

/** Texto en negrita **así** sin usar HTML crudo (más seguro que dangerouslySetInnerHTML). */
function enLinea(texto: string) {
  return texto.split('**').map((trozo, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-[#302d2e]">{trozo}</strong> : <Fragment key={i}>{trozo}</Fragment>,
  );
}

function Contenido({ texto }: { texto: string }) {
  const bloques: React.ReactNode[] = [];
  let items: string[] = [];
  const cerrarLista = (clave: number) => {
    if (!items.length) return;
    bloques.push(
      <ul key={`ul-${clave}`} className="mt-1.5 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-[#5f5a55]">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c77945]" />
            <span>{enLinea(it)}</span>
          </li>
        ))}
      </ul>,
    );
    items = [];
  };

  texto.split('\n').forEach((linea, i) => {
    const l = linea.trim();
    if (!l) return;
    if (l.startsWith('## ') || l.startsWith('# ')) {
      cerrarLista(i);
      bloques.push(
        <h3 key={i} className="mt-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049] first:mt-0">
          {l.replace(/^#+\s*/, '')}
        </h3>,
      );
    } else if (/^[-*•]\s+/.test(l)) {
      items.push(l.replace(/^[-*•]\s+/, ''));
    } else {
      cerrarLista(i);
      bloques.push(<p key={i} className="mt-1.5 text-sm leading-relaxed text-[#5f5a55]">{enLinea(l)}</p>);
    }
  });
  cerrarLista(9999);
  return <div>{bloques}</div>;
}

export function InformeIA({ periodos }: { periodos: Periodo[] }) {
  const [periodoId, setPeriodoId] = useState(periodos[0]?.id ?? '');
  const [informeId, setInformeId] = useState<string | null>(null);
  const [errorSolicitud, setErrorSolicitud] = useState('');

  const solicitar = useMutation({
    mutationFn: () => {
      const p = periodos.find((x) => x.id === periodoId) ?? periodos[0];
      return api.post('/reportes/ia', { periodoInicio: p.desde, periodoFin: p.hasta }).then((r) => r.data as { id: string });
    },
    onMutate: () => setErrorSolicitud(''),
    onSuccess: (d) => setInformeId(d.id),
    onError: (err: any) => setErrorSolicitud(err.response?.data?.message ?? 'No se pudo generar el informe.'),
  });

  const { data: informe } = useQuery<Informe>({
    queryKey: ['informe-ia', informeId],
    queryFn: () => api.get(`/reportes/ia/${informeId}`).then((r) => r.data),
    enabled: !!informeId,
    // consulta cada 3 s mientras se genera
    refetchInterval: (q) => (q.state.data && ['COMPLETADO', 'ERROR'].includes(q.state.data.estado) ? false : 3000),
  });

  const generando = solicitar.isPending || (!!informeId && (!informe || ['PENDIENTE', 'PROCESANDO'].includes(informe.estado)));

  return (
    <section className="rounded-2xl bg-[#f8f7f5] p-4 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e7e3de] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6e9df] text-[#b86d3d]">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Inteligencia artificial</p>
            <h2 className="text-base font-semibold">Informe con insights</h2>
            <p className="mt-0.5 text-xs text-[#817b76]">
              Analiza tus cifras del período y te explica qué está pasando y qué hacer. No se envían datos de clientes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={periodoId}
            onChange={(e) => setPeriodoId(e.target.value)}
            disabled={generando}
            aria-label="Período del informe"
            className="rounded-xl border border-[#e3dfd9] bg-white px-3 py-2 text-xs font-medium text-[#302d2e] outline-none focus:border-[#c77945] focus:ring-2 focus:ring-[#c77945]/15"
          >
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>{p.etiqueta}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => solicitar.mutate()}
            disabled={generando || !periodos.length}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#c77945] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#ad6338] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generando ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {generando ? 'Analizando…' : informe ? 'Generar de nuevo' : 'Generar informe'}
          </button>
        </div>
      </div>

      <div className="pt-4">
        {errorSolicitud && <p role="alert" className="rounded-xl bg-[#f8e9e5] px-3 py-2.5 text-xs text-[#a74838]">{errorSolicitud}</p>}

        {informe?.estado === 'ERROR' && (
          <p role="alert" className="rounded-xl bg-[#f8e9e5] px-3 py-2.5 text-xs text-[#a74838]">
            No se pudo generar el informe{informe.error ? `: ${informe.error}` : '.'}
          </p>
        )}

        {informe?.estado === 'COMPLETADO' && informe.resumenTexto && <Contenido texto={informe.resumenTexto} />}

        {!informeId && !errorSolicitud && (
          <p className="rounded-xl bg-[#f0eeea] px-3 py-5 text-center text-xs text-[#817b76]">
            Elige un período y pulsa “Generar informe”. Tarda unos segundos.
          </p>
        )}
        {generando && informeId && (
          <p className="rounded-xl bg-[#f0eeea] px-3 py-5 text-center text-xs text-[#817b76]">Estamos analizando tus cifras…</p>
        )}

        {informe?.estado === 'COMPLETADO' && (
          <p className="mt-4 border-t border-[#e7e3de] pt-3 text-[10px] text-[#99928c]">
            Generado automáticamente con IA a partir de tus cifras. Verifica las decisiones importantes con tus datos.
          </p>
        )}
      </div>
    </section>
  );
}
