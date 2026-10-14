import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Vault } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsPanelStore } from '../../store/useSettingsPanelStore';
import { useCofre } from '../../hooks/useCofre';
import { Select } from '../../components/ui/Select';
import { TransferirModal } from '../../components/Cofre/TransferirModal';
import { CofreBancario } from './CofreBancario';
import { CofreRecompensas } from './CofreRecompensas';
import { personagemDoCofre } from './cofre';

type Alvo =
  | { tipo: 'moeda'; moeda: string; saldo: number }
  // 'banco' é o Cofre bancário do Banqueiro (tabela do bot, à esquerda na
  // tela): outro estoque, outra rota - não some do cofre de recompensas.
  | { tipo: 'banco'; moeda: string; saldo: number }
  | { tipo: 'item'; itemId: string; titulo: string; quantidade: number };

/**
 * O Cofre: a única tela para o que o Discord guardou para a pessoa nesta campanha. Reúne o cofre de recompensas
 * (itens e moedas do bot, que o site entrega à ficha) e o status do Cofre bancário do Banqueiro. O vínculo com o
 * Discord se faz em Minha Conta; daqui só se abre aquele painel.
 */
export function CofrePage() {
  const campanhaAtiva = useAuthStore((estado) => estado.campanhaAtiva);
  const abrirPainel = useSettingsPanelStore((estado) => estado.openPanel);
  const {
    itens, moedas, vinculo, personagens, nivel, isLoading, error,
    transferirItem, transferirMoeda, sacarDoBanco,
  } = useCofre(campanhaAtiva?.id);

  const [personagemId, setPersonagemId] = useState<string>('');
  const [alvo, setAlvo] = useState<Alvo | null>(null);

  // O destino já vem escolhido quando só há uma resposta óbvia (único personagem ou o ativo); a escolha da pessoa nunca é trocada.
  useEffect(() => {
    setPersonagemId((atual) => personagemDoCofre(atual, personagens, campanhaAtiva?.personagem_ativo_id));
  }, [personagens, campanhaAtiva?.personagem_ativo_id]);

  const personagemSelecionado = personagens.find((personagem) => personagem.id === personagemId);
  const vincularDiscord = () => abrirPainel('conta');

  if (!campanhaAtiva) {
    return (
      <div className="app-page flex items-center justify-center text-gray-400">
        Selecione uma campanha ativa para ver o cofre.
      </div>
    );
  }

  return (
    <div role="main" className="app-page mx-auto flex max-w-[87.5rem] flex-col">

      <header className="mb-8 flex flex-col gap-5 border-b border-white/5 pb-8 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary" aria-hidden="true">
            <Vault size={28} />
          </span>
          <div className="min-w-0">
            <h1 className="flex items-center gap-3 text-[clamp(1.75rem,6vw,2.75rem)] font-bold leading-tight tracking-wider text-primary" style={{ fontFamily: 'Cinzel, serif' }}>
              Cofre
              {isLoading && <Loader2 size={20} className="shrink-0 animate-spin text-gray-500" aria-label="Carregando" />}
            </h1>
            <p className="max-w-2xl text-gray-400">
              Recompensas do Discord esperando entrega e o status do seu Cofre bancário no Banqueiro.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3" role="status">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${vinculo ? 'bg-emerald-400' : 'bg-gray-600'}`} aria-hidden="true" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-white">{vinculo ? 'Discord vinculado' : 'Discord não vinculado'}</p>
            {vinculo?.discord_nome ? <p className="truncate text-xs text-gray-500">@{vinculo.discord_nome}</p> : null}
          </div>
          <button
            type="button"
            onClick={vincularDiscord}
            className="ml-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-gray-300 transition-colors hover:border-primary/40 hover:text-primary"
          >
            {vinculo ? 'Gerenciar' : 'Vincular'}
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {personagens.length > 0 ? (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0f0e15] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Enviar para</p>
            <p className="text-xs text-gray-500">O que sair do cofre vai direto para a ficha deste personagem.</p>
          </div>
          <Select
            value={personagemId}
            onChange={setPersonagemId}
            placeholder="Escolha um personagem"
            ariaLabel="Personagem que recebe o que sair do cofre"
            options={personagens.map((personagem) => ({ value: personagem.id, label: personagem.nome }))}
            className="w-full sm:w-64"
          />
        </div>
      ) : !isLoading ? (
        <p className="mb-6 rounded-2xl border border-white/10 bg-[#0f0e15] p-4 text-sm text-gray-400">
          Você ainda não tem um personagem nesta campanha. <Link to="/ficha" className="font-semibold text-primary hover:underline">Crie um na Ficha</Link> para poder enviar o que está no cofre.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <CofreBancario
            vinculo={vinculo}
            nivel={nivel}
            personagemNome={personagemSelecionado?.nome ?? ''}
            onSacar={(moeda, saldo) => setAlvo({ tipo: 'banco', moeda, saldo })}
            onVincular={vincularDiscord}
          />
        </div>
        <div className="xl:col-span-2">
          <CofreRecompensas
            itens={itens}
            moedas={moedas}
            discordVinculado={Boolean(vinculo)}
            personagemNome={personagemSelecionado?.nome ?? ''}
            onEnviarMoeda={(moeda) => setAlvo({ tipo: 'moeda', moeda: moeda.moeda, saldo: moeda.saldo })}
            onEnviarItem={(item) => setAlvo({ tipo: 'item', itemId: item.item_id, titulo: item.titulo, quantidade: item.quantidade })}
            onVincular={vincularDiscord}
          />
        </div>
      </div>

      {alvo && personagemSelecionado && (
        <TransferirModal
          isOpen={!!alvo}
          onClose={() => setAlvo(null)}
          tipo={alvo.tipo}
          titulo={alvo.tipo === 'item' ? alvo.titulo : alvo.moeda}
          disponivel={alvo.tipo === 'item' ? alvo.quantidade : alvo.saldo}
          personagemNome={personagemSelecionado.nome}
          onConfirm={(quantidade) => {
            if (alvo.tipo === 'item') return transferirItem(personagemId, alvo.itemId, quantidade);
            if (alvo.tipo === 'banco') return sacarDoBanco(personagemId, alvo.moeda, quantidade);
            return transferirMoeda(personagemId, alvo.moeda, quantidade);
          }}
        />
      )}
    </div>
  );
}
