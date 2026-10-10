/** Qual "tela" é este endereço, para a transição entre telas.
 *
 * A transição (um fade rápido) recomeça quando a tela muda, e só então. Endereços que são a mesma tela
 * (os caminhos do Mundo, por exemplo, que a própria MundoPage navega por dentro) têm a mesma chave:
 * refazer a montagem ali perderia o estado e piscaria sem necessidade. */

export function chaveDeTransicao(pathname: string): string {
  const caminho = pathname.replace(/\/+$/, '') || '/';
  const [, primeiro = '', segundo = ''] = caminho.split('/');

  if (caminho === '/') return 'home';

  switch (primeiro) {
    case 'ficha':
      return segundo ? 'ficha-detalhe' : 'ficha-lista';
    case 'mundo':
      if (segundo === 'calendario') return 'mundo-calendario';
      if (segundo === 'livro-da-verdade') return 'mundo-livro-da-verdade';
      return 'mundo';
    case 'regras':
      return segundo ? 'regras-detalhe' : 'regras';
    case 'entidades':
      if (!segundo) return 'entidades';
      if (segundo === 'sobre') return 'entidades-sobre';
      if (segundo === 'gambler' && caminho.endsWith('/cassino')) return 'entidades-cassino';
      return 'entidades-conto';
    default:
      return primeiro;
  }
}
