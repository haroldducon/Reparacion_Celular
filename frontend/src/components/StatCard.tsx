import { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  acento,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  acento?: 'cobre' | 'circuito' | 'oxido';
  icon?: LucideIcon;
}) {
  const tono = acento ?? 'cobre';
  const colorAcento = {
    cobre: 'text-cobre',
    circuito: 'text-circuito',
    oxido: 'text-oxido',
  }[tono];
  const bgAcento = {
    cobre: 'bg-cobre/10',
    circuito: 'bg-circuito/10',
    oxido: 'bg-oxido/10',
  }[tono];
  const barraAcento = {
    cobre: 'bg-cobre',
    circuito: 'bg-circuito',
    oxido: 'bg-oxido',
  }[tono];

  return (
    <div className="group relative min-w-0 overflow-hidden rounded-2xl bg-[#f8f7f5] px-3 py-3 text-[#302d2e] shadow-[0_6px_18px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5 sm:px-3.5">
      <div className={`absolute inset-y-0 left-0 w-1 ${barraAcento}`} />
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-[#716d69]">{label}</p>
        {Icon && (
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${bgAcento} ${colorAcento}`}>
            <Icon size={14} strokeWidth={2.25} />
          </div>
        )}
      </div>
      <p className={`mt-2 font-display text-2xl font-semibold leading-none ${colorAcento}`}>{value}</p>
    </div>
  );
}
