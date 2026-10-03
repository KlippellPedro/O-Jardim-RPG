import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Activity, Check, Gem, Heart, Maximize2, Minus, Plus, RefreshCw, Search, Shield, Skull, Sparkles, X, Zap } from 'lucide-react';
import { sessaoApi, type BestiarioMonstro } from '../../../services/sessaoApi';
import { useDialogAccessibility } from '../../../hooks/useDialogAccessibility';
import { Select } from '../../../components/ui/Select';
import { CriaturaDetalhe } from './CriaturaDetalhe';
import { ARQUETIPOS_CRIATURA, ORDEM_DOS_ARQUETIPOS, ORDEM_DOS_PAPEIS, PAPEIS_CRIATURA, modeloDeCriatura, vdValido, type ArquetipoCriatura, type PapelCriatura } from '../../../services/curvaCriatura';
import { VD_MAXIMO } from '../../../services/progressaoNiveis';
import familiasData from '../../../../data/bestiario/familias-v1.json';

interface BestiarioPickerProps {
  campanhaId: string;
  onCancel: () => void;
  /** `numero` só vem quando se adicionam várias cópias: 1, 2, 3... para nomear "Goblin 1", "Goblin 2". */
  onPick: (monstro: BestiarioMonstro, numero?: number) => Promise<void>;
}

const ORDEM_CATEGORIAS = [
  'Humanoide', 'Animal', 'Monstro', 'Morto-Vivo', 'Elemental',
  'Constructo', 'Espírito', 'Aberração', 'Lendário',
];

// O VD é o nível do grupo que a criatura desafia sozinha, então as faixas
// seguem os patamares de jogo: começo, meio, fim do padrão e além dele.
const TITULO_DA_FAMILIA: Record<string, string> = Object.fromEntries(familiasData.familias.map((familia) => [familia.id, familia.titulo]));

type FaixaVd = 'todos' | 'baixo' | 'medio' | 'alto' | 'extremo';
const FAIXAS: Array<{ id: FaixaVd; rotulo: string; testar: (vd: number | null) => boolean }> = [
  { id: 'todos', rotulo: 'Qualquer VD', testar: () => true },
  { id: 'baixo', rotulo: 'VD 1-10', testar: (vd) => vd != null && vd <= 10 },
  { id: 'medio', rotulo: 'VD 11-25', testar: (vd) => vd != null && vd >= 11 && vd <= 25 },
  { id: 'alto', rotulo: 'VD 26-50', testar: (vd) => vd != null && vd >= 26 && vd <= 50 },
  { id: 'extremo', rotulo: 'VD 51+', testar: (vd) => vd != null && vd >= 51 },
];

/** A cor do selo sobe com a ameaça: verde tranquilo até vermelho mortal. */
const corDoVd = (vd: number | null): string => {
  if (vd == null) return '#9ca3af';
  if (vd <= 10) return '#4ade80';
  if (vd <= 25) return '#fbbf24';
  if (vd <= 40) return '#fb923c';
  return '#ef4444';
};

interface ICartaoProps {
  monstro: BestiarioMonstro;
  adicionados: number;
  ocupado: boolean;
  onAdicionar: (monstro: BestiarioMonstro, quantidade: number) => void;
  /** Abre a ficha completa da criatura. */
  onAbrir?: (monstro: BestiarioMonstro) => void;
}

/** A ficha que o gerador monta para um VD e um papel, no formato do Bestiário. */
const monstroSobMedida = (vd: number, papel: PapelCriatura, arquetipo: ArquetipoCriatura): BestiarioMonstro => {
  const modelo = modeloDeCriatura(vd, papel, arquetipo);
  return {
    id: `sob-medida-${modelo.vd}-${papel}-${arquetipo}`,
    titulo: `Criatura de VD ${modelo.vd} (${modelo.papelRotulo}${arquetipo === 'comum' ? '' : `, ${modelo.arquetipoRotulo}`})`,
    nivel: modelo.vd,
    classe: 'Sob medida',
    categoria: 'Universal',
    descricao: null,
    vd: modelo.vd,
    xp: modelo.xp,
    pv: modelo.pv,
    defesa: modelo.defesa,
    mana: modelo.mana,
    estamina: modelo.estamina,
    iniciativa: modelo.iniciativa,
    ataques: modelo.ataques,
    pericias: modelo.pericias,
    habilidades: modelo.habilidades,
  };
};

const Cartao = ({ monstro, adicionados, ocupado, onAdicionar, onAbrir }: ICartaoProps) => {
  const [quantidade, setQuantidade] = useState(1);
  const cor = corDoVd(monstro.vd);
  const conteudo = (
    <>
      <div className={`flex items-start gap-3 p-3.5 ${onAbrir ? 'pr-8' : ''}`}>
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border text-center" style={{ borderColor: `${cor}66`, backgroundColor: `${cor}14`, color: cor }} title={monstro.vd != null ? `Valor de desafio ${monstro.vd}` : 'Sem VD'}>
          <span className="text-[8px] font-bold uppercase leading-none tracking-wider opacity-70">VD</span>
          <span className="text-lg font-black leading-tight">{monstro.vd ?? '-'}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-bold text-white">{monstro.titulo}</h4>
          <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-white/40">
            {monstro.unico ? 'Única · ' : ''}{monstro.familia ? `${TITULO_DA_FAMILIA[monstro.familia] ?? monstro.familia}${monstro.estagio ? ` (${monstro.estagio})` : ''} · ` : ''}{monstro.classe ?? monstro.categoria ?? 'Criatura'}{monstro.nivel != null ? ` · Nível ${monstro.nivel}` : ''}{monstro.vd != null ? ` · ${monstro.xp} XP` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            {monstro.pv != null ? <span className="flex items-center gap-1 rounded-md bg-red-400/10 px-1.5 py-0.5 text-red-200"><Heart size={10} aria-hidden="true" /> {monstro.pv}</span> : null}
            {monstro.defesa != null ? <span className="flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-white/75"><Shield size={10} aria-hidden="true" /> {monstro.defesa}</span> : null}
            {monstro.mana != null ? <span className="flex items-center gap-1 rounded-md bg-sky-400/10 px-1.5 py-0.5 text-sky-200"><Zap size={10} aria-hidden="true" /> {monstro.mana}</span> : null}
            {monstro.estamina != null ? <span className="flex items-center gap-1 rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-emerald-200" title="Estamina"><Activity size={10} aria-hidden="true" /> {monstro.estamina}</span> : null}
            {monstro.iniciativa != null ? <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-white/60">Ini {monstro.iniciativa}</span> : null}
            {monstro.tem_loot ? <span className="flex items-center gap-1 rounded-md bg-emerald-300/10 px-1.5 py-0.5 text-emerald-200/80" title="Tem tabela de loot"><Gem size={10} aria-hidden="true" /> Loot</span> : null}
          </div>
        </div>
      </div>

      {monstro.descricao ? <p className="line-clamp-2 px-3.5 text-xs leading-5 text-white/45">{monstro.descricao}</p> : null}
      {monstro.ataques.length ? (
        <div className="flex flex-wrap gap-1 px-3.5 pt-2">
          {monstro.ataques.slice(0, 4).map((ataque) => <span key={ataque.nome} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">{ataque.nome}</span>)}
          {monstro.ataques.length > 4 ? <span className="px-1 text-[10px] text-white/30">+{monstro.ataques.length - 4}</span> : null}
        </div>
      ) : null}
    </>
  );
  return (
    <li className={`group flex flex-col overflow-hidden rounded-xl border bg-[#100f17] transition-colors ${adicionados > 0 ? 'border-emerald-400/25' : 'border-white/[0.08]'} hover:border-white/25`}>
      {onAbrir ? (
        <button
          type="button"
          onClick={() => onAbrir(monstro)}
          className="relative block w-full text-left outline-none transition-colors hover:bg-white/[0.02] focus-visible:bg-white/[0.04] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#c7a44c]/50"
          aria-label={`Ver a ficha completa de ${monstro.titulo}`}
        >
          {conteudo}
          <Maximize2 size={13} aria-hidden="true" className="pointer-events-none absolute right-3 top-3.5 text-white/0 transition-colors group-hover:text-white/55" />
        </button>
      ) : conteudo}

      <div className="mt-auto flex items-center gap-2 p-3.5 pt-3">
        <div className="flex items-center rounded-lg border border-white/10">
          <button type="button" aria-label="Menos uma cópia" className="flex h-9 w-8 items-center justify-center text-white/50 hover:text-white disabled:opacity-30" disabled={quantidade <= 1} onClick={() => setQuantidade((valor) => Math.max(1, valor - 1))}><Minus size={13} /></button>
          <span className="w-7 text-center text-sm font-bold tabular-nums text-white" aria-label={`${quantidade} cópia(s)`}>{quantidade}</span>
          <button type="button" aria-label="Mais uma cópia" className="flex h-9 w-8 items-center justify-center text-white/50 hover:text-white disabled:opacity-30" disabled={quantidade >= 10} onClick={() => setQuantidade((valor) => Math.min(10, valor + 1))}><Plus size={13} /></button>
        </div>
        <button type="button" onClick={() => onAdicionar(monstro, quantidade)} disabled={ocupado} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#c7a44c]/40 bg-[#c7a44c]/12 text-xs font-bold text-[#f0d685] hover:bg-[#c7a44c]/25 disabled:cursor-wait disabled:opacity-50">
          {ocupado ? <RefreshCw className="animate-spin" size={13} /> : adicionados > 0 ? <Check size={13} /> : <Plus size={13} />}
          {ocupado ? 'Adicionando...' : adicionados > 0 ? `Adicionar mais (${adicionados} na cena)` : 'Adicionar à cena'}
        </button>
      </div>
    </li>
  );
};

export const BestiarioPicker: React.FC<BestiarioPickerProps> = ({ campanhaId, onCancel, onPick }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [monstros, setMonstros] = useState<BestiarioMonstro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [aba, setAba] = useState<'criaturas' | 'deidades' | 'sobmedida'>('criaturas');
  const [vdSobMedida, setVdSobMedida] = useState('20');
  const [papelSobMedida, setPapelSobMedida] = useState<PapelCriatura>('solo');
  const [arquetipoSobMedida, setArquetipoSobMedida] = useState<ArquetipoCriatura>('comum');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [faixa, setFaixa] = useState<FaixaVd>('todos');
  const [familiaFiltro, setFamiliaFiltro] = useState('');
  const [ordem, setOrdem] = useState<'nome' | 'vd'>('nome');
  const [adicionados, setAdicionados] = useState<Record<string, number>>({});
  const [aberto, setAberto] = useState<BestiarioMonstro | null>(null);
  useDialogAccessibility({ open: true, dialogRef, initialFocusRef: searchRef, onClose: onCancel });

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    sessaoApi.listarBestiario(campanhaId)
      .then((response) => { if (!cancelado) setMonstros(response?.monstros ?? []); })
      .catch(() => { if (!cancelado) setError('Não foi possível carregar o Bestiário.'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [campanhaId]);

  const criaturas = useMemo(() => monstros.filter((m) => m.categoria !== 'Universal' && m.categoria !== 'Deidade'), [monstros]);
  // As Deidades vêm de um arquivo só do servidor; sem elas na resposta, a aba nem aparece.
  const deidades = useMemo(() => monstros.filter((m) => m.categoria === 'Deidade').sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR')), [monstros]);
  const vdEscolhido = vdValido(vdSobMedida);
  const sobMedida = useMemo(() => monstroSobMedida(vdEscolhido, papelSobMedida, arquetipoSobMedida), [vdEscolhido, papelSobMedida, arquetipoSobMedida]);

  const familiasDisponiveis = useMemo(() => {
    const presentes = new Set(criaturas.map((m) => m.familia).filter((f): f is string => !!f));
    return familiasData.familias.filter((familia) => presentes.has(familia.id));
  }, [criaturas]);

  const categoriasDisponiveis = useMemo(() => {
    const presentes = new Set(criaturas.map((m) => m.categoria).filter((c): c is string => !!c));
    return ORDEM_CATEGORIAS.filter((categoria) => presentes.has(categoria));
  }, [criaturas]);

  const filtrados = useMemo(() => {
    const base = criaturas;
    const termo = search.trim().toLocaleLowerCase('pt-BR');
    const testarFaixa = FAIXAS.find((item) => item.id === faixa)?.testar ?? (() => true);
    const lista = base.filter((monstro) => (
      (!categoriaFiltro || monstro.categoria === categoriaFiltro)
      && testarFaixa(monstro.vd)
      && (!familiaFiltro || (familiaFiltro === 'unicas' ? monstro.unico : monstro.familia === familiaFiltro))
      && (!termo || monstro.titulo.toLocaleLowerCase('pt-BR').includes(termo))
    ));
    return [...lista].sort((a, b) => (
      ordem === 'vd'
        ? (a.vd ?? 0) - (b.vd ?? 0) || a.titulo.localeCompare(b.titulo, 'pt-BR')
        : a.titulo.localeCompare(b.titulo, 'pt-BR')
    ));
  }, [criaturas, categoriaFiltro, faixa, familiaFiltro, ordem, search]);

  const totalAdicionados = Object.values(adicionados).reduce((soma, valor) => soma + valor, 0);
  const filtrosLigados = [
    search.trim() ? `"${search.trim()}"` : null,
    faixa !== 'todos' ? FAIXAS.find((item) => item.id === faixa)?.rotulo : null,
    categoriaFiltro,
    familiaFiltro ? (familiaFiltro === 'unicas' ? 'Criaturas únicas' : TITULO_DA_FAMILIA[familiaFiltro] ?? familiaFiltro) : null,
  ].filter((item): item is string => !!item);
  const limparFiltros = () => {
    setSearch('');
    setFaixa('todos');
    setCategoriaFiltro(null);
    setFamiliaFiltro('');
  };

  const adicionar = async (monstro: BestiarioMonstro, quantidade: number) => {
    if (busy) return;
    setBusy(monstro.id);
    setError(null);
    try {
      const jaTem = adicionados[monstro.id] ?? 0;
      for (let i = 1; i <= quantidade; i += 1) {
        // Com mais de uma cópia (ou depois de já ter adicionado uma), numera para não ficar tudo com o mesmo nome.
        await onPick(monstro, quantidade > 1 || jaTem > 0 ? jaTem + i : undefined);
      }
      setAdicionados((atual) => ({ ...atual, [monstro.id]: jaTem + quantidade }));
    } catch (falha) {
      setError(falha instanceof Error ? falha.message : 'Não foi possível adicionar esta criatura.');
    } finally {
      setBusy(null);
    }
  };

  if (typeof document === 'undefined') return null;

  // O filtro ligado tem que saltar aos olhos: fundo dourado cheio e um check.
  const botaoFiltro = (ativo: boolean) => `flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
    ativo ? 'border-[#e3c363] bg-[#c7a44c] text-black shadow-[0_0_12px_rgba(199,164,76,0.35)]' : 'border-white/10 bg-white/[0.02] text-white/55 hover:border-white/30 hover:text-white'
  }`;
  const marca = (ativo: boolean) => (ativo ? <Check size={11} strokeWidth={3} aria-hidden="true" /> : null);

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
      aria-labelledby="bestiario-picker-title"
    >
      <motion.div
        initial={{ scale: 0.97, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97, y: 12 }}
        onClick={(event) => event.stopPropagation()}
        className="modal-surface flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0c12] shadow-2xl"
        style={{ height: 'min(46rem, 100%)' }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div>
            <h3 id="bestiario-picker-title" className="flex items-center gap-2 text-lg font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              <Skull size={18} className="text-[#c7a44c]" /> Bestiário
            </h3>
            <p className="mt-0.5 text-xs text-white/40">Escolha as criaturas da cena. A janela fica aberta para você montar o encontro inteiro.</p>
          </div>
          <div className="flex items-center gap-2">
            {totalAdicionados > 0 ? <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">{totalAdicionados} na cena</span> : null}
            <button type="button" onClick={onCancel} className="flex h-10 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-bold text-white/70 hover:bg-white/5 hover:text-white" aria-label="Concluir e fechar">
              {totalAdicionados > 0 ? <><Check size={14} /> Concluir</> : <X size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-3 border-b border-white/[0.08] px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-white/10 p-0.5" role="tablist" aria-label="Tipo de criatura">
              {(['criaturas', ...(deidades.length ? ['deidades' as const] : []), 'sobmedida'] as const).map((valor) => (
                <button key={valor} type="button" role="tab" aria-selected={aba === valor} onClick={() => setAba(valor)} className={`rounded-md px-3 py-1.5 text-xs font-bold ${aba === valor ? 'bg-[#c7a44c]/18 text-[#f0d685]' : 'text-white/45 hover:text-white/80'}`}>
                  {valor === 'criaturas' ? `Criaturas · ${criaturas.length}` : valor === 'deidades' ? `Deidades · ${deidades.length}` : 'Sob medida'}
                </button>
              ))}
            </div>
            {aba === 'criaturas' ? (
            <>
            <div className="relative min-w-[12rem] flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar criatura pelo nome..." className="h-10 w-full rounded-lg border border-white/10 bg-black/30 pl-9 pr-3 text-sm text-white outline-none focus:border-[#c7a44c]/50" />
            </div>
            <Select
              value={ordem}
              onChange={(valor) => setOrdem(valor as 'nome' | 'vd')}
              ariaLabel="Ordenar"
              options={[
                { value: 'nome', label: 'Ordem: nome' },
                { value: 'vd', label: 'Ordem: mais fracas primeiro' },
              ]}
              menuMinWidth={220}
              className="!h-10 !min-h-0 w-auto min-w-[11rem] rounded-lg border-white/10 bg-black/30 !py-0 px-3 text-xs font-semibold text-white/80"
            />
            <Select
              value={familiaFiltro}
              onChange={setFamiliaFiltro}
              ariaLabel="Família"
              options={[
                { value: '', label: 'Todas as famílias' },
                { value: 'unicas', label: 'Criaturas únicas', labelClassName: 'text-[#f0d685]' },
                ...familiasDisponiveis.map((familia) => ({ value: familia.id, label: familia.titulo })),
              ]}
              menuMinWidth={220}
              className={`!h-10 !min-h-0 w-auto min-w-[11rem] rounded-lg !py-0 px-3 text-xs font-semibold ${familiaFiltro ? '!border-[#e3c363] !bg-[#c7a44c]/20 text-[#f6e3a1]' : 'border-white/10 bg-black/30 text-white/80'}`}
            />
            </>
            ) : null}
          </div>

          {aba === 'criaturas' ? (
          <div className="custom-scrollbar flex gap-1.5 overflow-x-auto pb-1">
            {FAIXAS.map((item) => <button key={item.id} type="button" aria-pressed={faixa === item.id} onClick={() => setFaixa(item.id)} className={botaoFiltro(faixa === item.id)}>{marca(faixa === item.id)}{item.rotulo}</button>)}
            {aba === 'criaturas' && categoriasDisponiveis.length ? <span className="mx-1 w-px shrink-0 self-stretch bg-white/10" aria-hidden="true" /> : null}
            {aba === 'criaturas' && categoriasDisponiveis.length ? (
              <>
                <button type="button" aria-pressed={categoriaFiltro === null} onClick={() => setCategoriaFiltro(null)} className={botaoFiltro(categoriaFiltro === null)}>{marca(categoriaFiltro === null)}Todas</button>
                {categoriasDisponiveis.map((categoria) => <button key={categoria} type="button" aria-pressed={categoriaFiltro === categoria} onClick={() => setCategoriaFiltro(categoriaFiltro === categoria ? null : categoria)} className={botaoFiltro(categoriaFiltro === categoria)}>{marca(categoriaFiltro === categoria)}{categoria}</button>)}
              </>
            ) : null}
          </div>
          ) : null}
          {aba === 'criaturas' && !loading ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px]" role="status">
              <span className="font-semibold text-white/70">{filtrados.length} de {criaturas.length} criaturas</span>
              {filtrosLigados.length ? (
                <>
                  <span className="text-white/30">filtrando por</span>
                  {filtrosLigados.map((filtro) => <span key={filtro} className="rounded-md bg-[#c7a44c]/15 px-1.5 py-0.5 font-semibold text-[#f0d685]">{filtro}</span>)}
                  <button type="button" onClick={limparFiltros} className="ml-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold text-white/50 hover:bg-white/5 hover:text-white">
                    <X size={11} /> Limpar filtros
                  </button>
                </>
              ) : <span className="text-white/30">· clique numa criatura para ver a ficha completa</span>}
            </div>
          ) : null}
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {error ? <p role="alert" className="mb-3 rounded-md bg-red-400/10 px-3 py-2 text-xs text-red-200">{error}</p> : null}
          {aba === 'deidades' ? (
            <div className="space-y-4">
              <p className="flex items-start gap-1.5 text-xs leading-5 text-white/45">
                <Sparkles size={14} className="mt-0.5 shrink-0 text-[#c7a44c]/70" />
                Fichas do teto do Jardim, só para o Mestre. Cada uma entra com os números fora do Domínio (VD 500); para levá-la ao Domínio, use "Escalar para outro VD" no editor e ponha 1000 (A.X.I.S fica um degrau abaixo: entra no VD 400 e vai a 800). O campo Estado da ficha revela segredos: deixe a visibilidade em Oculto ou Desconhecido até a história pedir.
              </p>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {deidades.map((monstro) => (
                  <Cartao key={monstro.id} monstro={monstro} adicionados={adicionados[monstro.id] ?? 0} ocupado={busy === monstro.id} onAdicionar={(m, quantidade) => void adicionar(m, quantidade)} onAbrir={setAberto} />
                ))}
              </ul>
            </div>
          ) : aba === 'sobmedida' ? (
            <div className="mx-auto max-w-xl space-y-4">
              <p className="flex items-start gap-1.5 text-xs leading-5 text-white/45">
                <Sparkles size={14} className="mt-0.5 shrink-0 text-[#c7a44c]/70" />
                Uma criatura para qualquer VD (o nível do grupo que ela desafia sozinha), com Vida, Defesa, ataques e testes já na conta. Depois de adicionar, troque o nome e um traço no editor (ícone de lápis).
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-[10px] uppercase tracking-wider text-white/40">
                  VD
                  <input
                    type="number"
                    min={1}
                    max={VD_MAXIMO}
                    value={vdSobMedida}
                    onChange={(evento) => setVdSobMedida(evento.target.value)}
                    aria-label="Valor de Desafio da criatura"
                    className="mt-1 block h-10 w-28 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-[#c7a44c]/50"
                  />
                </label>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Papel da criatura">
                  {ORDEM_DOS_PAPEIS.map((papel) => (
                    <button key={papel} type="button" aria-pressed={papelSobMedida === papel} onClick={() => setPapelSobMedida(papel)} className={botaoFiltro(papelSobMedida === papel)}>
                      {PAPEIS_CRIATURA[papel].rotulo}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jeito de lutar">
                {ORDEM_DOS_ARQUETIPOS.map((arquetipo) => (
                  <button key={arquetipo} type="button" aria-pressed={arquetipoSobMedida === arquetipo} onClick={() => setArquetipoSobMedida(arquetipo)} title={ARQUETIPOS_CRIATURA[arquetipo].descricao} className={botaoFiltro(arquetipoSobMedida === arquetipo)}>
                    {ARQUETIPOS_CRIATURA[arquetipo].rotulo}
                  </button>
                ))}
              </div>
              <p className="text-[11px] leading-5 text-white/40">{ARQUETIPOS_CRIATURA[arquetipoSobMedida].descricao}</p>
              <ul>
                <Cartao monstro={sobMedida} adicionados={adicionados[sobMedida.id] ?? 0} ocupado={busy === sobMedida.id} onAdicionar={(m, quantidade) => void adicionar(m, quantidade)} />
              </ul>
              <p className="text-[11px] leading-5 text-white/35">
                Lacaio, inimigo padrão e elite ocupam uma fatia do encontro (10%, 25% e 50% da Vida de um encontro padrão); chefe é o encontro inteiro e anuncia um golpe forte; solo é a criatura que basta sozinha, como as do Bestiário.
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-white/40"><RefreshCw className="mr-2 animate-spin" size={15} /> Carregando o Bestiário…</div>
          ) : filtrados.length === 0 ? (
            <p className="py-14 text-center text-sm text-white/35">Nenhuma criatura com esses filtros.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtrados.map((monstro) => (
                <Cartao key={monstro.id} monstro={monstro} adicionados={adicionados[monstro.id] ?? 0} ocupado={busy === monstro.id} onAdicionar={(m, quantidade) => void adicionar(m, quantidade)} onAbrir={setAberto} />
              ))}
            </ul>
          )}
        </div>
      </motion.div>
      {aberto ? (
        <CriaturaDetalhe
          campanhaId={campanhaId}
          monstro={aberto}
          familia={aberto.familia ? TITULO_DA_FAMILIA[aberto.familia] ?? aberto.familia : null}
          cor={corDoVd(aberto.vd)}
          adicionados={adicionados[aberto.id] ?? 0}
          ocupado={busy === aberto.id}
          onAdicionar={(m, quantidade) => void adicionar(m, quantidade)}
          onFechar={() => setAberto(null)}
        />
      ) : null}
    </motion.div>,
    document.body,
  );
};
