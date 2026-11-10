import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Copy, CopyPlus, Download, Loader2, Printer } from 'lucide-react';
import { documentosApi, type IDocumentoUniversal } from '../../../services/documentosApi';
import { valoresComPadrao, type IModeloDeDocumento, type ValoresDoDocumento } from './modelo';
import { modeloPorId } from './modelos';
import { BOTAO, ICONES, Miniatura, Previa, exportarDocumento, type Exportacao } from './telasDoDocumento';
import { agruparPorTema } from './universais';

interface IPronto {
  doc: IDocumentoUniversal;
  modelo: IModeloDeDocumento;
  valores: ValoresDoDocumento;
}

const ROTULO = 'text-xs font-bold uppercase tracking-widest text-gray-400';

function Nota({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className={ROTULO}>{titulo}</h4>
      <div className="text-sm leading-6 text-gray-300">{children}</div>
    </div>
  );
}

/**
 * A aba dos documentos prontos da lore. Só leitura: para mudar um texto, o Mestre leva uma
 * cópia para a Oficina, e o documento universal continua igual para todas as campanhas.
 */
export function DocumentosUniversais({
  campanhaId, copiando, aoLevarParaOficina,
}: { campanhaId: string; copiando: boolean; aoLevarParaOficina: (doc: IDocumentoUniversal) => void }) {
  const [documentos, setDocumentos] = useState<IDocumentoUniversal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tema, setTema] = useState<string | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [exportando, setExportando] = useState<Exportacao | null>(null);

  useEffect(() => {
    let valido = true;
    setCarregando(true);
    setErro('');
    setAbertoId(null);
    documentosApi.universais(campanhaId)
      .then((resposta) => { if (valido) setDocumentos(resposta.documentos); })
      .catch((falha) => { if (valido) setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar os documentos universais.'); })
      .finally(() => { if (valido) setCarregando(false); });
    return () => { valido = false; };
  }, [campanhaId]);

  // Documento de um modelo que o site não conhece fica de fora (o teste do repositório acusa antes).
  const prontos = useMemo<IPronto[]>(() => documentos.flatMap((doc) => {
    const modelo = modeloPorId(doc.modelo);
    return modelo ? [{ doc, modelo, valores: valoresComPadrao(modelo, doc.campos) }] : [];
  }), [documentos]);
  const grupos = useMemo(() => agruparPorTema(prontos, (item) => item.doc.tema), [prontos]);
  const visiveis = tema ? grupos.filter((grupo) => grupo.tema === tema) : grupos;
  const aberto = prontos.find((item) => item.doc.id === abertoId) ?? null;

  const abrir = (id: string | null) => {
    setAbertoId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exportar = async (tipo: Exportacao) => {
    if (!aberto || exportando) return;
    setExportando(tipo);
    try {
      await exportarDocumento(tipo, aberto.modelo, aberto.valores, aberto.doc.titulo);
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
    const { doc } = aberto;
    return (
      <div>
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => abrir(null)} className={BOTAO}>
              <ArrowLeft size={14} /> Documentos universais
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
              <Icone size={13} aria-hidden="true" /> {aberto.modelo.nome}
            </span>
            <span className="text-xs text-gray-500">{doc.tema}</span>
          </div>
          <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{doc.titulo}</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BOTAO} disabled={exportando !== null} onClick={() => void exportar('baixar')}>
              {exportando === 'baixar' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Baixar imagem
            </button>
            <button type="button" className={BOTAO} disabled={exportando !== null} onClick={() => void exportar('copiar')}>
              {exportando === 'copiar' ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />} Copiar imagem
            </button>
            <button type="button" className={BOTAO} disabled={exportando !== null} onClick={() => void exportar('imprimir')}>
              {exportando === 'imprimir' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} Imprimir ou PDF
            </button>
            <button
              type="button"
              className={BOTAO}
              disabled={copiando}
              onClick={() => aoLevarParaOficina(doc)}
              title="Cria uma cópia desta campanha na Oficina, para você mudar o que quiser"
            >
              {copiando ? <Loader2 size={14} className="animate-spin" /> : <CopyPlus size={14} />} Editar uma cópia na Oficina
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <div className="order-2 space-y-5 lg:order-1">
            <p className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-xs leading-5 text-amber-100/80">
              As notas abaixo são só para você. A imagem é o que o jogador recebe.
            </p>
            <Nota titulo="O que ensina">{doc.ensina}</Nota>
            <Nota titulo="Quando entregar">{doc.entregar}</Nota>
            {doc.fontes.length ? (
              <Nota titulo="De onde vem na lore">
                <ul className="list-disc space-y-1 pl-5 text-xs text-gray-400">{doc.fontes.map((fonte) => <li key={fonte}>{fonte}</li>)}</ul>
              </Nota>
            ) : null}
            {doc.inventado.length ? (
              <Nota titulo="Criado para este documento">
                <ul className="list-disc space-y-1 pl-5">{doc.inventado.map((item) => <li key={item}>{item}</li>)}</ul>
              </Nota>
            ) : null}
          </div>
          <div className="order-1 lg:order-2">
            <div className="rounded-2xl border border-white/5 bg-[radial-gradient(circle_at_30%_20%,#2a2531,#0d0c10_70%)] p-4 sm:p-6 lg:sticky lg:top-6">
              <Previa modelo={aberto.modelo} valores={aberto.valores} titulo={doc.titulo} />
              <p className="mt-4 text-center text-xs text-gray-500">
                Impresso, sai com {aberto.modelo.impressao.largura} × {aberto.modelo.impressao.altura} mm.
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
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {grupo.itens.map(({ doc, modelo, valores }) => {
              const Icone = ICONES[modelo.icone];
              return (
                <li key={doc.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => abrir(doc.id)}
                    className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-left transition hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <span className="flex h-52 items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#2a2531,#0d0c10_75%)] p-4">
                      <Miniatura modelo={modelo} valores={valores} largura={modelo.largura >= modelo.altura ? 210 : 120} />
                    </span>
                    <span className="flex flex-1 flex-col gap-1 p-4">
                      <span className="flex items-start gap-2 font-bold text-white">
                        <Icone size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /> {doc.titulo}
                      </span>
                      <span className="line-clamp-3 text-xs leading-5 text-gray-400">{doc.ensina}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default DocumentosUniversais;
