export const MOEDAS_VISUAIS: Record<string, { simbolo: string; classe: string }> = {
  Lunaris: { simbolo: '☾', classe: 'border-violet-400/25 bg-violet-400/10 text-violet-200' },
  Solares: { simbolo: '☉', classe: 'border-amber-400/25 bg-amber-400/10 text-amber-200' },
  'Fragmentos de Estrela': { simbolo: '✧', classe: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200' },
  'Créditos Sombrios': { simbolo: '♆', classe: 'border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200' },
};

const MOEDA_PADRAO = { simbolo: '◈', classe: 'border-white/10 bg-white/5 text-gray-300' };

export const visualDaMoeda = (moeda: string) => MOEDAS_VISUAIS[moeda] ?? MOEDA_PADRAO;

export function CustosUpgrade({ custos }: { custos: Record<string, number> }) {
  const entradas = Object.entries(custos ?? {}).filter(([, valor]) => valor > 0);
  if (!entradas.length) return <span className="text-gray-500">Sem custo</span>;
  return (
    <span className="inline-flex flex-wrap gap-1.5 align-middle">
      {entradas.map(([moeda, valor]) => (
        <span
          key={moeda}
          title={moeda}
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] ${visualDaMoeda(moeda).classe}`}
        >
          <span aria-hidden>{visualDaMoeda(moeda).simbolo}</span>
          <strong>{valor.toLocaleString('pt-BR')}</strong>
          <span className="font-sans opacity-80">{moeda}</span>
        </span>
      ))}
    </span>
  );
}

export function BarraCapacidade({
  atual,
  maximo,
  label,
  ilimitado = false,
}: {
  atual: number;
  maximo: number;
  label: string;
  ilimitado?: boolean;
}) {
  const percentual = ilimitado ? 100 : maximo > 0 ? Math.min(100, (atual / maximo) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span className="uppercase tracking-wider text-gray-400">{label}</span>
        <span className="font-mono text-gray-300">{atual} / {ilimitado ? '∞' : maximo}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-white/5 bg-black/50">
        <div
          className={`h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500 ${ilimitado ? 'opacity-30' : ''}`}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}
