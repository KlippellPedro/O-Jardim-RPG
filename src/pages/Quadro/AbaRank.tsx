import { useEffect, useState } from 'react';
import { Coins, Crown, Dices, Flame, PiggyBank, Skull, Sparkles, Swords } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { engajamentoApi, type IRank, type PeriodoRank } from '../../services/engajamentoApi';

const ICONES: Record<string, LucideIcon> = {
  rei_do_vinte: Crown,
  azarao: Skull,
  mao_pesada: Swords,
  maquina_de_dano: Flame,
  gastador: Coins,
  pe_de_meia: PiggyBank,
  rolador: Dices,
  conjurador: Sparkles,
};

const CORES: Record<string, string> = {
  rei_do_vinte: '#facc15', azarao: '#a78bfa', mao_pesada: '#fb923c', maquina_de_dano: '#ef4444',
  gastador: '#f59e0b', pe_de_meia: '#4ade80', rolador: '#60a5fa', conjurador: '#e879f9',
};

const PERIODOS: Array<{ valor: PeriodoRank; rotulo: string }> = [
  { valor: 'campanha', rotulo: 'A campanha toda' },
  { valor: 'ultima', rotulo: 'Última sessão' },
  { valor: 'atual', rotulo: 'Ao vivo agora' },
];

const numero = (valor: number) => valor.toLocaleString('pt-BR');

export const AbaRank = ({ campanhaId }: { campanhaId: string }) => {
  const [periodo, setPeriodo] = useState<PeriodoRank>('campanha');
  const [rank, setRank] = useState<IRank | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    setRank(null);
    engajamentoApi.rank(campanhaId, periodo)
      .then((resposta) => { if (ativo) { setRank(resposta); setErro(''); } })
      .catch((falha) => { if (ativo) setErro(falha instanceof Error ? falha.message : 'Não foi possível montar o rank.'); });
    return () => { ativo = false; };
  }, [campanhaId, periodo]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm leading-6 text-gray-400">Números da mesa, em tom de brincadeira. Ninguém ganha nada além do título e da fama de contar essa história depois.</p>
        <div className="flex gap-1.5" role="group" aria-label="Período do rank">
          {PERIODOS.map((item) => (
            <button key={item.valor} type="button" aria-pressed={periodo === item.valor} onClick={() => setPeriodo(item.valor)} className={`min-h-10 rounded-full border px-4 text-xs font-bold ${periodo === item.valor ? 'border-[#c7a44c]/50 bg-[#c7a44c]/15 text-[#f3dc8f]' : 'border-white/10 text-gray-400 hover:text-white'}`}>{item.rotulo}</button>
          ))}
        </div>
      </div>

      {erro ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{erro}</p> : null}
      {!rank && !erro ? <p className="py-10 text-center text-sm text-gray-500" aria-busy="true">Contando os dados...</p> : null}

      {rank && rank.titulos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-gray-500">
          {periodo === 'campanha' ? 'Ainda não há números para premiar. Role uns dados e volte aqui.' : periodo === 'atual' ? 'Não há sessão ao vivo com números ainda.' : 'Nenhuma sessão encerrada com números ainda.'}
        </p>
      ) : null}

      {rank && rank.titulos.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {rank.titulos.map((titulo) => {
            const Icone = ICONES[titulo.chave] ?? Crown;
            const cor = CORES[titulo.chave] ?? '#c7a44c';
            return (
              <article key={titulo.chave} className="rounded-2xl border p-5" style={{ borderColor: `${cor}55`, background: `linear-gradient(160deg, ${cor}14, transparent)` }}>
                <Icone size={26} style={{ color: cor }} aria-hidden="true" />
                <h3 className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: cor }}>{titulo.titulo}</h3>
                <p className="mt-1 text-xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{titulo.nome}</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">{titulo.frase}</p>
                {titulo.empatados > 1 ? <p className="mt-2 text-[11px] text-gray-500">Empate com mais {titulo.empatados - 1}.</p> : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {rank && rank.jogadores.length ? (
        <section aria-label="Tabela da mesa" className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0f0e15]">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <th className="px-4 py-3">Personagem</th>
                <th className="px-3 py-3 text-right">Rolagens</th>
                <th className="px-3 py-3 text-right">20 nat.</th>
                <th className="px-3 py-3 text-right">1 nat.</th>
                <th className="px-3 py-3 text-right">Maior golpe</th>
                <th className="px-3 py-3 text-right">Lunaris gastos</th>
              </tr>
            </thead>
            <tbody>
              {rank.jogadores.map((jogador) => (
                <tr key={jogador.personagem_id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2.5 font-bold text-white">{jogador.nome}</td>
                  <td className="px-3 py-2.5 text-right text-gray-300">{numero(jogador.rolagens)}</td>
                  <td className="px-3 py-2.5 text-right text-yellow-300">{numero(jogador.criticos)}</td>
                  <td className="px-3 py-2.5 text-right text-violet-300">{numero(jogador.falhas)}</td>
                  <td className="px-3 py-2.5 text-right text-orange-300">{numero(jogador.dano_maximo)}</td>
                  <td className="px-3 py-2.5 text-right text-amber-300">{numero(jogador.lunaris_gastos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
};
