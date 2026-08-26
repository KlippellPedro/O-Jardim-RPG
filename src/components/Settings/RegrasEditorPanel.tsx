import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock3, History, Loader2, LockKeyhole, RotateCcw, Save, Search, Send } from 'lucide-react';
import {
  conteudoEditorialApi,
  type EditorialLibraryEntry,
  type EditorialRevision,
  type EditorialState,
  type LoreDocument,
} from '../../services/conteudoEditorialApi';
import { RegrasContent } from '../../pages/Regras/components/RegrasContent';
import { NarrativeFieldsEditor } from './NarrativeFieldsEditor';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

const TIPOS_EDITAVEIS = [
  ['regra', 'Capítulos'],
  ['classe', 'Classes'],
  ['raca', 'Raças'],
  ['fluxo', 'Fluxos'],
  ['magia', 'Magias'],
  ['ritual', 'Rituais'],
  ['selo', 'Selos'],
  ['encantamento', 'Encantamentos'],
  ['pericia', 'Perícias'],
  ['legado', 'Legados'],
  ['condicao', 'Condições'],
  ['crise', 'Crises'],
] as const;

type TipoRegra = typeof TIPOS_EDITAVEIS[number][0];
const TIPOS_EDITAVEIS_SET = new Set<string>(TIPOS_EDITAVEIS.map(([value]) => value));

interface RegrasEditorPanelProps {
  campanhaId: string;
  initialItem?: string;
  onDirtyChange?: (dirty: boolean) => void;
}

function documentoEfetivo(entry: EditorialLibraryEntry): LoreDocument {
  if (entry.editorial?.rascunho) return entry.editorial.rascunho;
  if (entry.editorial?.publicado_em && entry.editorial.dados_completos?.titulo) {
    return entry.editorial.dados_completos as LoreDocument;
  }
  return entry.dados_base;
}

function tipoValido(value: string | undefined): TipoRegra {
  return value && TIPOS_EDITAVEIS_SET.has(value) ? value as TipoRegra : 'regra';
}

export function RegrasEditorPanel({ campanhaId, initialItem, onDirtyChange }: RegrasEditorPanelProps) {
  const [entradas, setEntradas] = useState<EditorialLibraryEntry[]>([]);
  const [tipo, setTipo] = useState<TipoRegra>(() => tipoValido(initialItem?.split(':', 1)[0]));
  const [selecionadaChave, setSelecionadaChave] = useState(initialItem || '');
  const [busca, setBusca] = useState('');
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [revisoes, setRevisoes] = useState<EditorialRevision[]>([]);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [previewAberta, setPreviewAberta] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const corpoRef = useRef<HTMLTextAreaElement | null>(null);
  const confirmarDescarte = useUnsavedChanges(dirty, onDirtyChange);

  const carregar = async (signal?: AbortSignal) => {
    setLoading(true);
    setErro(null);
    try {
      const resposta = await conteudoEditorialApi.listarRegras(campanhaId, signal);
      const editaveis = (resposta.entradas || []).filter((entry) => TIPOS_EDITAVEIS_SET.has(entry.tipo));
      setEntradas(editaveis);
      setSelecionadaChave((atual) => {
        if (atual && editaveis.some((entry) => entry.chave === atual)) return atual;
        return editaveis.find((entry) => entry.tipo === tipo)?.chave || '';
      });
    } catch (error: any) {
      if (error?.name !== 'AbortError') setErro(error?.message || 'Não foi possível carregar as regras editáveis.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void carregar(controller.signal);
    return () => controller.abort();
  }, [campanhaId]);

  useEffect(() => {
    if (!initialItem) return;
    setTipo(tipoValido(initialItem.split(':', 1)[0]));
    setSelecionadaChave(initialItem);
  }, [initialItem]);

  const selecionada = entradas.find((entry) => entry.chave === selecionadaChave) || null;

  useEffect(() => {
    if (!selecionada) return;
    const documento = documentoEfetivo(selecionada);
    setTitulo(documento.titulo || selecionada.titulo);
    setConteudo(documento.conteudo || {});
    setDirty(false);
    setErro(null);
    setSucesso(null);
    setRevisoes([]);
    setHistoricoAberto(false);
    setPreviewAberta(false);
  }, [selecionadaChave, selecionada?.editorial?.versao_editorial]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return entradas.filter((entry) => {
      if (entry.tipo !== tipo) return false;
      if (!termo) return true;
      const documento = documentoEfetivo(entry);
      return `${documento.titulo || entry.titulo} ${entry.chave_recurso}`.toLocaleLowerCase('pt-BR').includes(termo);
    });
  }, [busca, entradas, tipo]);

  const marcarAlteracao = () => {
    setDirty(true);
    setSucesso(null);
  };

  const atualizarCampo = (key: string, value: unknown) => {
    setConteudo((atual) => ({ ...atual, [key]: value }));
    marcarAlteracao();
  };

  const formatarCorpo = (tag: 'p' | 'strong' | 'h3' | 'ul') => {
    const textarea = corpoRef.current;
    const atual = String(conteudo.corpo || '');
    const inicio = textarea?.selectionStart ?? atual.length;
    const fim = textarea?.selectionEnd ?? inicio;
    const selecionado = atual.slice(inicio, fim) || (tag === 'h3' ? 'Novo título' : tag === 'ul' ? 'Primeiro item' : 'Novo texto');
    const bloco = tag === 'ul' ? `<ul>\n  <li>${selecionado}</li>\n</ul>` : `<${tag}>${selecionado}</${tag}>`;
    atualizarCampo('corpo', `${atual.slice(0, inicio)}${bloco}${atual.slice(fim)}`);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(inicio, inicio + bloco.length);
    });
  };

  const escolherTipo = (novoTipo: TipoRegra) => {
    if (!confirmarDescarte()) return;
    setTipo(novoTipo);
    const primeira = entradas.find((entry) => entry.tipo === novoTipo);
    if (primeira) setSelecionadaChave(primeira.chave);
  };

  const escolherEntrada = (chave: string) => {
    if (chave === selecionadaChave || !confirmarDescarte()) return;
    setSelecionadaChave(chave);
  };

  const salvar = async (): Promise<EditorialState | null> => {
    if (!selecionada || !titulo.trim()) return null;
    setSaving(true);
    setErro(null);
    try {
      const resposta = await conteudoEditorialApi.salvarRascunho({
        campanha_id: campanhaId,
        modulo: 'regras',
        tipo: selecionada.tipo,
        chave_recurso: selecionada.chave_recurso,
        titulo: titulo.trim(),
        conteudo,
        versao_esperada: selecionada.editorial?.versao_editorial ?? null,
      });
      setEntradas((atuais) => atuais.map((entry) => (
        entry.chave === selecionada.chave
          ? { ...entry, editorial: { ...entry.editorial, ...resposta.editorial } as EditorialState }
          : entry
      )));
      setDirty(false);
      setSucesso('Rascunho salvo. A versão pública ainda não mudou.');
      return resposta.editorial;
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível salvar o rascunho.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const publicar = async () => {
    if (!selecionada) return;
    setPublishing(true);
    setErro(null);
    try {
      let editorial = selecionada.editorial;
      if (dirty || !editorial?.rascunho) editorial = await salvar();
      if (!editorial) return;
      await conteudoEditorialApi.publicar(editorial.id, campanhaId, editorial.versao_editorial);
      await carregar();
      setSucesso('Alteração publicada nesta campanha.');
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível publicar a alteração.');
    } finally {
      setPublishing(false);
    }
  };

  const abrirHistorico = async () => {
    if (!selecionada?.editorial?.id) return;
    setHistoricoAberto((aberto) => !aberto);
    if (revisoes.length) return;
    try {
      const resposta = await conteudoEditorialApi.listarRevisoes(selecionada.editorial.id, campanhaId);
      setRevisoes(resposta.revisoes || []);
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível carregar o histórico.');
    }
  };

  const restaurarRevisao = async (revision: EditorialRevision) => {
    if (!selecionada?.editorial?.id || !confirmarDescarte('Existem alterações não salvas. Deseja descartá-las para restaurar uma versão anterior?') || !window.confirm(`Restaurar a versão ${revision.versao} como novo rascunho? A versão pública continuará igual até você publicar.`)) return;
    setRestoring(true);
    setErro(null);
    try {
      await conteudoEditorialApi.restaurarRevisao(
        selecionada.editorial.id,
        revision.id,
        campanhaId,
        selecionada.editorial.versao_editorial,
      );
      await carregar();
      setSucesso(`Versão ${revision.versao} restaurada como rascunho para revisão.`);
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível restaurar a versão.');
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-80 items-center justify-center text-primary"><Loader2 className="animate-spin" size={30} /></div>;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a090e] shadow-2xl">
      <header className="border-b border-white/10 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 text-primary" size={24} />
          <div>
            <h2 className="text-xl font-bold text-white">Livro de Regras</h2>
            <p className="mt-1 text-sm leading-6 text-gray-400">Edite capítulos, classes, raças, magia, perícias, Legados e condições. Títulos e textos narrativos são liberados; números, custos, requisitos e progressão continuam oficiais.</p>
          </div>
        </div>
      </header>

      <div className="grid min-h-[680px] lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
          <label className="mb-4 block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-600">Catálogo</span>
            <select value={tipo} onChange={(event) => escolherTipo(event.target.value as TipoRegra)} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-primary/50">
              {TIPOS_EDITAVEIS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="relative mb-4 block">
            <span className="sr-only">Buscar conteúdo</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar..." className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-primary/50" />
          </label>
          <div className="max-h-[570px] space-y-1 overflow-y-auto pr-1 custom-scrollbar">
            {filtradas.map((entry) => {
              const displayTitle = documentoEfetivo(entry).titulo || entry.titulo;
              return (
                <button key={entry.chave} type="button" onClick={() => escolherEntrada(entry.chave)} className={`w-full rounded-xl border px-3 py-3 text-left transition ${entry.chave === selecionadaChave ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'}`}>
                  <span className="block text-sm font-medium text-gray-200">{displayTitle}</span>
                  <span className={`mt-1.5 inline-flex items-center gap-1 text-[10px] ${entry.editorial?.rascunho ? 'text-amber-400' : entry.editorial?.publicado_em ? 'text-emerald-400' : 'text-gray-600'}`}>
                    {entry.editorial?.rascunho ? <Clock3 size={11} /> : entry.editorial?.publicado_em ? <Check size={11} /> : null}
                    {entry.editorial?.rascunho ? 'Rascunho' : entry.editorial?.publicado_em ? 'Personalizado' : 'Oficial'}
                  </span>
                </button>
              );
            })}
            {!filtradas.length ? <p className="px-3 py-8 text-center text-xs text-gray-600">Nenhuma entrada encontrada.</p> : null}
          </div>
        </aside>

        <section className="min-w-0 p-5 md:p-8">
          {!selecionada ? <p className="text-sm text-gray-500">Selecione uma entrada para editar.</p> : (
            <div className="mx-auto max-w-4xl space-y-6">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Título</label>
                <input value={titulo} onChange={(event) => { setTitulo(event.target.value); marcarAlteracao(); }} maxLength={160} className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-primary/50" />
              </div>

              {selecionada.tipo === 'regra' ? (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Categoria</label><select value={String(conteudo.categoria || 'Livro do Jogador')} onChange={(event) => atualizarCampo('categoria', event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/50"><option>Livro do Jogador</option><option>Combate e Mecânicas</option><option>Guia do Mestre</option></select></div>
                    <div><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Status</label><input value={String(conteudo.status || '')} onChange={(event) => atualizarCampo('status', event.target.value)} maxLength={160} className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/50" /></div>
                  </div>
                  <div><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Resumo</label><textarea rows={4} value={String(conteudo.resumo || '')} onChange={(event) => atualizarCampo('resumo', event.target.value)} className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-gray-200 outline-none focus:border-primary/50" /></div>
                  <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Corpo do capítulo <span className="normal-case tracking-normal text-gray-500">(HTML seguro)</span></label><div className="flex flex-wrap gap-1" aria-label="Atalhos de formatação"><button type="button" onClick={() => formatarCorpo('h3')} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-gray-300 hover:text-primary">Título</button><button type="button" onClick={() => formatarCorpo('p')} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-gray-300 hover:text-primary">Parágrafo</button><button type="button" onClick={() => formatarCorpo('strong')} className="rounded-lg border border-white/10 px-2 py-1 text-xs font-bold text-gray-300 hover:text-primary">Negrito</button><button type="button" onClick={() => formatarCorpo('ul')} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-gray-300 hover:text-primary">Lista</button></div></div><textarea ref={corpoRef} rows={18} value={String(conteudo.corpo || '')} onChange={(event) => atualizarCampo('corpo', event.target.value)} spellCheck={false} className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-xs leading-6 text-gray-200 outline-none focus:border-primary/50" /></div>
                  {'corpoMestre' in conteudo ? <div><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Orientações do mestre <span className="normal-case tracking-normal text-gray-700">(não exibidas a jogadores pela API)</span></label><textarea rows={10} value={String(conteudo.corpoMestre || '')} onChange={(event) => atualizarCampo('corpoMestre', event.target.value)} spellCheck={false} className="w-full resize-y rounded-xl border border-amber-400/15 bg-amber-400/[0.03] px-4 py-3 font-mono text-xs leading-6 text-gray-200 outline-none focus:border-amber-400/35" /></div> : null}
                  <div><button type="button" onClick={() => setPreviewAberta((aberta) => !aberta)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:border-primary/30 hover:text-primary">{previewAberta ? 'Fechar prévia' : 'Abrir prévia sanitizada'}</button>{previewAberta ? <div className="mt-4 rounded-2xl border border-white/10 bg-[#111017] px-5 py-2"><RegrasContent htmlContent={String(conteudo.corpo || '')} /></div> : null}</div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-4 py-3 text-sm leading-6 text-amber-100/70"><strong className="text-amber-200">Mecânicas bloqueadas.</strong> Este formulário altera apenas a apresentação narrativa; os demais campos do documento são preservados e conferidos pelo servidor.</div>
                  {(selecionada.tipo === 'condicao' || selecionada.tipo === 'crise') ? <div className="rounded-xl border border-sky-400/20 bg-sky-400/[0.05] px-4 py-3 text-xs leading-5 text-sky-100/65">A ficha automatizada ainda aplica a regra oficial. Textos personalizados de condições e crises servem como orientação para aplicação manual na mesa.</div> : null}
                  <NarrativeFieldsEditor tipo={selecionada.tipo} conteudo={conteudo} onChange={(next) => { setConteudo(next); marcarAlteracao(); }} />
                </div>
              )}

              {erro && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{erro}</div>}
              {sucesso && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{sucesso}</div>}

              <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a090e]/95 p-4 shadow-2xl backdrop-blur">
                <button type="button" onClick={abrirHistorico} disabled={!selecionada.editorial?.publicado_em} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-400 hover:text-white disabled:opacity-30"><History size={15} /> Histórico</button>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`text-xs font-bold ${dirty ? 'text-amber-300' : selecionada.editorial?.rascunho ? 'text-sky-300' : 'text-emerald-300'}`}>{dirty ? 'Alterações não salvas' : selecionada.editorial?.rascunho ? 'Rascunho salvo' : 'Tudo salvo'}</span>
                  <button type="button" onClick={() => void salvar()} disabled={saving || publishing || restoring || !dirty || !titulo.trim()} className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary disabled:opacity-40">{saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} Salvar rascunho</button>
                  <button type="button" onClick={() => void publicar()} disabled={saving || publishing || restoring || !titulo.trim() || (!dirty && !selecionada.editorial?.rascunho)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40">{publishing ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />} Publicar</button>
                </div>
              </div>

              {historicoAberto ? <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><h3 className="mb-3 text-sm font-bold text-white">Versões publicadas</h3>{revisoes.length === 0 ? <p className="text-xs text-gray-500">Nenhuma versão anterior registrada.</p> : revisoes.map((revision) => <details key={revision.id} className="border-b border-white/5 py-3 text-xs last:border-0"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 text-gray-300"><span>Versão {revision.versao} · {revision.autor_nome || 'Mestre'}</span><span className="text-gray-500">{new Date(revision.criado_em).toLocaleString('pt-BR')}</span></summary><pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-white/5 bg-black/40 p-3 text-[11px] text-gray-400">{JSON.stringify(revision.dados, null, 2)}</pre><button type="button" onClick={() => void restaurarRevisao(revision)} disabled={restoring} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-400/20 px-3 py-2 font-bold text-amber-300 disabled:opacity-50">{restoring ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Restaurar como rascunho</button></details>)}</div> : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
