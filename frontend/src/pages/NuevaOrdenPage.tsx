import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Smartphone, UserRound, ClipboardList, X } from 'lucide-react';
import { api } from '../lib/api';

const CAMPO =
  'w-full rounded-xl border border-[#e3dfd9] bg-white px-3 py-2.5 text-sm text-[#302d2e] outline-none transition placeholder:text-[#aaa39b] focus:border-[#c77945] focus:ring-2 focus:ring-[#c77945]/15 disabled:cursor-not-allowed disabled:bg-[#efede9]';
const PANEL = 'rounded-2xl bg-[#f8f7f5] p-4 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:p-5';
const LABEL = 'mb-1.5 block text-xs font-semibold text-[#5f5a55]';
const KICKER = 'text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]';

function EncabezadoPanel({
  icono,
  kicker,
  titulo,
  descripcion,
}: {
  icono: React.ReactNode;
  kicker: string;
  titulo: string;
  descripcion?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3 border-b border-[#e7e3de] pb-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#efede9] text-[#716d69]">
        {icono}
      </div>
      <div>
        <p className={KICKER}>{kicker}</p>
        <h2 className="text-base font-semibold">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-xs text-[#817b76]">{descripcion}</p>}
      </div>
    </div>
  );
}

export function NuevaOrdenPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);

  const [form, setForm] = useState({
    clienteId: '',
    clienteNombre: '',
    clienteTelefono: '',
    clienteEmail: '',
    marca: '',
    modelo: '',
    imei: '',
    color: '',
    accesoriosRecibidos: '',
    fallaReportada: '',
  });

  const crearOrden = useMutation({
    mutationFn: async () => {
      const { data: orden } = await api.post('/ordenes', form);

      // las fotos de recepción se suben justo después, ya con el id de la orden
      for (const foto of fotos) {
        const fd = new FormData();
        fd.append('foto', foto);
        fd.append('tipo', 'RECEPCION');
        await api.post(`/ordenes/${orden.id}/fotos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      return orden;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
      navigate('/ordenes');
    },
    onError: (err: any) =>
      setError(err.response?.data?.message ?? 'No se pudo crear la orden. Revisa los datos e intenta de nuevo.'),
  });

  function actualizar(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    crearOrden.mutate();
  }

  function quitarFoto(indice: number) {
    setFotos((actuales) => actuales.filter((_, i) => i !== indice));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <main className="rounded-[28px] bg-[#2b292a] p-4 text-white sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[900px] space-y-4">
        <header className="px-1">
          <Link
            to="/ordenes"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/55 transition hover:text-white"
          >
            <ArrowLeft size={14} /> Volver a órdenes
          </Link>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.15em] text-[#e7a16a]">Nueva entrada</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Recibir equipo</h1>
          <p className="mt-1 text-xs text-white/55">
            Registra el ingreso del equipo con los datos que te dé el cliente.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Cliente */}
          <section className={PANEL}>
            <EncabezadoPanel
              icono={<UserRound size={18} />}
              kicker="Cliente"
              titulo="Datos del cliente"
              descripcion="Si ya tienes el ID, pégalo abajo. Si es nuevo, completa nombre y teléfono."
            />
            <div className="space-y-3">
              <div>
                <label htmlFor="cliente-id" className={LABEL}>ID del cliente (opcional)</label>
                <input
                  id="cliente-id"
                  value={form.clienteId}
                  onChange={(e) => actualizar('clienteId', e.target.value)}
                  className={CAMPO}
                  placeholder="Déjalo vacío para crear uno nuevo"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="cliente-nombre" className={LABEL}>Nombre</label>
                  <input
                    id="cliente-nombre"
                    value={form.clienteNombre}
                    onChange={(e) => actualizar('clienteNombre', e.target.value)}
                    className={CAMPO}
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div>
                  <label htmlFor="cliente-telefono" className={LABEL}>Teléfono</label>
                  <input
                    id="cliente-telefono"
                    value={form.clienteTelefono}
                    onChange={(e) => actualizar('clienteTelefono', e.target.value)}
                    className={CAMPO}
                    placeholder="Teléfono"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="cliente-email" className={LABEL}>Correo (opcional)</label>
                <input
                  id="cliente-email"
                  type="email"
                  value={form.clienteEmail}
                  onChange={(e) => actualizar('clienteEmail', e.target.value)}
                  className={CAMPO}
                  placeholder="Correo del cliente (para notificaciones)"
                />
                <p className="mt-2 rounded-xl bg-[#f0eeea] px-3 py-2.5 text-[11px] leading-relaxed text-[#817b76]">
                  Sin correo, el cliente no podrá recibir notificaciones por email.
                </p>
              </div>
            </div>
          </section>

          {/* Equipo */}
          <section className={PANEL}>
            <EncabezadoPanel
              icono={<Smartphone size={18} />}
              kicker="Recepción"
              titulo="Información del equipo"
            />
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="marca" className={LABEL}>Marca</label>
                  <input
                    id="marca"
                    required
                    value={form.marca}
                    onChange={(e) => actualizar('marca', e.target.value)}
                    className={CAMPO}
                  />
                </div>
                <div>
                  <label htmlFor="modelo" className={LABEL}>Modelo</label>
                  <input
                    id="modelo"
                    required
                    value={form.modelo}
                    onChange={(e) => actualizar('modelo', e.target.value)}
                    className={CAMPO}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="imei" className={LABEL}>IMEI (opcional)</label>
                  <input
                    id="imei"
                    value={form.imei}
                    onChange={(e) => actualizar('imei', e.target.value)}
                    className={CAMPO}
                  />
                </div>
                <div>
                  <label htmlFor="color" className={LABEL}>Color (opcional)</label>
                  <input
                    id="color"
                    value={form.color}
                    onChange={(e) => actualizar('color', e.target.value)}
                    className={CAMPO}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="accesorios" className={LABEL}>Accesorios recibidos (opcional)</label>
                <input
                  id="accesorios"
                  value={form.accesoriosRecibidos}
                  onChange={(e) => actualizar('accesoriosRecibidos', e.target.value)}
                  className={CAMPO}
                  placeholder="Cargador, funda, sim..."
                />
              </div>
            </div>
          </section>

          {/* Falla */}
          <section className={PANEL}>
            <EncabezadoPanel
              icono={<ClipboardList size={18} />}
              kicker="Motivo de ingreso"
              titulo="Falla reportada"
              descripcion="Describe el problema tal como lo explica el cliente."
            />
            <label htmlFor="falla" className={LABEL}>Falla reportada por el cliente</label>
            <textarea
              id="falla"
              required
              value={form.fallaReportada}
              onChange={(e) => actualizar('fallaReportada', e.target.value)}
              rows={3}
              className={`${CAMPO} resize-y leading-relaxed`}
            />
          </section>

          {/* Fotos */}
          <section className={PANEL}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={KICKER}>Evidencia</p>
                <h2 className="mt-0.5 text-base font-semibold">
                  Fotos de recepción <span className="text-xs font-normal text-[#817b76]">(opcional)</span>
                </h2>
                <p className="mt-0.5 text-xs text-[#817b76]">Documenta el estado en que llega el equipo.</p>
              </div>
              <input
                ref={fileInputRef}
                id="fotos-recepcion"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFotos(Array.from(e.target.files ?? []))}
                className="sr-only"
              />
              <label
                htmlFor="fotos-recepcion"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#ded9d2] px-3 py-2 text-xs font-semibold text-[#5f5a55] transition hover:border-[#c77945] hover:bg-[#f6e9df]"
              >
                <ImagePlus size={15} /> {fotos.length ? 'Cambiar fotos' : 'Elegir archivos'}
              </label>
            </div>

            {fotos.length ? (
              <ul className="space-y-2">
                {fotos.map((foto, i) => (
                  <li
                    key={`${foto.name}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#f0eeea] px-3 py-2 text-xs text-[#5f5a55]"
                  >
                    <span className="truncate">{foto.name}</span>
                    <button
                      type="button"
                      onClick={() => quitarFoto(i)}
                      aria-label={`Quitar ${foto.name}`}
                      className="shrink-0 rounded-md p-1 text-[#a74838] transition hover:bg-[#f2e8e5]"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-[#f0eeea] px-3 py-5 text-center text-xs text-[#817b76]">
                Aún no has seleccionado fotos.
              </p>
            )}
          </section>

          {error && (
            <p role="alert" className="rounded-xl bg-[#f8e9e5] px-3 py-2.5 text-xs text-[#a74838]">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={crearOrden.isPending}
              className="w-full rounded-xl bg-[#c77945] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ad6338] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
            >
              {crearOrden.isPending ? 'Guardando…' : 'Registrar recepción'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
