import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Check, ChevronDown, Clock3, Code2, FileText, FolderOpen, History, Loader2, Lock, Plus, RotateCcw, Save, Search, Send, Trash2, X } from 'lucide-react';
import {
  conteudoEditorialApi,
  type EditorialLibraryEntry,
  type EditorialRevision,
  type EditorialState,
  type LoreDocument,
} from '../../services/conteudoEditorialApi';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

interface ConteudoLorePanelProps {
  onDirtyChange?: (dirty: boolean) => void;
}

const TIPOS_LORE = [
  'cosmologia', 'conceito', 'deidade', 'fluxo', 'realidade', 'galho',
  'dimensao', 'mundo', 'reino', 'personagem', 'soberano', 'npc', 'evento',
  'idioma', 'cultura', 'local',
] as const;

type FiltroBiblioteca = 'todos' | 'criados' | 'rascunhos' | 'excluidos';

const ORDEM_TIPOS = [
  'cosmologia', 'conceito', 'deidade', 'fluxo', 'galho', 'realidade',
  'dimensao', 'mundo', 'reino', 'local', 'personagem', 'soberano', 'npc',
  'evento', 'idioma', 'cultura',
];

function documentoEfetivo(entry: EditorialLibraryEntry): LoreDocument {
  if (entry.editorial?.rascunho) return entry.editorial.rascunho;
  if (entry.editorial?.publicado_em && entry.editorial.dados_completos?.titulo) {
    return entry.editorial.dados_completos as LoreDocument;
  }
  return entry.dados_base;
}

function rotuloCampo(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase('pt-BR'));
}

export function ConteudoLorePanel({ onDirtyChange }: ConteudoLorePanelProps) {
  const [entradas, setEntradas] = useState<EditorialLibraryEntry[]>([]);
  const [selecionadaChave, setSelecionadaChave] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroBiblioteca>('todos');
  const [tiposAbertos, setTiposAbertos] = useState<Set<string>>(new Set());
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState<Record<string, unknown>>({});
  const [revelado, setRevelado] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [revisoes, setRevisoes] = useState<EditorialRevision[]>([]);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [avisoLista, setAvisoLista] = useState<string | null>(null);
  const [novaEntrada, setNovaEntrada] = useState(false);
  const [novoTipo, setNovoTipo] = useState<string>('conceito');
  const [novoId, setNovoId] = useState('');
  const [jsonText, setJsonText] = useState('{}');
  const [jsonAberto, setJsonAberto] = useState(false);
  const [jsonErro, setJsonErro] = useState<string | null>(null);
  const confirmarDescarte = useUnsavedChanges(dirty, onDirtyChange);

  const carregar = async (signal?: AbortSignal, preferredKey?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const resposta = await conteudoEditorialApi.listarMundoGlobal(signal);
      const loreEntries = (resposta.entradas || []).filter((entry) => entry.tipo !== 'cronologia');
      setEntradas(loreEntries);
      setTiposAbertos((atuais) => atuais.size > 0 || !loreEntries[0]
        ? atuais
        : new Set([loreEntries[0].tipo]));
      setSelecionadaChave((atual) => {
        if (preferredKey && loreEntries.some((entry) => entry.chave === preferredKey)) return preferredKey;
        if (atual && loreEntries.some((entry) => entry.chave === atual)) return atual;
        return loreEntries.find((entry) => !entry.excluido)?.chave || loreEntries[0]?.chave || '';
      });
    } catch (error: any) {
      if (error?.name !== 'AbortError') setErro(error?.message || 'Não foi possível carregar a biblioteca de Mundo.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void carregar(controller.signal);
    return () => controller.abort();
  }, []);

  const selecionada = novaEntrada ? {
    chave: '__novo__',
    tipo: novoTipo,
    chave_recurso: novoId,
    titulo: titulo || 'Nova entrada',
    dados_base: { tipo: novoTipo, id: novoId, titulo: titulo || 'Nova entrada', conteudo, revelado },
    editorial: null,
  } satisfies EditorialLibraryEntry : entradas.find((entry) => entry.chave === selecionadaChave) || null;

  useEffect(() => {
    if (!selecionada || novaEntrada) return;
    const documento = documentoEfetivo(selecionada);
    setNovoTipo(documento.tipo || selecionada.tipo);
    setTitulo(documento.titulo || selecionada.titulo);
    setConteudo(documento.conteudo || {});
    setRevelado(documento.revelado !== false);
    setJsonText(JSON.stringify(documento.conteudo || {}, null, 2));
    setJsonErro(null);
    setJsonAberto(false);
    setDirty(false);
    setErro(null);
    setSucesso(null);
    setRevisoes([]);
    setHistoricoAberto(false);
  }, [novaEntrada, selecionadaChave, selecionada?.editorial?.versao_editorial]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return entradas.filter((entry) => {
      if (filtro === 'excluidos') return Boolean(entry.excluido) && (!termo || `${documentoEfetivo(entry).titulo} ${entry.tipo} ${entry.chave_recurso}`.toLocaleLowerCase('pt-BR').includes(termo));
      if (entry.excluido) return false;
      if (filtro === 'criados' && entry.origem !== 'global') return false;
      if (filtro === 'rascunhos' && !entry.editorial?.rascunho) return false;
      if (!termo) return true;
      const document = documentoEfetivo(entry);
      return `${document.titulo || entry.titulo} ${entry.tipo} ${entry.chave_recurso}`.toLocaleLowerCase('pt-BR').includes(termo);
    });
  }, [busca, entradas, filtro]);

  const grupos = useMemo(() => {
    const porTipo = new Map<string, EditorialLibraryEntry[]>();
    for (const entry of filtradas) {
      const atual = porTipo.get(entry.tipo) || [];
      atual.push(entry);
      porTipo.set(entry.tipo, atual);
    }
    return [...porTipo.entries()]
      .sort(([tipoA], [tipoB]) => {
        const a = ORDEM_TIPOS.indexOf(tipoA);
        const b = ORDEM_TIPOS.indexOf(tipoB);
        if (a === -1 && b === -1) return tipoA.localeCompare(tipoB, 'pt-BR');
        if (a === -1) return 1;
        if (b === -1) return -1;
        return a - b;
      })
      .map(([tipo, items]) => ({
        tipo,
        items: [...items].sort((a, b) => documentoEfetivo(a).titulo.localeCompare(documentoEfetivo(b).titulo, 'pt-BR')),
      }));
  }, [filtradas]);

  const totais = useMemo(() => ({
    todos: entradas.filter((entry) => !entry.excluido).length,
    criados: entradas.filter((entry) => entry.origem === 'global' && !entry.excluido).length,
    rascunhos: entradas.filter((entry) => entry.editorial?.rascunho && !entry.excluido).length,
    personalizados: entradas.filter((entry) => entry.editorial?.publicado_em && !entry.excluido).length,
    excluidos: entradas.filter((entry) => entry.excluido).length,
  }), [entradas]);

  const marcarAlteracao = () => {
    setDirty(true);
    setSucesso(null);
  };

  const atualizarCampo = (key: string, value: unknown) => {
    if (jsonErro) {
      setErro('Corrija o JSON do editor completo antes de alterar os campos simples.');
      return;
    }
    setConteudo((atual) => {
      const next = { ...atual, [key]: value };
      setJsonText(JSON.stringify(next, null, 2));
      return next;
    });
    marcarAlteracao();
  };

  const escolherEntrada = (chave: string) => {
    if ((!novaEntrada && chave === selecionadaChave) || !confirmarDescarte()) return;
    setNovaEntrada(false);
    setSelecionadaChave(chave);
  };

  const iniciarNovaEntrada = () => {
    if (!confirmarDescarte()) return;
    setNovaEntrada(true);
    setSelecionadaChave('__novo__');
    setNovoTipo('conceito');
    setNovoId('');
    setTitulo('Nova entrada');
    setConteudo({ descricao: '' });
    setRevelado(true);
    setJsonText(JSON.stringify({ descricao: '' }, null, 2));
    setJsonAberto(false);
    setJsonErro(null);
    setDirty(true);
    setErro(null);
    setSucesso(null);
    setRevisoes([]);
    setHistoricoAberto(false);
  };

  const cancelarNovaEntrada = () => {
    if (!confirmarDescarte('Descartar esta nova entrada ainda não salva?')) return;
    setNovaEntrada(false);
    setDirty(false);
    setSelecionadaChave(entradas[0]?.chave || '');
  };

  const alternarTipo = (tipo: string) => {
    setTiposAbertos((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(tipo)) proximos.delete(tipo);
      else proximos.add(tipo);
      return proximos;
    });
  };

  const excluirEntrada = async (entry: EditorialLibraryEntry) => {
    if (entry.excluido) return;
    const ehSelecionada = !novaEntrada && entry.chave === selecionadaChave;
    if (ehSelecionada && dirty && !confirmarDescarte('Existem alterações não salvas nesta entrada. Deseja descartá-las e excluir o conteúdo?')) return;
    const nome = documentoEfetivo(entry).titulo || entry.titulo;
    if (!window.confirm(`Excluir “${nome}” do Conteúdo do Mundo? A entrada deixará de aparecer em todas as campanhas. O histórico será preservado para restauração.`)) return;
    setDeletingId(entry.editorial?.id || entry.chave);
    setErro(null);
    setAvisoLista(null);
    try {
      let editorial = entry.editorial;
      if (!editorial?.id) {
        const documento = documentoEfetivo(entry);
        const preparada = await conteudoEditorialApi.salvarRascunhoGlobal({
          tipo: documento.tipo,
          chave_recurso: documento.id,
          chave_origem: entry.chave,
          titulo: documento.titulo,
          conteudo: documento.conteudo,
          revelado: documento.revelado,
          versao_esperada: null,
        });
        editorial = preparada.editorial;
      }
      await conteudoEditorialApi.excluirConteudoGlobal(editorial.id, editorial.versao_editorial);
      if (ehSelecionada) {
        setDirty(false);
        setNovaEntrada(false);
        setSelecionadaChave('');
      }
      await carregar(undefined, ehSelecionada ? undefined : selecionadaChave);
      setAvisoLista(`“${nome}” foi excluído globalmente. Ele pode ser recuperado no filtro Excluídos.`);
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível excluir o conteúdo.');
    } finally {
      setDeletingId(null);
    }
  };

  const restaurarEntradaExcluida = async (entry: EditorialLibraryEntry) => {
    const editorial = entry.editorial;
    if (!entry.excluido || !editorial?.id) return;
    const documento = documentoEfetivo(entry);
    if (!window.confirm(`Restaurar “${documento.titulo}” em todas as campanhas?`)) return;
    setRestoring(true);
    setErro(null);
    setAvisoLista(null);
    try {
      const rascunho = await conteudoEditorialApi.salvarRascunhoGlobal({
        tipo: documento.tipo,
        chave_recurso: documento.id,
        chave_origem: entry.chave,
        titulo: documento.titulo,
        conteudo: documento.conteudo,
        revelado: documento.revelado,
        versao_esperada: editorial.versao_editorial,
      });
      await conteudoEditorialApi.publicarGlobal(rascunho.editorial.id, rascunho.editorial.versao_editorial);
      setFiltro('todos');
      await carregar(undefined, entry.chave);
      setAvisoLista(`“${documento.titulo}” foi restaurado globalmente.`);
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível restaurar o conteúdo.');
    } finally {
      setRestoring(false);
    }
  };

  const conteudoDoJson = (): Record<string, unknown> | null => {
    try {
      const parsed: unknown = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new TypeError('o conteúdo completo precisa ser um objeto JSON');
      }
      setJsonErro(null);
      return parsed as Record<string, unknown>;
    } catch (error) {
      setJsonErro(error instanceof Error ? error.message : 'JSON inválido');
      return null;
    }
  };

  const aplicarJson = () => {
    const parsed = conteudoDoJson();
    if (!parsed) return;
    setConteudo(parsed);
    setJsonText(JSON.stringify(parsed, null, 2));
    marcarAlteracao();
  };

  const atualizarJsonCompleto = (value: string) => {
    setJsonText(value);
    try {
      const parsed: unknown = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new TypeError('o conteúdo completo precisa ser um objeto JSON');
      }
      setConteudo(parsed as Record<string, unknown>);
      setJsonErro(null);
      setErro(null);
    } catch (error) {
      setJsonErro(error instanceof Error ? error.message : 'JSON inválido');
    }
    marcarAlteracao();
  };

  const salvar = async (): Promise<EditorialState | null> => {
    if (!selecionada || !titulo.trim()) return null;
    const conteudoValidado = conteudoDoJson();
    if (!conteudoValidado) return null;
    const tipoAlvo = novoTipo.trim();
    const chaveAlvo = novaEntrada ? novoId.trim() : selecionada.chave_recurso;
    if (!tipoAlvo || !/^[a-zA-Z0-9_-]+$/.test(chaveAlvo)) {
      setErro('Informe um ID estável usando apenas letras, números, hífen ou sublinhado.');
      return null;
    }
    setSaving(true);
    setErro(null);
    try {
      const resposta = await conteudoEditorialApi.salvarRascunhoGlobal({
        tipo: tipoAlvo,
        chave_recurso: chaveAlvo,
        chave_origem: novaEntrada ? undefined : selecionada.chave,
        titulo: titulo.trim(),
        conteudo: conteudoValidado,
        revelado,
        versao_esperada: selecionada.editorial?.versao_editorial ?? null,
      });
      if (novaEntrada) {
        setNovaEntrada(false);
        await carregar(undefined, `${tipoAlvo}:${chaveAlvo}`);
      } else {
        setEntradas((atuais) => atuais.map((entry) => (
          entry.chave === selecionada.chave
            ? {
                ...entry,
                tipo: tipoAlvo,
                titulo: titulo.trim(),
                editorial: { ...entry.editorial, ...resposta.editorial } as EditorialState,
              }
            : entry
        )));
      }
      setDirty(false);
      setSucesso('Rascunho salvo. Os jogadores ainda não veem esta alteração.');
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
      await conteudoEditorialApi.publicarGlobal(editorial.id, editorial.versao_editorial);
      await carregar();
      setSucesso('Conteúdo publicado globalmente para todas as campanhas.');
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível publicar o conteúdo.');
    } finally {
      setPublishing(false);
    }
  };

  const abrirHistorico = async () => {
    if (!selecionada?.editorial?.id) return;
    setHistoricoAberto((aberto) => !aberto);
    if (revisoes.length) return;
    try {
      const resposta = await conteudoEditorialApi.listarRevisoesGlobais(selecionada.editorial.id);
      setRevisoes(resposta.revisoes || []);
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível carregar o histórico.');
    }
  };

  const restaurarRevisao = async (revision: EditorialRevision) => {
    if (!selecionada?.editorial?.id || !confirmarDescarte('Existem alterações não salvas. Deseja descartá-las para restaurar uma versão anterior?') || !window.confirm(`Restaurar a versão ${revision.versao} como novo rascunho? A publicação atual não será alterada.`)) return;
    setRestoring(true);
    setErro(null);
    try {
      await conteudoEditorialApi.restaurarRevisaoGlobal(
        selecionada.editorial.id,
        revision.id,
        selecionada.editorial.versao_editorial,
      );
      await carregar(undefined, selecionada.chave);
      setSucesso(`Versão ${revision.versao} restaurada como rascunho.`);
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
      <div className="border-b border-white/10 p-5 md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <BookOpenText className="mt-0.5 shrink-0 text-primary" size={24} />
            <div>
              <h2 className="text-xl font-bold text-white">Conteúdo do Mundo</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">Crie, edite, mova e exclua registros da biblioteca compartilhada por todas as campanhas.</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Registros', totais.todos],
              ['Criados', totais.criados],
              ['Rascunhos', totais.rascunhos],
              ['Publicados', totais.personalizados],
            ].map(([label, value]) => (
              <div key={label} className="min-w-24 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-center">
                <dt className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{label}</dt>
                <dd className="mt-0.5 text-lg font-bold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {avisoLista && <div role="status" className="mx-4 mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 md:mx-8">{avisoLista}</div>}

      <div className="grid min-h-[620px] lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-black/10 p-4 lg:border-b-0 lg:border-r">
          <button type="button" onClick={iniciarNovaEntrada} className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary/20"><Plus size={16} /> Criar conteúdo</button>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por título, tipo ou ID..." className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-primary/50" />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-white/5 bg-black/30 p-1">
            {([
              ['todos', 'Todos', totais.todos],
              ['criados', 'Criados', totais.criados],
              ['rascunhos', 'Rascunhos', totais.rascunhos],
              ['excluidos', 'Excluídos', totais.excluidos],
            ] as Array<[FiltroBiblioteca, string, number]>).map(([id, label, total]) => (
              <button key={id} type="button" onClick={() => setFiltro(id)} className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wide transition ${filtro === id ? 'bg-primary/15 text-primary' : 'text-gray-500 hover:text-gray-300'}`}>
                {label} <span className="block text-[9px] opacity-70">{total}</span>
              </button>
            ))}
          </div>
          <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {grupos.map(({ tipo, items }) => {
              const aberto = busca.trim().length > 0 || tiposAbertos.has(tipo);
              return (
                <div key={tipo} className="overflow-hidden rounded-xl border border-white/5 bg-black/25">
                  <button type="button" onClick={() => alternarTipo(tipo)} aria-expanded={aberto} className="flex w-full items-center gap-2 px-3 py-3 text-left transition hover:bg-white/[0.03]">
                    <FolderOpen size={15} className="shrink-0 text-primary/70" />
                    <span className="min-w-0 flex-1 text-xs font-bold uppercase tracking-widest text-gray-300">{rotuloCampo(tipo)}</span>
                    <span className="text-[10px] text-gray-600">{items.length}</span>
                    <ChevronDown size={15} className={`shrink-0 text-gray-600 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                  </button>
                  {aberto && (
                    <div className="space-y-1 border-t border-white/5 p-1.5">
                      {items.map((entry) => {
                        const displayTitle = documentoEfetivo(entry).titulo || entry.titulo;
                        const selecionadaAgora = !novaEntrada && entry.chave === selecionadaChave;
                        return (
                          <div key={entry.chave} className={`group flex items-stretch rounded-lg border transition ${selecionadaAgora ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'}`}>
                            <button type="button" onClick={() => escolherEntrada(entry.chave)} className="min-w-0 flex-1 px-3 py-2.5 text-left">
                              <span className="flex items-center gap-2">
                                <FileText size={13} className="shrink-0 text-gray-600" />
                                <span className="truncate text-sm font-medium text-gray-200">{displayTitle}</span>
                              </span>
                              <span className="mt-1.5 flex flex-wrap items-center gap-2 pl-5 text-[10px]">
                                <span className="max-w-full truncate font-mono text-gray-600">{entry.chave_recurso}</span>
                                <span className={`inline-flex items-center gap-1 ${entry.excluido ? 'text-red-300' : entry.editorial?.rascunho ? 'text-amber-400' : entry.editorial?.publicado_em ? 'text-emerald-400' : 'text-gray-600'}`}>
                                  {entry.excluido ? <Trash2 size={10} /> : entry.editorial?.rascunho ? <Clock3 size={10} /> : entry.editorial?.publicado_em ? <Check size={10} /> : <Lock size={10} />}
                                  {entry.excluido ? 'Excluído' : entry.editorial?.rascunho ? 'Rascunho' : entry.origem === 'global' ? 'Criado' : entry.editorial?.publicado_em ? 'Personalizado' : 'Oficial'}
                                </span>
                              </span>
                            </button>
                            {!entry.excluido && (
                              <button type="button" onClick={() => void excluirEntrada(entry)} disabled={deletingId === (entry.editorial?.id || entry.chave)} aria-label={`Excluir ${displayTitle}`} title="Excluir de todas as campanhas" className="m-1 flex w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 opacity-70 transition hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100 disabled:opacity-30">
                                {deletingId === (entry.editorial?.id || entry.chave) ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {grupos.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs leading-5 text-gray-500">Nenhum conteúdo corresponde à busca ou ao filtro escolhido.</div>
            )}
          </div>
        </aside>

        <section className="min-w-0 p-5 md:p-8">
          {!selecionada ? <p className="text-sm text-gray-500">Selecione uma entrada para editar.</p> : (
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{novaEntrada ? 'Novo conteúdo' : rotuloCampo(novoTipo)}</span>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="font-mono">{novaEntrada ? 'ID ainda não definido' : selecionada.chave_recurso}</span>
                    {!novaEntrada && (
                      <span className={`rounded-full border px-2 py-0.5 ${selecionada.excluido ? 'border-red-500/20 bg-red-500/10 text-red-300' : selecionada.origem === 'global' ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300' : 'border-white/10 bg-white/[0.03] text-gray-400'}`}>
                        {selecionada.excluido ? 'Excluído globalmente' : selecionada.origem === 'global' ? 'Criado no editor global' : 'Base oficial preservada'}
                      </span>
                    )}
                  </div>
                </div>
                {novaEntrada ? (
                  <button type="button" onClick={cancelarNovaEntrada} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-gray-400 transition hover:text-white"><X size={14} /> Cancelar criação</button>
                ) : selecionada.excluido ? (
                  <button type="button" onClick={() => void restaurarEntradaExcluida(selecionada)} disabled={restoring} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-40">
                    {restoring ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Restaurar conteúdo
                  </button>
                ) : (
                  <button type="button" onClick={() => void excluirEntrada(selecionada)} disabled={deletingId === (selecionada.editorial?.id || selecionada.chave)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40">
                    {deletingId === (selecionada.editorial?.id || selecionada.chave) ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir globalmente
                  </button>
                )}
              </div>
              {selecionada.excluido && (
                <div role="status" className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm leading-6 text-red-200">Este conteúdo não aparece em nenhuma campanha. Os dados abaixo foram preservados e podem ser restaurados.</div>
              )}
              {novaEntrada && (
                <div className="grid gap-4 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:grid-cols-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Tipo
                    <select value={novoTipo} onChange={(event) => { setNovoTipo(event.target.value); marcarAlteracao(); }} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-primary/50">
                      {TIPOS_LORE.map((tipo) => <option key={tipo} value={tipo}>{rotuloCampo(tipo)}</option>)}
                    </select>
                  </label>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">ID permanente
                    <input value={novoId} onChange={(event) => { setNovoId(event.target.value.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9_-]/g, '-')); marcarAlteracao(); }} placeholder="ex.: queda-de-astraluna" className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-primary/50" />
                  </label>
                  <p className="sm:col-span-2 text-xs leading-5 text-gray-400">O ID não poderá ser trocado depois do primeiro salvamento. Use um nome curto, estável e sem espaços.</p>
                </div>
              )}
              {!novaEntrada && (
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-gray-400">Categoria (pasta)</label>
                  <select value={novoTipo} onChange={(event) => { setNovoTipo(event.target.value); marcarAlteracao(); }} className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-primary/50">
                    {TIPOS_LORE.map((tipo) => <option key={tipo} value={tipo}>{rotuloCampo(tipo)}</option>)}
                  </select>
                  <p className="mt-2 text-xs leading-5 text-gray-500">Trocar a categoria move o registro sem mudar seu ID nem criar uma cópia.</p>
                </div>
              )}
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-gray-400">Título</label>
                <input value={titulo} onChange={(event) => { setTitulo(event.target.value); marcarAlteracao(); }} maxLength={160} className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-primary/50" />
              </div>

              <label className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 ${revelado ? 'border-emerald-500/20 bg-emerald-500/[0.06]' : 'border-amber-500/20 bg-amber-500/[0.06]'}`}>
                <span><strong className="block text-sm text-white">{revelado ? 'Visível inicialmente' : 'Oculto inicialmente'}</strong><span className="mt-1 block text-xs leading-5 text-gray-400">A configuração de revelações da campanha ainda pode liberar ou ocultar esta entrada para jogadores.</span></span>
                <input type="checkbox" checked={revelado} onChange={(event) => { setRevelado(event.target.checked); marcarAlteracao(); }} className="h-5 w-5 shrink-0 accent-emerald-500" />
              </label>

              <div className="space-y-5">
                {Object.entries(conteudo).map(([key, value]) => {
                  const label = rotuloCampo(key);
                  if (typeof value === 'boolean') {
                    return <label key={key} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300"><input type="checkbox" checked={value} onChange={(event) => atualizarCampo(key, event.target.checked)} /> {label}</label>;
                  }
                  if (typeof value === 'number') {
                    return <div key={key}><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</label><input type="number" value={value} onChange={(event) => atualizarCampo(key, Number(event.target.value))} className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-primary/50" /></div>;
                  }
                  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
                    return <div key={key}><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">{label} <span className="normal-case tracking-normal text-gray-700">(um por linha)</span></label><textarea rows={Math.min(8, Math.max(3, value.length + 1))} value={value.join('\n')} onChange={(event) => atualizarCampo(key, event.target.value.split('\n').filter(Boolean))} className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-gray-200 outline-none focus:border-primary/50" /></div>;
                  }
                  if (typeof value === 'string') {
                    return <div key={key}><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</label><textarea rows={key === 'descricao' || value.length > 140 ? 6 : 2} value={value} onChange={(event) => atualizarCampo(key, event.target.value)} className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-gray-200 outline-none focus:border-primary/50" /></div>;
                  }
                  return <div key={key}><label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-gray-400">{label} <span className="normal-case tracking-normal text-gray-500">(estrutura avançada; edite no modo completo abaixo)</span></label><pre className="max-h-52 overflow-auto rounded-xl border border-white/5 bg-black/20 px-4 py-3 font-mono text-xs text-gray-400">{JSON.stringify(value, null, 2)}</pre></div>;
                })}
              </div>

              <div className="rounded-2xl border border-white/10">
                <button type="button" onClick={() => setJsonAberto((aberto) => !aberto)} className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-bold text-gray-200"><span className="inline-flex items-center gap-2"><Code2 size={16} className="text-primary" /> Editor completo da estrutura</span><span className="text-xs text-gray-500">{jsonAberto ? 'Fechar' : 'Abrir'}</span></button>
                {jsonAberto && <div className="border-t border-white/10 p-4"><p className="mb-3 text-xs leading-5 text-gray-400">Use este modo para listas, vínculos e objetos que não aparecem nos campos simples. Alterações válidas são refletidas imediatamente; conteúdo inválido nunca pode ser salvo.</p><textarea value={jsonText} onChange={(event) => atualizarJsonCompleto(event.target.value)} rows={20} spellCheck={false} className="w-full resize-y rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs leading-5 text-gray-200 outline-none focus:border-primary/50" />{jsonErro && <p role="alert" className="mt-2 text-xs text-red-300">JSON inválido: {jsonErro}</p>}<button type="button" onClick={aplicarJson} className="mt-3 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-gray-200 hover:border-primary/30 hover:text-primary">Validar e formatar JSON</button></div>}
              </div>

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

              {historicoAberto && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <h3 className="mb-3 text-sm font-bold text-white">Versões publicadas</h3>
                  {revisoes.length === 0 ? <p className="text-xs text-gray-500">Nenhuma versão anterior registrada.</p> : revisoes.map((revision) => <details key={revision.id} className="border-b border-white/5 py-3 text-xs last:border-0"><summary className="flex cursor-pointer flex-wrap justify-between gap-3 text-gray-300"><span>Versão {revision.versao} · {revision.autor_nome || 'Mestre'}</span><span className="text-gray-500">{new Date(revision.criado_em).toLocaleString('pt-BR')}</span></summary><pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-white/5 bg-black/40 p-3 text-[11px] text-gray-400">{JSON.stringify(revision.dados, null, 2)}</pre><button type="button" onClick={() => void restaurarRevisao(revision)} disabled={restoring} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-400/20 px-3 py-2 font-bold text-amber-300 disabled:opacity-50">{restoring ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Restaurar como rascunho</button></details>)}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
