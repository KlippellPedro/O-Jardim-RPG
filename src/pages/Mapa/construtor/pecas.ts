import { urlPedaco } from '../../../services/mapaApi';
import catalogoMobilia from '../../../data/construtor-mobilia.json';
import { chaveDaImagem, type CamadaPeca, type IPecaProjeto } from './projeto';

export type ModeloPeca = Pick<IPecaProjeto, 'imagem_id' | 'pacote' | 'camada' | 'rotulo' | 'imagem_largura' | 'imagem_altura'>;
type DimensoesPeca = Pick<IPecaProjeto, 'imagem_id' | 'pacote' | 'imagem_largura' | 'imagem_altura'>;

/** Uma peça da mobília do Jardim (tools/blender/gerar_mobilia.py). `escala` é a largura da imagem em casas. */
export interface IMobilia {
  id: string;
  nome: string;
  categoria: string;
  imagem_largura: number;
  imagem_altura: number;
  escala: number;
}

export const MOBILIA: IMobilia[] = catalogoMobilia.pecas;

/** Tapete e alçapão ficam no chão (embaixo de tudo); copa de árvore e tocha de parede, no alto. */
const CAMADA_DA_MOBILIA: Record<string, CamadaPeca> = {
  tapete: 'chao', 'tapete-redondo': 'chao', alcapao: 'chao',
  arvore: 'alto', pinheiro: 'alto', 'tocha-de-parede': 'alto',
};

export function urlDaMobilia(id: string): string {
  return `/assets/construtor/mobilia/${id}.webp`;
}

export function pecaDaMobilia(item: IMobilia): ModeloPeca {
  return {
    imagem_id: '',
    pacote: item.id,
    camada: CAMADA_DA_MOBILIA[item.id] ?? 'objetos',
    rotulo: item.nome,
    imagem_largura: item.imagem_largura,
    imagem_altura: item.imagem_altura,
  };
}

const LADO_LADRILHO = 1024;
const LADO_MAXIMO = 2048;
const LADO_MINIMO = 256;

/** Divide um orçamento aproximado de 16 milhões de pixels entre as imagens únicas do mapa. */
function ladoParaImagem(quantidade: number): number {
  return Math.max(LADO_MINIMO, Math.min(LADO_MAXIMO, Math.floor(4096 / Math.sqrt(Math.max(1, quantidade)))));
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
    // Mobília do Jardim: um arquivo só, pequeno, servido junto com o site.
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

export function proporcaoPeca(peca: Pick<IPecaProjeto, 'imagem_largura' | 'imagem_altura'>): number {
  return peca.imagem_altura / peca.imagem_largura;
}
