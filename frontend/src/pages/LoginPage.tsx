import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Eye, EyeOff, PackageCheck, Search, Wrench } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { Footer } from '../components/Footer';

const CAMPO =
  'w-full rounded-xl border border-[#e3dfd9] bg-white px-3 py-2.5 text-sm text-[#302d2e] outline-none transition placeholder:text-[#aaa39b] focus:border-[#c77945] focus:ring-2 focus:ring-[#c77945]/15 disabled:cursor-not-allowed disabled:bg-[#efede9]';
const LABEL = 'mb-1.5 block text-xs font-semibold text-[#5f5a55]';

const PASOS = [
  { icono: ClipboardList, titulo: 'Registrar ingreso', texto: 'Guarda los datos del cliente, el equipo y su estado de recepción.' },
  { icono: Search, titulo: 'Realizar diagnóstico', texto: 'Documenta la falla, las evidencias y el presupuesto de reparación.' },
  { icono: Wrench, titulo: 'Gestionar reparación', texto: 'Da seguimiento al trabajo y mantén actualizado el estado del equipo.' },
  { icono: PackageCheck, titulo: 'Preparar entrega', texto: 'Confirma la reparación y entrega el celular con todo su historial.' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [passwordActive, setPasswordActive] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const eyeLeftRef = useRef<SVGCircleElement>(null);
  const eyeRightRef = useRef<SVGCircleElement>(null);

  // Los ojos del robot siguen el cursor mientras no se escribe la contraseña
  useEffect(() => {
    if (passwordActive) return;

    function seguirCursor(event: globalThis.MouseEvent) {
      [eyeLeftRef.current, eyeRightRef.current].forEach((eye) => {
        if (!eye) return;
        const rect = eye.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
        const distance = Math.min(3.2, Math.hypot(event.clientX - centerX, event.clientY - centerY) / 38);
        eye.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
      });
    }

    document.addEventListener('mousemove', seguirCursor);
    return () => document.removeEventListener('mousemove', seguirCursor);
  }, [passwordActive]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setEnviando(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(
        err?.response?.status === 429
          ? (err.response.data?.message ?? 'Demasiados intentos. Espera unos minutos.')
          : 'Correo o contraseña incorrectos.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#211f20]">
    <main className="flex flex-1 items-center justify-center px-3 py-6 sm:px-6">
      <div className="grid w-full max-w-[1040px] overflow-hidden rounded-[28px] bg-[#2b292a] shadow-[0_24px_60px_rgba(0,0,0,0.35)] lg:grid-cols-[1.05fr_0.95fr]">
        {/* Panel informativo */}
        <aside
          aria-label="Flujo de trabajo del taller"
          className="relative hidden flex-col justify-between overflow-hidden p-8 text-white lg:flex xl:p-10"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#c77945]/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-[#c77945]/10 blur-3xl"
          />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c77945] text-white shadow-[0_8px_18px_rgba(194,121,59,0.3)]">
                <Wrench size={19} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Tech Tinker</p>
                <p className="text-[11px] text-white/45">Flujo de reparación</p>
              </div>
            </div>

            <p className="mt-10 text-xs font-medium uppercase tracking-[0.15em] text-[#e7a16a]">Gestión del taller</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">
              Repara, organiza y entrega con confianza.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/55">
              Lleva cada equipo desde su recepción hasta la entrega final en un solo lugar.
            </p>

            <ol className="mt-8 space-y-3">
              {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
                <li
                  key={titulo}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#e7a16a]">
                    <Icono size={16} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">
                      <span className="mr-1.5 text-[10px] font-semibold tracking-wider text-[#e7a16a]">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {titulo}
                    </h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/50">{texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative mt-8 flex items-center gap-2 text-xs text-white/50">
            <span className="h-2 w-2 rounded-full bg-[#78bd91] shadow-[0_0_0_4px_rgba(120,189,145,0.15)]" />
            Todo el proceso, bajo control.
          </div>
        </aside>

        {/* Formulario */}
        <section aria-label="Inicio de sesión" className="p-3 sm:p-4 lg:p-4 lg:pl-0">
          <form
            id="loginForm"
            onSubmit={onSubmit}
            className="flex h-full flex-col justify-center rounded-[22px] bg-[#f8f7f5] px-6 py-8 text-[#302d2e] shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:px-10"
          >
            {/* Robot */}
            <div aria-hidden="true" className="mx-auto -mt-1 mb-2 w-44 sm:w-48">
              <svg viewBox="0 0 280 220" role="img" aria-label="Robot técnico de reparación de celulares">
                <defs>
                  <linearGradient id="robotBg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#f6e9df" />
                    <stop offset="1" stopColor="#ece6de" />
                  </linearGradient>
                  <linearGradient id="robotBody" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#3a3738" />
                    <stop offset="1" stopColor="#242223" />
                  </linearGradient>
                </defs>
                <ellipse cx="140" cy="207" rx="70" ry="8" fill="#302d2e" opacity="0.12" />
                <circle cx="140" cy="110" r="91" fill="url(#robotBg)" />
                {/* Antena */}
                <path
                  d="M140 30v17M140 30l-7-9M140 30l7-9"
                  fill="none"
                  stroke="#817b76"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="140" cy="19" r="5" fill="#c77945" />
                {/* Celular / cuerpo */}
                <rect x="78" y="48" width="124" height="138" rx="25" fill="url(#robotBody)" />
                <rect x="91" y="64" width="98" height="96" rx="15" fill="#1c1a1b" />
                <rect x="128" y="53" width="24" height="5" rx="2.5" fill="#5a5556" />
                {/* Ojos */}
                {passwordActive ? (
                  <g fill="none" stroke="#e7a16a" strokeWidth="3.5" strokeLinecap="round">
                    <path d="M111 108c5 -5 13 -5 18 0" />
                    <path d="M151 108c5 -5 13 -5 18 0" />
                  </g>
                ) : (
                  <>
                    <circle
                      ref={eyeLeftRef}
                      cx="120"
                      cy="106"
                      r="9"
                      fill="#e7a16a"
                      style={{ transition: 'transform 80ms linear' }}
                    />
                    <circle
                      ref={eyeRightRef}
                      cx="160"
                      cy="106"
                      r="9"
                      fill="#e7a16a"
                      style={{ transition: 'transform 80ms linear' }}
                    />
                    <circle cx="123" cy="103" r="2.5" fill="#fff" opacity="0.85" />
                    <circle cx="163" cy="103" r="2.5" fill="#fff" opacity="0.85" />
                  </>
                )}
                {/* Boca */}
                <path
                  d={passwordActive ? 'M126 139c8 3 20 3 28 0' : 'M120 137c12 9 28 9 40 0'}
                  fill="none"
                  stroke="#78bd91"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <rect x="116" y="174" width="48" height="6" rx="3" fill="#c77945" opacity="0.9" />
                {/* Brazos y herramienta */}
                <path d="M82 169c-23 3-31 15-37 30" fill="none" stroke="#3a3738" strokeWidth="9" strokeLinecap="round" />
                <path d="M198 169c23 3 31 15 37 30" fill="none" stroke="#3a3738" strokeWidth="9" strokeLinecap="round" />
                <path d="M55 195l-10 5M225 195l10 5" stroke="#c77945" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>

            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ad7049]">Taller de reparación</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Bienvenido de nuevo</h1>
              <p className="mt-1 text-xs text-[#817b76]">Ingresa a tu cuenta para continuar</p>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className={LABEL}>Correo electrónico</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@domain.com"
                  className={CAMPO}
                />
              </div>

              <div>
                <label htmlFor="password" className={LABEL}>Contraseña</label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={verPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onFocus={() => setPasswordActive(true)}
                    onBlur={() => setPasswordActive(false)}
                    placeholder="••••••••"
                    className={`${CAMPO} pr-10`}
                  />
                  <button
                    type="button"
                    // evita que el input pierda el foco al pulsar el ojo
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setVerPassword((v) => !v)}
                    aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#817b76] transition hover:bg-[#efede9] hover:text-[#302d2e]"
                  >
                    {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-[#f8e9e5] px-3 py-2.5 text-xs text-[#a74838]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="mt-6 w-full rounded-xl bg-[#c77945] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(194,121,59,0.22)] transition hover:bg-[#ad6338] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </button>

            <p className="mt-5 text-center text-[11px] text-[#aaa39b]">
              Acceso exclusivo para el personal del taller.
            </p>
          </form>
        </section>
      </div>
    </main>
    <Footer variante="oscuro" fijo />
    </div>
  );
}
