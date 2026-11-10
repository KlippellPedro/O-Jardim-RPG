import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Copy, CopyPlus, Download, Loader2, PencilLine, Printer, RotateCcw, Save, X } from 'lucide-react';
import { avisar, avisarErro } from '../../../components/avisos/avisos';
import { confirmar } from '../../../components/avisos/confirmacao';
import {
  documentosApi, type IDocumentoUniversal, type IMissaoUniversal,
} from '../../../services/documentosApi';
import { camposParaSalvar, valoresComPadrao, type IModeloDeDocumento, type ValoresDoDocumento } from './modelo';
import { modeloPorId } from './modelos';
import { BOTAO, CampoDoDocumento, ENTRADA, ICONES, Miniatura, Previa, exportarDocumento, type Exportacao } from './telasDoDocumento';
import { agruparPorTema } from './universais';

interface IPronto {
  doc: IDocumentoUniversal;
  modelo: IModeloDeDocumento;
  valores: ValoresDoDocumento;
}

/** O que está sendo editado: notas e campos, sempre a partir do documento aberto. */
interface IEdicao {
  titulo: string;
  ensina: string;
  entregar: string;
  valores: ValoresDoDocumento;
}

const ROTULO = 'text-xs font-bold uppercase tracking-widest text-gray-400';
const TEMA_DAS_MISSOES = 'Missões';

const retrato = (edicao: IEdicao, modelo: IModeloDeDocumento) =>
  JSON.stringify({ ...edicao, valores: camposParaSalvar(modelo, edicao.valores) });

function Nota({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className={ROTULO}>{titulo}</h4>
      <div className="text-sm leading-6 text-gray-300">{children}</div>
    </div>
  );
}

function Lista({ itens }: { itens: string[] }) {
  return <ul className="list-disc space-y-1 pl-5">{itens.map((item) => <li key={item}>{item}</li>)}</ul>;
}

/** O resumo da missão, só do Mestre: o que acontece, as perguntas, o relógio e onde estão as pistas. */
function ResumoDaMissao({ missao }: { missao: IMissaoUniversal }) {
  return (
    <div className="space-y-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4 text-sm leading-6 text-gray-300">
      <Nota titulo="O que está acontecendo">{missao.resumo}</Nota>
      <Nota titulo="As perguntas que fecham o caso"><Lista itens={missao.perguntas} /></Nota>
      <Nota titulo="O relógio">{missao.relogio}</Nota>
      <Nota titulo="Onde estão as pistas"><Lista itens={missao.pistas} /></Nota>
      <Nota titulo="Desfecho">{missao.desfecho}</Nota>
      <Nota titulo="Tom">{missao.tom}</Nota>
      {missao.texto_da_carta_em_universal.length ? (
        <Nota titulo="A carta, lida">
          <blockquote className="border-l-2 border-primary/50 pl-3 italic">
            {missao.texto_da_carta_em_universal.map((paragrafo) => <p key={paragrafo} className="mb-2">{paragrafo}</p>)}
          </blockquote>
        </Nota>
      ) : null}
    </div>
  );
}

function Cartao({ item, aoAbrir, rotulo }: { item: IPronto; aoAbrir: () => void; rotulo?: string | null }) {
  const { doc, modelo, valores } = item;
  const Icone = ICONES[modelo.icone];
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={aoAbrir}
        className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-left transition hover:-translate-y-0.5 hover:border-primary/40"
      >
        <span className="relative flex h-52 items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#2a2531,#0d0c10_75%)] p-4">
          <Miniatura modelo={modelo} valores={valores} largura={modelo.largura >= modelo.altura ? 210 : 120} />
          {doc.editado ? (
            <span className="absolute right-3 top-3 rounded-full border border-sky-300/40 bg-[#07101f]/90 px-2.5 py-1 text-[11px] font-bold text-sky-200">Editado</span>
          ) : null}
        </span>
        <span className="flex flex-1 flex-col gap-1 p-4">
          {rotulo ? <span className="text-[11px] font-bold uppercase tracking-widest text-primary">{rotulo}</span> : null}
          <span className="flex items-start gap-2 font-bold text-white">
            <Icone size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /> {doc.titulo}
          </span>
          <span className="line-clamp-3 text-xs leading-5 text-gray-400">{doc.ensina}</span>
        </span>
      </button>
    </li>
  );
}

const GRADE = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4';

/**
 * A aba dos documentos prontos da lore e das missões. Quem comanda a mesa lê, baixa e leva uma
 * cópia para a Oficina. O Criador também edita: a versão dele vale para todas as campanhas, e
 * "Voltar ao original" devolve o texto do arquivo.
 */
export function DocumentosUniversais({
  campanhaId, copiando, aoLevarParaOficina,
}: { campanhaId: string; copiando: boolean; aoLevarParaOficina: (doc: IDocumentoUniversal) => void }) {
  const [documentos, setDocumentos] = useState<IDocumentoUniversal[]>([]);
  const [missoes, setMissoes] = useState<IMissaoUniversal[]>([]);
  const [podeEditar, setPodeEditar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tema, setTema] = useState<string | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [exportando, setExportando] = useState<Exportacao | null>(null);
  const [edicao, setEdicao] = useState<IEdicao | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let valido = true;
    setCarregando(true);
    setErro('');
    setAbertoId(null);
    setEdicao(null);
    documentosApi.universais(campanhaId)
      .then((resposta) => {
        if (!valido) return;
        setDocumentos(resposta.documentos);
        setMissoes(resposta.missoes ?? []);
        setPodeEditar(Boolean(resposta.pode_editar));
      })
      .catch((falha) => { if (valido) setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar os documentos universais.'); })
      .finally(() => { if (valido) setCarregando(false); });
    return () => { valido = false; };
  }, [campanhaId]);

  // Documento de um modelo que o site não conhece fica de fora (o teste do repositório acusa antes).
  const prontos = useMemo<IPronto[]>(() => documentos.flatMap((doc) => {
    const modelo = modeloPorId(doc.modelo);
    return modelo ? [{ doc, modelo, valores: valoresComPadrao(modelo, doc.campos) }] : [];
  }), [documentos]);
  const missaoPorId = useMemo(() => new Map(missoes.map((missao) => [missao.id, missao])), [missoes]);
  const grupos = useMemo(() => agruparPorTema(prontos, (item) => (item.doc.missao && missaoPorId.has(item.doc.missao) ? TEMA_DAS_MISSOES : item.doc.tema)), [prontos, missaoPorId]);
  const visiveis = tema ? grupos.filter((grupo) => grupo.tema === tema) : grupos;
  const aberto = prontos.find((item) => item.doc.id === abertoId) ?? null;
  const alterado = Boolean(aberto && edicao && retrato(edicao, aberto.modelo) !== retrato(edicaoDe(aberto), aberto.modelo));

  // Fechar a aba do navegador com mudança sem salvar pede confirmação.
  useEffect(() => {
    if (!alterado) return undefined;
    const segurar = (evento: BeforeUnloadEvent) => { evento.preventDefault(); evento.returnValue = ''; };
    window.addEventListener('beforeunload', segurar);
    return () => window.removeEventListener('beforeunload', segurar);
  }, [alterado]);

  function edicaoDe(item: IPronto): IEdicao {
    return { titulo: item.doc.titulo, ensina: item.doc.ensina, entregar: item.doc.entregar, valores: item.valores };
  }

  const podeSair = async () => !alterado || confirmar({
    titulo: 'Sair sem salvar?',
    mensagem: 'As mudanças deste documento ainda não foram salvas.',
    rotuloConfirmar: 'Sair sem salvar',
    rotuloCancelar: 'Continuar editando',
    tom: 'perigo',
  });

  const abrir = async (id: string | null) => {
    if (!(await podeSair())) return;
    setEdicao(null);
    setAbertoId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const trocar = (atualizado: IDocumentoUniversal) => {
    setDocumentos((lista) => lista.map((doc) => (doc.id === atualizado.id ? atualizado : doc)));
  };

  const salvar = async () => {
    if (!aberto || !edicao || salvando) return;
    setSalvando(true);
    try {
      const atualizado = await documentosApi.editarUniversal(aberto.doc.id, {
        titulo: edicao.titulo.trim() || aberto.doc.titulo,
        ensina: edicao.ensina,
        entregar: edicao.entregar,
        campos: camposParaSalvar(aberto.modelo, edicao.valores),
      });
      trocar(atualizado);
      setEdicao(null);
      avisar.sucesso('Documento salvo. A mudança vale para todas as campanhas.');
    } catch (falha) {
      avisarErro(falha, 'Não foi possível salvar o documento.');
    } finally {
      setSalvando(false);
    }
  };

  const restaurar = async () => {
    if (!aberto || salvando) return;
    if (!(await confirmar({
      titulo: 'Voltar ao original?',
      mensagem: 'O texto que você editou sai, e o documento volta a ser o do arquivo, em todas as campanhas.',
      rotuloConfirmar: 'Voltar ao original',
      tom: 'perigo',
    }))) return;
    setSalvando(true);
    try {
      trocar(await documentosApi.restaurarUniversal(aberto.doc.id));
      setEdicao(null);
      avisar.info('O documento voltou ao original.');
    } catch (falha) {
      avisarErro(falha, 'Não foi possível voltar ao original.');
    } finally {
      setSalvando(false);
    }
  };

  // Ctrl+S salva enquanto edita.
  useEffect(() => {
    if (!edicao) return undefined;
    const atalho = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 's') {
        evento.preventDefault();
        void salvar();
      }
    };
    window.addEventListener('keydown', atalho);
    return () => window.removeEventListener('keydown', atalho);
  });

  const exportar = async (tipo: Exportacao) => {
    if (!aberto || exportando) return;
    setExportando(tipo);
    try {
      await exportarDocumento(tipo, aberto.modelo, edicao?.valores ?? aberto.valores, (edicao?.titulo ?? aberto.doc.titulo).trim() || aberto.modelo.nome);
    } finally {
      setExportando(null);
    }
  };

  if (carregando) {
    return <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Carregando...</p>;
  }
  if (erro) {
    return <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{erro}</p>;
  }

  // ---------------------------------------------------------------- um documento aberto

  if (aberto) {
    const Icone = ICONES[aberto.modelo.icone];
    const { doc, modelo } = aberto;
    const missao = doc.missao ? missaoPorId.get(doc.missao) ?? null : null;
    const valores = edicao?.valores ?? aberto.valores;
    const titulo = edicao?.titulo ?? doc.titulo;
    const mudar = (parcial: Partial<IEdicao>) => setEdicao((atual) => (atual ? { ...atual, ...parcial } : atual));
    return (
      <div>
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void abrir(null)} className={BOTAO}>
              <ArrowLeft size={14} /> Documentos universais
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
              <Icone size={13} aria-hidden="true" /> {modelo.nome}
            </span>
            <span className="text-xs text-gray-500">{missao ? `Missão: ${missao.titulo}` : doc.tema}</span>
            {doc.editado ? <span className="text-xs text-sky-300">Editado no site</span> : null}
            {edicao ? <span className={`text-xs ${alterado ? 'text-amber-400' : 'text-gray-500'}`} role="status">{alterado ? 'Mudanças não salvas' : 'Sem mudanças'}</span> : null}
          </div>
          {edicao ? (
            <>
              <label className="sr-only" htmlFor="universal-titulo">Nome do documento</label>
              <input
                id="universal-titulo"
                type="text"
                value={edicao.titulo}
                maxLength={120}
                onChange={(evento) => mudar({ titulo: evento.target.value })}
                className="w-full border-b border-white/10 bg-transparent pb-2 text-2xl font-bold text-white outline-none focus:border-primary/50"
                style={{ fontFamily: 'Cinzel, serif' }}
              />
            </>
          ) : (
            <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{doc.titulo}</h3>
          )}
          <div className="flex flex-wrap gap-2">
            {edicao ? (
              <>
                <button
                  type="button"
                  onClick={() => void salvar()}
                  disabled={salvando || !alterado}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
                </button>
                <button type="button" className={BOTAO} disabled={salvando} onClick={() => setEdicao(null)}>
                  <X size={14} /> Parar de editar
                </button>
              </>
            ) : podeEditar ? (
              <button type="button" className={BOTAO} onClick={() => setEdicao(edicaoDe(aberto))}>
                <PencilLine size={14} /> Editar
              </button>
            ) : null}
            <button type="button" className={BOTAO} disabled={exportando !== null} onClick={() => void exportar('baixar')}>
              {exportando === 'baixar' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Baixar imagem
            </button>
            <button type="button" className={BOTAO} disabled={exportando !== null} onClick={() => void exportar('copiar')}>
              {exportando === 'copiar' ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />} Copiar imagem
            </button>
            <button type="button" className={BOTAO} disabled={exportando !== null} onClick={() => void exportar('imprimir')}>
              {exportando === 'imprimir' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} Imprimir ou PDF
            </button>
            {!edicao ? (
              <button
                type="button"
                className={BOTAO}
                disabled={copiando}
                onClick={() => aoLevarParaOficina(doc)}
                title="Cria uma cópia desta campanha na Oficina"
              >
                {copiando ? <Loader2 size={14} className="animate-spin" /> : <CopyPlus size={14} />} Editar uma cópia na Oficina
              </button>
            ) : null}
            {podeEditar && doc.editado ? (
              <button type="button" className={`${BOTAO} hover:!border-red-500/40 hover:!text-red-400`} disabled={salvando} onClick={() => void restaurar()}>
                <RotateCcw size={14} /> Voltar ao original
              </button>
            ) : null}
          </div>
          {edicao ? (
            <p className="text-xs text-gray-500">A mudança vale para todas as campanhas. O texto original fica guardado, e Voltar ao original o devolve.</p>
          ) : null}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <div className="order-2 space-y-5 lg:order-1">
            {edicao ? (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="universal-ensina" className={ROTULO}>O que ensina (nota do Mestre)</label>
                  <textarea id="universal-ensina" value={edicao.ensina} maxLength={2000} rows={3} onChange={(evento) => mudar({ ensina: evento.target.value })} className={`${ENTRADA} resize-y leading-6`} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="universal-entregar" className={ROTULO}>Quando entregar (nota do Mestre)</label>
                  <textarea id="universal-entregar" value={edicao.entregar} maxLength={2000} rows={3} onChange={(evento) => mudar({ entregar: evento.target.value })} className={`${ENTRADA} resize-y leading-6`} />
                </div>
                <h4 className="border-t border-white/10 pt-5 text-xs font-bold uppercase tracking-widest text-primary">O papel</h4>
                {modelo.campos.filter((campo) => campo.visivel?.(edicao.valores) ?? true).map((campo) => (
                  <CampoDoDocumento
                    key={campo.id}
                    campo={campo}
                    valor={edicao.valores[campo.id] ?? ''}
                    aoMudar={(valor) => setEdicao((atual) => (atual ? { ...atual, valores: { ...atual.valores, [campo.id]: valor } } : atual))}
                  />
                ))}
              </>
            ) : (
              <>
                <p className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-xs leading-5 text-amber-100/80">
                  As notas abaixo são só para você. A imagem é o que o jogador recebe.
                </p>
                {missao ? <Nota titulo="Na missão">{doc.papel_na_missao ?? missao.titulo}</Nota> : null}
                <Nota titulo="O que ensina">{doc.ensina}</Nota>
                <Nota titulo="Quando entregar">{doc.entregar}</Nota>
                {doc.fontes.length ? (
                  <Nota titulo="De onde vem na lore">
                    <ul className="list-disc space-y-1 pl-5 text-xs text-gray-400">{doc.fontes.map((fonte) => <li key={fonte}>{fonte}</li>)}</ul>
                  </Nota>
                ) : null}
                {doc.inventado.length ? <Nota titulo="Criado para este documento"><Lista itens={doc.inventado} /></Nota> : null}
                {missao ? (
                  <details className="rounded-2xl border border-white/10 p-3">
                    <summary className="cursor-pointer text-sm font-bold text-gray-200">Resumo da missão {missao.titulo}</summary>
                    <div className="mt-3"><ResumoDaMissao missao={missao} /></div>
                  </details>
                ) : null}
              </>
            )}
          </div>
          <div className="order-1 lg:order-2">
            <div className="rounded-2xl border border-white/5 bg-[radial-gradient(circle_at_30%_20%,#2a2531,#0d0c10_70%)] p-4 sm:p-6 lg:sticky lg:top-6">
              <Previa modelo={modelo} valores={valores} titulo={titulo} />
              <p className="mt-4 text-center text-xs text-gray-500">
                Impresso, sai com {modelo.impressao.largura} × {modelo.impressao.altura} mm.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- a galeria

  if (!prontos.length) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-gray-500">
        Nenhum documento universal por enquanto.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tema">
        {[null, ...grupos.map((grupo) => grupo.tema)].map((opcao) => {
          const ativo = opcao === tema;
          const total = opcao ? grupos.find((grupo) => grupo.tema === opcao)?.itens.length ?? 0 : prontos.length;
          return (
            <button
              key={opcao ?? 'todos'}
              type="button"
              aria-pressed={ativo}
              onClick={() => setTema(opcao)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${ativo ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 bg-black/30 text-gray-400 hover:text-gray-200'}`}
            >
              {opcao ?? 'Todos'} <span className="text-gray-500">{total}</span>
            </button>
          );
        })}
      </div>

      {visiveis.map((grupo) => (
        <section key={grupo.tema} aria-label={grupo.tema}>
          <h4 className="mb-3 text-sm font-bold text-gray-300" style={{ fontFamily: 'Cinzel, serif' }}>{grupo.tema}</h4>
          {grupo.tema === TEMA_DAS_MISSOES ? (
            <div className="space-y-8">
              {missoes.map((missao) => {
                const papeis = grupo.itens.filter((item) => item.doc.missao === missao.id);
                if (!papeis.length) return null;
                return (
                  <div key={missao.id} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div>
                      <p className="text-lg font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{missao.titulo}</p>
                      <p className="text-xs text-gray-500">{missao.tamanho} · {papeis.length} papéis para entregar</p>
                    </div>
                    <details className="rounded-xl border border-white/10 p-3">
                      <summary className="cursor-pointer text-sm font-bold text-gray-200">Resumo do Mestre</summary>
                      <div className="mt-3"><ResumoDaMissao missao={missao} /></div>
                    </details>
                    <ul className={GRADE}>
                      {papeis.map((item) => <Cartao key={item.doc.id} item={item} rotulo={item.doc.papel_na_missao} aoAbrir={() => void abrir(item.doc.id)} />)}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <ul className={GRADE}>
              {grupo.itens.map((item) => <Cartao key={item.doc.id} item={item} aoAbrir={() => void abrir(item.doc.id)} />)}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export default DocumentosUniversais;
