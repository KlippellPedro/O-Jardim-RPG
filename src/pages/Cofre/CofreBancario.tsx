import { Coins, Link2, Lock, Send, Shield, ShieldCheck, Sparkles } from 'lucide-react';
import type { IDiscordVinculo } from '../../services/discordApi';
import type { ICofreNivel } from '../../services/cofreApi';
import { BarraCapacidade, CustosUpgrade } from './cofreVisual';

interface ICofreBancarioProps {
  vinculo: IDiscordVinculo | null;
  nivel: ICofreNivel | null;
  /** Nome do personagem que recebe o saque; vazio quando ainda não há destino escolhido. */
  personagemNome: string;
  onSacar: (moeda: string, saldo: number) => void;
  onVincular: () => void;
}

/** O Cofre bancário do Banqueiro (o bot do Discord): nível, segurança e o que está guardado no banco. É outro estoque, com outra rota. */
export function CofreBancario({ vinculo, nivel, personagemNome, onSacar, onVincular }: ICofreBancarioProps) {
  return (
    <section className="rounded-2xl border border-white/5 bg-[#0f0e15] p-6" aria-label="Cofre bancário">
      <div className="mb-5 flex items-center gap-2">
        <Shield size={18} className="text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Cofre Bancário</h2>
      </div>

      {!vinculo ? (
        <div className="py-6 text-center">
          <Lock size={32} className="mx-auto mb-3 text-gray-700" />
          <p className="text-sm text-gray-400">Vincule sua conta do Discord para ver o seu Cofre bancário.</p>
          <button
            type="button"
            onClick={onVincular}
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/50 bg-primary/20 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white"
          >
            <Link2 size={15} /> Vincular o Discord
          </button>
        </div>
      ) : !nivel?.vinculado ? (
        <div className="py-6 text-center">
          <Lock size={32} className="mx-auto mb-3 text-gray-700" />
          <p className="text-sm text-gray-400">Esta campanha ainda não está ligada a um servidor do Discord, então o Banqueiro não tem um cofre seu para mostrar aqui.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Nível atual</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-gray-600">
                {nivel.tier_nivel ?? 1} de {nivel.tier_total ?? 15}
              </p>
            </div>
            <p className="text-2xl font-bold text-primary" style={{ fontFamily: 'Cinzel, serif' }}>
              {nivel.tier?.nome}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Reputação bancária: <span className="font-bold text-gray-300">{nivel.reputacao_bancaria ?? 1}</span>
            </p>
          </div>

          {nivel.tier && (
            <div className="space-y-3">
              <BarraCapacidade
                atual={nivel.itens_no_inventario ?? 0}
                maximo={nivel.tier.capacidade}
                label="Itens no cofre"
                ilimitado={nivel.tier.limite_pratico}
              />
              <BarraCapacidade
                atual={Math.max(...(nivel.saldos_guardados?.map((s) => s.saldo) ?? [0]), 0)}
                maximo={nivel.tier.capacidade_moeda}
                label="Maior saldo guardado"
                ilimitado={nivel.tier.limite_pratico}
              />
            </div>
          )}

          {nivel.proximo_tier && (
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-primary" />
              <div className="min-w-0 space-y-2 text-xs text-gray-300">
                <p>
                  Próximo nível: <span className="font-bold text-primary">{nivel.proximo_tier.nome}</span>
                  {' '}- {nivel.proximo_tier.limite_pratico
                    ? 'capacidade sem limite prático para itens e moedas.'
                    : `${nivel.proximo_tier.capacidade.toLocaleString('pt-BR')} itens e até ${nivel.proximo_tier.capacidade_moeda.toLocaleString('pt-BR')} por moeda.`}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Custo no Discord</span>
                  <CustosUpgrade custos={nivel.proximo_tier.custos} />
                </div>
                <p className="text-gray-500">
                  Exige {nivel.proximo_tier.reputacao_exigida.toLocaleString('pt-BR')} de reputação
                  {(nivel.reputacao_bancaria ?? 1) >= nivel.proximo_tier.reputacao_exigida
                    ? ' - requisito atingido.'
                    : ` - faltam ${(nivel.proximo_tier.reputacao_exigida - (nivel.reputacao_bancaria ?? 1)).toLocaleString('pt-BR')}.`}
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-white/5 pt-4">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Segurança</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-white">{nivel.seguranca?.nome}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-gray-600">
                {nivel.seguranca_nivel ?? 1} de {nivel.seguranca_total ?? 15}
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {Math.round((nivel.seguranca?.defesa ?? 0) * 100)}% de chance de frustrar um roubo ao seu cofre.
            </p>
            {nivel.proxima_seguranca && (
              <div className="mt-3 space-y-2 text-xs text-gray-600">
                <p>
                  Próximo nível: <span className="font-semibold text-gray-400">{nivel.proxima_seguranca.nome}</span>
                  {' '}· exige {nivel.proxima_seguranca.reputacao_exigida.toLocaleString('pt-BR')} de reputação.
                </p>
                <CustosUpgrade custos={nivel.proxima_seguranca.custos} />
              </div>
            )}
          </div>

          {nivel.saldos_guardados && nivel.saldos_guardados.length > 0 && (
            <div className="border-t border-white/5 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <Coins size={16} className="text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Guardado no banco</p>
              </div>
              <div className="space-y-1.5">
                {nivel.saldos_guardados.map((saldo) => (
                  <div key={saldo.moeda} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-400">{saldo.moeda}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{saldo.saldo.toLocaleString('pt-BR')}</span>
                      {saldo.saldo > 0 && (
                        <button
                          type="button"
                          onClick={() => onSacar(saldo.moeda, saldo.saldo)}
                          disabled={!personagemNome}
                          aria-label={personagemNome ? `Sacar ${saldo.moeda} para ${personagemNome}` : `Sacar ${saldo.moeda} (escolha um personagem)`}
                          title={personagemNome ? `Sacar ${saldo.moeda} para ${personagemNome}` : 'Escolha um personagem para sacar'}
                          className="rounded-lg bg-primary/20 p-1.5 text-primary transition-colors hover:bg-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Send size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-gray-600">
                {personagemNome
                  ? `O saque vai direto para ${personagemNome} e aparece no seu /extrato no Discord.`
                  : 'Escolha um personagem acima para sacar direto para a ficha.'}
              </p>
            </div>
          )}

          <p className="border-t border-white/5 pt-2 text-[11px] text-gray-600">
            Depósitos e melhorias continuam pelos comandos do Banqueiro no Discord.
          </p>
        </div>
      )}
    </section>
  );
}
