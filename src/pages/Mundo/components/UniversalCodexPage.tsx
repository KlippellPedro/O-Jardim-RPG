import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  EyeOff,
  Gem,
  Globe2,
  History,
  Landmark,
  MessagesSquare,
  Pencil,
  Plus,
  Search,
  Skull,
  Sparkles,
  UserRound,
  BookText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LoreEntry } from '../../../../data/gerado/mundoCatalog';
import type { FaccaoDocumentada } from '../../../../data/regras/faccoes';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  registrosUniversaisApi,
  type IDadosRegistro,
  type IRegistroDoServidor,
  type RevelacaoRegistro,
  type SecaoUniversal,
} from '../../../services/registrosUniversaisApi';
import { CarimboRetido, RasuraTexto, RasuraTitulo } from '../../../components/ui/Rasura';
import { registrosDeFabrica } from '../universais/dadosPadrao';
import { EditorDeRegistro } from '../universais/EditorDeRegistro';
import {
  ROTULO_REVELACAO,
  SECOES_UNIVERSAIS,
  etiquetasDaLista,
  filtrarRegistros,
  mesclarRegistros,
  type IRegistro,
} from '../universais/registros';

interface IUniversalRecordsPageProps {
  catalog: LoreEntry[];
  factions: FaccaoDocumentada[];
  /** Seções que o criador escondeu dos jogadores. O Mestre continua vendo, com a marca de oculta. */
  secoesOcultas?: string[];
  isMestre: boolean;
  loreRevelado: string[];
  loreOculto: string[];
  podeEditarConteudo?: boolean;
  onBack: () => void;
  onOpenGlobalTimeline?: () => void;
  /** Abre o registro de lore no editor de Conteúdo (seres e locais têm fonte própria). */
  onEditEntry?: (tipo: string, id: string) => void;
}

const ICONE_SECAO: Record<SecaoUniversal, LucideIcon> = {
  bestiario: Skull,
  seres: Sparkles,
  faccoes: Building2,
  locais: Landmark,
  artefatos: Gem,
  personagens: UserRound,
  glossario: BookText,
  rumores: MessagesSquare,
};

const paragrafos = (texto: string): string[] => texto.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);

/** Rasurados vão para o fim da lista; o resto, em ordem alfabética. */
const ordenar = (lista: IRegistro[]): IRegistro[] => [...lista].sort((a, b) => {
  const retidoA = a.revelacao === 'rasurado' ? 1 : 0;
  const retidoB = b.revelacao === 'rasurado' ? 1 : 0;
  return retidoA - retidoB || a.titulo.localeCompare(b.titulo, 'pt-BR');
});

const Detalhe = ({
  registro, retido, gestor, onEditar, onEditarLore,
}: { registro: IRegistro; retido: boolean; gestor: boolean; onEditar: () => void; onEditarLore?: () => void }) => (
  <article className="rounded-3xl border border-cyan-400/20 bg-[#0d1116]/90 shadow-2xl lg:sticky lg:top-5">
    <header className="border-b border-white/10 bg-gradient-to-br from-cyan-400/10 to-transparent p-6 sm:p-9">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300">
          {SECOES_UNIVERSAIS.find((secao) => secao.id === registro.secao)?.rotulo}
          {registro.editado ? <span className="ml-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9px] text-amber-200">ajustado pelo Mestre</span> : null}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {gestor && registro.revelacao !== 'aberto' ? <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-200"><EyeOff size={11} /> {ROTULO_REVELACAO[registro.revelacao]}</span> : null}
          {gestor && registro.editor === 'servidor' ? (
            <button type="button" onClick={onEditar} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-300 transition hover:border-white/40 hover:text-white"><Pencil size={12} /> Editar</button>
          ) : null}
          {gestor && registro.editor === 'lore' && onEditarLore ? (
            <button type="button" onClick={onEditarLore} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-300 transition hover:border-white/40 hover:text-white"><Pencil size={12} /> Editar no conteúdo</button>
          ) : null}
        </div>
      </div>
      {retido ? (
        <div className="mt-4 space-y-4"><RasuraTitulo semente={registro.chave} className="text-4xl" /><CarimboRetido texto="Informação retida" /></div>
      ) : (
        <>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-5xl" style={{ fontFamily: 'Cinzel, serif' }}>{registro.titulo}</h2>
          {registro.subtitulo ? <p className="mt-3 text-sm font-bold uppercase tracking-widest text-gray-500">{registro.subtitulo}</p> : null}
          {registro.etiquetas.length ? <ul className="mt-4 flex flex-wrap gap-2">{registro.etiquetas.map((etiqueta) => <li key={etiqueta} className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-200">{etiqueta}</li>)}</ul> : null}
        </>
      )}
    </header>

    <div className="space-y-6 p-6 text-base leading-8 text-gray-300 sm:p-9 sm:text-lg sm:leading-9">
      {retido ? (
        <div className="space-y-5"><RasuraTexto semente={registro.chave} linhas={5} className="text-lg" /><RasuraTexto semente={`${registro.chave}:b`} linhas={3} className="text-lg" /><p className="text-sm text-gray-500">Este registro existe, mas o Mestre ainda não o liberou.</p></div>
      ) : (
        <>
          {paragrafos(registro.descricao).map((paragrafo, indice) => <p key={indice}>{paragrafo}</p>)}
          {registro.campos.length > 0 ? (
            <dl className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
              {registro.campos.map(([nome, valor]) => (
                <div key={nome} className="bg-[#0b0f14] p-4">
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{nome}</dt>
                  <dd className="mt-1 text-sm leading-6 text-gray-200">{valor}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {registro.blocos.map((bloco) => (
            <section key={bloco.titulo} className="border-l-2 border-cyan-400/30 pl-4">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">{bloco.titulo}</h3>
              <ul className="space-y-1.5 text-sm leading-7 text-gray-300 sm:text-base">{bloco.itens.map((item, indice) => <li key={indice}>{item}</li>)}</ul>
            </section>
          ))}
        </>
      )}
    </div>
  </article>
);

export const UniversalCodexPage: React.FC<IUniversalRecordsPageProps> = ({
  catalog, factions, secoesOcultas = [], isMestre, loreRevelado, loreOculto, onBack, onOpenGlobalTimeline, onEditEntry,
}) => {
  const campanhaId = useAuthStore((estado) => estado.campanhaAtiva?.id);
  const [secaoId, setSecaoId] = useState<SecaoUniversal>('bestiario');
  const [selecionada, setSelecionada] = useState('');
  const [busca, setBusca] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [doServidor, setDoServidor] = useState<IRegistroDoServidor[]>([]);
  const [aviso, setAviso] = useState('');
  const [editor, setEditor] = useState<{ registro: IRegistro | null } | null>(null);

  useEffect(() => {
    if (!campanhaId) return undefined;
    let ativo = true;
    registrosUniversaisApi.obter(campanhaId)
      .then((resposta) => { if (ativo) setDoServidor(resposta.registros); })
      .catch(() => { if (ativo) setAviso('Não foi possível carregar os ajustes do Mestre; mostrando os registros originais.'); });
    return () => { ativo = false; };
  }, [campanhaId]);

  const fabrica = useMemo(() => registrosDeFabrica({ catalog, factions, isMestre, loreRevelado, loreOculto }), [catalog, factions, isMestre, loreOculto, loreRevelado]);
  const todos = useMemo(() => mesclarRegistros(fabrica, doServidor, isMestre), [fabrica, doServidor, isMestre]);
  const porSecao = useMemo(() => {
    const mapa = new Map<SecaoUniversal, IRegistro[]>();
    SECOES_UNIVERSAIS.forEach((secao) => mapa.set(secao.id, []));
    todos.forEach((registro) => mapa.get(registro.secao)?.push(registro));
    return mapa;
  }, [todos]);

  // O jogador só vê as seções que têm alguma coisa; o Mestre vê todas, para poder preencher.
  const secoesVisiveis = SECOES_UNIVERSAIS.filter((secao) => isMestre || (!secoesOcultas.includes(secao.id) && (porSecao.get(secao.id)?.length ?? 0) > 0));
  const secao = SECOES_UNIVERSAIS.find((item) => item.id === secaoId) ?? SECOES_UNIVERSAIS[0];
  const daSecao = porSecao.get(secao.id) ?? [];
  const etiquetas = useMemo(() => etiquetasDaLista(daSecao).slice(0, 14), [daSecao]);
  const lista = useMemo(() => ordenar(filtrarRegistros(daSecao, busca, etiqueta, isMestre)), [daSecao, busca, etiqueta, isMestre]);
  const atual = lista.find((registro) => registro.chave === selecionada) ?? lista[0];
  const ehRetido = (registro: IRegistro) => registro.revelacao === 'rasurado' && !isMestre;

  const trocarSecao = (id: SecaoUniversal) => { setSecaoId(id); setSelecionada(''); setBusca(''); setEtiqueta(''); };

  const salvar = useCallback(async (registro: IRegistro | null, dados: IDadosRegistro, revelacao: RevelacaoRegistro) => {
    if (!campanhaId) throw new Error('Escolha uma campanha primeiro.');
    const resposta = registro?.serverId
      ? await registrosUniversaisApi.editar(campanhaId, registro.serverId, { secao: secao.id, revelacao, dados })
      : await registrosUniversaisApi.salvar(campanhaId, { secao: secao.id, origem_id: registro?.origemId ?? null, revelacao, dados });
    setDoServidor(resposta.registros);
    setEditor(null);
    setAviso('');
    if (resposta.id) setSelecionada(registro?.origemId ? registro.chave : `proprio:${resposta.id}`);
  }, [campanhaId, secao.id]);

  const desfazer = useCallback(async (registro: IRegistro) => {
    if (!campanhaId || !registro.serverId) return;
    const resposta = await registrosUniversaisApi.apagar(campanhaId, registro.serverId);
    setDoServidor(resposta.registros);
    setEditor(null);
    setSelecionada('');
  }, [campanhaId]);

  return (
    <main className="app-detail-page relative z-10 min-h-screen overflow-x-hidden pb-20">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_5%,rgba(103,232,249,0.12),transparent_34%),linear-gradient(180deg,#070a0e_0%,#050508_100%)]" />
      <header className="relative mx-auto max-w-[90rem] px-4 pb-5 pt-4 sm:px-5 sm:pb-8 sm:pt-7 md:px-10 md:pt-10">
        <div className="mb-6 flex items-center justify-between gap-2 sm:mb-10">
          <button type="button" onClick={onBack} className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-gray-300 transition hover:border-white/30 hover:text-white"><ArrowLeft size={16} /> Voltar ao Mundo</button>
          {onOpenGlobalTimeline ? (
            <button type="button" onClick={onOpenGlobalTimeline} className="inline-flex min-w-0 items-center gap-2 rounded-full border border-cyan-400/30 px-3 py-2 text-xs text-cyan-300 transition hover:bg-cyan-400/10"><History size={15} /> Linha do tempo</button>
          ) : null}
        </div>
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300"><Globe2 size={16} /> Fora de todas as Árvores</p>
        <h1 className="mt-3 text-[clamp(2.45rem,12vw,4.5rem)] font-bold leading-[1.02] tracking-wide text-white sm:mt-4" style={{ fontFamily: 'Cinzel, serif' }}>Registros Universais</h1>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-gray-400 sm:mt-5 sm:text-lg sm:leading-8">O arquivo geral do Jardim: criaturas, seres, facções, lugares, artefatos, gente notável, termos e rumores. O Mestre pode ajustar qualquer registro e decidir o que os jogadores já podem ler.</p>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-1 sm:mt-9" aria-label="Seções dos Registros Universais">
          {secoesVisiveis.map((item) => {
            const Icone = ICONE_SECAO[item.id];
            const ativa = item.id === secao.id;
            return (
              <button key={item.id} type="button" onClick={() => trocarSecao(item.id)} aria-pressed={ativa} className={`flex min-h-[3.25rem] shrink-0 items-center gap-2.5 rounded-2xl border px-4 text-left transition ${ativa ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/10 bg-black/25 hover:border-white/25'}`}>
                <Icone size={18} className={ativa ? 'text-cyan-300' : 'text-gray-600'} aria-hidden="true" />
                <span><strong className="block text-sm text-white">{item.rotulo}</strong><small className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">{porSecao.get(item.id)?.length ?? 0} registro(s){isMestre && secoesOcultas.includes(item.id) ? ' · oculta' : ''}</small></span>
              </button>
            );
          })}
        </nav>
      </header>

      <div className="relative mx-auto max-w-[90rem] px-4 sm:px-5 md:px-10">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <p className="mr-auto text-sm text-gray-400">{secao.descricao}</p>
          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Buscar nos registros</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar..." className="min-h-11 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan-300/50" />
          </label>
          {isMestre ? <button type="button" onClick={() => setEditor({ registro: null })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 text-xs font-bold text-cyan-100 hover:bg-cyan-300/20"><Plus size={15} /> {secao.novo}</button> : null}
        </div>
        {etiquetas.length > 1 ? (
          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar por etiqueta">
            <button type="button" aria-pressed={etiqueta === ''} onClick={() => setEtiqueta('')} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${etiqueta === '' ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100' : 'border-white/10 text-gray-400'}`}>Todos</button>
            {etiquetas.map((item) => <button key={item} type="button" aria-pressed={etiqueta === item} onClick={() => setEtiqueta(etiqueta === item ? '' : item)} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${etiqueta === item ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100' : 'border-white/10 text-gray-400'}`}>{item}</button>)}
          </div>
        ) : null}
        {aviso ? <p role="status" className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">{aviso}</p> : null}

        {lista.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-gray-500">
            {daSecao.length === 0
              ? (isMestre ? `Nada registrado ainda. Use “${secao.novo}” para começar.` : 'Nada foi registrado nesta seção ainda.')
              : 'Nenhum registro com esse filtro.'}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <label className="rounded-2xl border border-white/10 bg-[#0b0e13]/90 p-3 lg:hidden">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Escolher registro</span>
              <select value={atual?.chave ?? ''} onChange={(evento) => setSelecionada(evento.target.value)} className="w-full rounded-xl border border-white/10 bg-[#090c10] px-3 py-3 text-sm text-white outline-none">
                {lista.map((registro) => <option key={registro.chave} value={registro.chave}>{ehRetido(registro) ? 'Registro retido' : registro.titulo}</option>)}
              </select>
            </label>
            <aside className="hidden h-fit max-h-[78vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0e13]/90 custom-scrollbar lg:sticky lg:top-5 lg:block">
              <div className="border-b border-white/10 px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-500">{lista.length} de {daSecao.length}</div>
              {lista.map((registro) => {
                const ativo = registro.chave === atual?.chave;
                return (
                  <button key={registro.chave} type="button" onClick={() => setSelecionada(registro.chave)} aria-pressed={ativo} className={`group flex w-full items-center gap-3 border-b border-white/5 px-5 py-3.5 text-left transition hover:bg-white/5 ${ativo ? 'bg-cyan-400/[0.07]' : ''}`}>
                    <span className="min-w-0 flex-1">
                      {ehRetido(registro) ? <RasuraTitulo semente={registro.chave} className="text-sm" /> : <strong className={`block truncate text-sm ${ativo ? 'text-cyan-200' : 'text-gray-200'}`}>{registro.titulo}</strong>}
                      <small className="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-widest text-gray-600">{ehRetido(registro) ? 'Retido' : registro.subtitulo || registro.etiquetas[0] || ' '}{gestorMarca(registro, isMestre)}</small>
                    </span>
                    <ChevronRight size={14} className="text-gray-700 group-hover:text-cyan-300" />
                  </button>
                );
              })}
            </aside>
            <div className="min-w-0 scroll-mt-4">
              {atual ? (
                <Detalhe
                  registro={atual}
                  retido={ehRetido(atual)}
                  gestor={isMestre}
                  onEditar={() => setEditor({ registro: atual })}
                  onEditarLore={atual.loreRef && onEditEntry ? () => onEditEntry(atual.loreRef!.tipo, atual.loreRef!.id) : undefined}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>

      {editor ? (
        <EditorDeRegistro
          secao={secao}
          registro={editor.registro}
          onSalvar={(dados, revelacao) => salvar(editor.registro, dados, revelacao)}
          onDesfazer={editor.registro?.serverId ? () => desfazer(editor.registro as IRegistro) : undefined}
          onFechar={() => setEditor(null)}
        />
      ) : null}
    </main>
  );
};

/** Pequena marca para o Mestre ver de relance o que foi mexido ou está fechado. */
function gestorMarca(registro: IRegistro, gestor: boolean): string {
  if (!gestor) return '';
  const marcas = [registro.proprio ? 'do Mestre' : registro.editado ? 'ajustado' : '', registro.revelacao !== 'aberto' ? registro.revelacao : ''].filter(Boolean);
  return marcas.length ? ` · ${marcas.join(' · ')}` : '';
}
