import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookMarked, ChevronRight, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import catalogoLoja from '../../../../data/loja/catalogo.json';
import { useDialogAccessibility } from '../../../hooks/useDialogAccessibility';
import { useIsMobileViewport } from '../../../hooks/useMediaQuery';
import {
  ENCANTAMENTOS_CATALOGO,
  FLUXOS_CATALOGO,
  FLUXOS_POR_ID,
  FUSOES_CATALOGO,
  MAGIAS_CATALOGO,
  RITUAIS_CATALOGO,
  SELOS_CATALOGO,
  SIMBOLOS_POR_ID,
  circuloRotulo,
  simbolosDoRito,
  temaDoFluxo,
  variantesDaMagia,
  type FluxoDeMagia,
  type IIngredienteRitual,
} from '../../../services/magiaService';
import { getCurrencySymbol, lerPrecoNativoLoja, rotuloRaridadeChave } from '../../../services/lojaCatalogService';

type AbaCatalogo = 'magias' | 'rituais' | 'selos' | 'encantamentos' | 'fusoes';

/** Só os itens tipo "drop" (categoria Componentes da loja) servem de ingrediente
 * de ritual - são o que existe hoje pra "partes de seres" e reagentes avulsos. */
const COMPONENTES_POR_ID = new Map(
  (catalogoLoja.entradas as Array<{ id: string; titulo: string; tipo: string; conteudo: Record<string, unknown> }>)
    .filter((entrada) => entrada.tipo === 'drop')
    .map((entrada) => [entrada.id, entrada]),
);

interface IngredienteResolvido {
  id: string;
  titulo: string;
  quantidade: number;
  precoTexto: string;
  raridade: string;
}

/** Resolve os ids gravados no ritual contra o catálogo da loja, pra sempre
 * mostrar preço e raridade atuais em vez de duplicar esse dado no rito. */
function resolverIngredientes(ingredientes?: IIngredienteRitual[]): IngredienteResolvido[] {
  if (!ingredientes?.length) return [];
  return ingredientes.flatMap((ingrediente) => {
    const entrada = COMPONENTES_POR_ID.get(ingrediente.item_id);
    if (!entrada) return [];
    const preco = lerPrecoNativoLoja(entrada.conteudo.preco);
    return [{
      id: ingrediente.item_id,
      titulo: entrada.titulo,
      quantidade: ingrediente.quantidade,
      precoTexto: preco ? `${preco.valorOriginal.toLocaleString('pt-BR')} ${getCurrencySymbol(preco.moedaPreco)}` : '?',
      raridade: rotuloRaridadeChave(entrada.conteudo.raridade),
    }];
  });
}

interface CampoGrimorio {
  rotulo: string;
  valor: string | number;
}

interface LinhaSimbolo {
  id: string;
  titulo: string;
  relacao: string;
  bonus: string[];
  onus: string[];
}

interface GrimorioItem {
  id: string;
  titulo: string;
  fluxoId: FluxoDeMagia;
  categoria: string;
  chamada: string;
  /** O que a coisa é, antes dos números. As Fusões são a única aba sem ele. */
  descricao?: string;
  efeito: string;
  campos: CampoGrimorio[];
  complemento?: CampoGrimorio[];
  aviso?: string;
  circulo?: number;
  /** Só nos dois ritos dos Sete: o que cada Símbolo concedido por aquele rito
   * dá e cobra. Fica junto do ritual em vez de numa página de regras à parte. */
  simbolos?: LinhaSimbolo[];
  /** Só nos rituais: materiais compráveis na Loja (Componentes) que o rito consome. */
  ingredientes?: IngredienteResolvido[];
}

const CIRCULOS = Array.from({ length: 10 }, (_, indice) => indice + 1);

const ITENS_POR_ABA: Record<AbaCatalogo, GrimorioItem[]> = {
  magias: MAGIAS_CATALOGO.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    fluxoId: item.fluxo,
    categoria: circuloRotulo(item.circulo),
    chamada: `${item.papel} · ${item.custo_mana} Mana`,
    descricao: item.descricao,
    efeito: item.efeito,
    campos: [
      { rotulo: 'Execução', valor: item.execucao },
      { rotulo: 'Alcance', valor: item.alcance },
      { rotulo: 'Alvo', valor: item.alvo },
      { rotulo: 'Duração', valor: item.duracao },
      { rotulo: 'Concentração', valor: item.concentracao ? 'Sim' : 'Não' },
      { rotulo: 'Defesa', valor: item.defesa || 'Nenhuma' },
    ],
    complemento: [
      ...(item.dano ? [{ rotulo: 'Dano', valor: item.dano }] : []),
      // No livro de referência a universal mostra as onze manifestações; na
      // ficha aparece só a do Fluxo de quem conjura.
      ...variantesDaMagia(item).map((variante) => ({
        rotulo: `Canalizada por ${variante.fluxo.titulo}`,
        valor: variante.efeito,
      })),
    ],
    aviso: item.aviso_mestre,
    circulo: typeof item.circulo === 'number' ? item.circulo : undefined,
  })),
  rituais: RITUAIS_CATALOGO.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    fluxoId: item.fluxo,
    categoria: 'Ritual',
    chamada: `${item.complexidade} · DT ${item.dt} · ${item.custo_mana} Mana`,
    descricao: item.descricao,
    efeito: item.efeito,
    campos: [
      { rotulo: 'Tempo', valor: item.tempo },
      { rotulo: 'Complexidade', valor: item.complexidade },
      { rotulo: 'DT', valor: item.dt },
      { rotulo: 'Mana', valor: item.custo_mana },
    ],
    complemento: [
      { rotulo: 'Requisito', valor: item.requisito },
      { rotulo: 'Falha', valor: item.falha },
    ],
    aviso: item.aviso_mestre,
    ingredientes: resolverIngredientes(item.ingredientes),
    simbolos: simbolosDoRito(item.id).map((simbolo) => ({
      id: simbolo.id,
      titulo: simbolo.titulo,
      relacao: simbolo.natureza === 'pecado'
        ? `Apagado por ${SIMBOLOS_POR_ID.get(simbolo.opostoId)?.titulo || '?'}`
        : `Apaga ${SIMBOLOS_POR_ID.get(simbolo.opostoId)?.titulo || '?'}`,
      bonus: simbolo.bonus,
      onus: simbolo.onus,
    })),
  })),
  selos: SELOS_CATALOGO.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    fluxoId: item.fluxo,
    categoria: `Selo de Grau ${item.grau}`,
    chamada: `DT ${item.dt_inscricao} · ${item.custo_mana} Mana`,
    descricao: item.descricao,
    efeito: item.efeito,
    campos: [
      { rotulo: 'Tempo de inscrição', valor: item.tempo },
      { rotulo: 'Grau', valor: item.grau },
      { rotulo: 'DT', valor: item.dt_inscricao },
      { rotulo: 'Mana', valor: item.custo_mana },
    ],
    complemento: [{ rotulo: 'Ativação', valor: item.ativacao }],
    aviso: item.aviso_mestre,
  })),
  encantamentos: ENCANTAMENTOS_CATALOGO.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    fluxoId: item.fluxo,
    categoria: `Encantamento de Grau ${item.grau}`,
    chamada: `DT ${item.dt} · ${item.custo_mana} Mana`,
    descricao: item.descricao,
    efeito: item.efeito,
    campos: [
      { rotulo: 'Tempo', valor: item.tempo },
      { rotulo: 'Aplicação', valor: item.aplicacao },
      { rotulo: 'DT', valor: item.dt },
      { rotulo: 'Mana', valor: item.custo_mana },
    ],
    aviso: item.aviso_mestre,
  })),
  fusoes: FUSOES_CATALOGO.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    fluxoId: item.fluxo_secundario,
    categoria: 'Assinatura de fusão',
    chamada: `Fluxo secundário: ${FLUXOS_POR_ID.get(item.fluxo_secundario)?.titulo || item.fluxo_secundario}`,
    efeito: item.efeito,
    campos: [
      { rotulo: 'Fluxo secundário', valor: FLUXOS_POR_ID.get(item.fluxo_secundario)?.titulo || item.fluxo_secundario },
      { rotulo: 'Limite', valor: 'Um Fluxo secundário por magia' },
    ],
  })),
};

const ABAS: Array<{ id: AbaCatalogo; titulo: string }> = [
  { id: 'magias', titulo: 'Magias' },
  { id: 'rituais', titulo: 'Rituais' },
  { id: 'selos', titulo: 'Selos' },
  { id: 'encantamentos', titulo: 'Encantamentos' },
  { id: 'fusoes', titulo: 'Fusões' },
];

const rotuloDoFluxo = (fluxoId: FluxoDeMagia): string => (fluxoId === 'universal'
  ? 'Universal'
  : FLUXOS_POR_ID.get(fluxoId)?.titulo || fluxoId);

const FluxoBadge = ({ fluxoId }: { fluxoId: FluxoDeMagia }) => {
  const tema = temaDoFluxo(fluxoId);
  const rotulo = rotuloDoFluxo(fluxoId);
  return (
    <span
      className="inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]"
      style={{
        backgroundColor: tema.fundo,
        borderColor: tema.borda,
        color: tema.texto,
        boxShadow: `0 0 14px ${tema.brilho}`,
      }}
      title={fluxoId === 'universal'
        ? 'Magia universal: qualquer Fluxo aprende, e o efeito muda conforme quem canaliza'
        : `Fluxo de ${rotulo} · ${tema.arvore}`}
    >
      {rotulo}
    </span>
  );
};

const GrimorioDetail = ({ item, compacto = false }: { item: GrimorioItem; compacto?: boolean }) => {
  const tema = temaDoFluxo(item.fluxoId);
  return (
  <article
    className={`overflow-hidden rounded-2xl border bg-[#15121b] shadow-xl ${compacto ? '' : 'sticky top-24'}`}
    style={{ borderColor: tema.borda, boxShadow: `0 18px 45px rgba(0,0,0,.32), 0 0 24px ${tema.brilho}` }}
  >
    <header
      className="border-b p-5 sm:p-6"
      style={{ borderColor: tema.borda, background: `linear-gradient(135deg, ${tema.fundo}, transparent 70%)` }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: tema.destaque }}>{item.categoria}</span>
        <FluxoBadge fluxoId={item.fluxoId} />
      </div>
      <h3 className="text-2xl font-bold leading-tight text-[#f2ead7] sm:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>{item.titulo}</h3>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{item.chamada}</p>
    </header>

    <div className="p-5 sm:p-6">
      {item.descricao && (
        <p className="mb-5 border-l-2 pl-4 text-sm italic leading-7 text-gray-400 sm:text-[15px]" style={{ borderColor: tema.borda }}>
          {item.descricao}
        </p>
      )}

      <dl className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2">
        {item.campos.map((campo) => (
          <div key={campo.rotulo} className="bg-[#100e15] px-4 py-3">
            <dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-gray-600">{campo.rotulo}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-gray-300">{campo.valor}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-6">
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: tema.destaque }}>Efeito</h4>
        <p className="text-sm leading-7 text-gray-300 sm:text-[15px]">{item.efeito}</p>
      </section>

      {item.complemento?.map((campo) => (
        <section key={campo.rotulo} className="mt-5 border-l-2 pl-4" style={{ borderColor: tema.borda }}>
          <h4 className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-500">{campo.rotulo}</h4>
          <p className="text-sm leading-6 text-gray-300">{campo.valor}</p>
        </section>
      ))}

      {item.ingredientes?.length ? (
        <section className="mt-6">
          <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: tema.destaque }}>
            Ingredientes (Componentes da Loja)
          </h4>
          <ul className="space-y-1.5">
            {item.ingredientes.map((ingrediente) => (
              <li
                key={ingrediente.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs"
              >
                <span className="text-gray-300">
                  {ingrediente.titulo} <span className="text-gray-600">×{ingrediente.quantidade}</span>
                </span>
                <span className="whitespace-nowrap text-[10px] uppercase tracking-wide text-gray-500">
                  {ingrediente.precoTexto} · {ingrediente.raridade}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {item.simbolos?.length ? (
        <section className="mt-6">
          <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: tema.destaque }}>
            O que cada Símbolo dá e cobra
          </h4>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  <th className="p-3">Símbolo</th>
                  <th className="p-3">O que dá</th>
                  <th className="p-3">O que cobra</th>
                </tr>
              </thead>
              <tbody>
                {item.simbolos.map((simbolo) => (
                  <tr key={simbolo.id} className="border-b border-white/5 align-top last:border-0">
                    <td className="p-3">
                      <strong className="text-sm text-white">{simbolo.titulo}</strong>
                      <span className="mt-1 block text-[10px] text-gray-500">{simbolo.relacao}</span>
                    </td>
                    <td className="p-3">
                      <ul className="space-y-1.5">
                        {simbolo.bonus.map((texto) => <li key={texto} className="text-xs leading-relaxed text-emerald-300">{texto}</li>)}
                      </ul>
                    </td>
                    <td className="p-3">
                      <ul className="space-y-1.5">
                        {simbolo.onus.map((texto) => <li key={texto} className="text-xs leading-relaxed text-red-300">{texto}</li>)}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {item.aviso ? (
        <p className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">{item.aviso}</p>
      ) : null}
    </div>
  </article>
  );
};

interface GrimorioListItemProps {
  active: boolean;
  item: GrimorioItem;
  onSelect: (id: string) => void;
}

const GrimorioListItem = memo(({ active, item, onSelect }: GrimorioListItemProps) => {
  const tema = temaDoFluxo(item.fluxoId);
  return (
  <button
    type="button"
    onClick={() => onSelect(item.id)}
    aria-pressed={active}
    className="content-auto-list-item group flex w-full items-center gap-3 border-b border-white/5 px-4 py-3.5 text-left transition-colors hover:bg-white/5"
    style={{ backgroundColor: active ? tema.fundo : undefined }}
  >
    <span
      className="h-8 w-1 shrink-0 rounded-full transition-opacity"
      style={{ backgroundColor: tema.destaque, opacity: active ? 1 : 0.35, boxShadow: active ? `0 0 12px ${tema.brilho}` : undefined }}
    />
    <span className="min-w-0 flex-1">
      <strong className={`block truncate text-sm ${active ? '' : 'text-gray-300 group-hover:text-white'}`} style={{ color: active ? tema.texto : undefined }}>{item.titulo}</strong>
      <small className="mt-1 block truncate text-[10px] uppercase tracking-wider text-gray-600">
        {rotuloDoFluxo(item.fluxoId)} · {item.categoria}
      </small>
    </span>
    <ChevronRight size={15} className={active ? '' : 'text-gray-700 group-hover:text-gray-400'} style={{ color: active ? tema.destaque : undefined }} />
  </button>
  );
});

export const CatalogoMagico = () => {
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const [aba, setAba] = useState<AbaCatalogo>('magias');
  const [busca, setBusca] = useState('');
  const [fluxo, setFluxo] = useState<FluxoDeMagia | 'todos'>('todos');
  const [circulo, setCirculo] = useState<number | 'todos'>('todos');
  const [selecionadoId, setSelecionadoId] = useState('');
  const [detalheMovelAberto, setDetalheMovelAberto] = useState(false);
  const isMobile = useIsMobileViewport();
  useDialogAccessibility({
    open: detalheMovelAberto && isMobile,
    dialogRef: mobileDialogRef,
    initialFocusRef: mobileCloseRef,
    onClose: () => setDetalheMovelAberto(false),
  });
  const buscaAdiada = useDeferredValue(busca.trim().toLocaleLowerCase('pt-BR'));
  const itensAba = ITENS_POR_ABA[aba];

  const itensVisiveis = useMemo(() => itensAba.filter((item) => {
    if (fluxo !== 'todos' && item.fluxoId !== fluxo && item.fluxoId !== 'universal') return false;
    if (circulo !== 'todos' && item.circulo !== circulo) return false;
    if (!buscaAdiada) return true;
    const texto = [
      item.titulo,
      item.categoria,
      item.chamada,
      item.descricao || '',
      item.efeito,
      ...item.campos.flatMap((campo) => [campo.rotulo, campo.valor]),
    ].join(' ').toLocaleLowerCase('pt-BR');
    return texto.includes(buscaAdiada);
  }), [buscaAdiada, circulo, fluxo, itensAba]);

  const selecionado = itensVisiveis.find((item) => item.id === selecionadoId) || itensVisiveis[0] || null;

  useEffect(() => {
    if (!detalheMovelAberto) return undefined;
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetalheMovelAberto(false);
    };
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [detalheMovelAberto]);

  const selecionar = useCallback((id: string) => {
    setSelecionadoId(id);
    if (isMobile) setDetalheMovelAberto(true);
  }, [isMobile]);

  const trocarAba = (novaAba: AbaCatalogo) => {
    setAba(novaAba);
    setSelecionadoId('');
    setDetalheMovelAberto(false);
    if (novaAba !== 'magias') setCirculo('todos');
  };

  return (
    <section className="mt-16 border-t border-[#c7a44c]/20 pt-10" aria-labelledby="catalogo-magico-titulo">
      <header className="mb-7">
        <span className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c7a44c]">
          <BookMarked size={15} /> Grimório
        </span>
        <h2 id="catalogo-magico-titulo" className="text-3xl font-bold text-[#f2ead7] sm:text-4xl" style={{ fontFamily: 'Cinzel, serif' }}>Catálogo mágico</h2>
        <p className="mt-3 max-w-[72ch] text-sm leading-7 text-gray-500">
          Escolha uma manifestação na lista para consultar seus detalhes sem precisar atravessar dezenas de cartões completos.
        </p>
      </header>

      <div className="sticky top-0 z-30 -mx-2 mb-5 border-y border-white/10 bg-[#111017]/95 px-2 py-3 shadow-xl backdrop-blur-xl">
        <div className="custom-scrollbar flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Formas de manifestação mágica">
          {ABAS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={aba === item.id}
              onClick={() => trocarAba(item.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${aba === item.id
                ? 'bg-[#c7a44c]/20 text-[#e4ca83]'
                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
            >
              {item.titulo} <span className="ml-1 opacity-50">{ITENS_POR_ABA[item.id].length}</span>
            </button>
          ))}
        </div>
        <div className={`mt-2 grid gap-2 ${aba === 'magias' ? 'sm:grid-cols-[1fr_210px_190px]' : 'sm:grid-cols-[1fr_210px]'}`}>
          <label className="relative block">
            <span className="sr-only">Buscar no grimório</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
            <input
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar nome, regra ou efeito..."
              className="w-full rounded-lg border border-white/10 bg-black/25 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-[#c7a44c]/40"
            />
          </label>
          <label className="relative block">
            <span className="sr-only">Filtrar por Fluxo</span>
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={15} />
            <select
              value={fluxo}
              onChange={(event) => setFluxo(event.target.value as FluxoDeMagia | 'todos')}
              className="w-full appearance-none rounded-lg border border-white/10 bg-[#0c0b10] py-2.5 pl-9 pr-8 text-sm text-gray-300 outline-none focus:border-[#c7a44c]/40"
            >
              <option value="todos">Todos os Fluxos</option>
              {FLUXOS_CATALOGO.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}
              <option value="universal">Universal</option>
            </select>
          </label>
          {aba === 'magias' ? (
            <label className="relative block">
              <span className="sr-only">Filtrar por círculo</span>
              <Sparkles className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={15} />
              <select
                value={String(circulo)}
                onChange={(event) => setCirculo(event.target.value === 'todos' ? 'todos' : Number(event.target.value))}
                className="w-full appearance-none rounded-lg border border-white/10 bg-[#0c0b10] py-2.5 pl-9 pr-8 text-sm text-gray-300 outline-none focus:border-[#c7a44c]/40"
              >
                <option value="todos">Todos os círculos</option>
                {CIRCULOS.map((item) => <option key={item} value={item}>{circuloRotulo(item as 1)}</option>)}
              </select>
            </label>
          ) : null}
        </div>
        <p className="mt-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-700">{itensVisiveis.length} resultado(s)</p>
      </div>

      {itensVisiveis.length && selecionado ? (
        <div className="grid items-start gap-5 md:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <div className="custom-scrollbar md:max-h-[min(66dvh,680px)] md:overflow-y-auto">
              {itensVisiveis.map((item) => (
                <GrimorioListItem key={item.id} item={item} active={selecionado.id === item.id} onSelect={selecionar} />
              ))}
            </div>
          </div>
          <div className="hidden md:block"><GrimorioDetail item={selecionado} /></div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center">
          <Sparkles className="mx-auto mb-3 text-gray-700" size={32} />
          <p className="text-sm text-gray-500">Nenhuma entrada encontrada com estes filtros.</p>
        </div>
      )}

      {detalheMovelAberto && selecionado ? createPortal(
        <div ref={mobileDialogRef} className="modal-viewport fixed inset-0 z-[100] flex items-end bg-black/80 backdrop-blur-sm md:hidden" role="dialog" aria-modal="true" aria-labelledby="detalhe-grimorio-titulo">
          <button type="button" aria-label="Fechar detalhes" onClick={() => setDetalheMovelAberto(false)} className="absolute inset-0" />
          <div className="modal-surface custom-scrollbar relative z-10 w-full overflow-y-auto rounded-2xl">
            <button ref={mobileCloseRef} type="button" onClick={() => setDetalheMovelAberto(false)} aria-label="Fechar detalhes" className="absolute right-4 top-4 z-20 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-black/50 text-gray-300"><X size={17} /></button>
            <div id="detalhe-grimorio-titulo" className="sr-only">Detalhes de {selecionado.titulo}</div>
            <GrimorioDetail item={selecionado} compacto />
          </div>
        </div>,
        document.body,
      ) : null}
    </section>
  );
};
