import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Loader2, Share2 } from 'lucide-react';
import { FichaModal } from './FichaModal';
import { FichaImprimivel } from './FichaImprimivel';
import type { EfeitoAtmosfericoFicha } from '../fichaTheme';
import { baixarImagem, compartilharImagem, gerarImagemCartao, type ResultadoEntrega } from '../utils/cartaoPersonagem';
import { montarResumoFicha, nomeDeArquivo } from '../utils/exportarFicha';

interface IExportarFichaModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: any;
  destaque: string;
  segunda: string;
  efeito: EfeitoAtmosfericoFicha;
}

const MENSAGEM: Record<ResultadoEntrega, string> = {
  compartilhado: 'Cartão enviado.',
  copiado: 'Imagem copiada. É só colar no Discord.',
  baixado: 'Imagem baixada.',
};

/** Escolha do formato: PDF pela impressão do navegador ou o cartão do
 * personagem em imagem. As duas saídas leem o mesmo resumo da ficha. */
export const ExportarFichaModal = ({ isOpen, onClose, character, destaque, segunda, efeito }: IExportarFichaModalProps) => {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);

  // O resumo é recalculado a cada abertura, para refletir a ficha como está agora.
  const resumo = useMemo(() => (isOpen ? montarResumoFicha(character) : null), [isOpen, character]);

  useEffect(() => {
    if (!isOpen || !resumo) return undefined;
    let ativo = true;
    let url: string | null = null;
    setBlob(null);
    setPrevia(null);
    setErro('');
    setAviso('');
    gerarImagemCartao({ resumo, destaque, segunda, efeito })
      .then((imagem) => {
        if (!ativo) return;
        url = URL.createObjectURL(imagem);
        setBlob(imagem);
        setPrevia(url);
      })
      .catch((falha) => { if (ativo) setErro(falha instanceof Error ? falha.message : 'Não foi possível gerar o cartão.'); });
    return () => {
      ativo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isOpen, resumo, destaque, segunda, efeito]);

  if (!resumo) return null;
  const arquivo = nomeDeArquivo(resumo.nome, 'cartao', 'png');

  const executar = async (acao: () => Promise<ResultadoEntrega> | ResultadoEntrega) => {
    if (!blob || ocupado) return;
    setOcupado(true);
    try {
      setAviso(MENSAGEM[await acao()]);
    } catch {
      setAviso('Não foi possível concluir. Tente baixar a imagem.');
    } finally {
      setOcupado(false);
    }
  };

  const imprimir = () => {
    // Título da página vira o nome sugerido do PDF na maioria dos navegadores.
    const tituloAnterior = document.title;
    document.title = `Ficha - ${resumo.nome}`;
    const restaurar = () => {
      document.title = tituloAnterior;
      window.removeEventListener('afterprint', restaurar);
    };
    window.addEventListener('afterprint', restaurar);
    window.print();
  };

  return (
    <>
      <FichaModal isOpen={isOpen} onClose={onClose} title="Exportar ficha" eyebrow={resumo.nome} size="lg">
        <div className="grid gap-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <div className="mx-auto w-full max-w-[15rem]">
            {previa ? (
              <img src={previa} alt={`Prévia do cartão de ${resumo.nome}`} className="w-full rounded-xl border border-white/10 shadow-xl" />
            ) : erro ? (
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{erro}</p>
            ) : (
              <div className="flex aspect-[750/1050] w-full items-center justify-center rounded-xl border border-white/10 bg-black/30" aria-busy="true">
                <Loader2 className="animate-spin text-gray-500" size={26} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={imprimir}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#0f0e15] p-4 text-left transition-colors hover:border-[#c7a44c]/40"
            >
              <FileText size={20} className="mt-0.5 shrink-0 text-[#c7a44c]" />
              <span>
                <span className="block font-bold text-white">Ficha em PDF</span>
                <span className="mt-0.5 block text-xs leading-5 text-gray-400">
                  Uma página A4 com recursos, atributos, perícias, poderes e inventário. Na janela de impressão, escolha “Salvar como PDF”.
                </span>
              </span>
            </button>

            <button
              type="button"
              disabled={!blob || ocupado}
              onClick={() => void executar(() => baixarImagem(blob!, arquivo))}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#0f0e15] p-4 text-left transition-colors hover:border-[#c7a44c]/40 disabled:opacity-50"
            >
              <Download size={20} className="mt-0.5 shrink-0 text-[#c7a44c]" />
              <span>
                <span className="block font-bold text-white">Baixar cartão (PNG)</span>
                <span className="mt-0.5 block text-xs leading-5 text-gray-400">Imagem em formato de carta, com a moldura do seu nível.</span>
              </span>
            </button>

            <button
              type="button"
              disabled={!blob || ocupado}
              onClick={() => void executar(() => compartilharImagem(blob!, arquivo, `Cartão de ${resumo.nome}`))}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#0f0e15] p-4 text-left transition-colors hover:border-[#c7a44c]/40 disabled:opacity-50"
            >
              <Share2 size={20} className="mt-0.5 shrink-0 text-[#c7a44c]" />
              <span>
                <span className="block font-bold text-white">Compartilhar cartão</span>
                <span className="mt-0.5 block text-xs leading-5 text-gray-400">No celular abre o compartilhar; no computador copia a imagem para colar no Discord.</span>
              </span>
            </button>

            <p className="min-h-5 text-xs text-emerald-300" role="status">{aviso}</p>
          </div>
        </div>
      </FichaModal>
      {isOpen && typeof document !== 'undefined'
        ? createPortal(<FichaImprimivel resumo={resumo} destaque={destaque} segunda={segunda} efeito={efeito} />, document.body)
        : null}
    </>
  );
};
