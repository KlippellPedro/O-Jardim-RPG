import type { KeyboardEvent } from 'react';
import { Building2, Users } from 'lucide-react';
import { textoResumoBens, type ResumoBens } from '../../utils/resumoBens';

export type SecaoBens = 'meus' | 'equipe';

const SECOES: Array<{ id: SecaoBens; rotulo: string; dica: string; icone: typeof Users }> = [
  { id: 'meus', rotulo: 'Meus bens', dica: 'Só do personagem', icone: Building2 },
  { id: 'equipe', rotulo: 'Da equipe', dica: 'Bases e frota da campanha', icone: Users },
];

interface AbasBensProps {
  secao: SecaoBens;
  resumo: ResumoBens;
  onMudar: (secao: SecaoBens) => void;
}

/** Cabeçalho da aba Bens: separa o que é do personagem do que é do grupo e
 * já mostra o custo mensal, pra ninguém ter que rolar a página atrás disso. */
export const AbasBens = ({ secao, resumo, onMudar }: AbasBensProps) => {
  const teclado = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const proxima = secao === 'meus' ? 'equipe' : 'meus';
    onMudar(proxima);
    document.getElementById(`bens-tab-${proxima}`)?.focus();
  };

  return (
    <header className="space-y-3" data-tour="bens-cabecalho">
      <div role="tablist" aria-label="Tipo de bens" className="flex flex-wrap gap-2">
        {SECOES.map(({ id, rotulo, dica, icone: Icone }) => {
          const ativa = secao === id;
          return (
            <button
              key={id}
              id={`bens-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={ativa}
              aria-controls={`bens-painel-${id}`}
              tabIndex={ativa ? 0 : -1}
              onClick={() => onMudar(id)}
              onKeyDown={teclado}
              data-sfx="select"
              className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-colors ${
                ativa
                  ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                  : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
              }`}
            >
              <Icone size={15} aria-hidden="true" />
              <span>{rotulo}</span>
              <span className="hidden text-[11px] font-normal text-gray-500 sm:inline">{dica}</span>
            </button>
          );
        })}
      </div>
      {secao === 'meus' ? (
        <p className="text-sm text-gray-400" role="status">{textoResumoBens(resumo)}</p>
      ) : (
        <p className="text-sm text-gray-400">Pertencem ao grupo, não a uma ficha só. Quem pode mexer em cada um depende das permissões definidas pelo Mestre.</p>
      )}
    </header>
  );
};
