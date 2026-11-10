import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Copy, CopyPlus, Cpu, Download, Eraser, FileLock2, Loader2, Plus, Printer, Save, Trash2,
} from 'lucide-react';
import { PainelCartao } from '../../../components/painel/PainelShell';
import { avisar, avisarErro } from '../../../components/avisos/avisos';
import { confirmar } from '../../../components/avisos/confirmacao';
import { documentosApi, type IDocumentoUniversal, type IResumoDocumento } from '../../../services/documentosApi';
import {
  camposParaSalvar, limparTextos, tituloSugerido, valoresComPadrao,
  type IModeloDeDocumento, type ValoresDoDocumento,
} from './modelo';
import { MODELOS, ORDEM_DAS_CATEGORIAS, modeloPorId } from './modelos';
import { DocumentosUniversais } from './DocumentosUniversais';
import { BOTAO, CampoDoDocumento, ICONES, Miniatura, Previa, exportarDocumento, type Exportacao } from './telasDoDocumento';

/** A segunda versão de um modelo (tablet, crachá ou cartão da AstraTech), quando ele tem. */
function versaoDeTecnologia(modelo: IModeloDeDocumento): { valor: string; rotulo: string } | null {
  const suporte = modelo.campos.find((campo) => campo.id === 'suporte');
  return suporte?.opcoes?.find((opcao) => opcao.valor !== suporte.padrao) ?? null;
}

interface IDocumentoAberto {
  /** null enquanto o documento ainda não foi salvo. */
  id: string | null;
  modelo: IModeloDeDocumento;
  titulo: string;
  /** O Mestre escreveu o nome: ele deixa de acompanhar o campo principal. */
  tituloManual: boolean;
  valores: ValoresDoDocumento;
}

type Aba = 'oficina' | 'universais';

const retrato = (aberto: IDocumentoAberto) => JSON.stringify({ titulo: aberto.titulo, valores: camposParaSalvar(aberto.modelo, aberto.valores) });

const dataCurta = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');


// ---------------------------------------------------------------- campos

// ---------------------------------------------------------------- painel

export function DocumentosPainel({ campanhaId }: { campanhaId: string }) {
  const [documentos, setDocumentos] = useState<IResumoDocumento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<IDocumentoAberto | null>(null);
  const [salvo, setSalvo] = useState<string | null>(null);
  const [abrindoId, setAbrindoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [exportando, setExportando] = useState<Exportacao | null>(null);
  const [aba, setAba] = useState<Aba>('oficina');

  const alterado = aberto ? retrato(aberto) !== salvo : false;

  useEffect(() => {
    let valido = true;
    setCarregando(true);
    setDocumentos([]);
    setAberto(null);
    documentosApi.listar(campanhaId)
      .then((resposta) => { if (valido) setDocumentos(resposta.documentos); })
      .catch((erro) => { if (valido) avisarErro(erro, 'Não foi possível carregar os documentos.'); })
      .finally(() => { if (valido) setCarregando(false); });
    return () => { valido = false; };
  }, [campanhaId]);

  // Fechar a aba com mudança sem salvar pede confirmação do navegador.
  useEffect(() => {
    if (!alterado) return undefined;
    const segurar = (evento: BeforeUnloadEvent) => { evento.preventDefault(); evento.returnValue = ''; };
    window.addEventListener('beforeunload', segurar);
    return () => window.removeEventListener('beforeunload', segurar);
  }, [alterado]);

  const porCategoria = useMemo(() => ORDEM_DAS_CATEGORIAS
    .map((categoria) => ({ categoria, modelos: MODELOS.filter((modelo) => modelo.categoria === categoria) }))
    .filter((grupo) => grupo.modelos.length), []);

  const abrirNovo = (modelo: IModeloDeDocumento, suporte?: string) => {
    const valores = valoresComPadrao(modelo, suporte ? { suporte } : {});
    setAberto({ id: null, modelo, valores, titulo: tituloSugerido(modelo, valores), tituloManual: false });
    setSalvo(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const abrirSalvo = async (resumo: IResumoDocumento) => {
    const modelo = modeloPorId(resumo.modelo);
    if (!modelo) {
      avisar.aviso('Este documento usa um modelo que saiu do site. Dá para excluí-lo pela lista.');
      return;
    }
    setAbrindoId(resumo.id);
    try {
      const documento = await documentosApi.obter(campanhaId, resumo.id);
      const novo: IDocumentoAberto = {
        id: documento.id,
        modelo,
        valores: valoresComPadrao(modelo, documento.campos),
        titulo: documento.titulo,
        tituloManual: documento.titulo !== tituloSugerido(modelo, valoresComPadrao(modelo, documento.campos)),
      };
      setAberto(novo);
      setSalvo(retrato(novo));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (erro) {
      avisarErro(erro, 'Não foi possível abrir o documento.');
    } finally {
      setAbrindoId(null);
    }
  };

  // Sempre a partir do estado mais recente: a imagem termina de preparar depois de outras edições.
  const mudarValores = (mudar: (valores: ValoresDoDocumento, modelo: IModeloDeDocumento) => ValoresDoDocumento) => {
    setAberto((atual) => {
      if (!atual) return atual;
      const valores = mudar(atual.valores, atual.modelo);
      return { ...atual, valores, titulo: atual.tituloManual ? atual.titulo : tituloSugerido(atual.modelo, valores) };
    });
  };

  const mudarCampo = (campo: string, valor: string) => mudarValores((valores) => ({ ...valores, [campo]: valor }));

  const mudarTitulo = (titulo: string) => {
    setAberto((atual) => (atual ? { ...atual, titulo, tituloManual: true } : atual));
  };

  const guardarNaLista = (resumo: IResumoDocumento) => {
    setDocumentos((lista) => [resumo, ...lista.filter((outro) => outro.id !== resumo.id)]);
  };

  const salvar = useCallback(async () => {
    if (!aberto || salvando) return;
    const titulo = aberto.titulo.trim() || tituloSugerido(aberto.modelo, aberto.valores);
    const corpo = { modelo: aberto.modelo.id, titulo, campos: camposParaSalvar(aberto.modelo, aberto.valores) };
    setSalvando(true);
    try {
      const documento = aberto.id
        ? await documentosApi.editar(campanhaId, aberto.id, corpo)
        : await documentosApi.criar(campanhaId, corpo);
      const atualizado = { ...aberto, id: documento.id, titulo: documento.titulo };
      setAberto((atual) => (atual && (atual.id === aberto.id) ? { ...atual, id: documento.id, titulo: documento.titulo } : atual));
      setSalvo(retrato(atualizado));
      guardarNaLista(documento);
      avisar.sucesso('Documento salvo.');
    } catch (erro) {
      avisarErro(erro, 'Não foi possível salvar o documento.');
    } finally {
      setSalvando(false);
    }
  }, [aberto, campanhaId, salvando]);

  // Ctrl+S salva enquanto o documento está aberto.
  useEffect(() => {
    if (!aberto) return undefined;
    const atalho = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 's') {
        evento.preventDefault();
        void salvar();
      }
    };
    window.addEventListener('keydown', atalho);
    return () => window.removeEventListener('keydown', atalho);
  }, [aberto, salvar]);

  const voltar = async () => {
    if (alterado && !(await confirmar({
      titulo: 'Sair sem salvar?',
      mensagem: 'As mudanças deste documento ainda não foram salvas.',
      rotuloConfirmar: 'Sair sem salvar',
      rotuloCancelar: 'Continuar editando',
      tom: 'perigo',
    }))) return;
    setAberto(null);
    setSalvo(null);
  };

  const duplicar = async () => {
    if (!aberto) return;
    setSalvando(true);
    try {
      const titulo = `${aberto.titulo.trim() || aberto.modelo.nome} (cópia)`.slice(0, 120);
      const documento = await documentosApi.criar(campanhaId, { modelo: aberto.modelo.id, titulo, campos: camposParaSalvar(aberto.modelo, aberto.valores) });
      const copia: IDocumentoAberto = { ...aberto, id: documento.id, titulo: documento.titulo, tituloManual: true };
      guardarNaLista(documento);
      setAberto(copia);
      setSalvo(retrato(copia));
      avisar.sucesso('Cópia criada. Você está editando a cópia.');
    } catch (erro) {
      avisarErro(erro, 'Não foi possível duplicar o documento.');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (alvo: { id: string; titulo: string }) => {
    if (!(await confirmar({
      titulo: 'Excluir documento?',
      mensagem: `"${alvo.titulo}" sai da campanha e não volta.`,
      rotuloConfirmar: 'Excluir',
      tom: 'perigo',
    }))) return;
    try {
      await documentosApi.apagar(campanhaId, alvo.id);
      setDocumentos((lista) => lista.filter((documento) => documento.id !== alvo.id));
      if (aberto?.id === alvo.id) {
        setAberto(null);
        setSalvo(null);
      }
      avisar.info('Documento excluído.');
    } catch (erro) {
      avisarErro(erro, 'Não foi possível excluir o documento.');
    }
  };

  const exportar = async (tipo: Exportacao) => {
    if (!aberto || exportando) return;
    setExportando(tipo);
    try {
      await exportarDocumento(tipo, aberto.modelo, aberto.valores, aberto.titulo.trim() || aberto.modelo.nome);
    } finally {
      setExportando(null);
    }
  };

  /** Um documento universal vira documento da campanha, aberto na Oficina para editar. */
  const levarParaOficina = async (universal: IDocumentoUniversal) => {
    const modelo = modeloPorId(universal.modelo);
    if (!modelo || salvando) return;
    setSalvando(true);
    try {
      const valores = valoresComPadrao(modelo, universal.campos);
      const documento = await documentosApi.criar(campanhaId, {
        modelo: modelo.id, titulo: universal.titulo.slice(0, 120), campos: camposParaSalvar(modelo, valores),
      });
      const novo: IDocumentoAberto = { id: documento.id, modelo, valores, titulo: documento.titulo, tituloManual: true };
      guardarNaLista(documento);
      setAba('oficina');
      setAberto(novo);
      setSalvo(retrato(novo));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      avisar.sucesso('Cópia criada na Oficina. O documento universal continua igual.');
    } catch (erro) {
      avisarErro(erro, 'Não foi possível copiar para a Oficina.');
    } finally {
      setSalvando(false);
    }
  };

  // ---------------------------------------------------------------- editor

  if (aberto) {
    const Icone = ICONES[aberto.modelo.icone];
    return (
      <PainelCartao>
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void voltar()} className={BOTAO}>
              <ArrowLeft size={14} /> Documentos
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
              <Icone size={13} aria-hidden="true" /> {aberto.modelo.nome}
            </span>
            <span className={`text-xs ${alterado ? 'text-amber-400' : 'text-gray-500'}`} role="status">
              {alterado ? (aberto.id ? 'Mudanças não salvas' : 'Ainda não salvo') : 'Salvo'}
            </span>
          </div>
          <label className="sr-only" htmlFor="documento-titulo">Nome do documento</label>
          <input
            id="documento-titulo"
            type="text"
            value={aberto.titulo}
            maxLength={120}
            onChange={(evento) => mudarTitulo(evento.target.value)}
            placeholder="Nome do documento"
            className="w-full border-b border-white/10 bg-transparent pb-2 text-2xl font-bold text-white outline-none focus:border-primary/50"
            style={{ fontFamily: 'Cinzel, serif' }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={salvando || (!alterado && aberto.id !== null)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
            </button>
            <button type="button" className={BOTAO} disabled={exportando !== null} onClick={() => void exportar('baixar')}>
              {exportando === 'baixar' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Baixar imagem
            </button>
            <button type="button" className={BOTAO} disabled={exportando !== null} onClick={() => void exportar('copiar')}>
              {exportando === 'copiar' ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />} Copiar imagem
            </button>
            <button type="button" className={BOTAO} disabled={exportando !== null} onClick={() => void exportar('imprimir')}>
              {exportando === 'imprimir' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} Imprimir ou PDF
            </button>
            <button type="button" className={BOTAO} disabled={salvando || aberto.id === null} onClick={() => void duplicar()} title={aberto.id ? undefined : 'Salve antes de duplicar'}>
              <CopyPlus size={14} /> Duplicar
            </button>
            <button type="button" className={BOTAO} onClick={() => mudarValores((valores, modelo) => limparTextos(modelo, valores))}>
              <Eraser size={14} /> Limpar textos
            </button>
            {aberto.id ? (
              <button type="button" className={`${BOTAO} hover:!border-red-500/40 hover:!text-red-400`} onClick={() => void excluir({ id: aberto.id as string, titulo: aberto.titulo })}>
                <Trash2 size={14} /> Excluir
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <div className="order-2 space-y-5 lg:order-1">
            {aberto.modelo.campos.filter((campo) => campo.visivel?.(aberto.valores) ?? true).map((campo) => (
              <CampoDoDocumento key={campo.id} campo={campo} valor={aberto.valores[campo.id] ?? ''} aoMudar={(valor) => mudarCampo(campo.id, valor)} />
            ))}
          </div>
          <div className="order-1 lg:order-2">
            <div className="rounded-2xl border border-white/5 bg-[radial-gradient(circle_at_30%_20%,#2a2531,#0d0c10_70%)] p-4 sm:p-6 lg:sticky lg:top-6">
              <Previa modelo={aberto.modelo} valores={aberto.valores} titulo={aberto.titulo} />
              <p className="mt-4 text-center text-xs text-gray-500">
                Impresso, sai com {aberto.modelo.impressao.largura} × {aberto.modelo.impressao.altura} mm
                {aberto.modelo.copiasNaFolha ? ', várias cópias por folha para recortar.' : '.'}
              </p>
            </div>
          </div>
        </div>
      </PainelCartao>
    );
  }

  // ---------------------------------------------------------------- lista e modelos

  return (
    <PainelCartao>
      <header className="mb-6 max-w-3xl">
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Documentos</h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          {aba === 'oficina'
            ? 'Escolha um modelo, troque os textos e a imagem, e o papel fica pronto para a mesa: baixe a imagem, copie para colar no Discord ou imprima. Os documentos ficam guardados nesta campanha e só quem comanda a mesa vê esta aba.'
            : 'Documentos prontos que ajudam a explicar o Jardim (Fluxos, Deidades, Árvores, acontecimentos e povos) e papéis de missões secundárias. Baixe, copie ou imprima e mande aos jogadores. Cada um traz uma nota sobre o que revela e quando entregar.'}
        </p>
      </header>

      <div className="mb-8 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Partes de Documentos">
        {([['oficina', 'Oficina'], ['universais', 'Documentos universais']] as const).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`documentos-aba-${id}`}
            aria-selected={aba === id}
            aria-controls={`documentos-painel-${id}`}
            onClick={() => setAba(id)}
            className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition ${aba === id ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 text-gray-400 hover:text-white'}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'universais' ? (
        <div role="tabpanel" id="documentos-painel-universais" aria-labelledby="documentos-aba-universais">
          <DocumentosUniversais campanhaId={campanhaId} copiando={salvando} aoLevarParaOficina={(doc) => void levarParaOficina(doc)} />
        </div>
      ) : (
      <div role="tabpanel" id="documentos-painel-oficina" aria-labelledby="documentos-aba-oficina">
      <section aria-labelledby="documentos-salvos" className="mb-10">
        <h3 id="documentos-salvos" className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Seus documentos</h3>
        {carregando ? (
          <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Carregando...</p>
        ) : documentos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-gray-500">
            Nenhum documento ainda. Comece por um dos modelos abaixo.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {documentos.map((documento) => {
              const modelo = modeloPorId(documento.modelo);
              const Icone = modelo ? ICONES[modelo.icone] : FileLock2;
              return (
                <li key={documento.id} className="group relative min-w-0">
                  <button
                    type="button"
                    onClick={() => void abrirSalvo(documento)}
                    disabled={abrindoId !== null}
                    className="flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 pr-12 text-left transition hover:border-primary/40 disabled:cursor-wait"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary" aria-hidden="true">
                      {abrindoId === documento.id ? <Loader2 size={18} className="animate-spin" /> : <Icone size={18} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-white">{documento.titulo}</span>
                      <span className="block text-xs text-gray-500">
                        {modelo?.nome ?? 'Modelo que saiu do site'} · {dataCurta(documento.atualizado_em)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void excluir(documento)}
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-600 transition hover:bg-red-500/10 hover:text-red-400"
                    aria-label={`Excluir ${documento.titulo}`}
                    title="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="documentos-modelos">
        <h3 id="documentos-modelos" className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">Modelos</h3>
        <p className="mb-5 text-sm text-gray-500">Cada modelo já vem com um exemplo preenchido. É só trocar.</p>
        <div className="space-y-8">
          {porCategoria.map(({ categoria, modelos }) => (
            <div key={categoria}>
              <h4 className="mb-3 text-sm font-bold text-gray-300" style={{ fontFamily: 'Cinzel, serif' }}>{categoria}</h4>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {modelos.map((modelo) => {
                  const Icone = ICONES[modelo.icone];
                  const tecnologia = versaoDeTecnologia(modelo);
                  return (
                    <li key={modelo.id} className="relative min-w-0">
                      <button
                        type="button"
                        onClick={() => abrirNovo(modelo)}
                        className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-left transition hover:-translate-y-0.5 hover:border-primary/40"
                      >
                        <span className="flex h-52 items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#2a2531,#0d0c10_75%)] p-4">
                          <Miniatura modelo={modelo} largura={modelo.largura >= modelo.altura ? 210 : 120} />
                        </span>
                        <span className="flex flex-1 flex-col gap-1 p-4">
                          <span className="flex items-center gap-2 font-bold text-white">
                            <Icone size={16} className="text-primary" aria-hidden="true" /> {modelo.nome}
                          </span>
                          <span className="text-xs leading-5 text-gray-400">{modelo.descricao}</span>
                          <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-xs font-bold text-primary">
                            <Plus size={14} aria-hidden="true" /> Criar a partir deste modelo
                          </span>
                        </span>
                      </button>
                      {tecnologia ? (
                        <button
                          type="button"
                          onClick={() => abrirNovo(modelo, tecnologia.valor)}
                          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-[#07101f]/90 px-2.5 py-1 text-[11px] font-bold text-sky-300 transition hover:border-sky-300 hover:text-sky-200"
                          title={`Criar já na versão ${tecnologia.rotulo}`}
                        >
                          <Cpu size={12} aria-hidden="true" /> {tecnologia.rotulo}
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
      </div>
      )}
    </PainelCartao>
  );
}

export default DocumentosPainel;
