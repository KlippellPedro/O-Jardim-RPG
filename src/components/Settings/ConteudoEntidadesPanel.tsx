import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Feather, Loader2, Plus, RotateCcw, Save, Send, Trash2 } from 'lucide-react';
import { CLASSIFICACOES_ENTIDADE, RANKS_PERIGO, type EntidadeCatalogo } from '../../../data/mundo/entidades';
import {
  conteudoEditorialApi,
  type EditorialLibraryEntry,
  type EditorialState,
  type LoreDocument,
} from '../../services/conteudoEditorialApi';
import {
  FORMULARIO_VAZIO,
  formularioDaEntidade,
  idDaEntidade,
  montarEntidade,
  problemasDoFormulario,
  type FormularioEntidade,
} from '../../services/entidadesEditorService';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { confirmar } from '../avisos/confirmacao';

interface ConteudoEntidadesPanelProps {
  onDirtyChange?: (dirty: boolean) => void;
}

const NOVA = '__nova__';

function documentoEfetivo(entry: EditorialLibraryEntry): LoreDocument {
  if (entry.editorial?.rascunho) return entry.editorial.rascunho;
  if (entry.editorial?.publicado_em && entry.editorial.dados_completos?.titulo) {
    return entry.editorial.dados_completos as LoreDocument;
  }
  return entry.dados_base;
}

function situacao(entry: EditorialLibraryEntry): { rotulo: string; classe: string } {
  if (entry.excluido) return { rotulo: 'Excluída', classe: 'text-red-300' };
  if (!entry.editorial?.publicado_em) return { rotulo: 'Rascunho, ainda não publicada', classe: 'text-amber-300' };
  if (entry.editorial.rascunho) return { rotulo: 'Publicada, com rascunho novo', classe: 'text-amber-200' };
  return { rotulo: 'Publicada', classe: 'text-emerald-300' };
}

const campo = 'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-primary/50 focus:outline-none';
const rotulo = 'mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500';

/**
 * Entidades novas do Livro das Entidades, criadas no Painel do Criador. As
 * oficiais continuam nos arquivos do jogo; aqui só aparecem as que nasceram no
 * painel, com o mesmo fluxo da Lore: rascunho, publicar, excluir e restaurar.
 */
export function ConteudoEntidadesPanel({ onDirtyChange }: ConteudoEntidadesPanelProps) {
  const [entradas, setEntradas] = useState<EditorialLibraryEntry[]>([]);
  const [selecionada, setSelecionada] = useState<string>(NOVA);
  const [formulario, setFormulario] = useState<FormularioEntidade>(FORMULARIO_VAZIO);
  const [idEditado, setIdEditado] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState<'salvar' | 'publicar' | 'excluir' | 'restaurar' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const confirmarDescarte = useUnsavedChanges(dirty, onDirtyChange);

  const entradaAtual = selecionada === NOVA ? null : entradas.find((entry) => entry.chave === selecionada) || null;

  const carregar = async (signal?: AbortSignal, preferida?: string) => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await conteudoEditorialApi.listarMundoGlobal(signal);
      const lista = (resposta.entradas || []).filter((entry) => entry.tipo === 'entidade');
      setEntradas(lista);
      if (preferida && lista.some((entry) => entry.chave === preferida)) setSelecionada(preferida);
      else if (!lista.some((entry) => entry.chave === selecionada)) setSelecionada(lista.find((entry) => !entry.excluido)?.chave || NOVA);
    } catch (error: any) {
      if (error?.name !== 'AbortError') setErro(error?.message || 'Não foi possível carregar as Entidades.');
    } finally {
      if (!signal?.aborted) setCarregando(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void carregar(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trocar de Entidade (ou recarregar depois de salvar) refaz o formulário.
  useEffect(() => {
    if (!entradaAtual) {
      setFormulario(FORMULARIO_VAZIO);
      setIdEditado(false);
    } else {
      const documento = documentoEfetivo(entradaAtual);
      setFormulario(formularioDaEntidade(documento.conteudo as Partial<EntidadeCatalogo>, documento.revelado !== false));
      setIdEditado(true);
    }
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionada, entradaAtual?.editorial?.versao_editorial]);

  const ativas = useMemo(() => entradas.filter((entry) => !entry.excluido), [entradas]);
  const excluidas = useMemo(() => entradas.filter((entry) => entry.excluido), [entradas]);
  const problemas = problemasDoFormulario(formulario);
  const ehNova = !entradaAtual;
  const publicada = Boolean(entradaAtual?.editorial?.publicado_em) && !entradaAtual?.excluido;

  const alterar = <K extends keyof FormularioEntidade>(chave: K, valor: FormularioEntidade[K]) => {
    setFormulario((atual) => {
      const proximo = { ...atual, [chave]: valor };
      if (chave === 'nome' && ehNova && !idEditado) proximo.id = idDaEntidade(String(valor));
      return proximo;
    });
    setDirty(true);
    setAviso(null);
  };

  const alternarClassificacao = (id: FormularioEntidade['classificacao'][number]) => {
    alterar('classificacao', formulario.classificacao.includes(id)
      ? formulario.classificacao.filter((item) => item !== id)
      : [...formulario.classificacao, id]);
  };

  const escolher = async (chave: string) => {
    if (chave === selecionada || !(await confirmarDescarte())) return;
    setSelecionada(chave);
    setErro(null);
    setAviso(null);
  };

  const salvar = async (): Promise<EditorialState | null> => {
    if (problemas.length > 0) {
      setErro(problemas[0]);
      return null;
    }
    setOcupado('salvar');
    setErro(null);
    try {
      const entidade = montarEntidade(formulario);
      const resposta = await conteudoEditorialApi.salvarRascunhoGlobal({
        tipo: 'entidade',
        chave_recurso: entidade.id,
        titulo: entidade.nome,
        conteudo: entidade as unknown as Record<string, unknown>,
        revelado: formulario.revelado,
        versao_esperada: entradaAtual?.editorial?.versao_editorial ?? null,
      });
      setDirty(false);
      await carregar(undefined, `entidade:${entidade.id}`);
      setAviso('Rascunho salvo. Os jogadores ainda não veem este conto.');
      return resposta.editorial;
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível salvar o rascunho.');
      return null;
    } finally {
      setOcupado(null);
    }
  };

  const publicar = async () => {
    let editorial = entradaAtual?.editorial ?? null;
    if (dirty || !editorial?.rascunho) editorial = await salvar();
    if (!editorial) return;
    setOcupado('publicar');
    setErro(null);
    try {
      await conteudoEditorialApi.publicarGlobal(editorial.id, editorial.versao_editorial);
      await carregar(undefined, `entidade:${formulario.id}`);
      setAviso(formulario.revelado
        ? 'Publicado. O conto já está no Livro das Entidades de todas as campanhas.'
        : 'Publicado e trancado. Cada Mestre revela o conto em Visibilidade quando quiser.');
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível publicar o conto.');
    } finally {
      setOcupado(null);
    }
  };

  const excluir = async () => {
    const editorial = entradaAtual?.editorial;
    if (!entradaAtual || !editorial?.id) return;
    const mensagem = publicada
      ? `Excluir “${formulario.nome}” do Livro das Entidades? Ele some de todas as campanhas, mas o histórico fica guardado e dá para restaurar.`
      : `Apagar o rascunho de “${formulario.nome}”? Ele nunca foi publicado e não dá para recuperar.`;
    if (!(await confirmar({ titulo: publicada ? 'Excluir a Entidade' : 'Apagar o rascunho', mensagem, rotuloConfirmar: publicada ? 'Excluir' : 'Apagar', tom: 'perigo' }))) return;
    setOcupado('excluir');
    setErro(null);
    try {
      await conteudoEditorialApi.excluirConteudoGlobal(editorial.id, editorial.versao_editorial);
      setDirty(false);
      setSelecionada(NOVA);
      await carregar();
      setAviso(publicada ? `“${formulario.nome}” saiu do Livro. Ela aparece em Excluídas para restaurar.` : 'Rascunho apagado.');
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível excluir.');
    } finally {
      setOcupado(null);
    }
  };

  const restaurar = async (entry: EditorialLibraryEntry) => {
    const editorial = entry.editorial;
    if (!editorial?.id) return;
    const documento = documentoEfetivo(entry);
    if (!(await confirmar({ titulo: 'Restaurar a Entidade', mensagem: `Devolver “${documento.titulo}” ao Livro das Entidades em todas as campanhas?`, rotuloConfirmar: 'Devolver' }))) return;
    setOcupado('restaurar');
    setErro(null);
    try {
      const rascunho = await conteudoEditorialApi.salvarRascunhoGlobal({
        tipo: 'entidade',
        chave_recurso: documento.id,
        chave_origem: entry.chave,
        titulo: documento.titulo,
        conteudo: documento.conteudo,
        revelado: documento.revelado,
        versao_esperada: editorial.versao_editorial,
      });
      await conteudoEditorialApi.publicarGlobal(rascunho.editorial.id, rascunho.editorial.versao_editorial);
      await carregar(undefined, entry.chave);
      setAviso(`“${documento.titulo}” voltou ao Livro.`);
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível restaurar.');
    } finally {
      setOcupado(null);
    }
  };

  if (carregando && entradas.length === 0) {
    return <div className="flex items-center gap-2 py-10 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> Carregando Entidades...</div>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-3">
        <button type="button" onClick={() => escolher(NOVA)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${ehNova ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 text-gray-300 hover:border-primary/30'}`}>
          <Plus size={14} /> Nova Entidade
        </button>
        <p className="text-[11px] leading-5 text-gray-500">As Entidades oficiais continuam nos arquivos do jogo. Aqui ficam as que nasceram no painel, como o conto do Escritor de Contos.</p>
        <ul className="flex flex-col gap-1.5">
          {ativas.map((entry) => {
            const estado = situacao(entry);
            return (
              <li key={entry.chave}>
                <button type="button" onClick={() => escolher(entry.chave)} className={`w-full rounded-lg border px-3 py-2 text-left ${entry.chave === selecionada ? 'border-primary/50 bg-primary/10' : 'border-white/10 bg-black/20 hover:border-white/20'}`}>
                  <strong className="block text-sm text-white">{documentoEfetivo(entry).titulo}</strong>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${estado.classe}`}>{estado.rotulo}</span>
                </button>
              </li>
            );
          })}
          {ativas.length === 0 && <li className="text-xs italic text-gray-600">Nenhuma Entidade criada no painel ainda.</li>}
        </ul>
        {excluidas.length > 0 && (
          <div className="border-t border-white/10 pt-3">
            <span className={rotulo}>Excluídas</span>
            <ul className="flex flex-col gap-1.5">
              {excluidas.map((entry) => (
                <li key={entry.chave} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <span className="truncate text-xs text-gray-400">{documentoEfetivo(entry).titulo}</span>
                  <button type="button" disabled={ocupado !== null} onClick={() => void restaurar(entry)} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-primary disabled:opacity-50"><RotateCcw size={12} /> Restaurar</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-white/10 bg-[#0f0e15] p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white"><Feather size={18} className="text-primary" /> {ehNova ? 'Nova Entidade' : formulario.nome || 'Entidade'}</h3>
          {publicada && (
            <Link to={`/entidades/${formulario.id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-white"><BookOpen size={13} /> Abrir no Livro</Link>
          )}
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={rotulo}>Nome</span>
            <input id="entidade-nome" className={campo} value={formulario.nome} onChange={(event) => alterar('nome', event.target.value)} placeholder="Ex.: Colecionador de Sombras" />
          </label>
          <label>
            <span className={rotulo}>Identificador (aparece no endereço)</span>
            <input
              id="entidade-id"
              className={`${campo} font-mono`}
              value={formulario.id}
              disabled={!ehNova}
              onChange={(event) => { setIdEditado(true); alterar('id', event.target.value.toLocaleLowerCase('pt-BR')); }}
            />
          </label>
          <label>
            <span className={rotulo}>Epíteto (opcional)</span>
            <input id="entidade-epiteto" className={campo} value={formulario.epiteto} onChange={(event) => alterar('epiteto', event.target.value)} placeholder="Ex.: O que compra o que ninguém vende" />
          </label>
          <label>
            <span className={rotulo}>Cor do conto</span>
            <span className="flex items-center gap-3">
              <input id="entidade-cor" type="color" className="h-10 w-14 cursor-pointer rounded border border-white/10 bg-transparent" value={formulario.cor} onChange={(event) => alterar('cor', event.target.value)} />
              <span className="text-xs text-gray-500">Pinta o título, a epígrafe e os detalhes da página.</span>
            </span>
          </label>
        </div>

        <label>
          <span className={rotulo}>Epígrafe (frase de abertura)</span>
          <input id="entidade-epigrafe" className={campo} value={formulario.epigrafe} onChange={(event) => alterar('epigrafe', event.target.value)} placeholder="Ex.: Toda sombra tem dono, até o dia em que não tem." />
        </label>
        <label>
          <span className={rotulo}>Resumo para o índice do Livro</span>
          <textarea id="entidade-resumo" className={`${campo} min-h-[64px]`} value={formulario.resumo} onChange={(event) => alterar('resumo', event.target.value)} placeholder="Uma ou duas frases: o que ela faz e o que custa." />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={rotulo}>Rank de perigo</span>
            <select id="entidade-rank" className={campo} value={formulario.rankPerigo} onChange={(event) => alterar('rankPerigo', event.target.value as FormularioEntidade['rankPerigo'])}>
              {RANKS_PERIGO.map((rank) => <option key={rank.id} value={rank.id}>{rank.titulo}</option>)}
            </select>
            <span className="mt-1 block text-[11px] leading-5 text-gray-500">{RANKS_PERIGO.find((rank) => rank.id === formulario.rankPerigo)?.descricao}</span>
          </label>
          <fieldset>
            <legend className={rotulo}>Classificação</legend>
            <div className="flex flex-wrap gap-2">
              {CLASSIFICACOES_ENTIDADE.map((item) => {
                const marcada = formulario.classificacao.includes(item.id);
                return (
                  <button key={item.id} type="button" aria-pressed={marcada} title={item.descricao} onClick={() => alternarClassificacao(item.id)} className={`rounded-full border px-3 py-1 text-xs font-bold ${marcada ? 'border-primary/50 bg-primary/15 text-primary' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                    {item.titulo}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <label>
          <span className={rotulo}>Conto</span>
          <textarea
            id="entidade-conto"
            className={`${campo} min-h-[320px] font-serif leading-7`}
            value={formulario.texto}
            onChange={(event) => alterar('texto', event.target.value)}
            placeholder={'Escreva o conto aqui.\n\nDeixe uma linha em branco entre um parágrafo e outro.\n\n# Uma linha que começa com # vira o título de uma parte nova'}
          />
          <span className="mt-1 block text-[11px] leading-5 text-gray-500">Linha em branco separa parágrafos. Uma linha começando com <code>#</code> abre uma parte nova com aquele título.</span>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <input id="entidade-revelado" type="checkbox" className="mt-1" checked={formulario.revelado} onChange={(event) => alterar('revelado', event.target.checked)} />
          <span className="text-xs leading-5 text-gray-300">
            <strong className="block text-white">Visível para os jogadores assim que publicar</strong>
            Desmarcado, o conto entra trancado e cada Mestre revela na tela de Visibilidade da campanha. Marcado, o Mestre ainda pode esconder lá.
          </span>
        </label>

        {problemas.length > 0 && dirty && (
          <ul className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-4 py-3 text-xs leading-5 text-amber-200">
            {problemas.map((problema) => <li key={problema}>{problema}</li>)}
          </ul>
        )}
        {erro && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs text-red-200">{erro}</p>}
        {aviso && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-xs text-emerald-200">{aviso}</p>}

        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <button type="button" disabled={ocupado !== null || !dirty} onClick={() => void salvar()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-gray-200 hover:border-primary/30 disabled:opacity-40">
            {ocupado === 'salvar' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar rascunho
          </button>
          <button type="button" disabled={ocupado !== null || problemas.length > 0 || (!dirty && !entradaAtual?.editorial?.rascunho)} onClick={() => void publicar()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-black hover:brightness-110 disabled:opacity-40">
            {ocupado === 'publicar' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publicar no Livro
          </button>
          {!ehNova && entradaAtual?.editorial?.id && (
            <button type="button" disabled={ocupado !== null} onClick={() => void excluir()} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-red-400/20 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-400/10 disabled:opacity-40">
              {ocupado === 'excluir' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {publicada ? 'Excluir do Livro' : 'Apagar rascunho'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
