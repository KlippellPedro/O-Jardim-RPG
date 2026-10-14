import { Download, ExternalLink, LockKeyhole } from 'lucide-react';
import {
  formatarDataDaEdicao,
  formatarTamanhoDoArquivo,
  urlDoPdf,
  type IEdicaoDoLivro,
} from '../../../services/livroApi';
import { EmblemaDaArvore } from './EmblemaDaArvore';

interface CartaoDoPdfProps {
  jogador?: IEdicaoDoLivro;
  mestre?: IEdicaoDoLivro;
  campanhaId?: string | null;
}

const detalhes = (edicao: IEdicaoDoLivro) => [
  edicao.paginas ? `${edicao.paginas} páginas` : null,
  formatarTamanhoDoArquivo(edicao.bytes) || null,
  formatarDataDaEdicao(edicao.gerado_em) ? `edição de ${formatarDataDaEdicao(edicao.gerado_em)}` : null,
].filter(Boolean).join(' · ');

const botaoPrincipal = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#d8bd75] px-4 py-2.5 text-sm font-bold text-[#1a1408] transition hover:bg-[#e6cf8c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8bd75]';
const botaoSecundario = 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-[#c7a44c]/50 hover:text-[#f2ead7]';

/** A capa em miniatura: o mesmo desenho do PDF, em CSS. */
const CapaEmMiniatura = () => (
  <div
    aria-hidden="true"
    className="relative mx-auto flex aspect-[210/297] w-28 shrink-0 flex-col items-center justify-between overflow-hidden rounded-md border border-[#c7a44c]/50 bg-gradient-to-b from-[#241d33] via-[#15111f] to-[#0b0911] px-3 pb-4 pt-5 shadow-[0_18px_40px_rgba(0,0,0,0.5)] sm:mx-0 sm:w-32"
  >
    <span aria-hidden="true" className="pointer-events-none absolute inset-1.5 rounded-sm border border-[#c7a44c]/35" />
    <span className="text-[6px] font-bold uppercase tracking-[0.3em] text-[#c7a44c]">Sistema d20</span>
    <EmblemaDaArvore className="h-14 w-auto sm:h-16" />
    <span className="text-center">
      <span className="block font-serif text-[15px] leading-none text-[#f2ead7]">O Jardim</span>
      <span className="mt-1 block text-[7px] italic text-[#bcb3cc]">Livro de Regras</span>
    </span>
  </div>
);

/** Convite para ler o livro como um livro: o mesmo texto do site, num PDF só. */
export const CartaoDoPdf = ({ jogador, mestre, campanhaId }: CartaoDoPdfProps) => {
  if (!jogador && !mestre) return null;
  const principal = jogador ?? mestre!;
  const info = detalhes(principal);

  return (
    <section
      data-tour="regras-pdf"
      aria-labelledby="regras-pdf-titulo"
      className="mt-8 overflow-hidden rounded-[1.75rem] border border-[#c7a44c]/25 bg-gradient-to-br from-[#c7a44c]/[0.12] via-[#0d0c12] to-black/40 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:p-7"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <CapaEmMiniatura />
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c7a44c]">Leitura de livro</span>
          <h2 id="regras-pdf-titulo" className="mt-2 font-serif text-2xl font-bold text-[#f2ead7]">O livro inteiro em um PDF</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-300/80">
            Os tópicos na ordem de um livro de RPG e, no fim, o Compêndio com as classes, as raças, os Legados e as magias.
            Tem sumário, referência rápida e índice, e depois de baixado funciona sem internet.
          </p>
          {info ? <p className="mt-2 text-xs text-gray-500">{info}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            {jogador ? (
              <>
                <a href={urlDoPdf('jogador', { baixar: true })} className={botaoPrincipal} data-testid="baixar-pdf-jogador">
                  <Download size={16} /> Baixar PDF
                </a>
                <a href={urlDoPdf('jogador')} target="_blank" rel="noopener noreferrer" className={botaoSecundario}>
                  <ExternalLink size={15} /> Abrir no navegador
                </a>
              </>
            ) : null}
          </div>

          {mestre ? (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#cbb87e]">
                <LockKeyhole size={13} /> Edição do Mestre
              </p>
              <p className="mt-1.5 text-xs leading-6 text-gray-400">
                O mesmo livro com o Guia do Mestre e as notas de condução de cada tópico. Só quem conduz a mesa vê este arquivo,
                e ele não deve ir para as mãos dos jogadores.
              </p>
              <p className="mt-1 text-xs text-gray-500">{detalhes(mestre)}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a href={urlDoPdf('mestre', { baixar: true, campanhaId })} className={botaoSecundario} data-testid="baixar-pdf-mestre">
                  <Download size={15} /> Baixar edição do Mestre
                </a>
                <a href={urlDoPdf('mestre', { campanhaId })} target="_blank" rel="noopener noreferrer" className={botaoSecundario}>
                  <ExternalLink size={15} /> Abrir no navegador
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};
