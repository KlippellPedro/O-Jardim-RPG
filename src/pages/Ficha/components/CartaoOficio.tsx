import { useState } from 'react';
import { Briefcase, HandCoins } from 'lucide-react';
import { Select } from '../../../components/ui/Select';
import {
  FAIXAS,
  OFICIOS,
  formatarLunaris,
  linhaDeRenda,
  oficioDaFicha,
  rendaDoTrabalho,
  type IOficioDaFicha,
} from '../../../services/oficios';

interface CartaoOficioProps {
  /** `ficha.oficio` como está salvo. */
  oficio: unknown;
  /** `ficha.pericias`: o grau numa perícia do ofício decide a linha da renda. */
  pericias?: Record<string, unknown> | null;
  /** Grava o ofício na ficha. Só aparece para ficha que ainda não tem um. */
  onEscolher?: (oficio: IOficioDaFicha) => void;
  /** Credita os Lunaris dos dias trabalhados na carteira. */
  onTrabalhar: (lunaris: number) => void;
}

const DIAS_MAXIMOS = 365;

/**
 * O ofício de antes da aventura, dentro da Carteira: quanto ele rende e o
 * botão de registrar dias de trabalho do tempo entre aventuras. Entra só a
 * sobra do dia (o resto paga o custo de vida), como ajuste de saldo que fica
 * no extrato para o Mestre conferir.
 */
export function CartaoOficio({ oficio, pericias, onEscolher, onTrabalhar }: CartaoOficioProps) {
  const atual = oficioDaFicha(oficio);
  const [dias, setDias] = useState(1);

  if (!atual) {
    if (!onEscolher) return null;
    const opcoes = FAIXAS.flatMap((faixa) => OFICIOS
      .filter((item) => item.faixa === faixa.id)
      .map((item) => ({ value: item.id, label: `${item.titulo} (${faixa.titulo})` })));
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Briefcase size={14} className="shrink-0 text-gray-500" />
          <span className="min-w-0 flex-1">Sem ofício registrado. Ele diz quanto você ganha trabalhando entre aventuras.</span>
        </div>
        <Select
          value=""
          onChange={(id) => {
            const escolhido = OFICIOS.find((item) => item.id === id);
            if (escolhido) onEscolher({ id: escolhido.id, titulo: escolhido.titulo, faixa: escolhido.faixa });
          }}
          placeholder="Escolher ofício"
          options={opcoes}
          className="mt-2 w-full !py-1.5 text-xs"
        />
      </div>
    );
  }

  const { faixa, teto, falta } = linhaDeRenda(atual, pericias);
  const diasValidos = Math.min(DIAS_MAXIMOS, Math.max(1, Math.trunc(dias) || 1));
  const ganho = rendaDoTrabalho(faixa, diasValidos);

  return (
    <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-3 py-2">
      <div className="flex items-start gap-2">
        <Briefcase size={14} className="mt-0.5 shrink-0 text-amber-200/80" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-white">{atual.titulo}</p>
          <p className="text-[11px] text-gray-400">{teto.titulo}. {faixa.renda_rotulo}</p>
          {falta ? (
            <p className="text-[11px] text-amber-200/70">
              Por enquanto você ganha na linha {faixa.titulo}. A renda cheia pede grau {falta.rotulo}
              {falta.pericias.length ? ` em ${falta.pericias.join(' ou ')}` : ' numa perícia do ofício'}.
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-[11px] text-gray-400">
          Trabalhei
          <input
            type="number"
            min={1}
            max={DIAS_MAXIMOS}
            value={dias}
            onChange={(evento) => setDias(Number(evento.target.value))}
            aria-label="Dias de trabalho no ofício"
            className="w-12 rounded border border-white/10 bg-black/40 px-1 py-0.5 text-center font-mono text-xs text-white focus:outline-none"
          />
          {diasValidos === 1 ? 'dia' : 'dias'}
        </label>
        <button
          type="button"
          onClick={() => onTrabalhar(ganho)}
          disabled={ganho <= 0}
          title="Soma o ganho na carteira. Fica no extrato para o Mestre conferir."
          className="flex items-center gap-1 rounded-md border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[11px] font-bold text-amber-100 hover:bg-amber-300/20 disabled:opacity-40"
        >
          <HandCoins size={12} /> Receber {formatarLunaris(ganho)}
        </button>
      </div>
    </div>
  );
}
