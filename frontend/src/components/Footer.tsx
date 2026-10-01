export function Footer({ className = '' }: { className?: string }) {
  return (
    <footer className={`px-2 py-5 text-center text-[11px] tracking-wide text-[#817b76] ${className}`}>
      <p>
        Desarrollado por <span className="font-semibold text-[#ad7049]">Harold Ducon</span>
        <span className="mx-2 text-[#c9c4be]" aria-hidden="true">·</span>
        © {new Date().getFullYear()} <span className="font-semibold text-[#302d2e]">Tech Tinker</span>
        <span className="hidden sm:inline">. Todos los derechos reservados.</span>
      </p>
    </footer>
  );
}