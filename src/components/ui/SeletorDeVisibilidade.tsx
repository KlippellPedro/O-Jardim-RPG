import { useState } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

export type TomDeVisibilidade = 'aberto' | 'retido' | 'oculto';

export interface IOpcaoDeVisibilidade<T extends string> {
  id: T;
  rotulo: string;
  icone: LucideIcon;
  /** Aparece como dica ao passar o mouse: o que os jogadores enxergam nesta opção. */
  ajuda: string;
  tom: TomDeVisibilidade;
}

// As classes ficam escritas por inteiro para o Tailwind enxergá-las.
const TONS: Record<TomDeVisibilidade, string> = {
  aberto: 'bg-emerald-400/15 text-emerald-200',
  retido: 'bg-amber-400/15 text-amber-200',
  oculto: 'bg-red-400/15 text-red-200',
};

interface ISeletorDeVisibilidadeProps<T extends string> {
  opcoes: IOpcaoDeVisibilidade<T>[];
  valor: T;
  /** Grava a escolha. Rejeitar a promessa mostra o erro ao lado e mantém o valor de antes. */
  onChange: (proximo: T) => Promise<void>;
  /** O que o grupo controla, para leitor de tela ("Visibilidade para os jogadores"). */
  rotulo?: string;
}

/**
 * Escolha de quanto os jogadores enxergam de uma entrada, na própria página da entrada. Cada opção é um botão de
 * um grupo de rádio; enquanto grava, o grupo fica parado para uma troca não atropelar a outra.
 */
export function SeletorDeVisibilidade<T extends string>({ opcoes, valor, onChange, rotulo = 'Visibilidade para os jogadores' }: ISeletorDeVisibilidadeProps<T>) {
  const [gravando, setGravando] = useState<T | null>(null);
  const [erro, setErro] = useState('');

  const escolher = async (proximo: T) => {
    if (proximo === valor || gravando) return;
    setGravando(proximo);
    setErro('');
    try {
      await onChange(proximo);
    } catch (falha) {
      setErro(falha instanceof Error && falha.message ? falha.message : 'Não foi possível mudar a visibilidade.');
    } finally {
      setGravando(null);
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span role="radiogroup" aria-label={rotulo} className="inline-flex rounded-full border border-white/15 bg-black/30 p-0.5">
        {opcoes.map((opcao) => {
          const Icone = opcao.icone;
          const ativa = opcao.id === valor;
          return (
            <button
              key={opcao.id}
              type="button"
              role="radio"
              aria-checked={ativa}
              title={opcao.ajuda}
              disabled={gravando !== null}
              onClick={() => void escolher(opcao.id)}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:cursor-wait ${ativa ? TONS[opcao.tom] : 'text-gray-400 hover:text-white'}`}
            >
              {gravando === opcao.id ? <Loader2 size={12} className="animate-spin" /> : <Icone size={12} />}
              {opcao.rotulo}
            </button>
          );
        })}
      </span>
      {erro ? <span role="alert" className="text-[11px] text-red-300">{erro}</span> : null}
    </span>
  );
}
