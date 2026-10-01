interface FooterProps {
  /** 'claro' para fondos claros (panel interno), 'oscuro' para fondos oscuros (login, seguimiento) */
  variante?: 'claro' | 'oscuro';
  className?: string;
}

export function Footer({ variante = 'claro', className = '' }: FooterProps) {
  const oscuro = variante === 'oscuro';

  return (
    <footer
      className={`px-2 py-5 text-center text-[11px] tracking-wide ${
        oscuro ? 'text-white/45' : 'text-[#817b76]'
      } ${className}`}
    >
      <p>
        Desarrollado por{' '}
        <span className={`font-semibold ${oscuro ? 'text-[#e7a16a]' : 'text-[#ad7049]'}`}>Harold Ducon</span>
        <span className={`mx-2 ${oscuro ? 'text-white/25' : 'text-[#c9c4be]'}`} aria-hidden="true">
          ·
        </span>
        © {new Date().getFullYear()}{' '}
        <span className={`font-semibold ${oscuro ? 'text-white/80' : 'text-[#302d2e]'}`}>Tech Tinker</span>
        <span className="hidden sm:inline">. Todos los derechos reservados.</span>
      </p>
    </footer>
  );
}