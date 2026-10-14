import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { abaPorTecla } from './abas';

export interface IAbaDoPainel<T extends string = string> {
  id: T;
  rotulo: string;
  icone: LucideIcon;
  /** O número vermelho da aba: avisos novos, pedidos esperando. */
  contagem?: number;
}

type TomDoPainel = 'ouro' | 'roxo';

const TONS: Record<TomDoPainel, { icone: string; abaAtiva: string }> = {
  ouro: { icone: 'border-primary/30 bg-primary/10 text-primary', abaAtiva: 'border-primary text-primary' },
  roxo: { icone: 'border-purple-500/30 bg-purple-500/10 text-purple-400', abaAtiva: 'border-purple-500 text-purple-400' },
};

interface IPainelShellProps<T extends string> {
  icone: LucideIcon;
  titulo: string;
  subtitulo?: ReactNode;
  /** Canto direito do cabeçalho: o seletor de campanha, por exemplo. */
  acoes?: ReactNode;
  /** Faixa entre o cabeçalho e as abas (os números da Administração). */
  resumo?: ReactNode;
  abas: IAbaDoPainel<T>[];
  abaAtiva: T;
  aoTrocarAba: (id: T) => void;
  tom?: TomDoPainel;
  /** `larga` é para painéis de tabela (Administração). */
  largura?: 'normal' | 'larga';
  children: ReactNode;
}

/**
 * A moldura dos painéis de gestão (Mestre, Criador e Administração): mesmo cabeçalho, mesmas abas, com número vermelho
 * onde há recado esperando e navegação por setas. O que muda de um para o outro é só o conteúdo de cada aba.
 */
export function PainelShell<T extends string>({
  icone: Icone,
  titulo,
  subtitulo,
  acoes,
  resumo,
  abas,
  abaAtiva,
  aoTrocarAba,
  tom = 'ouro',
  largura = 'normal',
  children,
}: IPainelShellProps<T>) {
  const base = useId();
  const botoes = useRef<Record<string, HTMLButtonElement | null>>({});
  const aparencia = TONS[tom];

  // Em tela estreita a lista de abas rola de lado: a aba aberta (um link com ?aba=avisos, por exemplo) precisa estar à vista.
  useEffect(() => {
    const aba = botoes.current[abaAtiva];
    const lista = aba?.parentElement;
    if (!aba || !lista || lista.scrollWidth <= lista.clientWidth) return;
    const dentroDaLista = aba.getBoundingClientRect().left - lista.getBoundingClientRect().left + lista.scrollLeft;
    lista.scrollTo({ left: Math.max(0, dentroDaLista - (lista.clientWidth - aba.clientWidth) / 2) });
  }, [abaAtiva]);

  const aoTeclar = (evento: KeyboardEvent<HTMLButtonElement>) => {
    const proxima = abaPorTecla(abas.map((aba) => aba.id), abaAtiva, evento.key);
    if (!proxima) return;
    evento.preventDefault();
    botoes.current[proxima]?.focus();
    aoTrocarAba(proxima);
  };

  return (
    <div role="main" className={`app-page mx-auto ${largura === 'larga' ? 'max-w-[87.5rem]' : 'max-w-7xl'}`}>
      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${aparencia.icone}`} aria-hidden="true">
            <Icone size={28} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[clamp(1.75rem,6vw,2.75rem)] font-bold leading-tight text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              {titulo}
            </h1>
            {subtitulo ? <p className="mt-1 text-base text-gray-400 sm:text-lg">{subtitulo}</p> : null}
          </div>
        </div>
        {acoes ? <div className="w-full shrink-0 md:w-auto">{acoes}</div> : null}
      </header>

      {resumo}

      <div
        role="tablist"
        aria-label={`Seções do ${titulo}`}
        className="horizontal-scroll mb-6 flex gap-4 overflow-x-auto border-b border-white/10 pb-1 custom-scrollbar"
      >
        {abas.map((aba) => {
          const ativa = aba.id === abaAtiva;
          const Aba = aba.icone;
          const contagem = aba.contagem ?? 0;
          return (
            <button
              key={aba.id}
              ref={(elemento) => { botoes.current[aba.id] = elemento; }}
              type="button"
              role="tab"
              id={`${base}-aba-${aba.id}`}
              aria-selected={ativa}
              aria-controls={ativa ? `${base}-painel-${aba.id}` : undefined}
              tabIndex={ativa ? 0 : -1}
              onClick={() => aoTrocarAba(aba.id)}
              onKeyDown={aoTeclar}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 pb-2 text-xs font-bold uppercase tracking-widest transition-colors sm:text-sm ${
                ativa ? aparencia.abaAtiva : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Aba size={16} />
              {aba.rotulo}
              {contagem > 0 ? (
                <span
                  className="min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white"
                  role="img"
                  aria-label={`${contagem} ${contagem === 1 ? 'novo' : 'novos'}`}
                >
                  {contagem > 99 ? '99+' : contagem}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`${base}-painel-${abaAtiva}`} aria-labelledby={`${base}-aba-${abaAtiva}`}>
        {children}
      </div>
    </div>
  );
}

/** O cartão escuro em que quase toda aba de painel se apoia. */
export function PainelCartao({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative flex min-h-[min(600px,70dvh)] flex-col rounded-3xl border border-white/10 bg-[#0a090e] p-5 shadow-2xl sm:p-6 md:p-8 ${className}`}>
      {children}
    </div>
  );
}
