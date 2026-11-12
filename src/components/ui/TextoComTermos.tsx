import { Fragment, useMemo } from 'react';
import { dicaDoTermo, dividirEmTermos, type ITermoDoJogo } from '../../services/termosDoJogo';

interface LinkDoTermoProps {
  termo: ITermoDoJogo;
  children: string;
}

/** Um termo do jogo dentro do texto. Abre o Livro numa guia nova, já no lugar
 * que explica o termo, para quem lê não perder onde estava. */
export const LinkDoTermo = ({ termo, children }: LinkDoTermoProps) => (
  <a
    href={termo.rota}
    target="_blank"
    rel="noopener noreferrer"
    title={dicaDoTermo(termo)}
    data-termo={termo.id}
    // O texto costuma estar dentro de um cartão que abre ou fecha ao clicar.
    onClick={(evento) => evento.stopPropagation()}
    className="termo-do-jogo"
  >
    {children}
  </a>
);

interface TextoComTermosProps {
  texto?: string | null;
  /** Termos que não viram link aqui (o próprio termo, num cartão que já o explica). */
  ignorar?: readonly string[];
  /** Tópico do Livro em que o texto está: o que ele mesmo explica não vira link. */
  topicoAtual?: string;
}

/** Texto corrido com as condições, aflições e mecânicas virando link para o
 * Livro. Cada termo liga só na primeira vez que aparece no texto. */
export const TextoComTermos = ({ texto, ignorar, topicoAtual }: TextoComTermosProps) => {
  const chaveIgnorar = ignorar?.join('|') ?? '';
  const trechos = useMemo(
    () => dividirEmTermos(texto || '', { ignorar: chaveIgnorar ? chaveIgnorar.split('|') : [], topicoAtual }),
    [texto, chaveIgnorar, topicoAtual],
  );
  return (
    <>
      {trechos.map((trecho, indice) => (typeof trecho === 'string'
        ? <Fragment key={indice}>{trecho}</Fragment>
        : <LinkDoTermo key={indice} termo={trecho.termo}>{trecho.texto}</LinkDoTermo>))}
    </>
  );
};
