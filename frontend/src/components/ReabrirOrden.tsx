import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { LockKeyhole, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-context';

interface Props {
  ordenId: string;
  estado: 'CANCELADO' | 'ENTREGADO' | string;
}

/** Reabrir una orden cerrada: solo administradores, con motivo y su contraseña. */
export function ReabrirOrden({ ordenId, estado }: Props) {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const reabrir = useMutation({
    mutationFn: () => api.post(`/ordenes/${ordenId}/reabrir`, { motivo: motivo.trim(), password }),
    onSuccess: () => {
      setAbierto(false);
      setMotivo('');
      setPassword('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['orden', ordenId] });
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
      queryClient.invalidateQueries({ queryKey: ['resumen-estados'] });
      queryClient.invalidateQueries({ queryKey: ['margen-mes'] });
    },
    onError: (err: any) => setError(err.response?.data?.message ?? 'No se pudo reabrir la orden.'),
  });

  if (usuario?.rol !== 'ADMIN' && usuario?.rol !== 'SUPER_ADMIN') return null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    reabrir.mutate();
  }

  const destino = estado === 'ENTREGADO' ? 'volverá a "Listo para recoger" y dejará de contar en los reportes hasta que se entregue de nuevo' : 'volverá a la etapa de diagnóstico';

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <RotateCcw size={13} /> Reabrir orden (administrador)
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3 rounded-xl bg-[#f8f7f5] p-4 text-[#302d2e]">
      <div className="flex items-start gap-2">
        <LockKeyhole size={16} className="mt-0.5 shrink-0 text-[#ad7049]" />
        <p className="text-xs leading-relaxed text-[#5f5a55]">
          Al reabrir, la orden {destino}. Quedará registrado en el historial quién la reabrió y por qué.
        </p>
      </div>
      <div>
        <label htmlFor="motivo-reabrir" className="mb-1.5 block text-xs font-semibold text-[#5f5a55]">Motivo</label>
        <textarea
          id="motivo-reabrir"
          required
          minLength={5}
          maxLength={500}
          rows={2}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full resize-y rounded-xl border border-[#e3dfd9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#c77945] focus:ring-2 focus:ring-[#c77945]/15"
        />
      </div>
      <div>
        <label htmlFor="password-reabrir" className="mb-1.5 block text-xs font-semibold text-[#5f5a55]">Tu contraseña de administrador</label>
        <input
          id="password-reabrir"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-[#e3dfd9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#c77945] focus:ring-2 focus:ring-[#c77945]/15"
        />
      </div>
      {error && <p role="alert" className="rounded-xl bg-[#f8e9e5] px-3 py-2.5 text-xs text-[#a74838]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => { setAbierto(false); setError(''); setPassword(''); }}
          className="rounded-lg border border-[#ded9d2] px-3 py-2 text-xs font-semibold text-[#5f5a55] hover:bg-[#efede9]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={reabrir.isPending || motivo.trim().length < 5 || !password}
          className="rounded-lg bg-[#c77945] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#ad6338] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {reabrir.isPending ? 'Reabriendo…' : 'Reabrir orden'}
        </button>
      </div>
    </form>
  );
}
