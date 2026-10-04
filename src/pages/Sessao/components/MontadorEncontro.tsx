import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Check, Dices, Heart, Minus, Plus, RefreshCw, Shuffle, Swords, X } from 'lucide-react';
import { sessaoApi, type BestiarioMonstro } from '../../../services/sessaoApi';
import { useDialogAccessibility } from '../../../hooks/useDialogAccessibility';
import { Select } from '../../../components/ui/Select';
import { PAPEIS_CRIATURA } from '../../../services/curvaCriatura';
import {
  DIFICULDADES,
  ESTILOS,
  NIVEL_MAXIMO_DO_MONTADOR,
  ORDEM_DAS_DIFICULDADES,
  ROTULO_DA_AMEACA,
  montarEncontro,
  rodadasEsperadas,
  type Dificuldade,
  type EstiloEncontro,
  type VagaDoEncontro,
} from '../../../services/montadorEncontro';
import { corDoVd } from './BestiarioPicker';
import familiasData from '../../../../data/bestiario/familias-v1.json';

interface MontadorEncontroProps {
  campanhaId: string;
  /** Quantos personagens de jogador já estão na cena (vira o palpite inicial de jogadores). */
  jogadoresNaCena: number;
  onCancel: () => void;
  onPick: (monstro: BestiarioMonstro, numero?: number) => Promise<void>;
}

const TITULO_DA_FAMILIA: Record<string, string> = Object.fromEntries(familiasData.familias.map((familia) => [familia.id, familia.titulo]));
const NIVEIS_RAPIDOS = [5, 10, 20, 30, 40, 50, 75, 100];
const COR_DO_PAPEL: Record<string, string> = { lacaio: '#9ca3af', padrao: '#7dd3fc', elite: '#fbbf24', chefe: '#f87171', solo: '#f87171' };

const sementeNova = () => Math.floor(Math.random() * 1_000_000) + 1;

export const MontadorEncontro: React.FC<MontadorEncontroProps> = ({ campanhaId, jogadoresNaCena, onCancel, onPick }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const nivelRef = useRef<HTMLInputElement>(null);
  const [monstros, setMonstros] = useState<BestiarioMonstro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [nivel, setNivel] = useState('10');
  const [jogadores, setJogadores] = useState(Math.min(10, Math.max(1, jogadoresNaCena || 4)));
  const [dificuldade, setDificuldade] = useState<Dificuldade>('padrao');
  const [estilo, setEstilo] = useState<EstiloEncontro>('auto');
  const [familia, setFamilia] = useState('');
  const [incluirUnicas, setIncluirUnicas] = useState(false);
  const [semente, setSemente] = useState(sementeNova);
  const [trocas, setTrocas] = useState<Record<number, number>>({});
  const [removidas, setRemovidas] = useState<Set<string>>(new Set());
  const [adicionando, setAdicionando] = useState(false);
  const [adicionado, setAdicionado] = useState<number | null>(null);
  useDialogAccessibility({ open: true, dialogRef, initialFocusRef: nivelRef, onClose: onCancel });

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    sessaoApi.listarBestiario(campanhaId)
      .then((resposta) => { if (!cancelado) setMonstros(resposta?.monstros ?? []); })
      .catch(() => { if (!cancelado) setErro('Não foi possível carregar o Bestiário. As vagas saem do gerador por VD.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [campanhaId]);

  const nivelNumero = Math.min(NIVEL_MAXIMO_DO_MONTADOR, Math.max(1, Math.trunc(Number(nivel)) || 1));

  const familiasDisponiveis = useMemo(() => {
    const presentes = new Set(monstros.filter((m) => !m.unico && m.categoria !== 'Universal' && m.categoria !== 'Deidade').map((m) => m.familia).filter((f): f is string => !!f));
    return familiasData.familias.filter((item) => presentes.has(item.id));
  }, [monstros]);

  const encontro = useMemo(() => montarEncontro(monstros, {
    nivel: nivelNumero,
    jogadores,
    dificuldade,
    estilo,
    familia: familia || null,
    incluirUnicas,
    semente,
    trocas,
  }), [monstros, nivelNumero, jogadores, dificuldade, estilo, familia, incluirUnicas, semente, trocas]);

  const vagasAtivas = encontro.vagas.filter((vaga) => !removidas.has(vaga.chave));
  const totais = useMemo(() => ({
    xp: vagasAtivas.reduce((soma, vaga) => soma + vaga.monstro.xp, 0),
    vida: vagasAtivas.reduce((soma, vaga) => soma + (vaga.monstro.pv ?? 0), 0),
  }), [vagasAtivas]);

  const mudar = (acao: () => void) => {
    acao();
    setRemovidas(new Set());
    setAdicionado(null);
  };
  const sortearDeNovo = () => mudar(() => { setSemente(sementeNova()); setTrocas({}); });
  const trocarVaga = (vaga: VagaDoEncontro) => {
    setTrocas((atual) => ({ ...atual, [vaga.posicao]: (atual[vaga.posicao] ?? 0) + 1 }));
    setRemovidas((atual) => { const proximo = new Set(atual); proximo.delete(vaga.chave); return proximo; });
  };
  const tirarVaga = (vaga: VagaDoEncontro) => setRemovidas((atual) => new Set(atual).add(vaga.chave));

  const adicionarACena = async () => {
    if (adicionando || !vagasAtivas.length) return;
    setAdicionando(true);
    setErro(null);
    try {
      // Criaturas iguais ganham número ("Lobo 1", "Lobo 2") para não ficarem todas com o mesmo nome.
      const contagem = new Map<string, number>();
      for (const vaga of vagasAtivas) contagem.set(vaga.monstro.id, (contagem.get(vaga.monstro.id) ?? 0) + 1);
      const andamento = new Map<string, number>();
      for (const vaga of vagasAtivas) {
        const id = vaga.monstro.id;
        const numero = (andamento.get(id) ?? 0) + 1;
        andamento.set(id, numero);
        await onPick(vaga.monstro, (contagem.get(id) ?? 1) > 1 ? numero : undefined);
      }
      setAdicionado(vagasAtivas.length);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível adicionar o encontro à cena.');
    } finally {
      setAdicionando(false);
    }
  };

  if (typeof document === 'undefined') return null;

  const chip = (ativo: boolean) => `flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
    ativo ? 'border-[#e3c363] bg-[#c7a44c] text-black shadow-[0_0_12px_rgba(199,164,76,0.35)]' : 'border-white/10 bg-white/[0.02] text-white/55 hover:border-white/30 hover:text-white'
  }`;
  const rodadas = rodadasEsperadas(encontro, jogadores);

  return createPortal(
    <motion.div
      ref={dialogRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-viewport fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-2 sm:p-6"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="montador-encontro-title"
    >
      <motion.div
        initial={{ scale: 0.97, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97, y: 12 }}
        onClick={(event) => event.stopPropagation()}
        className="modal-surface flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0c12] shadow-2xl"
        style={{ height: 'min(48rem, 100%)' }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div>
            <h3 id="montador-encontro-title" className="flex items-center gap-2 text-lg font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              <Swords size={18} className="text-[#c7a44c]" /> Montador de encontro
            </h3>
            <p className="mt-0.5 text-xs text-white/40">Diga o nível do grupo e a dificuldade. As criaturas saem do Bestiário já escaladas para o VD.</p>
          </div>
          <button type="button" onClick={onCancel} className="flex h-10 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-bold text-white/70 hover:bg-white/5 hover:text-white" aria-label="Fechar o montador">
            <X size={16} />
          </button>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 border-b border-white/[0.08] px-5 py-4">
            <div className="flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Nível do grupo</span>
                <input
                  ref={nivelRef}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={NIVEL_MAXIMO_DO_MONTADOR}
                  value={nivel}
                  onChange={(event) => mudar(() => setNivel(event.target.value))}
                  className="mt-1 h-10 w-28 rounded-lg border border-white/10 bg-black/30 px-3 text-sm font-bold text-white outline-none focus:border-[#c7a44c]/50"
                />
              </label>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Jogadores</span>
                <div className="mt-1 flex h-10 items-center rounded-lg border border-white/10">
                  <button type="button" aria-label="Menos um jogador" className="flex h-10 w-9 items-center justify-center text-white/50 hover:text-white disabled:opacity-30" disabled={jogadores <= 1} onClick={() => mudar(() => setJogadores((valor) => Math.max(1, valor - 1)))}><Minus size={13} /></button>
                  <span className="w-8 text-center text-sm font-bold tabular-nums text-white" aria-label={`${jogadores} jogador(es)`}>{jogadores}</span>
                  <button type="button" aria-label="Mais um jogador" className="flex h-10 w-9 items-center justify-center text-white/50 hover:text-white disabled:opacity-30" disabled={jogadores >= 10} onClick={() => mudar(() => setJogadores((valor) => Math.min(10, valor + 1)))}><Plus size={13} /></button>
                </div>
              </div>
              <div className="custom-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1" aria-label="Níveis rápidos">
                {NIVEIS_RAPIDOS.map((valor) => (
                  <button key={valor} type="button" aria-pressed={nivelNumero === valor} onClick={() => mudar(() => setNivel(String(valor)))} className={chip(nivelNumero === valor)}>{nivelNumero === valor ? <Check size={11} strokeWidth={3} aria-hidden="true" /> : null}{valor}</button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Dificuldade</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ORDEM_DAS_DIFICULDADES.map((valor) => (
                  <button key={valor} type="button" aria-pressed={dificuldade === valor} onClick={() => mudar(() => setDificuldade(valor))} className={chip(dificuldade === valor)}>{dificuldade === valor ? <Check size={11} strokeWidth={3} aria-hidden="true" /> : null}{DIFICULDADES[valor].rotulo}</button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-white/45">{DIFICULDADES[dificuldade].descricao}</p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Estilo</span>
                <Select
                  value={estilo}
                  onChange={(valor) => mudar(() => { setEstilo(valor as EstiloEncontro); setTrocas({}); })}
                  ariaLabel="Estilo do encontro"
                  options={(Object.keys(ESTILOS) as EstiloEncontro[]).map((valor) => ({ value: valor, label: ESTILOS[valor].rotulo }))}
                  menuMinWidth={220}
                  className="mt-1 !h-10 !min-h-0 w-auto min-w-[11rem] rounded-lg border-white/10 bg-black/30 !py-0 px-3 text-xs font-semibold text-white/80"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Povo</span>
                <Select
                  value={familia}
                  onChange={(valor) => mudar(() => { setFamilia(valor); setTrocas({}); })}
                  ariaLabel="Família das criaturas"
                  options={[
                    { value: '', label: 'Deixar o montador escolher' },
                    ...familiasDisponiveis.map((item) => ({ value: item.id, label: item.titulo })),
                  ]}
                  menuMinWidth={240}
                  className={`mt-1 !h-10 !min-h-0 w-auto min-w-[12rem] rounded-lg !py-0 px-3 text-xs font-semibold ${familia ? '!border-[#e3c363] !bg-[#c7a44c]/20 text-[#f6e3a1]' : 'border-white/10 bg-black/30 text-white/80'}`}
                />
              </div>
              <label className="flex h-10 cursor-pointer items-center gap-2 text-xs font-semibold text-white/65">
                <input type="checkbox" checked={incluirUnicas} onChange={(event) => mudar(() => { setIncluirUnicas(event.target.checked); setTrocas({}); })} className="h-4 w-4 shrink-0 accent-[#c7a44c]" />
                Chefe pode ser criatura única
              </label>
              <button type="button" onClick={sortearDeNovo} className="ml-auto flex h-10 items-center gap-1.5 rounded-lg border border-[#c7a44c]/40 bg-[#c7a44c]/12 px-3 text-xs font-bold text-[#f0d685] hover:bg-[#c7a44c]/25">
                <Dices size={14} /> Sortear de novo
              </button>
            </div>
            <p className="text-xs text-white/40">{ESTILOS[estilo].descricao}</p>
          </div>

          <div className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-white/10 px-3 py-1 font-bold text-white/70">{ESTILOS[encontro.estiloUsado].rotulo}{encontro.tema ? ` · ${encontro.tema}` : ''}</span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-white/60" title="Cada papel gasta uma fatia do orçamento: lacaio 0,1, padrão 0,25, elite 0,5, chefe 1">Orçamento {encontro.gasto.toLocaleString('pt-BR')} de {encontro.orcamento.toLocaleString('pt-BR')}</span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-white/60" title="Quanto o grupo leva para derrubar tudo, no ritmo do Guia do Mestre">Cerca de {rodadas.toLocaleString('pt-BR')} rodadas</span>
              {encontro.pesoDasHabilidades > 0 ? (
                <span className="rounded-full border border-sky-300/20 px-3 py-1 text-sky-100/70" title="Cura, controle e dano em área gastam orçamento: as criaturas com essas habilidades têm menos Vida">Habilidades pesam {encontro.pesoDasHabilidades.toLocaleString('pt-BR')}</span>
              ) : null}
            </div>
            {encontro.aviso ? <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2 text-xs leading-5 text-amber-100/80" role="status">{encontro.aviso}</p> : null}
            {carregando ? <p className="mt-4 flex items-center gap-2 text-sm text-white/45"><RefreshCw size={14} className="animate-spin" /> Carregando o Bestiário...</p> : null}

            <ul className="mt-4 grid gap-2.5 md:grid-cols-2">
              {encontro.vagas.map((vaga) => {
                const tirada = removidas.has(vaga.chave);
                const corPapel = COR_DO_PAPEL[vaga.papel] ?? '#9ca3af';
                const cor = corDoVd(vaga.monstro.vd);
                return (
                  <li key={vaga.chave} className={`flex flex-col overflow-hidden rounded-xl border bg-[#100f17] ${tirada ? 'border-white/[0.04] opacity-35' : 'border-white/[0.08]'}`}>
                    <div className="flex items-start gap-3 p-3.5">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border text-center" style={{ borderColor: `${cor}66`, backgroundColor: `${cor}14`, color: cor }} title={`Valor de desafio ${vaga.monstro.vd}`}>
                        <span className="text-[8px] font-bold uppercase leading-none tracking-wider opacity-70">VD</span>
                        <span className="text-lg font-black leading-tight">{vaga.monstro.vd ?? '-'}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-bold text-white">{vaga.monstro.titulo}</h4>
                        <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-white/40">
                          <span style={{ color: corPapel }}>{PAPEIS_CRIATURA[vaga.papel].rotulo}</span>
                          {vaga.monstro.unico ? ' · Única' : ''}
                          {vaga.monstro.familia ? ` · ${TITULO_DA_FAMILIA[vaga.monstro.familia] ?? vaga.monstro.familia}` : ''}
                          {` · ${vaga.monstro.xp} XP`}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                          {vaga.monstro.pv != null ? <span className="flex items-center gap-1 rounded-md bg-red-400/10 px-1.5 py-0.5 text-red-200"><Heart size={10} aria-hidden="true" /> {vaga.monstro.pv}</span> : null}
                          {vaga.monstro.defesa != null ? <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-white/75">Def {vaga.monstro.defesa}</span> : null}
                          {vaga.monstro.ataques[0] ? <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-white/60">{vaga.monstro.ataques[0].nome} {vaga.monstro.ataques[0].detalhe ?? ''}</span> : null}
                        </div>
                      </div>
                    </div>
                    {vaga.ameaca.tipos.length ? (
                      <div className="flex flex-wrap gap-1.5 px-3.5 pb-1" title={`Habilidades pesam ${Math.round(vaga.ameaca.extra * 100)}% no custo desta vaga, e a Vida dela cai na mesma proporção.`}>
                        {vaga.ameaca.tipos.map((tipo) => <span key={tipo} className="rounded-full border border-sky-300/25 bg-sky-300/[0.06] px-2 py-0.5 text-[10px] font-semibold text-sky-100/80">{ROTULO_DA_AMEACA[tipo]}</span>)}
                      </div>
                    ) : null}
                    {vaga.monstro.habilidades.some((habilidade) => habilidade.startsWith('Golpe Anunciado')) ? (
                      <p className="px-3.5 pb-1 text-[11px] leading-5 text-[#f19a96]">Anuncia um golpe forte na rodada anterior.</p>
                    ) : null}
                    {vaga.baseTitulo === null ? <p className="px-3.5 pb-1 text-[11px] text-white/40">Sem criatura do Bestiário para este VD: saiu do gerador.</p> : null}
                    <div className="mt-auto flex items-center gap-2 p-3.5 pt-2">
                      <button type="button" onClick={() => trocarVaga(vaga)} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 text-[11px] font-bold text-white/70 hover:bg-white/5 hover:text-white">
                        <Shuffle size={12} /> Trocar
                      </button>
                      <button type="button" onClick={() => (tirada ? setRemovidas((atual) => { const proximo = new Set(atual); proximo.delete(vaga.chave); return proximo; }) : tirarVaga(vaga))} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 text-[11px] font-bold text-white/70 hover:bg-white/5 hover:text-white">
                        {tirada ? <><Plus size={12} /> Voltar</> : <><X size={12} /> Tirar</>}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.08] px-5 py-3">
          <div className="min-w-0 flex-1 text-xs text-white/55">
            <strong className="text-white">{vagasAtivas.length}</strong> criatura{vagasAtivas.length === 1 ? '' : 's'} · <strong className="text-white">{totais.xp.toLocaleString('pt-BR')}</strong> XP no total · <strong className="text-white">{totais.vida.toLocaleString('pt-BR')}</strong> de Vida somada
            {erro ? <span className="ml-2 text-red-200" role="alert">{erro}</span> : null}
            {adicionado ? <span className="ml-2 text-emerald-200" role="status">{adicionado} na cena.</span> : null}
          </div>
          <button type="button" onClick={adicionarACena} disabled={adicionando || !vagasAtivas.length} className="flex h-10 items-center gap-1.5 rounded-lg border border-[#c7a44c]/40 bg-[#c7a44c]/18 px-4 text-xs font-bold text-[#f0d685] hover:bg-[#c7a44c]/30 disabled:cursor-not-allowed disabled:opacity-40">
            {adicionando ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />}
            {adicionando ? 'Adicionando...' : 'Adicionar tudo à cena'}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};
