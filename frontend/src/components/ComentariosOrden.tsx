import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Eye, EyeOff, MessageSquare, Send } from 'lucide-react';
import { api } from '../lib/api';
import type { HistorialEstado } from '../types';

interface Props {
  ordenId: string;
  historial?: HistorialEstado[];
}

/** Notas de la orden. Las marcadas "visibles" aparecen en la página de seguimiento del cliente. */
export function ComentariosOrden({ ordenId, historial = [] }: Props) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState('');
  const [visibleCliente, setVisibleCliente] = useState(true);
  const [error, setError] = useState('');

  const comentarios = historial.filter((h) => h.estadoAnterior === h.estadoNuevo && h.nota);

  const enviar = useMutation({
    mutationFn: () => api.post(`/ordenes/${ordenId}/comentarios`, { texto: texto.trim(), visibleCliente }),
    onSuccess: () => {
      setTexto('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['orden', ordenId] });
    },
    onError: (err: any) => setError(err.response?.data?.message ?? 'No se pudo guardar el comentario.'),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (texto.trim()) enviar.mutate();
  }

  return (
    <section className="rounded-2xl bg-[#f8f7f5] p-4 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-[#e7e3de] pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#efede9] text-[#716d69]">
          <MessageSquare size={18} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Comunicación</p>
          <h2 className="text-base font-semibold">Comentarios de la orden</h2>
          <p className="mt-0.5 text-xs text-[#817b76]">Deja notas internas o mensajes que el cliente verá en su enlace de seguimiento.</p>
        </div>
      </div>

      {comentarios.length > 0 && (
        <ul className="mb-4 space-y-2">
          {comentarios.map((c) => (
            <li key={c.id} className="rounded-xl bg-[#f0eeea] px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    c.visibleCliente ? 'bg-[#e6f0e8] text-[#43845b]' : 'bg-[#efede9] text-[#716d69] ring-1 ring-[#ded9d2]'
                  }`}
                >
                  {c.visibleCliente ? <Eye size={11} /> : <EyeOff size={11} />}
                  {c.visibleCliente ? 'Visible para el cliente' : 'Nota interna'}
                </span>
                <span className="text-[10px] text-[#99928c]">{new Date(c.createdAt).toLocaleString('es-CO')}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed">{c.nota}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <label htmlFor="comentario-orden" className="sr-only">Nuevo comentario</label>
        <textarea
          id="comentario-orden"
          rows={3}
          maxLength={1000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej.: Estamos esperando la pantalla, llega el jueves."
          className="w-full resize-y rounded-xl border border-[#e3dfd9] bg-white px-3 py-2.5 text-sm leading-relaxed outline-none transition placeholder:text-[#aaa39b] focus:border-[#c77945] focus:ring-2 focus:ring-[#c77945]/15"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#5f5a55]">
            <input
              type="checkbox"
              checked={visibleCliente}
              onChange={(e) => setVisibleCliente(e.target.checked)}
              className="h-4 w-4 rounded border-[#ded9d2] accent-[#c77945]"
            />
            Mostrar al cliente en su enlace de seguimiento
          </label>
          <button
            type="submit"
            disabled={enviar.isPending || !texto.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#c77945] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#ad6338] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={13} /> {enviar.isPending ? 'Guardando…' : 'Agregar comentario'}
          </button>
        </div>
        {error && <p role="alert" className="rounded-xl bg-[#f8e9e5] px-3 py-2.5 text-xs text-[#a74838]">{error}</p>}
      </form>
    </section>
  );
}
