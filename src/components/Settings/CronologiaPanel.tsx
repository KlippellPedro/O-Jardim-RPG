import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Clock3, History, Loader2, Plus, RotateCcw, Save, Send, Trash2 } from 'lucide-react';
import { ARVORES } from '../../../data/mundo/arvoresCatalog';
import {
  conteudoEditorialApi,
  type EditorialLibraryEntry,
  type EditorialRevision,
  type EditorialState,
  type LoreDocument,
} from '../../services/conteudoEditorialApi';
import type { ChronicleEvent, WorldChronicleCatalog } from '../../pages/Mundo/worldChronicles';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

interface CronologiaPanelProps {
  campanhaId: string;
  onDirtyChange?: (dirty: boolean) => void;
}

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

export function CronologiaPanel({ campanhaId, onDirtyChange }: CronologiaPanelProps) {
  const [entry, setEntry] = useState<EditorialLibraryEntry | null>(null);
  const [catalog, setCatalog] = useState<WorldChronicleCatalog | null>(null);
  const [scope, setScope] = useState('global');
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
      const response = await conteudoEditorialApi.listarMundo(campanhaId, signal);
      const chronologyEntry = response.entradas.find((item) => item.tipo === 'cronologia') || null;
      if (!chronologyEntry) {
        setEntry(null);
        setCatalog(null);
        setErro('A cronologia oficial ainda não foi carregada na biblioteca. Reinicie o backend para executar a carga inicial.');
        return;
      }
      const document = documentoEfetivo(chronologyEntry);
      const content = document.conteudo as unknown as WorldChronicleCatalog;
      if (!Array.isArray(content?.linha_tempo_geral) || !Array.isArray(content?.arvores)) {
        throw new Error('A estrutura da cronologia oficial é inválida.');
      }
      setEntry(chronologyEntry);
      setCatalog(content);
      setDirty(false);
      setRevisoes([]);
      setHistoricoAberto(false);
    } catch (error: any) {
      if (error?.name !== 'AbortError') setErro(error?.message || 'Não foi possível carregar a cronologia.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void carregar(controller.signal);
    return () => controller.abort();
  }, [campanhaId]);

  const activeTree = catalog?.arvores.find((tree) => tree.id === scope);
  const events = useMemo(() => {
    if (!catalog) return [];
    const source = scope === 'global' ? catalog.linha_tempo_geral : activeTree?.cronologia || [];
    return [...source].sort((left, right) => left.ordem - right.ordem);
  }, [activeTree, catalog, scope]);
  const selected = events.find((event) => event.id === selectedId) || null;

  useEffect(() => {
    setSelectedId((current) => events.some((event) => event.id === current) ? current : events[0]?.id || '');
  }, [scope, events.map((event) => event.id).join('|')]);

  const updateEvents = (nextEvents: ChronicleEvent[]) => {
    if (!catalog) return;
    const ordered = reordenar(nextEvents);
    setCatalog(scope === 'global'
      ? { ...catalog, linha_tempo_geral: ordered }
      : {
          ...catalog,
          arvores: catalog.arvores.map((tree) => tree.id === scope ? { ...tree, cronologia: ordered } : tree),
        });
    setDirty(true);
    setSucesso(null);
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
    const index = events.findIndex((event) => event.id === selected.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= events.length) return;
    const next = [...events];
    [next[index], next[target]] = [next[target], next[index]];
    updateEvents(next);
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
      const response = await conteudoEditorialApi.salvarRascunho({
        campanha_id: campanhaId,
        tipo: entry.tipo,
        chave_recurso: entry.chave_recurso,
        titulo: document.titulo || 'Crônicas do Jardim',
        conteudo: catalog as unknown as Record<string, unknown>,
        versao_esperada: entry.editorial?.versao_editorial ?? null,
      });
      setEntry({
        ...entry,
        editorial: { ...entry.editorial, ...response.editorial } as EditorialState,
      });
      setDirty(false);
      setSucesso('Rascunho da cronologia salvo.');
      return response.editorial;
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível salvar a cronologia.');
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
      await conteudoEditorialApi.publicar(editorial.id, campanhaId, editorial.versao_editorial);
      await carregar();
      setSucesso('Cronologia publicada para esta campanha.');
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível publicar a cronologia.');
    } finally {
      setPublishing(false);
    }
  };

  const abrirHistorico = async () => {
    if (!entry?.editorial?.id) return;
    setHistoricoAberto((aberto) => !aberto);
    if (revisoes.length) return;
    try {
      const response = await conteudoEditorialApi.listarRevisoes(entry.editorial.id, campanhaId);
      setRevisoes(response.revisoes || []);
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível carregar o histórico.');
    }
  };

  const restaurarRevisao = async (revision: EditorialRevision) => {
    if (!entry?.editorial?.id || !confirmarDescarte('Existem alterações não salvas. Deseja descartá-las para restaurar uma cronologia anterior?') || !window.confirm(`Restaurar a versão ${revision.versao} da cronologia como rascunho?`)) return;
    setRestoring(true);
    setErro(null);
    try {
      await conteudoEditorialApi.restaurarRevisao(
        entry.editorial.id,
        revision.id,
        campanhaId,
        entry.editorial.versao_editorial,
      );
      await carregar();
      setSucesso(`Versão ${revision.versao} restaurada como rascunho.`);
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível restaurar a cronologia.');
    } finally {
      setRestoring(false);
    }
  };

  if (loading) return <div className="flex min-h-80 items-center justify-center text-primary"><Loader2 className="animate-spin" size={30} /></div>;

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a090e] shadow-2xl">
      <div className="flex flex-col gap-4 border-b border-white/10 p-6 md:flex-row md:items-end md:justify-between md:p-8">
        <div>
          <div className="flex items-center gap-2 text-primary"><Clock3 size={22} /><h2 className="text-xl font-bold text-white">Linha do Tempo</h2></div>
          <p className="mt-2 text-sm text-gray-400">Crie e organize os marcos compartilhados ou a cronologia de uma Árvore específica.</p>
        </div>
        <select value={scope} onChange={(event) => setScope(event.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/50">
          <option value="global">Linha do tempo geral</option>
          {(catalog?.arvores || []).map((tree) => <option key={tree.id} value={tree.id}>{tree.nome}</option>)}
        </select>
      </div>

      {!catalog ? <div className="p-8 text-sm text-red-300">{erro || 'Cronologia indisponível.'}</div> : (
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
                <div><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Era ou data</label><input value={selected.era} maxLength={120} onChange={(event) => updateSelected({ era: event.target.value })} className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-primary/50" /></div>
                <div><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Título</label><input value={selected.titulo} maxLength={160} onChange={(event) => updateSelected({ titulo: event.target.value })} className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-primary/50" /></div>
                <div><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Resumo</label><textarea value={selected.resumo} rows={7} maxLength={4000} onChange={(event) => updateSelected({ resumo: event.target.value })} className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-7 text-gray-200 outline-none focus:border-primary/50" /></div>

                {scope === 'global' && (
                  <div>
                    <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Árvores envolvidas</label>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {ARVORES.map((tree) => {
                        const checked = selected.arvores?.includes(tree.id) || false;
                        return <label key={tree.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${checked ? 'border-primary/30 bg-primary/10 text-gray-200' : 'border-white/5 text-gray-500'}`}><input type="checkbox" checked={checked} onChange={() => updateSelected({ arvores: checked ? selected.arvores?.filter((id) => id !== tree.id) : [...(selected.arvores || []), tree.id] })} /> {tree.nome}</label>;
                      })}
                    </div>
                  </div>
                )}

                {erro && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{erro}</div>}
                {sucesso && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{sucesso}</div>}
                <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a090e]/95 p-4 shadow-2xl backdrop-blur">
                  <button type="button" onClick={abrirHistorico} disabled={!entry?.editorial?.publicado_em} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-400 hover:text-white disabled:opacity-30"><History size={15} /> Histórico</button>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`text-xs font-bold ${dirty ? 'text-amber-300' : entry?.editorial?.rascunho ? 'text-sky-300' : 'text-emerald-300'}`}>{dirty ? 'Alterações não salvas' : entry?.editorial?.rascunho ? 'Rascunho salvo' : 'Tudo salvo'}</span>
                    <button type="button" onClick={() => void salvar()} disabled={saving || publishing || restoring || !dirty} className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary disabled:opacity-40">{saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} Salvar rascunho</button>
                    <button type="button" onClick={() => void publicar()} disabled={saving || publishing || restoring || (!dirty && !entry?.editorial?.rascunho)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40">{publishing ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />} Publicar</button>
                  </div>
                </div>
                {historicoAberto && <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><h3 className="mb-3 text-sm font-bold text-white">Versões publicadas</h3>{revisoes.length === 0 ? <p className="text-xs text-gray-500">Nenhuma versão anterior registrada.</p> : revisoes.map((revision) => <details key={revision.id} className="border-b border-white/5 py-3 text-xs last:border-0"><summary className="flex cursor-pointer flex-wrap justify-between gap-3 text-gray-300"><span>Versão {revision.versao} · {revision.autor_nome || 'Mestre'}</span><span className="text-gray-500">{new Date(revision.criado_em).toLocaleString('pt-BR')}</span></summary><pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-white/5 bg-black/40 p-3 text-[11px] text-gray-400">{JSON.stringify(revision.dados, null, 2)}</pre><button type="button" onClick={() => void restaurarRevisao(revision)} disabled={restoring} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-400/20 px-3 py-2 font-bold text-amber-300 disabled:opacity-50">{restoring ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Restaurar como rascunho</button></details>)}</div>}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
