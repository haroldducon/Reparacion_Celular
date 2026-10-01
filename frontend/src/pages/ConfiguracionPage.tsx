import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

export function ConfiguracionPage() {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState('');

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => api.get('/tenant').then((r) => r.data),
  });

  useEffect(() => {
    if (tenant?.nombre) setNombre(tenant.nombre);
  }, [tenant]);

  const guardar = useMutation({
    mutationFn: () => api.patch('/tenant', { nombre }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    },
    onError: (err: any) => setError(err.response?.data?.message ?? 'No se pudo guardar el cambio.'),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    guardar.mutate();
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <p className="section-kicker">Administración</p>
        <h1 className="text-3xl font-semibold mt-1">Configuración</h1>
        <p className="text-sm text-grafito/60 mt-2">
          El nombre que pongas aquí es el que ven todos los usuarios del taller en el menú.
        </p>
      </div>

      <form onSubmit={onSubmit} className="surface-panel p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre del negocio</label>
          {isLoading ? (
            <p className="text-sm text-grafito/50">Cargando...</p>
          ) : (
            <input
              required
              minLength={2}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-md border border-borde px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cobre"
              placeholder="Ej: Taller Celutech"
            />
          )}
        </div>

        {error && <p className="text-sm text-oxido">{error}</p>}
        {guardado && <p className="text-sm text-circuito">Guardado.</p>}

        <button
          type="submit"
          disabled={guardar.isPending || isLoading}
          className="rounded-lg bg-cobre hover:bg-cobre-oscuro transition-colors text-white text-sm font-semibold px-5 py-2.5 disabled:opacity-60"
        >
          {guardar.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
