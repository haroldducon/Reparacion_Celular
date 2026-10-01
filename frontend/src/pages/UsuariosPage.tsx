import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, type FormEvent, useEffect, useState } from 'react';
import { Building2, UserPlus, UsersRound } from 'lucide-react';
import { api } from '../lib/api';

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
}

const ETIQUETA_ROL: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Administrador',
  TECNICO: 'Técnico',
  RECEPCION: 'Recepción',
};

const CAMPO = 'w-full rounded-xl border border-[#e3dfd9] bg-white px-3.5 py-2.5 text-sm text-[#302d2e] outline-none transition placeholder:text-[#aaa39b] focus:border-[#c77945] focus:ring-2 focus:ring-[#c77945]/15';
const ETIQUETA = 'mb-1.5 block text-xs font-semibold text-[#5f5a55]';
const PANEL = 'rounded-2xl bg-[#f8f7f5] p-5 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:p-6';

function PanelTaller() {
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
      setError('');
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
    <form onSubmit={onSubmit} className={`${PANEL} flex h-full flex-col`}>
      <div className="mb-5 flex items-center gap-3 border-b border-[#e7e3de] pb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e6f0e8] text-[#43845b]">
          <Building2 size={20} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Configuración</p>
          <h2 className="mt-0.5 text-lg font-semibold">Datos del taller</h2>
          <p className="mt-0.5 text-xs text-[#817b76]">Este nombre aparece en el menú de todos los usuarios.</p>
        </div>
      </div>

      <div className="flex-1">
        <label htmlFor="nombre-taller" className={ETIQUETA}>Nombre del negocio</label>
        {isLoading ? (
          <div className="h-10 animate-pulse rounded-xl bg-[#ebe8e3]" />
        ) : (
          <input
            id="nombre-taller"
            required
            minLength={2}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={CAMPO}
            placeholder="Ej: Taller Celutech"
          />
        )}
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl bg-[#f8e9e5] px-3 py-2 text-xs text-[#a74838]">{error}</p>}
      {guardado && <p role="status" className="mt-3 rounded-xl bg-[#e6f0e8] px-3 py-2 text-xs font-medium text-[#43845b]">Nombre del taller guardado.</p>}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={guardar.isPending || isLoading}
          className="rounded-xl bg-[#43845b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#36734d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'TECNICO' });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editRol, setEditRol] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [errorEdicion, setErrorEdicion] = useState('');

  const { data: usuarios, isLoading: cargandoUsuarios } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/usuarios').then((r) => r.data),
  });

  const crear = useMutation({
    mutationFn: () => api.post('/usuarios', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setForm({ nombre: '', email: '', password: '', rol: 'TECNICO' });
      setError('');
    },
    onError: (err: any) => setError(err.response?.data?.message ?? 'No se pudo crear el usuario.'),
  });

  const cambiarActivo = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      api.patch(`/usuarios/${id}/activo`, { activo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  });

  const guardarEdicion = useMutation({
    mutationFn: (id: string) => api.patch(`/usuarios/${id}`, { nombre: editNombre, rol: editRol }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setEditandoId(null);
      setErrorEdicion('');
    },
    onError: (err: any) => setErrorEdicion(err.response?.data?.message ?? 'No se pudo guardar el cambio.'),
  });

  const restablecerPassword = useMutation({
    mutationFn: (id: string) => api.patch(`/usuarios/${id}/password`, { password: nuevaPassword }),
    onSuccess: () => {
      setNuevaPassword('');
      setEditandoId(null);
      setErrorEdicion('');
    },
    onError: (err: any) =>
      setErrorEdicion(err.response?.data?.message ?? 'No se pudo restablecer la contraseña.'),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    crear.mutate();
  }

  function abrirEdicion(u: Usuario) {
    setEditandoId(u.id);
    setEditNombre(u.nombre);
    setEditRol(u.rol);
    setNuevaPassword('');
    setErrorEdicion('');
  }

  return (
    <main className="rounded-[28px] bg-[#2b292a] p-4 text-white sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#e7a16a]">Administración del taller</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Usuarios</h1>
            <p className="mt-0.5 text-xs text-white/50">Administra accesos, responsabilidades y datos del taller.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
            <UsersRound size={16} className="text-[#e7a16a]" />
            <span className="text-xs text-white/70">{usuarios?.length ?? 0} cuentas</span>
          </div>
        </header>

        <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <form onSubmit={onSubmit} className={PANEL}>
            <div className="mb-5 flex items-center gap-3 border-b border-[#e7e3de] pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f6e9df] text-[#b86d3d]">
                <UserPlus size={20} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Equipo de trabajo</p>
                <h2 className="mt-0.5 text-lg font-semibold">Crear usuario</h2>
                <p className="mt-0.5 text-xs text-[#817b76]">Crea el acceso y define su responsabilidad.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="nuevo-nombre" className={ETIQUETA}>Nombre completo</label>
                <input
                  id="nuevo-nombre"
                  required
                  autoComplete="name"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className={CAMPO}
                  placeholder="Nombre del usuario"
                />
              </div>
              <div>
                <label htmlFor="nuevo-correo" className={ETIQUETA}>Correo electrónico</label>
                <input
                  id="nuevo-correo"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={CAMPO}
                  placeholder="nombre@taller.com"
                />
              </div>
              <div>
                <label htmlFor="nueva-clave" className={ETIQUETA}>Contraseña temporal</label>
                <input
                  id="nueva-clave"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className={CAMPO}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div>
                <label htmlFor="nuevo-rol" className={ETIQUETA}>Rol y permisos</label>
                <select
                  id="nuevo-rol"
                  value={form.rol}
                  onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
                  className={CAMPO}
                >
                  <option value="TECNICO">Técnico</option>
                  <option value="RECEPCION">Recepción</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>

            {error && <p role="alert" className="mt-4 rounded-xl bg-[#f8e9e5] px-3 py-2.5 text-xs text-[#a74838]">{error}</p>}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7e3de] pt-4">
              <p className="text-[11px] text-[#817b76]">El usuario podrá iniciar sesión con estas credenciales.</p>
              <button
                type="submit"
                disabled={crear.isPending}
                className="rounded-xl bg-[#c77945] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ad6338] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {crear.isPending ? 'Creando…' : 'Crear usuario'}
              </button>
            </div>
          </form>

          <PanelTaller />
        </section>

        <section className="overflow-hidden rounded-2xl bg-[#f8f7f5] text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e3de] px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Directorio</p>
              <h2 className="mt-0.5 text-lg font-semibold">Usuarios registrados</h2>
            </div>
            <span className="rounded-full bg-[#efede9] px-3 py-1.5 text-xs font-medium text-[#716d69]">
              {usuarios?.length ?? 0} cuentas
            </span>
          </div>

          <div className="max-h-[min(55vh,560px)] overflow-auto">
            <table className="w-full min-w-[780px] text-xs">
              <thead className="sticky top-0 z-10 bg-[#f0eeea] text-left text-[#716d69]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Usuario</th>
                  <th className="px-5 py-3 font-semibold">Correo</th>
                  <th className="px-5 py-3 font-semibold">Rol</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e3de]">
                {cargandoUsuarios ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#817b76]">Cargando usuarios…</td></tr>
                ) : usuarios?.length ? (
                  usuarios.map((u) => (
                    <Fragment key={u.id}>
                      <tr className="transition-colors hover:bg-[#f2f0ec]">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2b292a] text-xs font-semibold text-white">
                              {u.nombre.charAt(0).toUpperCase()}
                            </span>
                            <span className="font-semibold">{u.nombre}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[#716d69]">{u.email}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex rounded-full bg-[#f6e9df] px-2.5 py-1 text-[11px] font-semibold text-[#975f3c]">
                            {ETIQUETA_ROL[u.rol] ?? u.rol}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${u.activo ? 'bg-[#e6f0e8] text-[#43845b]' : 'bg-[#f2e8e5] text-[#a74838]'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${u.activo ? 'bg-[#43845b]' : 'bg-[#a74838]'}`} />
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => (editandoId === u.id ? setEditandoId(null) : abrirEdicion(u))}
                              className="rounded-lg border border-[#ded9d2] px-3 py-1.5 text-[11px] font-medium text-[#5f5a55] transition hover:border-[#c77945] hover:bg-[#f6e9df] hover:text-[#975f3c]"
                            >
                              {editandoId === u.id ? 'Cerrar' : 'Editar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => cambiarActivo.mutate({ id: u.id, activo: !u.activo })}
                              disabled={cambiarActivo.isPending}
                              className="rounded-lg border border-[#ded9d2] px-3 py-1.5 text-[11px] font-medium text-[#5f5a55] transition hover:bg-[#efede9] disabled:opacity-50"
                            >
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {editandoId === u.id && (
                        <tr>
                          <td colSpan={5} className="bg-[#f0eeea] px-5 py-4">
                            <div className="grid gap-5 lg:grid-cols-2">
                              <div className="space-y-3 rounded-xl bg-white p-4">
                                <div>
                                  <p className="text-xs font-semibold text-[#302d2e]">Editar datos</p>
                                  <p className="mt-0.5 text-[11px] text-[#817b76]">Actualiza el nombre o el rol asignado.</p>
                                </div>
                                <div>
                                  <label htmlFor={`editar-nombre-${u.id}`} className={ETIQUETA}>Nombre</label>
                                  <input
                                    id={`editar-nombre-${u.id}`}
                                    value={editNombre}
                                    onChange={(e) => setEditNombre(e.target.value)}
                                    className={CAMPO}
                                  />
                                </div>
                                <div>
                                  <label htmlFor={`editar-rol-${u.id}`} className={ETIQUETA}>Rol</label>
                                  <select
                                    id={`editar-rol-${u.id}`}
                                    value={editRol}
                                    onChange={(e) => setEditRol(e.target.value)}
                                    className={CAMPO}
                                  >
                                    <option value="TECNICO">Técnico</option>
                                    <option value="RECEPCION">Recepción</option>
                                    <option value="ADMIN">Administrador</option>
                                    <option value="SUPER_ADMIN">Super admin</option>
                                  </select>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => guardarEdicion.mutate(u.id)}
                                  disabled={guardarEdicion.isPending}
                                  className="rounded-lg bg-[#c77945] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#ad6338] disabled:opacity-60"
                                >
                                  {guardarEdicion.isPending ? 'Guardando…' : 'Guardar cambios'}
                                </button>
                              </div>

                              <div className="space-y-3 rounded-xl bg-white p-4">
                                <div>
                                  <p className="text-xs font-semibold text-[#302d2e]">Restablecer contraseña</p>
                                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#817b76]">
                                    Establece una nueva contraseña temporal de al menos 8 caracteres.
                                  </p>
                                </div>
                                <div>
                                  <label htmlFor={`nueva-clave-${u.id}`} className={ETIQUETA}>Nueva contraseña</label>
                                  <input
                                    id={`nueva-clave-${u.id}`}
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    placeholder="Mínimo 8 caracteres"
                                    value={nuevaPassword}
                                    onChange={(e) => setNuevaPassword(e.target.value)}
                                    className={CAMPO}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => restablecerPassword.mutate(u.id)}
                                  disabled={nuevaPassword.length < 8 || restablecerPassword.isPending}
                                  className="rounded-lg border border-[#c77945] px-4 py-2 text-xs font-semibold text-[#975f3c] transition hover:bg-[#f6e9df] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {restablecerPassword.isPending ? 'Guardando…' : 'Restablecer contraseña'}
                                </button>
                              </div>
                            </div>
                            {errorEdicion && <p role="alert" className="mt-3 rounded-xl bg-[#f8e9e5] px-3 py-2 text-xs text-[#a74838]">{errorEdicion}</p>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                ) : (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#817b76]">Todavía no hay usuarios registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
