import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Activity, Check, Coins, Flame, Footprints, Gem, Heart, Minus, Pencil, Plus, RefreshCw, RotateCcw, Shield, Sparkles, Star, Swords, Timer, X, Zap } from 'lucide-react';
import { sessaoApi, type BestiarioMonstro, type TabelaDeLoot } from '../../../services/sessaoApi';
import { useDialogAccessibility } from '../../../hooks/useDialogAccessibility';
import { PAPEIS_CRIATURA, type PapelCriatura } from '../../../services/curvaCriatura';
import { EditorLootCampanha } from './EditorLootCampanha';

interface CriaturaDetalheProps {
  /** Para buscar a tabela de loot, que só o Mestre recebe. */
  campanhaId?: string;
  monstro: BestiarioMonstro;
  familia?: string | null;
  cor: string;
  /** Sem `onAdicionar` a ficha vira só consulta, sem o rodapé de adicionar à cena. */
  adicionados?: number;
  ocupado?: boolean;
  onAdicionar?: (monstro: BestiarioMonstro, quantidade: number) => void;
  onFechar: () => void;
}

// Bloco de atributos de criatura (não é o bloco do personagem).
const ATRIBUTOS_CRIATURA: Array<[string, string]> = [
  ['forca', 'Força'],
  ['agilidade', 'Agilidade'],
  ['vigor', 'Vigor'],
  ['presenca', 'Presença'],
  ['intelecto', 'Intelecto'],
];

const RARIDADES: Record<string, string> = {
  comum: 'Comum', incomum: 'Incomum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário',
};

const COR_RARIDADE: Record<string, string> = {
  comum: 'text-white/75', incomum: 'text-emerald-200', raro: 'text-sky-200', epico: 'text-fuchsia-200', lendario: 'text-amber-200',
};

/** A chance pesa na cor: o que sempre cai fica verde, o raro vai esfriando. */
const corDaChance = (chance: number) => (
  chance >= 100 ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200'
    : chance >= 50 ? 'border-sky-300/30 bg-sky-300/10 text-sky-200'
      : chance >= 15 ? 'border-amber-300/30 bg-amber-300/10 text-amber-200'
        : 'border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-200'
);

const quantidadeLegivel = (texto: string) => (/^\d+$/.test(texto) ? `${texto}x` : texto);

/** Tabela de loot da criatura: o que pode cair e com que chance. */
const SecaoLoot = ({ campanhaId, monstroId }: { campanhaId: string; monstroId: string }) => {
  const [tabela, setTabela] = useState<TabelaDeLoot | null>(null);
  const [erro, setErro] = useState(false);
  const [editando, setEditando] = useState(false);
  const [voltando, setVoltando] = useState(false);
  const carregar = React.useCallback(() => {
    let cancelado = false;
    setErro(false);
    sessaoApi.tabelaDeLoot(campanhaId, monstroId)
      .then((resposta) => { if (!cancelado) setTabela(resposta); })
      .catch(() => { if (!cancelado) setErro(true); });
    return () => { cancelado = true; };
  }, [campanhaId, monstroId]);
  useEffect(() => {
    setTabela(null);
    setEditando(false);
    return carregar();
  }, [carregar]);

  const voltarParaOficial = async () => {
    if (!window.confirm('Voltar esta criatura para a tabela de loot oficial nesta campanha?')) return;
    setVoltando(true);
    try {
      await sessaoApi.restaurarTabelaDeLoot(campanhaId, monstroId);
      carregar();
    } catch {
      setErro(true);
    } finally {
      setVoltando(false);
    }
  };

  return (
    <section id="criatura-detalhe-loot" className="scroll-mt-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40"><Gem size={12} /> Loot</h4>
        {tabela?.ajustada ? <span className="rounded-full border border-[#c7a44c]/40 bg-[#c7a44c]/10 px-2 py-0.5 text-[10px] font-semibold text-[#f0d685]">Ajustada nesta campanha</span> : null}
        {tabela && !editando ? (
          <div className="ml-auto flex gap-1.5">
            {tabela.ajustada ? (
              <button type="button" disabled={voltando} onClick={() => void voltarParaOficial()} className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/55 hover:text-white disabled:opacity-40">
                {voltando ? <RefreshCw size={11} className="animate-spin" /> : <RotateCcw size={11} />} Voltar à oficial
              </button>
            ) : null}
            <button type="button" onClick={() => setEditando(true)} className="flex items-center gap-1 rounded-md border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-2 py-1 text-[11px] font-semibold text-[#f0d685] hover:bg-[#c7a44c]/20">
              <Pencil size={11} /> Ajustar nesta campanha
            </button>
          </div>
        ) : null}
      </div>
      {erro ? (
        <p className="text-xs text-red-200/80">Não foi possível carregar a tabela de loot.</p>
      ) : !tabela ? (
        <p className="flex items-center gap-2 text-xs text-white/40"><RefreshCw size={12} className="animate-spin" /> Carregando a tabela…</p>
      ) : editando ? (
        <EditorLootCampanha
          campanhaId={campanhaId}
          monstroId={monstroId}
          tabela={tabela}
          onSalvo={(nova) => { setTabela(nova); setEditando(false); }}
          onCancelar={() => setEditando(false)}
        />
      ) : tabela.itens.length === 0 && !tabela.moedas ? (
        <p className="text-xs text-white/40">Nesta campanha, esta criatura não deixa nada.</p>
      ) : (
        <>
          <ul className="space-y-1">
            {[...tabela.itens].sort((a, b) => b.chance - a.chance).map((item) => (
              <li key={item.item_id} className="flex items-center gap-2.5 rounded-lg border border-white/[0.07] bg-black/25 px-3 py-2">
                <span className={`w-12 shrink-0 rounded-md border py-0.5 text-center text-[11px] font-bold tabular-nums ${corDaChance(item.chance)}`}>{item.chance}%</span>
                <span className={`min-w-0 flex-1 truncate text-sm ${COR_RARIDADE[item.raridade ?? ''] ?? 'text-white/75'}`}>
                  {item.titulo}
                  {item.exclusivo ? <Star size={11} className="ml-1.5 inline -translate-y-px fill-amber-300 text-amber-300" aria-label="Exclusivo" /> : null}
                </span>
                {item.raridade ? <span className="hidden shrink-0 text-[10px] uppercase tracking-wider text-white/35 sm:inline">{RARIDADES[item.raridade] ?? item.raridade}</span> : null}
                <span className="w-12 shrink-0 text-right font-mono text-xs text-white/55">{quantidadeLegivel(item.quantidade)}</span>
              </li>
            ))}
            {tabela.moedas ? (
              <li className="flex items-center gap-2.5 rounded-lg border border-amber-300/15 bg-amber-300/[0.04] px-3 py-2">
                <span className={`w-12 shrink-0 rounded-md border py-0.5 text-center text-[11px] font-bold tabular-nums ${corDaChance(tabela.moedas.chance)}`}>{tabela.moedas.chance}%</span>
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-amber-100"><Coins size={13} /> {tabela.moedas.moeda}</span>
                <span className="w-12 shrink-0 text-right font-mono text-xs text-white/55">{tabela.moedas.dados}</span>
              </li>
            ) : null}
          </ul>
          <p className="mt-2 text-[11px] leading-5 text-white/35">
            Cada linha rola sozinha (d100 contra a chance) quando você rolar o loot no card da criatura em cena.
            {tabela.itens.some((item) => item.exclusivo) ? ' A estrela marca o que só cai desta criatura e não existe na Loja.' : ''}
          </p>
        </>
      )}
    </section>
  );
};

/** "Presença Aterradora (cada personagem...)" vira nome em destaque e regra embaixo. */
const separarHabilidade = (texto: string): { nome: string; regra: string } => {
  const casamento = texto.match(/^([^()]{1,60}?)\s*\(([\s\S]*)\)\s*$/);
  if (!casamento) return { nome: '', regra: texto };
  const regra = casamento[2].trim();
  return { nome: casamento[1].trim(), regra: `${regra.charAt(0).toLocaleUpperCase('pt-BR')}${regra.slice(1)}` };
};

const Numero = ({ icone, rotulo, valor, tom }: { icone: React.ReactNode; rotulo: string; valor: React.ReactNode; tom: string }) => (
  <div className={`rounded-xl border px-3 py-2 ${tom}`}>
    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70">{icone} {rotulo}</span>
    <span className="mt-0.5 block text-lg font-black tabular-nums leading-tight">{valor}</span>
  </div>
);

/** A ficha inteira de uma criatura do Bestiário, para consultar durante a sessão. */
export const CriaturaDetalhe: React.FC<CriaturaDetalheProps> = ({ campanhaId, monstro, familia, cor, adicionados = 0, ocupado = false, onAdicionar, onFechar }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [quantidade, setQuantidade] = useState(1);
  useDialogAccessibility({ open: true, dialogRef, onClose: onFechar });

  const papel = monstro.papel && monstro.papel in PAPEIS_CRIATURA ? PAPEIS_CRIATURA[monstro.papel as PapelCriatura].rotulo : monstro.papel;
  const marcadores = [
    monstro.unico ? 'Única' : null,
    familia ? `${familia}${monstro.estagio ? ` (${monstro.estagio})` : ''}` : null,
    monstro.classe,
    monstro.categoria,
    monstro.subtipo,
    papel,
    monstro.raridade ? RARIDADES[monstro.raridade] ?? monstro.raridade : null,
  ].filter((item): item is string => !!item).filter((item, indice, lista) => lista.indexOf(item) === indice);
  const atributos = monstro.atributos ?? null;
  const habilidades = monstro.habilidades.map(separarHabilidade);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      ref={dialogRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="modal-viewport fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-2 sm:p-6"
      // O portal ainda borbulha pela árvore do React até o Bestiário, que fecha
      // ao clicar fora; sem parar aqui, fechar a ficha fecharia os dois.
      onClick={(evento) => { evento.stopPropagation(); onFechar(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="criatura-detalhe-titulo"
    >
      <motion.div
        initial={{ scale: 0.97, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(evento) => evento.stopPropagation()}
        className="modal-surface flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-[#0d0c12] shadow-2xl"
        style={{ borderColor: `${cor}40` }}
      >
        <header className="flex items-start gap-4 border-b border-white/[0.08] p-5" style={{ background: `linear-gradient(135deg, ${cor}14, transparent 60%)` }}>
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border-2 text-center" style={{ borderColor: `${cor}88`, backgroundColor: `${cor}18`, color: cor }}>
            <span className="text-[9px] font-bold uppercase leading-none tracking-wider opacity-70">VD</span>
            <span className="text-2xl font-black leading-tight">{monstro.vd ?? '-'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="criatura-detalhe-titulo" className="text-xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{monstro.titulo}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {marcadores.map((marcador) => (
                <span key={marcador} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/65">{marcador}</span>
              ))}
              {monstro.nivel != null ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/65">Nível {monstro.nivel}</span> : null}
              {monstro.vd != null ? <span className="rounded-full border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-2 py-0.5 text-[11px] font-semibold text-[#f0d685]">{monstro.xp} XP</span> : null}
              {monstro.tem_loot ? (
                <button
                  type="button"
                  onClick={() => document.getElementById('criatura-detalhe-loot')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="flex items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[11px] text-emerald-200 hover:bg-emerald-300/20"
                >
                  <Gem size={10} /> Ver loot
                </button>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={onFechar} className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Fechar ficha da criatura">
            <X size={18} />
          </button>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {monstro.descricao ? <p className="text-sm leading-6 text-white/70">{monstro.descricao}</p> : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {monstro.pv != null ? <Numero icone={<Heart size={11} />} rotulo="Vida" valor={monstro.pv} tom="border-red-400/20 bg-red-400/[0.06] text-red-100" /> : null}
            {monstro.defesa != null ? <Numero icone={<Shield size={11} />} rotulo="Defesa" valor={monstro.defesa} tom="border-white/10 bg-white/[0.04] text-white/90" /> : null}
            {monstro.iniciativa != null ? <Numero icone={<Timer size={11} />} rotulo="Iniciativa" valor={monstro.iniciativa} tom="border-white/10 bg-white/[0.04] text-white/90" /> : null}
            {monstro.mana != null ? <Numero icone={<Zap size={11} />} rotulo="Mana" valor={monstro.mana} tom="border-sky-400/20 bg-sky-400/[0.06] text-sky-100" /> : null}
            {monstro.estamina != null ? <Numero icone={<Activity size={11} />} rotulo="Estamina" valor={monstro.estamina} tom="border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-100" /> : null}
            {monstro.deslocamento ? <Numero icone={<Footprints size={11} />} rotulo="Deslocamento" valor={monstro.deslocamento} tom="border-white/10 bg-white/[0.04] text-white/90" /> : null}
          </div>

          {atributos ? (
            <section>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">Atributos</h4>
              <div className="grid grid-cols-5 gap-1.5">
                {ATRIBUTOS_CRIATURA.map(([chave, rotulo]) => (
                  <div key={chave} className="rounded-lg border border-white/[0.07] bg-black/30 py-2 text-center">
                    <span className="block text-[9px] font-bold uppercase tracking-tight text-white/40 sm:tracking-wider">{rotulo}</span>
                    <span className="text-base font-black tabular-nums text-white">{atributos[chave] ?? '-'}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {monstro.ataques.length ? (
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40"><Swords size={12} /> Ataques</h4>
              <ul className="space-y-1.5">
                {monstro.ataques.map((ataque) => (
                  <li key={ataque.nome} className="rounded-lg border border-white/[0.07] bg-black/25 px-3 py-2">
                    <strong className="block text-sm text-white">{ataque.nome}</strong>
                    {ataque.detalhe ? <span className="mt-0.5 block text-xs leading-5 text-white/65">{ataque.detalhe}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {monstro.pericias.length ? (
            <section>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">Testes</h4>
              <div className="flex flex-wrap gap-1.5">
                {monstro.pericias.map((pericia) => <span key={pericia} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-xs text-white/75">{pericia}</span>)}
              </div>
            </section>
          ) : null}

          {habilidades.length ? (
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40"><Sparkles size={12} /> Habilidades</h4>
              <ul className="space-y-2">
                {habilidades.map((habilidade, indice) => (
                  <li key={indice} className="rounded-lg border border-white/[0.07] bg-black/25 px-3 py-2.5 text-sm leading-6 text-white/70">
                    {habilidade.nome ? <strong className="block text-white">{habilidade.nome}</strong> : null}
                    {habilidade.regra}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {monstro.fases?.length ? (
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40"><Flame size={12} /> Fases do chefe</h4>
              <ol className="space-y-2">
                {monstro.fases.map((fase, indice) => (
                  <li key={fase.nome} className="rounded-lg border border-[#e0645f]/20 bg-[#e0645f]/[0.04] px-3 py-2.5 text-sm leading-6 text-white/70">
                    <strong className="block text-white">Fase {indice + 2}: {fase.nome}{fase.quando ? <span className="ml-2 text-[11px] font-semibold text-[#f19a96]">a partir de {Math.round(fase.quando * 100)}% da Vida</span> : <span className="ml-2 text-[11px] font-semibold text-white/40">só pelo Mestre</span>}</strong>
                    {fase.anuncio ? <span className="mt-0.5 block italic text-white/80">{fase.anuncio}</span> : null}
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-white/65">
                      {fase.mudancas.map((mudanca) => <li key={mudanca}>{mudanca}</li>)}
                    </ul>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {(monstro.tem_loot || monstro.loot_ajustado) && campanhaId ? <SecaoLoot campanhaId={campanhaId} monstroId={monstro.id} /> : null}

          {monstro.funcao ? <p className="text-xs leading-5 text-white/45"><strong className="text-white/60">Contratada para:</strong> {monstro.funcao}</p> : null}
        </div>

        {onAdicionar ? (
        <footer className="flex items-center gap-2 border-t border-white/[0.08] p-4">
          <div className="flex items-center rounded-lg border border-white/10">
            <button type="button" aria-label="Menos uma cópia" className="flex h-10 w-9 items-center justify-center text-white/50 hover:text-white disabled:opacity-30" disabled={quantidade <= 1} onClick={() => setQuantidade((valor) => Math.max(1, valor - 1))}><Minus size={14} /></button>
            <span className="w-8 text-center text-sm font-bold tabular-nums text-white" aria-label={`${quantidade} cópia(s)`}>{quantidade}</span>
            <button type="button" aria-label="Mais uma cópia" className="flex h-10 w-9 items-center justify-center text-white/50 hover:text-white disabled:opacity-30" disabled={quantidade >= 10} onClick={() => setQuantidade((valor) => Math.min(10, valor + 1))}><Plus size={14} /></button>
          </div>
          <button type="button" onClick={() => onAdicionar(monstro, quantidade)} disabled={ocupado} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#c7a44c]/40 bg-[#c7a44c]/15 text-sm font-bold text-[#f0d685] hover:bg-[#c7a44c]/25 disabled:cursor-wait disabled:opacity-50">
            {ocupado ? <RefreshCw className="animate-spin" size={14} /> : adicionados > 0 ? <Check size={14} /> : <Plus size={14} />}
            {ocupado ? 'Adicionando...' : adicionados > 0 ? `Adicionar mais (${adicionados} na cena)` : 'Adicionar à cena'}
          </button>
        </footer>
        ) : null}
      </motion.div>
    </motion.div>,
    document.body,
  );
};
