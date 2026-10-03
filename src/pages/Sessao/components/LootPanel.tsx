import React, { useState } from 'react';
import { ChevronDown, Coins, Dices, Gem, Gift, RefreshCw, ScrollText } from 'lucide-react';
import { useSessaoStore, type EntidadeIniciativa } from '../../../store/useSessaoStore';
import { sessaoApi, type TabelaDeLoot } from '../../../services/sessaoApi';

interface LootPanelProps {
  entity: EntidadeIniciativa;
  /** Personagens de jogador da cena: são eles que podem receber o loot. */
  jogadores: EntidadeIniciativa[];
}

const COR_RARIDADE: Record<string, string> = {
  comum: 'text-white/60',
  incomum: 'text-emerald-200',
  raro: 'text-sky-200',
  epico: 'text-fuchsia-200',
  lendario: 'text-amber-200',
};

/** O catálogo grava a raridade sem acento e em minúsculas ("epico"). */
const corDaRaridade = (raridade: string | null | undefined, padrao: string) => (
  COR_RARIDADE[(raridade ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()] ?? padrao
);

/**
 * Loot da criatura, só para quem comanda a mesa. O servidor rola cada linha
 * (d100 contra a chance) e guarda o resultado; o Mestre escolhe quem leva o
 * quê e entrega. Item cai no inventário e moeda na carteira do personagem.
 */
export const LootPanel: React.FC<LootPanelProps> = ({ entity, jogadores }) => {
  const { campanhaId, rolarLoot, entregarLoot } = useSessaoStore();
  const [aberto, setAberto] = useState(false);
  const [tabela, setTabela] = useState<TabelaDeLoot | null>(null);
  const [destino, setDestino] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const loot = entity.loot ?? null;
  const pendentes = loot?.linhas.filter((linha) => !linha.entregue_para) ?? [];
  const algumEntregue = !!loot?.linhas.some((linha) => linha.entregue_para);
  const escolhidos = pendentes.filter((linha) => destino[linha.linha]);

  const executar = async (acao: () => Promise<void>, falha: string) => {
    if (busy) return;
    setBusy(true);
    setErro(null);
    setAviso(null);
    try {
      await acao();
    } catch (error) {
      setErro(error instanceof Error && error.message ? error.message : falha);
    } finally {
      setBusy(false);
    }
  };

  const verTabela = () => void executar(async () => {
    if (!campanhaId || !entity.monstroId) return;
    setTabela(tabela ? null : await sessaoApi.tabelaDeLoot(campanhaId, entity.monstroId));
  }, 'Não foi possível abrir a tabela de loot.');

  const rolar = (refazer: boolean) => void executar(async () => {
    await rolarLoot(entity.id, refazer);
    setDestino({});
  }, 'Não foi possível rolar o loot.');

  const entregar = () => void executar(async () => {
    const entregas = escolhidos.map((linha) => ({ linha: linha.linha, personagem_id: destino[linha.linha] }));
    await entregarLoot(entity.id, entregas);
    setDestino({});
    setAviso(`${entregas.length} ${entregas.length === 1 ? 'coisa entregue' : 'coisas entregues'}.`);
  }, 'Não foi possível entregar o loot.');

  const tudoPara = (personagemId: string) => {
    setDestino(Object.fromEntries(pendentes.map((linha) => [linha.linha, personagemId])));
  };

  const seletor = 'h-8 rounded-md border border-white/10 bg-black/40 px-2 text-[11px] text-white/80 outline-none focus:border-[#c7a44c]/50';

  return (
    <div className="border-t border-white/[0.06]">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-[#e3c363]/80 hover:text-[#e3c363]"
      >
        <Gem size={12} />
        <span className="flex-1">
          Loot
          {loot ? ` · ${pendentes.length ? `${pendentes.length} para entregar` : 'tudo entregue'}` : ' · ainda não rolado'}
        </span>
        <ChevronDown size={13} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto ? (
        <div className="space-y-2 px-3 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {!loot ? (
              <button type="button" disabled={busy} onClick={() => rolar(false)} className="flex items-center gap-1.5 rounded-md bg-[#c7a44c] px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-50">
                {busy ? <RefreshCw size={12} className="animate-spin" /> : <Dices size={12} />} Rolar loot
              </button>
            ) : !algumEntregue ? (
              <button type="button" disabled={busy} onClick={() => rolar(true)} className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-white/55 hover:text-white disabled:opacity-50" title="Só dá enquanto nada foi entregue">
                <Dices size={12} /> Rolar de novo
              </button>
            ) : null}
            <button type="button" disabled={busy} onClick={verTabela} className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-white/55 hover:text-white disabled:opacity-50">
              <ScrollText size={12} /> {tabela ? 'Esconder tabela' : 'Ver tabela'}
            </button>
          </div>

          {tabela ? (
            <ul className="space-y-0.5 rounded-lg border border-white/[0.06] bg-black/20 p-2 text-[11px]">
              {tabela.itens.map((item) => (
                <li key={item.item_id} className="flex items-baseline gap-2">
                  <span className="w-9 shrink-0 text-right font-mono text-white/40">{item.chance}%</span>
                  <span className={`min-w-0 flex-1 truncate ${corDaRaridade(item.raridade, 'text-white/60')}`}>
                    {item.titulo}{item.exclusivo ? ' ★' : ''}
                  </span>
                  <span className="shrink-0 text-white/35">{item.quantidade}</span>
                </li>
              ))}
              {tabela.moedas ? (
                <li className="flex items-baseline gap-2">
                  <span className="w-9 shrink-0 text-right font-mono text-white/40">{tabela.moedas.chance}%</span>
                  <span className="flex-1 text-amber-100/70">{tabela.moedas.moeda}</span>
                  <span className="shrink-0 text-white/35">{tabela.moedas.dados}</span>
                </li>
              ) : null}
              <li className="pt-1 text-[10px] text-white/30">★ só cai desta criatura e não vende na Loja.</li>
            </ul>
          ) : null}

          {loot ? (
            loot.linhas.length === 0 ? (
              <p className="text-[11px] text-white/40">Nada caiu desta vez.</p>
            ) : (
              <>
                <ul className="space-y-1">
                  {loot.linhas.map((linha) => (
                    <li key={linha.linha} className="flex items-center gap-2 rounded-md bg-white/[0.03] px-2 py-1.5 text-[11px]">
                      {linha.tipo === 'moedas' ? <Coins size={12} className="shrink-0 text-amber-200/70" /> : <Gift size={12} className="shrink-0 text-white/40" />}
                      <span className={`min-w-0 flex-1 truncate ${corDaRaridade(linha.raridade, 'text-white/75')}`} title={`d100 ${linha.rolagem} contra ${linha.chance}%`}>
                        {linha.quantidade}x {linha.titulo}
                      </span>
                      {linha.entregue_para ? (
                        <span className="shrink-0 text-emerald-200/70">com {linha.entregue_para.nome}</span>
                      ) : (
                        <select
                          value={destino[linha.linha] ?? ''}
                          onChange={(evento) => setDestino((atual) => ({ ...atual, [linha.linha]: evento.target.value }))}
                          aria-label={`Quem leva ${linha.titulo}`}
                          className={`${seletor} max-w-[8.5rem]`}
                        >
                          <option value="">Quem leva?</option>
                          {jogadores.map((jogador) => <option key={jogador.id} value={jogador.personagemId ?? ''}>{jogador.nome}</option>)}
                        </select>
                      )}
                    </li>
                  ))}
                </ul>

                {pendentes.length ? (
                  jogadores.length ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <select value="" onChange={(evento) => evento.target.value && tudoPara(evento.target.value)} aria-label="Dar tudo para" className={seletor}>
                        <option value="">Tudo para...</option>
                        {jogadores.map((jogador) => <option key={jogador.id} value={jogador.personagemId ?? ''}>{jogador.nome}</option>)}
                      </select>
                      <button
                        type="button"
                        disabled={busy || escolhidos.length === 0}
                        onClick={entregar}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                      >
                        {busy ? <RefreshCw size={12} className="animate-spin" /> : <Gift size={12} />}
                        Entregar{escolhidos.length ? ` (${escolhidos.length})` : ''}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-white/40">Ponha os personagens dos jogadores na cena para entregar o loot.</p>
                  )
                ) : null}
              </>
            )
          ) : null}

          {aviso ? <p role="status" className="rounded-md bg-emerald-400/10 px-2 py-1.5 text-[11px] text-emerald-200">{aviso}</p> : null}
          {erro ? <p role="alert" className="rounded-md bg-red-400/10 px-2 py-1.5 text-[11px] text-red-200">{erro}</p> : null}
        </div>
      ) : null}
    </div>
  );
};
