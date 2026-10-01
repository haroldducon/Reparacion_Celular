interface FooterProps {
  /** 'claro' para el panel interno, 'oscuro' para login y seguimiento */
  variante?: 'claro' | 'oscuro';
  /** Mantiene la barra pegada al borde inferior de la pantalla mientras se hace scroll */
  fijo?: boolean;
  className?: string;
}

export function Footer({ variante = 'claro', fijo = false, className = '' }: FooterProps) {
  const oscuro = variante === 'oscuro';

  return (
    <footer
      className={`shrink-0 border-t backdrop-blur ${
        oscuro
          ? 'border-white/10 bg-[#1a1819]/95 text-white/50'
          : 'border-[#d9d4cd] bg-[#f4f1ec]/95 text-[#817b76]'
      } ${fijo ? 'sticky bottom-0 z-10' : ''} ${className}`}
    >
      <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-0.5 px-4 py-2 text-[11px] tracking-wide sm:flex-row sm:py-2.5">
        <p>
          © {new Date().getFullYear()}{' '}
          <span className={`font-semibold ${oscuro ? 'text-white/85' : 'text-[#302d2e]'}`}>Tech Tinker</span>
          <span className="hidden sm:inline">. Todos los derechos reservados.</span>
        </p>
        <p className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#c77945]" />
          Desarrollado por{' '}
          <span className={`font-semibold ${oscuro ? 'text-[#e7a16a]' : 'text-[#ad7049]'}`}>Harold Ducon</span>
        </p>
      </div>
    </footer>
  );
}
