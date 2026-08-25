import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Check, Clock3, Code2, History, Loader2, Plus, RotateCcw, Save, Search, Send } from 'lucide-react';
import {
  conteudoEditorialApi,
  type EditorialLibraryEntry,
  type EditorialRevision,
  type EditorialState,
  type LoreDocument,
} from '../../services/conteudoEditorialApi';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';

interface ConteudoLorePanelProps {
  campanhaId: string;
  onDirtyChange?: (dirty: boolean) => void;
}

const TIPOS_LORE = [
  'cosmologia', 'conceito', 'deidade', 'fluxo', 'realidade', 'galho',
  'dimensao', 'mundo', 'reino', 'personagem', 'soberano', 'npc', 'evento',
  'idioma', 'cultura',
] as const;

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

export function ConteudoLorePanel({ campanhaId, onDirtyChange }: ConteudoLorePanelProps) {
  const [entradas, setEntradas] = useState<EditorialLibraryEntry[]>([]);
  const [selecionadaChave, setSelecionadaChave] = useState<string>('');
  const [busca, setBusca] = useState('');
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
      const resposta = await conteudoEditorialApi.listarMundo(campanhaId, signal);
      const loreEntries = (resposta.entradas || []).filter((entry) => entry.tipo !== 'cronologia');
      setEntradas(loreEntries);
      setSelecionadaChave((atual) => {
        if (preferredKey && loreEntries.some((entry) => entry.chave === preferredKey)) return preferredKey;
        if (atual && loreEntries.some((entry) => entry.chave === atual)) return atual;
        return loreEntries[0]?.chave || '';
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
  }, [campanhaId]);

  const selecionada = novaEntrada ? {
    chave: '__novo__',
    tipo: novoTipo,
    chave_recurso: novoId,
    titulo: titulo || 'Nova entrada',
    dados_base: { tipo: novoTipo, id: novoId, titulo: titulo || 'Nova entrada', conteudo, revelado },
    editorial: null,
  } satisfies EditorialLibraryEntry : entradas.find((entry) => entry.chave === selecionadaChave) || null;

  useEffect(() => {
    if (!selecionada) return;
    const documento = documentoEfetivo(selecionada);
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
  }, [selecionadaChave, selecionada?.editorial?.versao_editorial]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return entradas;
    return entradas.filter((entry) => {
      const document = documentoEfetivo(entry);
      return `${document.titulo || entry.titulo} ${entry.tipo}`.toLocaleLowerCase('pt-BR').includes(termo);
    });
  }, [busca, entradas]);

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
    const tipoAlvo = novaEntrada ? novoTipo.trim() : selecionada.tipo;
    const chaveAlvo = novaEntrada ? novoId.trim() : selecionada.chave_recurso;
    if (!tipoAlvo || !/^[a-zA-Z0-9_-]+$/.test(chaveAlvo)) {
      setErro('Informe um ID estável usando apenas letras, números, hífen ou sublinhado.');
      return null;
    }
    setSaving(true);
    setErro(null);
    try {
      const resposta = await conteudoEditorialApi.salvarRascunho({
        campanha_id: campanhaId,
        tipo: tipoAlvo,
        chave_recurso: chaveAlvo,
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
            ? { ...entry, editorial: { ...entry.editorial, ...resposta.editorial } as EditorialState }
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
      await conteudoEditorialApi.publicar(editorial.id, campanhaId, editorial.versao_editorial);
      await carregar();
      setSucesso('Conteúdo publicado para esta campanha.');
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
      const resposta = await conteudoEditorialApi.listarRevisoes(selecionada.editorial.id, campanhaId);
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
      await conteudoEditorialApi.restaurarRevisao(
        selecionada.editorial.id,
        revision.id,
        campanhaId,
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
      <div className="border-b border-white/10 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <BookOpenText className="mt-0.5 text-primary" size={24} />
          <div>
            <h2 className="text-xl font-bold text-white">Conteúdo do Mundo</h2>
            <p className="mt-1 text-sm text-gray-400">Edite a versão desta campanha. Salvar cria um rascunho; publicar torna a alteração visível.</p>
          </div>
        </div>
      </div>

      <div className="grid min-h-[620px] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
          <button type="button" onClick={iniciarNovaEntrada} className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/20"><Plus size={15} /> Nova entrada de lore</button>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar lore..." className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-primary/50" />
          </div>
          <div className="max-h-[540px] space-y-1 overflow-y-auto pr-1 custom-scrollbar">
            {filtradas.map((entry) => {
              const displayTitle = documentoEfetivo(entry).titulo || entry.titulo;
              return (
                <button key={entry.chave} type="button" onClick={() => escolherEntrada(entry.chave)} className={`w-full rounded-xl border px-3 py-3 text-left transition ${!novaEntrada && entry.chave === selecionadaChave ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'}`}>
                  <span className="block text-[11px] font-bold uppercase tracking-widest text-gray-500">{entry.tipo}</span>
                  <span className="mt-1 block text-sm font-medium text-gray-200">{displayTitle}</span>
                  <span className={`mt-1.5 inline-flex items-center gap-1 text-[10px] ${entry.editorial?.rascunho ? 'text-amber-400' : entry.editorial?.publicado_em ? 'text-emerald-400' : 'text-gray-600'}`}>
                    {entry.editorial?.rascunho ? <Clock3 size={11} /> : entry.editorial?.publicado_em ? <Check size={11} /> : null}
                    {entry.editorial?.rascunho ? 'Rascunho' : entry.editorial?.publicado_em ? 'Personalizado' : 'Oficial'}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 p-5 md:p-8">
          {!selecionada ? <p className="text-sm text-gray-500">Selecione uma entrada para editar.</p> : (
            <div className="mx-auto max-w-3xl space-y-6">
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
