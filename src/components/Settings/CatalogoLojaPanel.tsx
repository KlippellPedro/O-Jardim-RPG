import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive, CheckCircle2, Clock3, Code2, Loader2, PackagePlus,
  RefreshCw, RotateCcw, Save, Search, Send, Store,
} from 'lucide-react';
import {
  lojaApi,
  type LojaCatalogDocument,
  type LojaCatalogEditorEntry,
  type LojaCatalogRevision,
} from '../../services/lojaApi';
import { lerPrecoNativoLoja, mapearItemLoja } from '../../services/lojaCatalogService';
import { ItemCard } from '../../pages/Loja/components/ItemCard';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

const TIPOS = [
  'arma', 'armadura', 'artefato', 'consumivel', 'drop', 'equipamento',
  'fruto-eden', 'implante', 'modificacao', 'monstro', 'propriedade',
  'veiculo', 'veiculo-completo',
] as const;

const RARIDADES = [
  ['comum', 'Comum'], ['incomum', 'Incomum'], ['raro', 'Raro'],
  ['epico', 'Épico'], ['lendario', 'Lendário'], ['mitico', 'Mítico'],
  ['reliquia da criacao', 'Relíquia da Criação'],
] as const;

const MOEDAS = ['Solares', 'Lunaris', 'Fragmentos de Estrela', 'Créditos Sombrios'] as const;

const documentoNovo = (): LojaCatalogDocument => ({
  id: '',
  tipo: 'equipamento',
  titulo: 'Novo item',
  ativo: true,
  conteudo: {
    descricao: '',
    raridade: 'comum',
    preco: { Solares: 1 },
    nivelMinimoLoja: 1,
  },
});

function documentoDaEntrada(entry: LojaCatalogEditorEntry): LojaCatalogDocument {
  return entry.editorial?.rascunho
    ?? entry.editorial?.publicado
    ?? entry.base
    ?? documentoNovo();
}

function lerPreco(conteudo: Record<string, unknown>): { moeda: string; valor: number } {
  const raw = conteudo.preco;
  if (typeof raw === 'number') return { moeda: 'Solares', valor: raw };
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const first = Object.entries(raw as Record<string, unknown>)[0];
    if (first) return { moeda: first[0], valor: Number(first[1]) || 0 };
  }
  return { moeda: 'Solares', valor: 0 };
}

function mensagemDoErro(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
}

export function CatalogoLojaPanel({ campanhaId, onDirtyChange }: { campanhaId: string; onDirtyChange?: (dirty: boolean) => void }) {
  const [entries, setEntries] = useState<LojaCatalogEditorEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [document, setDocument] = useState<LojaCatalogDocument | null>(null);
  const [jsonText, setJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<'save' | 'publish' | 'history' | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [revisions, setRevisions] = useState<LojaCatalogRevision[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const confirmarDescarte = useUnsavedChanges(dirty, onDirtyChange);

  const selectedEntry = entries.find((entry) => entry.item_id === selectedId) ?? null;

  const applyEntry = useCallback((entry: LojaCatalogEditorEntry) => {
    const next = documentoDaEntrada(entry);
    setSelectedId(entry.item_id);
    setDocument(next);
    setJsonText(JSON.stringify(next.conteudo, null, 2));
    setJsonError(null);
    setRevisions(null);
    setMessage(null);
    setDirty(false);
  }, []);

  const selectEntry = (entry: LojaCatalogEditorEntry) => {
    if (entry.item_id === selectedId || !confirmarDescarte()) return;
    applyEntry(entry);
  };

  const load = useCallback(async (preferredId?: string | null) => {
    setLoading(true);
    try {
      const response = await lojaApi.listarCatalogoEditor(campanhaId);
      setEntries(response.itens);
      const id = preferredId ?? selectedId;
      const preferred = response.itens.find((entry) => entry.item_id === id);
      if (preferred) applyEntry(preferred);
    } catch (error) {
      setMessage({ kind: 'error', text: mensagemDoErro(error) });
    } finally {
      setLoading(false);
    }
  }, [applyEntry, campanhaId, selectedId]);

  useEffect(() => { void load(null); }, [campanhaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return entries;
    return entries.filter((entry) => {
      const doc = documentoDaEntrada(entry);
      return `${entry.item_id} ${doc.titulo} ${doc.tipo}`.toLocaleLowerCase('pt-BR').includes(term);
    });
  }, [entries, search]);

  const updateDocument = (change: Partial<LojaCatalogDocument>) => {
    setDocument((current) => current ? { ...current, ...change } : current);
    setDirty(true);
    setMessage(null);
  };

  const updateContent = (change: Record<string, unknown>) => {
    if (jsonError) {
      setMessage({ kind: 'error', text: 'Corrija o JSON avançado antes de alterar os campos simples.' });
      return;
    }
    setDocument((current) => {
      if (!current) return current;
      const conteudo = { ...current.conteudo, ...change };
      setJsonText(JSON.stringify(conteudo, null, 2));
      return { ...current, conteudo };
    });
    setDirty(true);
    setMessage(null);
  };

  const startNew = () => {
    if (!confirmarDescarte()) return;
    const next = documentoNovo();
    setSelectedId('__novo__');
    setDocument(next);
    setJsonText(JSON.stringify(next.conteudo, null, 2));
    setJsonError(null);
    setRevisions(null);
    setMessage(null);
    setDirty(true);
  };

  const applyAdvancedJson = (): Record<string, unknown> | null => {
    try {
      const parsed: unknown = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new TypeError('O conteúdo avançado precisa ser um objeto JSON.');
      }
      const conteudo = parsed as Record<string, unknown>;
      setDocument((current) => current ? { ...current, conteudo } : current);
      setJsonText(JSON.stringify(conteudo, null, 2));
      setJsonError(null);
      setMessage(null);
      return conteudo;
    } catch (error) {
      const text = mensagemDoErro(error);
      setJsonError(text);
      setMessage({ kind: 'error', text: `JSON inválido: ${text}` });
      return null;
    }
  };

  const updateAdvancedJson = (value: string) => {
    setJsonText(value);
    try {
      const parsed: unknown = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new TypeError('O conteúdo avançado precisa ser um objeto JSON.');
      }
      setDocument((current) => current ? { ...current, conteudo: parsed as Record<string, unknown> } : current);
      setJsonError(null);
      setMessage(null);
    } catch (error) {
      setJsonError(mensagemDoErro(error));
    }
    setDirty(true);
  };

  const save = async () => {
    if (!document) return;
    const conteudo = applyAdvancedJson();
    if (!conteudo) return;
    const itemId = document.id.trim();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(itemId)) {
      setMessage({ kind: 'error', text: 'O ID deve usar apenas letras minúsculas, números e hífens.' });
      return;
    }
    setWorking('save');
    try {
      await lojaApi.salvarRascunhoCatalogo({
        campanha_id: campanhaId,
        item_id: itemId,
        tipo: document.tipo,
        titulo: document.titulo,
        conteudo,
        ativo: document.ativo,
        versao_esperada: selectedEntry?.editorial?.versao ?? null,
      });
      await load(itemId);
      setMessage({ kind: 'ok', text: 'Rascunho salvo. A loja dos jogadores ainda não mudou.' });
    } catch (error) {
      setMessage({ kind: 'error', text: mensagemDoErro(error) });
    } finally {
      setWorking(null);
    }
  };

  const publish = async () => {
    if (dirty) {
      setMessage({ kind: 'error', text: 'Existem alterações não salvas. Salve o rascunho atual antes de publicar.' });
      return;
    }
    const editorial = selectedEntry?.editorial;
    if (!editorial) {
      setMessage({ kind: 'error', text: 'Salve o rascunho antes de publicar.' });
      return;
    }
    setWorking('publish');
    try {
      await lojaApi.publicarItemCatalogo(editorial.id, campanhaId, editorial.versao);
      await load(selectedEntry.item_id);
      setMessage({ kind: 'ok', text: document?.ativo === false ? 'Item retirado da loja desta campanha.' : 'Item publicado na loja da campanha.' });
    } catch (error) {
      setMessage({ kind: 'error', text: mensagemDoErro(error) });
    } finally {
      setWorking(null);
    }
  };

  const loadHistory = async () => {
    const editorial = selectedEntry?.editorial;
    if (!editorial) return;
    setWorking('history');
    try {
      const response = await lojaApi.listarRevisoesCatalogo(editorial.id, campanhaId);
      setRevisions(response.revisoes);
    } catch (error) {
      setMessage({ kind: 'error', text: mensagemDoErro(error) });
    } finally {
      setWorking(null);
    }
  };

  const restoreRevision = async (revision: LojaCatalogRevision) => {
    const editorial = selectedEntry?.editorial;
    if (!editorial || !confirmarDescarte('Existem alterações não salvas. Deseja descartá-las para restaurar uma versão anterior?') || !window.confirm(`Restaurar a versão ${revision.versao} como rascunho? A loja publicada continuará igual.`)) return;
    setWorking('history');
    try {
      await lojaApi.restaurarRevisaoCatalogo(editorial.id, revision.id, campanhaId, editorial.versao);
      await load(selectedEntry.item_id);
      setMessage({ kind: 'ok', text: `Versão ${revision.versao} restaurada como rascunho.` });
    } catch (error) {
      setMessage({ kind: 'error', text: mensagemDoErro(error) });
    } finally {
      setWorking(null);
    }
  };

  const price = document ? lerPreco(document.conteudo) : { moeda: 'Solares', valor: 0 };
  const parsedPrice = document ? lerPrecoNativoLoja(document.conteudo.preco) : null;
  const preview = document && parsedPrice
    ? mapearItemLoja({
        id: document.id || 'novo-item',
        tipo: document.tipo,
        titulo: document.titulo,
        conteudo: document.conteudo,
        preco: { moeda: parsedPrice.moedaPreco, valor: parsedPrice.valorOriginal },
        nivel_loja: Number(document.conteudo.nivelMinimoLoja) || 1,
      })
    : null;
  const hasSavedDraft = Boolean(selectedEntry?.editorial && (
    !selectedEntry.editorial.publicado
    || JSON.stringify(selectedEntry.editorial.rascunho) !== JSON.stringify(selectedEntry.editorial.publicado)
  ));

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        <div className="border-b border-white/10 p-4">
          <button type="button" onClick={startNew} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-black hover:brightness-110">
            <PackagePlus size={16} /> Criar item da campanha
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar item ou ID..." className="w-full rounded-xl border border-white/10 bg-black/50 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-primary/50" />
          </div>
        </div>
        <div className="max-h-[720px] overflow-y-auto p-2">
          {loading ? <div className="flex justify-center py-10 text-primary"><Loader2 className="animate-spin" /></div> : filtered.map((entry) => {
            const doc = documentoDaEntrada(entry);
            return (
              <button key={entry.item_id} type="button" onClick={() => selectEntry(entry)} className={`mb-1 w-full rounded-xl border p-3 text-left transition-colors ${selectedId === entry.item_id ? 'border-primary/50 bg-primary/10' : 'border-transparent hover:bg-white/5'}`}>
                <span className="block truncate text-sm font-bold text-white">{doc.titulo}</span>
                <span className="mt-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-gray-500">
                  <span className="truncate">{entry.item_id}</span>
                  <span>{entry.origem === 'oficial' ? 'oficial' : 'campanha'}</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="min-w-0 rounded-2xl border border-white/10 bg-black/30 p-5 md:p-7">
        {!document ? (
          <div className="flex min-h-80 flex-col items-center justify-center text-center text-gray-500">
            <Store size={38} className="mb-3 opacity-60" />
            <p>Escolha um item ou crie um novo.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="sticky top-3 z-20 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[#0a090e]/95 p-4 shadow-2xl backdrop-blur">
              <div>
                <h2 className="text-xl font-bold text-white">Editor do catálogo</h2>
                <p className="mt-1 text-xs text-gray-500">Rascunhos são privados. Somente Publicar altera a loja dos jogadores.</p>
                <p className={`mt-2 text-xs font-bold ${dirty ? 'text-amber-300' : hasSavedDraft ? 'text-sky-300' : 'text-emerald-300'}`}>{dirty ? 'Alterações não salvas' : hasSavedDraft ? 'Rascunho salvo e pronto para publicar' : 'Tudo salvo e publicado'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { if (confirmarDescarte('Existem alterações não salvas. Deseja recarregar e descartá-las?')) void load(selectedEntry?.item_id); }} disabled={loading || working !== null} className="rounded-xl border border-white/10 p-2.5 text-gray-400 hover:text-white" title="Recarregar"><RefreshCw size={16} /></button>
                {selectedEntry?.editorial && <button type="button" onClick={loadHistory} disabled={working !== null} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-gray-300 hover:border-white/30"><Clock3 size={15} /> Histórico</button>}
                <button type="button" onClick={save} disabled={working !== null || !dirty} className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 disabled:opacity-50">{working === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar rascunho</button>
                <button type="button" onClick={publish} disabled={working !== null || dirty || !hasSavedDraft} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">{working === 'publish' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Publicar</button>
              </div>
            </div>

            {message && <div className={`rounded-xl border px-4 py-3 text-sm ${message.kind === 'ok' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>{message.text}</div>}

            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">ID permanente
                    <input value={document.id} disabled={selectedId !== '__novo__'} onChange={(event) => updateDocument({ id: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-primary/50 disabled:opacity-50" />
                  </label>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Tipo
                    <select value={document.tipo} onChange={(event) => updateDocument({ tipo: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-primary/50">{TIPOS.map((type) => <option key={type}>{type}</option>)}</select>
                  </label>
                </div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Nome
                  <input value={document.titulo} onChange={(event) => updateDocument({ titulo: event.target.value })} maxLength={160} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-primary/50" />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Descrição
                  <textarea value={String(document.conteudo.descricao ?? '')} onChange={(event) => updateContent({ descricao: event.target.value })} rows={4} className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-primary/50" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Raridade
                    <select value={String(document.conteudo.raridade ?? 'comum')} onChange={(event) => updateContent({ raridade: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white">{RARIDADES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
                  </label>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Moeda
                    <select value={price.moeda} onChange={(event) => updateContent({ preco: { [event.target.value]: Math.max(1, price.valor) } })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white">{MOEDAS.map((currency) => <option key={currency}>{currency}</option>)}</select>
                  </label>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Preço
                    <input type="number" min={1} step={1} value={price.valor} onChange={(event) => updateContent({ preco: { [price.moeda]: Number(event.target.value) } })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white" />
                  </label>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nível da loja
                    <select value={Number(document.conteudo.nivelMinimoLoja) || 1} onChange={(event) => updateContent({ nivelMinimoLoja: Number(event.target.value) })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white">{[1, 2, 3, 4].map((level) => <option key={level} value={level}>Nível {level}</option>)}</select>
                  </label>
                </div>

                <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 ${document.ativo ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-amber-500/20 bg-amber-500/10'}`}>
                  <span className="flex items-center gap-3 text-sm font-bold text-white">{document.ativo ? <CheckCircle2 className="text-emerald-400" size={18} /> : <Archive className="text-amber-400" size={18} />}{document.ativo ? 'Disponível na campanha' : 'Retirar da loja ao publicar'}</span>
                  <input type="checkbox" checked={document.ativo} onChange={(event) => updateDocument({ ativo: event.target.checked })} className="h-5 w-5 accent-emerald-500" />
                </label>

                <div className="rounded-xl border border-white/10">
                  <button type="button" onClick={() => setShowAdvanced((value) => !value)} className="flex w-full items-center justify-between p-4 text-left text-sm font-bold text-gray-300"><span className="flex items-center gap-2"><Code2 size={16} /> Campos avançados (JSON)</span><span className="text-xs text-gray-600">{showAdvanced ? 'Fechar' : 'Abrir'}</span></button>
                  {showAdvanced && <div className="border-t border-white/10 p-4"><textarea value={jsonText} onChange={(event) => updateAdvancedJson(event.target.value)} spellCheck={false} rows={16} className="w-full resize-y rounded-xl border border-white/10 bg-black/70 p-3 font-mono text-xs text-gray-200 outline-none focus:border-primary/50" />{jsonError && <p role="alert" className="mt-2 text-xs text-red-300">JSON inválido: {jsonError}</p>}<button type="button" onClick={applyAdvancedJson} className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-gray-300 hover:border-primary/30 hover:text-primary">Validar e formatar JSON</button></div>}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500">Prévia do cartão</p>
                {preview ? <ItemCard item={preview} onBuy={() => undefined} onView={() => undefined} podeComprar={false} /> : <div className="rounded-2xl border border-dashed border-red-500/30 p-6 text-sm text-red-300">Defina um preço inteiro positivo em uma moeda válida para gerar a prévia.</div>}
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-gray-500">
                  <p>Versão: <span className="text-gray-300">{selectedEntry?.editorial?.versao ?? 'novo rascunho'}</span></p>
                  <p className="mt-1">Última publicação: <span className="text-gray-300">{selectedEntry?.editorial?.publicado_em ? new Date(selectedEntry.editorial.publicado_em).toLocaleString('pt-BR') : 'nunca'}</span></p>
                </div>
              </div>
            </div>

            {revisions && <div className="rounded-xl border border-white/10 bg-black/30 p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Clock3 size={16} className="text-primary" /> Publicações anteriores</h3>{revisions.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{revisions.map((revision) => <details key={revision.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs"><summary className="cursor-pointer"><p className="font-bold text-gray-200">Versão {revision.versao}</p><p className="mt-1 truncate text-gray-500">{revision.dados.titulo}</p><p className="mt-1 text-gray-500">{new Date(revision.criado_em).toLocaleString('pt-BR')}</p></summary><pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-black/40 p-2 text-[10px] text-gray-400">{JSON.stringify(revision.dados, null, 2)}</pre><button type="button" onClick={() => void restoreRevision(revision)} disabled={working !== null} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-400/20 px-3 py-2 font-bold text-amber-300 disabled:opacity-50"><RotateCcw size={13} /> Restaurar como rascunho</button></details>)}</div> : <p className="text-sm text-gray-500">Nenhuma publicação registrada.</p>}</div>}
          </div>
        )}
      </section>
    </div>
  );
}
