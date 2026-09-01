import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Compass,
  GitBranch,
  History,
  Lock,
  MapPin,
  Network,
  Orbit,
  Sparkles,
} from 'lucide-react';
import type { LoreEntry } from '../../../../data/gerado/mundoCatalog';
import { VAZIO_ID } from '../../../../data/mundo/arvoresCatalog';
import { secaoCronicaOculta, eventoCronicaOculto } from '../chronicleVisibility';
import { loreBloqueado } from '../loreVisibility';
import {
  buildTreeCodex,
  findCodexEntry,
  findCodexNode,
  type WorldCodexNode,
} from '../worldCodex';
import { getTreeChronicle, type WorldChronicleCatalog } from '../worldChronicles';
import { ChronicleTimeline } from './ChronicleTimeline';

interface TreeCodexPageProps {
  treeId: string;
  treeName: string;
  color: string;
  catalog: LoreEntry[];
  chronicles: WorldChronicleCatalog;
  entryType?: string;
  entryId?: string;
  isMestre: boolean;
  loreRevelado: string[];
  loreOculto: string[];
  cronicaSecoesOcultas: string[];
  cronicaEventosOcultos: string[];
  onBack: () => void;
  onOpenOverview: () => void;
  onOpenGlobalTimeline?: () => void;
  onOpenEntry: (entry: LoreEntry) => void;
}

const TYPE_LABELS: Record<string, string> = {
  conceito: 'Conceito universal',
  deidade: 'Deidade',
  dimensao: 'Dimensão',
  evento: 'Evento',
  fluxo: 'Fluxo',
  galho: 'Galho',
  local: 'Local',
  personagem: 'Personagem',
  reino: 'Reino',
};

const FIELD_LABELS: Record<string, string> = {
  caracteristicas: 'Características',
  citacao: 'Citação',
  cor: 'Cor',
  dominio: 'Domínio',
  envolvido: 'Envolvido',
  envolvidos: 'Envolvidos',
  epiteto: 'Epíteto',
  era: 'Era',
  falas: 'Falas registradas',
  fundacao: 'Fundação',
  genero: 'Gênero',
  governo: 'Governo',
  mandamentos: 'Mandamentos',
  marca_corporal: 'Marca corporal',
  nota: 'Nota',
  status: 'Estado',
  subjugado_por: 'Subjugado por',
};

const STRUCTURAL_FIELDS = new Set([
  'arvore',
  'arvores',
  'descricao',
  'dimensao',
  'fluxo',
  'galho',
  'local_pai',
  'no_vazio',
]);

const entryKey = (entry: LoreEntry) => `${entry.tipo}:${entry.id}`;
const typeLabel = (type: string) => TYPE_LABELS[type] || type.replace(/_/g, ' ');
const fieldLabel = (field: string) => FIELD_LABELS[field] || field.replace(/_/g, ' ');

const paragraphs = (value: unknown): string[] => (
  typeof value === 'string' ? value.split(/\n\s*\n/).filter(Boolean) : []
);

const displayValue = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)));
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return [String(value)];
  return [];
};

const DetailFields = ({ entry }: { entry: LoreEntry }) => {
  const fields = Object.entries(entry.conteudo as Record<string, unknown>)
    .filter(([key, value]) => (
      !STRUCTURAL_FIELDS.has(key)
      && key !== 'corpoMestre'
      && !key.startsWith('_')
      && displayValue(value).length > 0
    ));
  if (fields.length === 0) return null;
  return (
    <dl className="mt-8 grid gap-3 sm:grid-cols-2">
      {fields.map(([key, value]) => (
        <div key={key} className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">{fieldLabel(key)}</dt>
          <dd className="mt-2 space-y-2 text-sm leading-6 text-gray-300">
            {displayValue(value).map((line, index) => <p key={`${key}-${index}`}>{line}</p>)}
          </dd>
        </div>
      ))}
    </dl>
  );
};

/** Ordem de abertura pedida pelo botão "expandir/recolher tudo". O `nonce` faz
 * cada clique valer mesmo quando o alvo repete, e começa em 0 pra que o estado
 * inicial de cada linha (raiz aberta, resto fechado) não seja atropelado logo
 * na primeira renderização. */
interface OrdemDeAbertura {
  aberto: boolean;
  nonce: number;
}

const subtreeHas = (node: WorldCodexNode, target?: LoreEntry): boolean => {
  if (!target) return false;
  if (node.entry.tipo === target.tipo && node.entry.id === target.id) return true;
  return node.children.some((child) => subtreeHas(child, target));
};

interface NodeListProps {
  nodes: WorldCodexNode[];
  color: string;
  locked: ReadonlyMap<string, boolean>;
  onSelect: (entry: LoreEntry) => void;
  selected?: LoreEntry;
  ordem: OrdemDeAbertura;
  depth?: number;
}

const CodexRow = ({ node, color, locked, onSelect, selected, ordem, depth }: NodeListProps & { node: WorldCodexNode; depth: number }) => {
  const isLocked = locked.get(entryKey(node.entry)) === true;
  const hasChildren = !isLocked && node.children.length > 0;
  // O caminho até o registro aberto no momento fica visível sozinho, pra que
  // clicar num Reino não deixe o mapa mostrando um galho que não é o dele.
  const noCaminho = subtreeHas(node, selected);
  const [aberto, setAberto] = useState(depth === 0 || noCaminho);
  const isSelected = Boolean(selected && selected.tipo === node.entry.tipo && selected.id === node.entry.id);

  useEffect(() => {
    if (noCaminho) setAberto(true);
  }, [noCaminho]);

  useEffect(() => {
    if (ordem.nonce > 0) setAberto(ordem.aberto);
  }, [ordem]);

  return (
    <div className="mb-0.5">
      <div className="flex items-center">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setAberto((valor) => !valor)}
            aria-expanded={aberto}
            aria-label={`${aberto ? 'Recolher' : 'Expandir'} ${node.entry.titulo}`}
            className="shrink-0 rounded-lg p-1.5 text-gray-600 transition hover:bg-white/5 hover:text-gray-200"
          >
            <ChevronRight size={13} className={`transition-transform duration-150 ${aberto ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="w-[25px] shrink-0" aria-hidden="true" />
        )}
        <button
          type="button"
          disabled={isLocked}
          onClick={() => onSelect(node.entry)}
          className={`group flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-white/5 disabled:cursor-not-allowed ${isSelected ? 'bg-white/[0.07]' : ''}`}
        >
          <span className="h-6 w-1 shrink-0 rounded-full" style={{ backgroundColor: isLocked ? '#4b5563' : color, opacity: isSelected ? 1 : 0.6 }} />
          <span className="min-w-0 flex-1">
            <strong className={`block truncate text-sm ${isSelected ? 'text-white' : 'text-gray-200'}`}>
              {isLocked ? 'Registro oculto' : node.entry.titulo}
            </strong>
            <small className="block text-[9px] font-bold uppercase tracking-widest text-gray-600">
              {isLocked ? 'Não revelado' : typeLabel(node.entry.tipo)}
              {hasChildren && !aberto ? ` · ${node.children.length}` : ''}
            </small>
          </span>
          {isLocked ? <Lock size={13} className="shrink-0 text-gray-700" /> : null}
        </button>
      </div>
      {hasChildren && aberto ? (
        <NodeList nodes={node.children} color={color} locked={locked} onSelect={onSelect} selected={selected} ordem={ordem} depth={depth + 1} />
      ) : null}
    </div>
  );
};

const NodeList = ({ nodes, color, locked, onSelect, selected, ordem, depth = 0 }: NodeListProps) => (
  <div className={depth > 0 ? 'ml-3 border-l border-white/10 pl-2' : ''}>
    {nodes.map((node) => (
      <CodexRow
        key={entryKey(node.entry)}
        node={node}
        nodes={nodes}
        color={color}
        locked={locked}
        onSelect={onSelect}
        selected={selected}
        ordem={ordem}
        depth={depth}
      />
    ))}
  </div>
);

const contaDescendentes = (nodes: WorldCodexNode[]): number => nodes.reduce(
  (total, node) => total + 1 + contaDescendentes(node.children),
  0,
);

const TreeMapContents = ({
  nodes,
  concepts,
  color,
  locked,
  onSelect,
  selected,
}: {
  nodes: WorldCodexNode[];
  concepts: LoreEntry[];
  color: string;
  locked: ReadonlyMap<string, boolean>;
  onSelect: (entry: LoreEntry) => void;
  selected?: LoreEntry;
}) => {
  const [ordem, setOrdem] = useState<OrdemDeAbertura>({ aberto: false, nonce: 0 });
  // Só vale oferecer "expandir tudo" quando existe mais coisa aninhada do que
  // as próprias raízes - numa Árvore com um Galho e nada dentro o botão seria
  // um controle que não muda nada na tela.
  const temAninhados = contaDescendentes(nodes) > nodes.length;

  return (
    <>
      {nodes.length > 0 ? (
        <>
          {temAninhados ? (
            <div className="mb-1 flex justify-end px-1">
              <button
                type="button"
                onClick={() => setOrdem((atual) => ({ aberto: !atual.aberto, nonce: atual.nonce + 1 }))}
                className="rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 transition hover:bg-white/5 hover:text-gray-200"
              >
                {ordem.aberto && ordem.nonce > 0 ? 'Recolher tudo' : 'Expandir tudo'}
              </button>
            </div>
          ) : null}
          <NodeList nodes={nodes} color={color} locked={locked} onSelect={onSelect} selected={selected} ordem={ordem} />
        </>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 p-4 text-xs italic leading-5 text-gray-600">Nenhum Galho ou local interno foi documentado.</p>
      )}
      {concepts.length > 0 ? (
        <div className="mt-4 border-t border-white/10 px-2 pt-4">
          <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-widest text-gray-600">Conexões universais</p>
          {concepts.map((entry) => (
            <button key={entryKey(entry)} type="button" onClick={() => onSelect(entry)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-gray-400 hover:bg-white/5 hover:text-white">
              <Sparkles size={13} style={{ color }} /> {entry.titulo}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
};

const IdentityCard = ({
  entry,
  label,
  color,
  locked,
  onSelect,
}: {
  entry?: LoreEntry;
  label: string;
  color: string;
  locked: boolean;
  onSelect: (entry: LoreEntry) => void;
}) => {
  if (!entry || locked) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center rounded-3xl border border-white/10 bg-black/25 p-6 text-center">
        <Lock size={24} className="mb-3 text-gray-700" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{label}</p>
        <p className="mt-2 text-sm italic text-gray-700">Conhecimento ainda não revelado.</p>
      </div>
    );
  }
  const description = paragraphs((entry.conteudo as Record<string, unknown>).descricao)[0];
  const epithet = (entry.conteudo as Record<string, unknown>).epiteto;
  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="group flex min-h-52 flex-col rounded-3xl border border-white/10 bg-black/25 p-6 text-left transition hover:-translate-y-0.5 hover:border-white/25"
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color }}>{label}</span>
      <h3 className="mt-4 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{entry.titulo}</h3>
      {typeof epithet === 'string' ? <p className="mt-2 text-sm italic text-gray-400">“{epithet}”</p> : null}
      {description ? <p className="mt-4 line-clamp-4 text-sm leading-6 text-gray-500">{description}</p> : null}
      <span className="mt-auto pt-5 text-[10px] font-bold uppercase tracking-widest opacity-70 group-hover:opacity-100" style={{ color }}>
        Abrir registro →
      </span>
    </button>
  );
};

export const TreeCodexPage: React.FC<TreeCodexPageProps> = ({
  treeId,
  treeName,
  color,
  catalog,
  chronicles,
  entryType,
  entryId,
  isMestre,
  loreRevelado,
  loreOculto,
  cronicaSecoesOcultas,
  cronicaEventosOcultos,
  onBack,
  onOpenOverview,
  onOpenGlobalTimeline,
  onOpenEntry,
}) => {
  const codex = useMemo(() => buildTreeCodex(catalog, treeId), [catalog, treeId]);
  const chronicle = getTreeChronicle(treeId, chronicles);
  const displayTreeName = chronicle?.nome?.trim() || treeName;
  // O Vazio reusa esta página inteira, mas não é uma Árvore: é o espaço entre
  // elas. Só os rótulos mudam - a estrutura de Deidade, Fluxo, locais e
  // cronologia é a mesma, então não vale um componente separado só pra isso.
  const ehVazio = treeId === VAZIO_ID;
  const dono = ehVazio ? 'do Vazio' : 'da Árvore';
  const secaoOculta = (secao: 'tese' | 'atmosfera' | 'historia' | 'cronologia') => (
    secaoCronicaOculta(treeId, secao, { isMestre, seccoesOcultas: cronicaSecoesOcultas })
  );
  const eventosVisiveis = useMemo(
    () => (chronicle?.cronologia ?? []).filter(
      (evento) => !eventoCronicaOculto(evento.id, { isMestre, eventosOcultos: cronicaEventosOcultos }),
    ),
    [chronicle, isMestre, cronicaEventosOcultos],
  );
  const selectedEntry = findCodexEntry(codex, entryType, entryId);
  const selectedNode = selectedEntry ? findCodexNode(codex.roots, selectedEntry) : undefined;

  const lockedEntries = useMemo(() => {
    const result = new Map<string, boolean>();
    const walk = (nodes: WorldCodexNode[], parentLocked: boolean) => {
      nodes.forEach((node) => {
        const locked = loreBloqueado(node.entry, {
          isMestre,
          loreRevelado,
          loreOculto,
          paiBloqueado: parentLocked,
        });
        result.set(entryKey(node.entry), locked);
        walk(node.children, locked);
      });
    };
    walk(codex.roots, false);
    [codex.deity, ...codex.flows, ...codex.crossTreeConcepts].forEach((entry) => {
      if (!entry) return;
      result.set(entryKey(entry), loreBloqueado(entry, { isMestre, loreRevelado, loreOculto }));
    });
    return result;
  }, [codex, isMestre, loreOculto, loreRevelado]);

  const selectedLocked = selectedEntry ? lockedEntries.get(entryKey(selectedEntry)) === true : false;
  const counts = useMemo(() => ({
    branches: codex.entries.filter((entry) => entry.tipo === 'galho').length,
    dimensions: codex.entries.filter((entry) => entry.tipo === 'dimensao').length,
    realms: codex.entries.filter((entry) => entry.tipo === 'reino').length,
    locations: codex.entries.filter((entry) => entry.tipo === 'local').length,
  }), [codex.entries]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entryType || !entryId || !window.matchMedia('(max-width: 1023px)').matches) return undefined;
    const frame = window.requestAnimationFrame(() => {
      contentRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [entryId, entryType]);

  return (
    <main className="app-detail-page relative z-10 min-h-screen overflow-x-hidden pb-20">
      <div className="pointer-events-none fixed inset-0 opacity-90" style={{ background: `radial-gradient(circle at 75% 5%, ${color}33, transparent 35%), linear-gradient(180deg, #08070b 0%, #050508 100%)` }} />

      <header className="relative mx-auto max-w-[90rem] px-4 pb-5 pt-4 sm:px-5 sm:pb-8 sm:pt-7 md:px-10 md:pt-10">
        <div className="mb-6 flex flex-col gap-2 sm:mb-9 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
          <button type="button" onClick={onBack} className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-gray-300 transition hover:border-white/30 hover:text-white sm:px-4 sm:text-sm">
            <ArrowLeft size={16} /> Voltar ao Jardim
          </button>
          <div className={`grid gap-2 sm:flex sm:flex-wrap ${onOpenGlobalTimeline ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button type="button" onClick={onOpenOverview} className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-gray-300 transition hover:border-white/30 hover:text-white sm:px-4 sm:text-sm">
              <BookOpen size={15} /> Códice {dono}
            </button>
            {onOpenGlobalTimeline && (
              <button type="button" onClick={onOpenGlobalTimeline} className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition hover:bg-white/5 sm:px-4 sm:text-sm" style={{ borderColor: `${color}88`, color }}>
                <History size={15} /> Cronologia geral
              </button>
            )}
          </div>
        </div>

        <div className="grid items-end gap-5 sm:gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color }}>
              <Orbit size={16} /> {ehVazio ? 'O espaço entre as Árvores' : 'Códice dimensional'}
            </p>
            <h1 className="break-words text-[clamp(2.5rem,12vw,4.5rem)] font-bold leading-[1.02] tracking-wide text-white" style={{ fontFamily: 'Cinzel, serif' }}>{displayTreeName}</h1>
            {chronicle?.epiteto ? <p className="mt-3 max-w-4xl text-base italic leading-relaxed text-gray-300 sm:mt-4 sm:text-xl">“{chronicle.epiteto}”</p> : null}
          </div>
          <dl className={`grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 text-center ${ehVazio ? 'grid-cols-1' : 'grid-cols-4'}`}>
            {(ehVazio
              // O Vazio não tem Galho, Dimensão nem Reino - mostrar três zeros
              // ao lado do nome dele passaria a ideia de Árvore incompleta.
              ? [['Locais', counts.locations]] as Array<[string, number]>
              : [
                ['Galhos', counts.branches],
                ['Dimensões', counts.dimensions],
                ['Reinos', counts.realms],
                ['Locais', counts.locations],
              ] as Array<[string, number]>
            ).map(([label, value]) => (
              <div key={label} className="min-w-0 bg-[#0b0a10] px-1 py-3 sm:min-w-20 sm:px-3 sm:py-4">
                <dt className="truncate text-[7px] font-bold uppercase tracking-wide text-gray-600 sm:text-[8px] sm:tracking-widest">{label}</dt>
                <dd className="mt-1 text-lg font-bold sm:text-xl" style={{ color }}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="relative mx-auto grid max-w-[90rem] gap-4 px-4 sm:gap-6 sm:px-5 md:px-10 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="h-fit rounded-3xl border border-white/10 bg-[#0c0b11]/90 p-3 shadow-2xl lg:sticky lg:top-5">
          <details className="group lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
              <Network size={15} style={{ color }} />
              <span className="flex-1">Mapa {dono}</span>
              <span className="text-gray-600 group-open:hidden">Abrir</span>
              <span className="hidden text-gray-600 group-open:inline">Fechar</span>
            </summary>
            <div className="mt-3 max-h-[60vh] overflow-y-auto border-t border-white/10 pt-3 custom-scrollbar">
              <TreeMapContents nodes={codex.roots} concepts={codex.crossTreeConcepts} color={color} locked={lockedEntries} onSelect={onOpenEntry} selected={selectedEntry} />
            </div>
          </details>
          <div className="hidden lg:block">
            <div className="flex items-center gap-2 px-3 pb-3 pt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
              <Network size={14} style={{ color }} /> Mapa {dono}
            </div>
            {/* Teto de altura pra que uma Árvore com muitos Reinos role dentro
                do próprio mapa em vez de esticar a barra lateral inteira. */}
            <div className="max-h-[calc(100vh-11rem)] overflow-y-auto custom-scrollbar">
              <TreeMapContents nodes={codex.roots} concepts={codex.crossTreeConcepts} color={color} locked={lockedEntries} onSelect={onOpenEntry} selected={selectedEntry} />
            </div>
          </div>
        </aside>

        <div ref={contentRef} className="min-w-0 scroll-mt-4">
          {entryType && entryId ? (
            !selectedEntry || selectedLocked ? (
              <section className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#0c0b11]/85 p-8 text-center">
                <Lock size={42} className="mb-5 text-gray-700" />
                <h2 className="text-2xl font-bold text-white">Registro indisponível</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">{ehVazio ? 'Este fragmento não pertence ao Vazio ou ainda não foi revelado pelo Mestre.' : 'Este fragmento não pertence à Árvore ou ainda não foi revelado pelo Mestre.'}</p>
                <button type="button" onClick={onOpenOverview} className="mt-6 rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300 hover:text-white">Voltar ao códice</button>
              </section>
            ) : (
              <article className="rounded-3xl border border-white/10 bg-[#0c0b11]/85 shadow-2xl">
                <header className="border-b border-white/10 p-6 sm:p-9" style={{ background: `linear-gradient(135deg, ${color}18, transparent 65%)` }}>
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color }}>
                    <MapPin size={14} /> {typeLabel(selectedEntry.tipo)} · {displayTreeName}
                  </div>
                  <h2 className="break-words text-3xl font-bold leading-tight text-white sm:text-5xl" style={{ fontFamily: 'Cinzel, serif' }}>{selectedEntry.titulo}</h2>
                  {typeof selectedEntry.conteudo.epiteto === 'string' ? <p className="mt-3 text-lg italic text-gray-400">“{selectedEntry.conteudo.epiteto}”</p> : null}
                </header>
                <div className="p-6 sm:p-9">
                  <div className="max-w-4xl space-y-5 text-base leading-8 text-gray-300 sm:text-lg sm:leading-9">
                    {paragraphs((selectedEntry.conteudo as Record<string, unknown>).descricao).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                  <DetailFields entry={selectedEntry} />
                  {selectedNode?.children.length ? (
                    <section className="mt-10 border-t border-white/10 pt-8">
                      <div className="mb-5 flex items-center gap-3" style={{ color }}>
                        <GitBranch size={20} />
                        <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Dentro deste registro</h3>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selectedNode.children.map((child) => {
                          const childLocked = lockedEntries.get(entryKey(child.entry)) === true;
                          return (
                            <button key={entryKey(child.entry)} type="button" disabled={childLocked} onClick={() => onOpenEntry(child.entry)} className="group rounded-2xl border border-white/10 bg-black/25 p-5 text-left transition hover:border-white/25 disabled:cursor-not-allowed">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">{childLocked ? 'Não revelado' : typeLabel(child.entry.tipo)}</span>
                              <strong className="mt-2 block text-lg text-white">{childLocked ? 'Registro oculto' : child.entry.titulo}</strong>
                              {!childLocked ? <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color }}>Explorar <ChevronRight size={12} /></span> : null}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}
                </div>
              </article>
            )
          ) : (
            <div className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-[#0c0b11]/85 p-6 shadow-2xl sm:p-9">
                <div className="mb-7 flex items-center gap-3" style={{ color }}>
                  <BookOpen size={21} />
                  <h2 className="text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>{ehVazio ? 'O Vazio, Deidade e Fluxo' : 'Árvore, Deidade e Fluxo'}</h2>
                </div>
                {chronicle?.tese && !secaoOculta('tese') ? <p className="mb-8 max-w-5xl text-xl leading-9 text-gray-200 sm:text-2xl">{chronicle.tese}</p> : null}
                <div className={`grid gap-4 ${codex.flows.length > 1 ? 'xl:grid-cols-3' : 'md:grid-cols-2'}`}>
                  <IdentityCard entry={codex.deity} label="Deidade" color={color} locked={codex.deity ? lockedEntries.get(entryKey(codex.deity)) === true : true} onSelect={onOpenEntry} />
                  {codex.flows.length > 0 ? codex.flows.map((flow, index) => (
                    <IdentityCard key={entryKey(flow)} entry={flow} label={codex.flows.length > 1 ? `Fluxo ${index + 1}` : 'Fluxo cósmico'} color={color} locked={lockedEntries.get(entryKey(flow)) === true} onSelect={onOpenEntry} />
                  )) : <IdentityCard label="Fluxo cósmico" color={color} locked onSelect={onOpenEntry} />}
                </div>
                {chronicle?.atmosfera && !secaoOculta('atmosfera') ? (
                  <div className="mt-6 rounded-2xl border-l-2 bg-black/25 p-5" style={{ borderColor: color }}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">Atmosfera {dono}</p>
                    <p className="mt-2 leading-7 text-gray-400">{chronicle.atmosfera}</p>
                  </div>
                ) : null}
              </section>

              {codex.crossTreeConcepts.map((entry) => (
                <button key={entryKey(entry)} type="button" onClick={() => onOpenEntry(entry)} className="group flex w-full items-start gap-5 rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.04] p-6 text-left transition hover:border-cyan-300/40 sm:p-8">
                  <Sparkles size={24} className="mt-1 shrink-0 text-cyan-300" />
                  <span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-400">Conceito presente nesta Árvore</span>
                    <strong className="mt-2 block text-xl text-white">{entry.titulo}</strong>
                    <span className="mt-2 line-clamp-2 block text-sm leading-6 text-gray-400">{paragraphs((entry.conteudo as Record<string, unknown>).descricao)[0]}</span>
                  </span>
                  <ChevronRight size={18} className="ml-auto mt-2 shrink-0 text-cyan-500/60 group-hover:text-cyan-300" />
                </button>
              ))}

              <section className="rounded-3xl border border-white/10 bg-[#0c0b11]/85 p-6 shadow-2xl sm:p-9">
                <div className="mb-7 flex items-center gap-3" style={{ color }}>
                  <Compass size={21} />
                  <h2 className="text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>{ehVazio ? 'Lugares do Vazio' : 'Geografia documentada'}</h2>
                </div>
                {codex.roots.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {codex.roots.map((node) => {
                      const isLocked = lockedEntries.get(entryKey(node.entry)) === true;
                      return (
                        <button key={entryKey(node.entry)} type="button" disabled={isLocked} onClick={() => onOpenEntry(node.entry)} className="group rounded-2xl border border-white/10 bg-black/25 p-5 text-left transition hover:-translate-y-0.5 hover:border-white/25 disabled:cursor-not-allowed">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: isLocked ? '#4b5563' : color }}>{isLocked ? 'Não revelado' : typeLabel(node.entry.tipo)}</span>
                            {isLocked ? <Lock size={14} className="text-gray-700" /> : <GitBranch size={14} className="text-gray-600" />}
                          </div>
                          <h3 className="mt-3 text-xl font-bold text-white">{isLocked ? 'Registro oculto' : node.entry.titulo}</h3>
                          {!isLocked ? <p className="mt-2 text-xs text-gray-600">{node.children.length} registro(s) diretamente dentro</p> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : <p className="text-sm italic text-gray-600">Ainda não há geografia interna documentada para este domínio.</p>}
              </section>

              {chronicle?.historia?.length && !secaoOculta('historia') ? (
                <section className="rounded-3xl border border-white/10 bg-[#0c0b11]/85 p-6 shadow-2xl sm:p-9">
                  <div className="mb-7 flex items-center gap-3" style={{ color }}><BookOpen size={21} /><h2 className="text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>História</h2></div>
                  <div className="max-w-5xl space-y-5 text-base leading-8 text-gray-300 sm:text-lg sm:leading-9">{chronicle.historia.map((paragraph, index) => <p key={`historia-${index}`}>{paragraph}</p>)}</div>
                </section>
              ) : null}

              {eventosVisiveis.length && !secaoOculta('cronologia') ? (
                <section className="rounded-3xl border border-white/10 bg-[#0c0b11]/85 p-6 shadow-2xl sm:p-9">
                  <div className="mb-9 flex items-center gap-3" style={{ color }}><History size={21} /><h2 className="text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>Linha do tempo {dono}</h2></div>
                  <ChronicleTimeline events={eventosVisiveis} color={color} />
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
