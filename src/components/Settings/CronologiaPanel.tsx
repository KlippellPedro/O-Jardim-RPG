import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpenText, Clock3, History, Loader2, Plus, RotateCcw, Save, Send, Trash2 } from 'lucide-react';
import { ARVORES } from '../../../data/mundo/arvoresCatalog';
import {
  conteudoEditorialApi,
  type EditorialLibraryEntry,
  type EditorialRevision,
  type EditorialState,
  type LoreDocument,
} from '../../services/conteudoEditorialApi';
import type { ChronicleEvent, ChroniclePlace, TreeChronicle, WorldChronicleCatalog } from '../../pages/Mundo/worldChronicles';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

interface CronologiaPanelProps {
  onDirtyChange?: (dirty: boolean) => void;
}

type EditorSection = 'ficha' | 'cronologia';

function documentoEfetivo(entry: EditorialLibraryEntry): LoreDocument {
  if (entry.editorial?.rascunho) return entry.editorial.rascunho;
  if (entry.editorial?.publicado_em && entry.editorial.dados_completos?.titulo) {
    return entry.editorial.dados_completos as LoreDocument;
  }
  return entry.dados_base;
}

function novoMarcoId(): string {
  const random = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID().slice(0, 8)
    : Date.now().toString(36);
  return `marco-${random}`;
}

function reordenar(events: ChronicleEvent[]): ChronicleEvent[] {
  return events.map((event, index) => ({ ...event, ordem: (index + 1) * 10 }));
}

function moverItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-primary/50';
const textareaClass = 'w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-7 text-gray-200 outline-none focus:border-primary/50';
const labelClass = 'mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500';

export function CronologiaPanel({ onDirtyChange }: CronologiaPanelProps) {
  const [entry, setEntry] = useState<EditorialLibraryEntry | null>(null);
  const [catalog, setCatalog] = useState<WorldChronicleCatalog | null>(null);
  const [scope, setScope] = useState('global');
  const [section, setSection] = useState<EditorSection>('ficha');
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [revisoes, setRevisoes] = useState<EditorialRevision[]>([]);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const confirmarDescarte = useUnsavedChanges(dirty, onDirtyChange);

  const carregar = async (signal?: AbortSignal) => {
    setLoading(true);
    setErro(null);
    try {
      const response = await conteudoEditorialApi.listarMundoGlobal(signal);
      const chronologyEntry = response.entradas.find((item) => item.tipo === 'cronologia') || null;
      if (!chronologyEntry) {
        setEntry(null);
        setCatalog(null);
        setErro('As Crônicas oficiais ainda não foram carregadas na biblioteca. Reinicie o backend para executar a carga inicial.');
        return;
      }
      const document = documentoEfetivo(chronologyEntry);
      const content = document.conteudo as unknown as WorldChronicleCatalog;
      if (!content?.introducao || !Array.isArray(content?.linha_tempo_geral) || !Array.isArray(content?.arvores)) {
        throw new Error('A estrutura das Crônicas oficiais é inválida.');
      }
      setEntry(chronologyEntry);
      setCatalog(content);
      setDirty(false);
      setRevisoes([]);
      setHistoricoAberto(false);
    } catch (error: any) {
      if (error?.name !== 'AbortError') setErro(error?.message || 'Não foi possível carregar as Crônicas.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void carregar(controller.signal);
    return () => controller.abort();
  }, []);

  const activeTree = catalog?.arvores.find((tree) => tree.id === scope) || null;
  const events = useMemo(() => {
    if (!catalog) return [];
    const source = scope === 'global' ? catalog.linha_tempo_geral : activeTree?.cronologia || [];
    return [...source].sort((left, right) => left.ordem - right.ordem);
  }, [activeTree, catalog, scope]);
  const selected = events.find((event) => event.id === selectedId) || null;

  useEffect(() => {
    setSelectedId((current) => events.some((event) => event.id === current) ? current : events[0]?.id || '');
  }, [scope, events.map((event) => event.id).join('|')]);

  const updateCatalog = (next: WorldChronicleCatalog) => {
    setCatalog(next);
    setDirty(true);
    setSucesso(null);
  };

  const updateTree = (changes: Partial<TreeChronicle>) => {
    if (!catalog || !activeTree) return;
    updateCatalog({
      ...catalog,
      arvores: catalog.arvores.map((tree) => tree.id === activeTree.id ? { ...tree, ...changes } : tree),
    });
  };

  const updateEvents = (nextEvents: ChronicleEvent[]) => {
    if (!catalog) return;
    const ordered = reordenar(nextEvents);
    updateCatalog(scope === 'global'
      ? { ...catalog, linha_tempo_geral: ordered }
      : { ...catalog, arvores: catalog.arvores.map((tree) => tree.id === scope ? { ...tree, cronologia: ordered } : tree) });
  };

  const updateSelected = (changes: Partial<ChronicleEvent>) => {
    if (!selected) return;
    updateEvents(events.map((event) => event.id === selected.id ? { ...event, ...changes } : event));
  };

  const addEvent = () => {
    const event: ChronicleEvent = {
      id: novoMarcoId(),
      ordem: (events.length + 1) * 10,
      era: 'Nova era',
      titulo: 'Novo marco',
      resumo: 'Descreva o que aconteceu e por que este marco importa.',
      ...(scope === 'global' ? { arvores: [] } : {}),
    };
    updateEvents([...events, event]);
    setSelectedId(event.id);
  };

  const moveEvent = (direction: -1 | 1) => {
    if (!selected) return;
    updateEvents(moverItem(events, events.findIndex((event) => event.id === selected.id), direction));
  };

  const removeEvent = () => {
    if (!selected || !window.confirm(`Remover o marco “${selected.titulo}” deste rascunho?`)) return;
    const next = events.filter((event) => event.id !== selected.id);
    updateEvents(next);
    setSelectedId(next[0]?.id || '');
  };

  const salvar = async (): Promise<EditorialState | null> => {
    if (!entry || !catalog) return null;
    setSaving(true);
    setErro(null);
    try {
      const document = documentoEfetivo(entry);
      const response = await conteudoEditorialApi.salvarRascunhoGlobal({
        tipo: entry.tipo,
        chave_recurso: entry.chave_recurso,
        chave_origem: entry.chave,
        titulo: document.titulo || 'Crônicas do Jardim',
        conteudo: catalog as unknown as Record<string, unknown>,
        versao_esperada: entry.editorial?.versao_editorial ?? null,
      });
      setEntry({ ...entry, editorial: { ...entry.editorial, ...response.editorial } as EditorialState });
      setDirty(false);
      setSucesso('Rascunho das Crônicas salvo.');
      return response.editorial;
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível salvar as Crônicas.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const publicar = async () => {
    if (!entry) return;
    setPublishing(true);
    setErro(null);
    try {
      let editorial = entry.editorial;
      if (dirty || !editorial?.rascunho) editorial = await salvar();
      if (!editorial) return;
      await conteudoEditorialApi.publicarGlobal(editorial.id, editorial.versao_editorial);
      await carregar();
      setSucesso('Crônicas publicadas globalmente para todas as campanhas.');
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível publicar as Crônicas.');
    } finally {
      setPublishing(false);
    }
  };

  const abrirHistorico = async () => {
    if (!entry?.editorial?.id) return;
    setHistoricoAberto((aberto) => !aberto);
    if (revisoes.length) return;
    try {
      const response = await conteudoEditorialApi.listarRevisoesGlobais(entry.editorial.id);
      setRevisoes(response.revisoes || []);
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível carregar o histórico.');
    }
  };

  const restaurarRevisao = async (revision: EditorialRevision) => {
    if (!entry?.editorial?.id || !confirmarDescarte('Existem alterações não salvas. Deseja descartá-las para restaurar uma versão anterior?') || !window.confirm(`Restaurar a versão ${revision.versao} das Crônicas como rascunho?`)) return;
    setRestoring(true);
    setErro(null);
    try {
      await conteudoEditorialApi.restaurarRevisaoGlobal(entry.editorial.id, revision.id, entry.editorial.versao_editorial);
      await carregar();
      setSucesso(`Versão ${revision.versao} restaurada como rascunho.`);
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível restaurar as Crônicas.');
    } finally {
      setRestoring(false);
    }
  };

  const setHistory = (history: string[]) => updateTree({ historia: history });
  const setPlaces = (places: ChroniclePlace[]) => updateTree({ lugares: places });

  if (loading) return <div className="flex min-h-80 items-center justify-center text-primary"><Loader2 className="animate-spin" size={30} /></div>;

  const editorFicha = scope === 'global' ? (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-4 text-sm leading-6 text-gray-300">Estes textos formam a apresentação da página “Crônicas do Jardim”.</div>
      <div><label className={labelClass}>Título das Crônicas</label><input value={catalog?.introducao.titulo || ''} maxLength={160} onChange={(event) => catalog && updateCatalog({ ...catalog, introducao: { ...catalog.introducao, titulo: event.target.value } })} className={inputClass} /></div>
      <div><label className={labelClass}>Subtítulo</label><input value={catalog?.introducao.subtitulo || ''} maxLength={300} onChange={(event) => catalog && updateCatalog({ ...catalog, introducao: { ...catalog.introducao, subtitulo: event.target.value } })} className={inputClass} /></div>
      <div><label className={labelClass}>Descrição</label><textarea value={catalog?.introducao.descricao || ''} rows={9} maxLength={12000} onChange={(event) => catalog && updateCatalog({ ...catalog, introducao: { ...catalog.introducao, descricao: event.target.value } })} className={textareaClass} /></div>
    </div>
  ) : activeTree ? (
    <div className="mx-auto max-w-4xl space-y-7">
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-4 text-sm leading-6 text-gray-300">Esta ficha controla os textos da página da Árvore. Deidade, Fluxo, Galhos, Dimensões, Reinos e Locais continuam como registros independentes na aba <strong>Lore</strong>, onde podem ser criados, movidos e excluídos.</div>
      <div className="grid gap-5 md:grid-cols-2">
        <div><label className={labelClass}>Nome exibido</label><input value={activeTree.nome} maxLength={160} onChange={(event) => updateTree({ nome: event.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>Estado atual</label><input value={activeTree.estado} maxLength={300} onChange={(event) => updateTree({ estado: event.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>Deidade</label><input value={activeTree.deidade} maxLength={160} onChange={(event) => updateTree({ deidade: event.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>Fluxo</label><input value={activeTree.fluxo} maxLength={160} onChange={(event) => updateTree({ fluxo: event.target.value })} className={inputClass} /></div>
      </div>
      <div><label className={labelClass}>Lema / epíteto</label><textarea value={activeTree.epiteto} rows={3} maxLength={1000} onChange={(event) => updateTree({ epiteto: event.target.value })} className={textareaClass} /></div>
      <div><label className={labelClass}>Descrição principal</label><textarea value={activeTree.tese} rows={6} maxLength={12000} onChange={(event) => updateTree({ tese: event.target.value })} className={textareaClass} /></div>
      <div><label className={labelClass}>Atmosfera da Árvore</label><textarea value={activeTree.atmosfera} rows={5} maxLength={12000} onChange={(event) => updateTree({ atmosfera: event.target.value })} className={textareaClass} /><p className="mt-2 text-xs text-gray-600">Deixe vazio para retirar este bloco da página.</p></div>
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-bold text-white">Temas</h3><p className="mt-1 text-xs text-gray-500">Organize as palavras-chave associadas à Árvore.</p></div>
          <button type="button" onClick={() => updateTree({ temas: [...activeTree.temas, 'Novo tema'] })} className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-bold text-primary"><Plus size={14} /> Tema</button>
        </div>
        <div className="space-y-2">
          {activeTree.temas.map((theme, index) => (
            <div key={`tema-${index}`} className="flex items-center gap-2">
              <input value={theme} maxLength={160} aria-label={`Tema ${index + 1}`} onChange={(event) => updateTree({ temas: activeTree.temas.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} className={inputClass} />
              <button type="button" aria-label={`Mover tema ${index + 1} para cima`} disabled={index === 0} onClick={() => updateTree({ temas: moverItem(activeTree.temas, index, -1) })} className="shrink-0 rounded-lg border border-white/10 p-2 text-gray-400 disabled:opacity-25"><ArrowUp size={14} /></button>
              <button type="button" aria-label={`Mover tema ${index + 1} para baixo`} disabled={index === activeTree.temas.length - 1} onClick={() => updateTree({ temas: moverItem(activeTree.temas, index, 1) })} className="shrink-0 rounded-lg border border-white/10 p-2 text-gray-400 disabled:opacity-25"><ArrowDown size={14} /></button>
              <button type="button" aria-label={`Excluir tema ${index + 1}`} onClick={() => updateTree({ temas: activeTree.temas.filter((_, itemIndex) => itemIndex !== index) })} className="shrink-0 rounded-lg border border-red-500/20 p-2 text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
          {activeTree.temas.length === 0 && <p className="py-4 text-center text-xs italic text-gray-600">Nenhum tema associado.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-bold text-white">História</h3><p className="mt-1 text-xs text-gray-500">Cada cartão é um parágrafo. Use as setas para reorganizar a leitura.</p></div>
          <button type="button" onClick={() => setHistory([...activeTree.historia, 'Novo parágrafo.'])} className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-bold text-primary"><Plus size={14} /> Parágrafo</button>
        </div>
        <div className="space-y-3">
          {activeTree.historia.map((paragraph, index) => (
            <div key={`historia-${index}`} className="rounded-xl border border-white/10 bg-black/25 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Parágrafo {index + 1}</span>
                <div className="flex gap-1">
                  <button type="button" aria-label={`Mover parágrafo ${index + 1} para cima`} disabled={index === 0} onClick={() => setHistory(moverItem(activeTree.historia, index, -1))} className="rounded-lg border border-white/10 p-2 text-gray-400 disabled:opacity-25"><ArrowUp size={14} /></button>
                  <button type="button" aria-label={`Mover parágrafo ${index + 1} para baixo`} disabled={index === activeTree.historia.length - 1} onClick={() => setHistory(moverItem(activeTree.historia, index, 1))} className="rounded-lg border border-white/10 p-2 text-gray-400 disabled:opacity-25"><ArrowDown size={14} /></button>
                  <button type="button" aria-label={`Excluir parágrafo ${index + 1}`} onClick={() => setHistory(activeTree.historia.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border border-red-500/20 p-2 text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <textarea value={paragraph} rows={5} maxLength={12000} onChange={(event) => setHistory(activeTree.historia.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className={textareaClass} />
            </div>
          ))}
          {activeTree.historia.length === 0 && <p className="py-6 text-center text-xs italic text-gray-600">Sem História. O bloco não será mostrado na página.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-bold text-white">Lugares resumidos da Crônica</h3><p className="mt-1 text-xs text-gray-500">Mantidos para a ficha completa e formatos antigos. A árvore navegável usa os registros da aba Lore.</p></div>
          <button type="button" onClick={() => setPlaces([...activeTree.lugares, { nome: 'Novo lugar', tipo: 'Local', resumo: 'Descreva este lugar.' }])} className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-bold text-primary"><Plus size={14} /> Lugar</button>
        </div>
        <div className="space-y-3">
          {activeTree.lugares.map((place, index) => (
            <div key={`lugar-${index}`} className="rounded-xl border border-white/10 bg-black/25 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Lugar {index + 1}</span>
                <div className="flex gap-1">
                  <button type="button" aria-label={`Mover lugar ${index + 1} para cima`} disabled={index === 0} onClick={() => setPlaces(moverItem(activeTree.lugares, index, -1))} className="rounded-lg border border-white/10 p-2 text-gray-400 disabled:opacity-25"><ArrowUp size={14} /></button>
                  <button type="button" aria-label={`Mover lugar ${index + 1} para baixo`} disabled={index === activeTree.lugares.length - 1} onClick={() => setPlaces(moverItem(activeTree.lugares, index, 1))} className="rounded-lg border border-white/10 p-2 text-gray-400 disabled:opacity-25"><ArrowDown size={14} /></button>
                  <button type="button" aria-label={`Excluir lugar ${index + 1}`} onClick={() => setPlaces(activeTree.lugares.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg border border-red-500/20 p-2 text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                <div><label className={labelClass}>Nome</label><input value={place.nome} maxLength={160} onChange={(event) => setPlaces(activeTree.lugares.map((item, itemIndex) => itemIndex === index ? { ...item, nome: event.target.value } : item))} className={inputClass} /></div>
                <div><label className={labelClass}>Tipo</label><input value={place.tipo} maxLength={80} onChange={(event) => setPlaces(activeTree.lugares.map((item, itemIndex) => itemIndex === index ? { ...item, tipo: event.target.value } : item))} className={inputClass} /></div>
              </div>
              <div className="mt-3"><label className={labelClass}>Resumo</label><textarea value={place.resumo} rows={4} maxLength={6000} onChange={(event) => setPlaces(activeTree.lugares.map((item, itemIndex) => itemIndex === index ? { ...item, resumo: event.target.value } : item))} className={textareaClass} /></div>
            </div>
          ))}
          {activeTree.lugares.length === 0 && <p className="py-6 text-center text-xs italic text-gray-600">Nenhum lugar resumido nesta Crônica.</p>}
        </div>
      </section>
    </div>
  ) : <p className="text-sm text-red-300">A Árvore selecionada não existe neste documento.</p>;

  const editorCronologia = (
    <div className="grid min-h-[620px] lg:grid-cols-[330px_minmax(0,1fr)]">
      <aside className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
        <button type="button" onClick={addEvent} className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary hover:bg-primary/20"><Plus size={16} /> Novo marco</button>
        <div className="max-h-[535px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {events.map((event, index) => (
            <button key={event.id} type="button" onClick={() => setSelectedId(event.id)} className={`w-full rounded-xl border p-3 text-left transition ${event.id === selectedId ? 'border-primary/40 bg-primary/10' : 'border-white/5 bg-white/[0.02] hover:border-white/15'}`}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{index + 1} · {event.era}</span>
              <span className="mt-1 block text-sm font-medium text-gray-200">{event.titulo}</span>
            </button>
          ))}
          {events.length === 0 && <p className="py-8 text-center text-xs italic text-gray-600">Nenhum marco nesta linha.</p>}
        </div>
      </aside>
      <section className="min-w-0 p-5 md:p-8">
        {!selected ? <p className="text-sm text-gray-500">Crie ou selecione um marco para editar.</p> : (
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-gray-600">ID estável: <code>{selected.id}</code></div>
              <div className="flex gap-2">
                <button type="button" onClick={() => moveEvent(-1)} disabled={events[0]?.id === selected.id} className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white disabled:opacity-25" title="Mover para cima"><ArrowUp size={15} /></button>
                <button type="button" onClick={() => moveEvent(1)} disabled={events[events.length - 1]?.id === selected.id} className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white disabled:opacity-25" title="Mover para baixo"><ArrowDown size={15} /></button>
                <button type="button" onClick={removeEvent} className="rounded-lg border border-red-500/20 p-2 text-red-400 hover:bg-red-500/10" title="Remover marco"><Trash2 size={15} /></button>
              </div>
            </div>
            <div><label className={labelClass}>Era ou data</label><input value={selected.era} maxLength={120} onChange={(event) => updateSelected({ era: event.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Título</label><input value={selected.titulo} maxLength={160} onChange={(event) => updateSelected({ titulo: event.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Resumo</label><textarea value={selected.resumo} rows={7} maxLength={4000} onChange={(event) => updateSelected({ resumo: event.target.value })} className={textareaClass} /></div>
            {scope === 'global' && (
              <div>
                <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Árvores envolvidas</label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {ARVORES.filter((tree) => catalog?.arvores.some((item) => item.id === tree.id)).map((tree) => {
                    const checked = selected.arvores?.includes(tree.id) || false;
                    return <label key={tree.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${checked ? 'border-primary/30 bg-primary/10 text-gray-200' : 'border-white/5 text-gray-500'}`}><input type="checkbox" checked={checked} onChange={() => updateSelected({ arvores: checked ? selected.arvores?.filter((id) => id !== tree.id) : [...(selected.arvores || []), tree.id] })} /> {tree.nome}</label>;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a090e] shadow-2xl">
      <div className="flex flex-col gap-4 border-b border-white/10 p-6 md:flex-row md:items-end md:justify-between md:p-8">
        <div>
          <div className="flex items-center gap-2 text-primary"><BookOpenText size={22} /><h2 className="text-xl font-bold text-white">Árvores e Crônicas</h2></div>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">Reescreva a apresentação, a atmosfera, a História e a cronologia de cada Árvore.</p>
        </div>
        <select value={scope} onChange={(event) => { setScope(event.target.value); setSection('ficha'); }} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/50">
          <option value="global">Crônicas do Jardim (geral)</option>
          {(catalog?.arvores || []).map((tree) => <option key={tree.id} value={tree.id}>{tree.nome}</option>)}
        </select>
      </div>

      {!catalog ? <div className="p-8 text-sm text-red-300">{erro || 'Crônicas indisponíveis.'}</div> : (
        <>
          <div className="flex gap-2 border-b border-white/10 px-5 pt-4 md:px-8">
            <button type="button" onClick={() => setSection('ficha')} className={`inline-flex items-center gap-2 border-b-2 px-3 pb-3 text-xs font-bold uppercase tracking-widest ${section === 'ficha' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}><BookOpenText size={14} /> {scope === 'global' ? 'Apresentação' : 'Ficha completa'}</button>
            <button type="button" onClick={() => setSection('cronologia')} className={`inline-flex items-center gap-2 border-b-2 px-3 pb-3 text-xs font-bold uppercase tracking-widest ${section === 'cronologia' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}><Clock3 size={14} /> Linha do tempo</button>
          </div>
          <div className={section === 'ficha' ? 'p-5 md:p-8' : ''}>{section === 'ficha' ? editorFicha : editorCronologia}</div>
          <div className="border-t border-white/10 p-5 md:p-8">
            {erro && <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{erro}</div>}
            {sucesso && <div role="status" className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{sucesso}</div>}
            <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a090e]/95 p-4 shadow-2xl backdrop-blur">
              <button type="button" onClick={abrirHistorico} disabled={!entry?.editorial?.publicado_em} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-400 hover:text-white disabled:opacity-30"><History size={15} /> Histórico</button>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-xs font-bold ${dirty ? 'text-amber-300' : entry?.editorial?.rascunho ? 'text-sky-300' : 'text-emerald-300'}`}>{dirty ? 'Alterações não salvas' : entry?.editorial?.rascunho ? 'Rascunho salvo' : 'Tudo salvo'}</span>
                <button type="button" onClick={() => void salvar()} disabled={saving || publishing || restoring || !dirty} className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary disabled:opacity-40">{saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} Salvar rascunho</button>
                <button type="button" onClick={() => void publicar()} disabled={saving || publishing || restoring || (!dirty && !entry?.editorial?.rascunho)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40">{publishing ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />} Publicar</button>
              </div>
            </div>
            {historicoAberto && <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4"><h3 className="mb-3 text-sm font-bold text-white">Versões publicadas</h3>{revisoes.length === 0 ? <p className="text-xs text-gray-500">Nenhuma versão anterior registrada.</p> : revisoes.map((revision) => <details key={revision.id} className="border-b border-white/5 py-3 text-xs last:border-0"><summary className="flex cursor-pointer flex-wrap justify-between gap-3 text-gray-300"><span>Versão {revision.versao} · {revision.autor_nome || 'Mestre'}</span><span className="text-gray-500">{new Date(revision.criado_em).toLocaleString('pt-BR')}</span></summary><pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-white/5 bg-black/40 p-3 text-[11px] text-gray-400">{JSON.stringify(revision.dados, null, 2)}</pre><button type="button" onClick={() => void restaurarRevisao(revision)} disabled={restoring} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-400/20 px-3 py-2 font-bold text-amber-300 disabled:opacity-50">{restoring ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Restaurar como rascunho</button></details>)}</div>}
          </div>
        </>
      )}
    </div>
  );
}
