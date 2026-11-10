import { urlPedaco } from '../../../services/mapaApi';
import { chaveDaImagem, ESCALA_PECA_MAX, type IPecaProjeto } from './projeto';

export type ModeloPeca = Pick<IPecaProjeto, 'imagem_id' | 'pacote' | 'camada' | 'rotulo' | 'imagem_largura' | 'imagem_altura'>;
type DimensoesPeca = Pick<IPecaProjeto, 'imagem_id' | 'pacote' | 'imagem_largura' | 'imagem_altura'>;

/**
 * A antiga mobília do Jardim (peças 3D de Blender) saiu do catálogo do Construtor. As imagens continuam em
 * public/assets/construtor/mobilia só para projetos e peças prontas que já as usam seguirem abrindo (`pacote`).
 */
export function urlDaMobilia(id: string): string {
  return `/assets/construtor/mobilia/${id}.webp`;
}

const LADO_LADRILHO = 1024;
const LADO_MAXIMO = 4096;
const LADO_MINIMO = 256;

/**
 * Divide um orçamento de uns 67 milhões de pixels entre as imagens únicas do mapa (cada uma
 * com no máximo 4096 px de lado). Quatro mapas do Acervo juntos ainda saem na resolução cheia
 * até esse tamanho; com mais imagens o lado cai, para a memória do navegador aguentar.
 */
function ladoParaImagem(quantidade: number): number {
  return Math.max(LADO_MINIMO, Math.min(LADO_MAXIMO, Math.floor(8192 / Math.sqrt(Math.max(1, quantidade)))));
}

/**
 * Monta uma fonte em resolução adequada ao tamanho máximo de uma peça. Usa os ladrilhos
 * cheios; para imagens acima de 8192 px, usa o nível de 1/4, que ainda cobre o limite.
 */
export async function carregarImagemPeca(
  peca: DimensoesPeca,
  quantidadeImagens = 1,
): Promise<ImageBitmap> {
  if (peca.pacote) {
    // Peça da antiga mobília do Jardim (projeto ou peça pronta já salvos): um arquivo só, servido junto com o site.
    const resposta = await fetch(urlDaMobilia(peca.pacote));
    if (!resposta.ok) throw new Error(`Não deu para carregar a peça "${peca.pacote}".`);
    return createImageBitmap(await resposta.blob());
  }
  const { imagem_id: imagemId, imagem_largura: largura, imagem_altura: altura } = peca;
  if (!Number.isInteger(largura) || !Number.isInteger(altura) || largura < 1 || altura < 1 || largura > 32768 || altura > 32768) {
    throw new Error('As dimensões da imagem da peça são inválidas.');
  }
  const escalaFonte = Math.max(largura, altura) > 8192 ? 4 : 1;
  const colunas = Math.ceil(Math.ceil(largura / escalaFonte) / LADO_LADRILHO);
  const linhas = Math.ceil(Math.ceil(altura / escalaFonte) / LADO_LADRILHO);
  const ladoAlvo = ladoParaImagem(quantidadeImagens);
  const escalaDestino = Math.min(1, ladoAlvo / Math.max(largura, altura));
  const tela = new OffscreenCanvas(Math.max(1, Math.ceil(largura * escalaDestino)), Math.max(1, Math.ceil(altura * escalaDestino)));
  const contexto = tela.getContext('2d');
  if (!contexto) throw new Error('Este navegador não conseguiu preparar a imagem da peça.');
  contexto.imageSmoothingQuality = 'high';

  const pedacos = Array.from({ length: colunas * linhas }, (_, indice) => ({ coluna: Math.floor(indice / linhas), linha: indice % linhas }));
  let proximo = 0;
  let falhou = false;
  let falha: unknown;
  const trabalhador = async () => {
    while (!falhou && proximo < pedacos.length) {
      const { coluna, linha } = pedacos[proximo++];
      try {
        const nivel = escalaFonte === 4 ? 'n2' : 'n0';
        const resposta = await fetch(urlPedaco(imagemId, `${nivel}/${coluna}/${linha}`), { credentials: 'same-origin' });
        if (!resposta.ok) throw new Error(`Não deu para carregar a imagem "${imagemId}" do Acervo.`);
        const bitmap = await createImageBitmap(await resposta.blob());
        try {
          const fator = escalaFonte * escalaDestino;
          contexto.drawImage(bitmap, coluna * LADO_LADRILHO * fator, linha * LADO_LADRILHO * fator, bitmap.width * fator, bitmap.height * fator);
        } finally {
          bitmap.close();
        }
      } catch (erro) {
        falhou = true;
        falha = erro;
        return;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, pedacos.length) }, trabalhador));
  if (falhou) throw falha;
  return createImageBitmap(tela);
}

/** Carrega imagens em lotes pequenos e fecha as já abertas se alguma referência falhar. */
export async function carregarImagensPecas(pecas: DimensoesPeca[]): Promise<Map<string, ImageBitmap>> {
  const unicas = new Map(pecas.map((peca) => [chaveDaImagem(peca), peca]));
  const lista = [...unicas.values()];
  const quantidade = lista.length;
  const imagens = new Map<string, ImageBitmap>();
  let proxima = 0;
  let falhou = false;
  let falha: unknown;
  const trabalhador = async () => {
    while (!falhou && proxima < quantidade) {
      const peca = lista[proxima++];
      try {
        imagens.set(chaveDaImagem(peca), await carregarImagemPeca(peca, quantidade));
      } catch (erro) {
        falhou = true;
        falha = erro;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, quantidade) }, trabalhador));
  if (falhou) {
    for (const imagem of imagens.values()) imagem.close();
    throw falha;
  }
  return imagens;
}

export function pecaDoAcervo(item: { id: string; nome: string; largura: number; altura: number }): ModeloPeca {
  return {
    imagem_id: item.id,
    pacote: null,
    camada: 'objetos',
    rotulo: item.nome,
    imagem_largura: item.largura,
    imagem_altura: item.altura,
  };
}

/**
 * Um mapa do Acervo como peça: vai para o chão e entra no tamanho original, se a casa do projeto
 * for a do desenho. `escala` é a largura em casas; o Mestre acerta depois até as grades casarem.
 */
export function pecaDoMapa(item: { id: string; nome: string; largura: number; altura: number }): ModeloPeca {
  return { ...pecaDoAcervo(item), camada: 'chao' };
}

/** Largura, em casas, que um mapa de `larguraPx` ocupa se cada casa do projeto tem `casa` px. */
export function casasDoMapa(larguraPx: number, casa: number): number {
  return Math.min(ESCALA_PECA_MAX, Math.max(0.1, Number((larguraPx / Math.max(1, casa)).toFixed(2))));
}

export function proporcaoPeca(peca: Pick<IPecaProjeto, 'imagem_largura' | 'imagem_altura'>): number {
  return peca.imagem_altura / peca.imagem_largura;
}
