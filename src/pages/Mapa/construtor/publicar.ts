// Publicar o mapa montado: o navegador desenha cada ladrilho que o acervo pede (o cheio de
// 1024 px, o reduzido em um quarto e a miniatura) direto do projeto, sem montar a imagem
// inteira na memória, sobe um por um e pede ao servidor para pôr o mapa na cena.

import { acervoApi } from '../../../services/acervoApi';
import { construtorApi, type IProjeto } from '../../../services/construtorApi';
import type { IEstadoMapa } from '../../../services/mapaApi';
import { chavesEsperadas, LADO_LADRILHO } from '../motor/geometria';
import { desenharTrecho } from './desenho';
import { carregarImagensPecas } from './pecas';

const LADO_MINIATURA = 320;
const QUALIDADE = 0.9;
const ENVIOS_SIMULTANEOS = 3;
/** A pasta do acervo onde caem os mapas publicados pelo construtor. */
export const PASTA_DO_CONSTRUTOR = 'Construtor';

export interface ProgressoPublicacao {
  feitos: number;
  total: number;
}

/** Desenha um pedaço pela chave do acervo ("mini", "n0/coluna/linha" ou "n2/coluna/linha"). */
export async function desenharPedaco(projeto: IProjeto, chave: string, imagensPecas: Map<string, CanvasImageSource> = new Map()): Promise<Blob> {
  const largura = projeto.largura * projeto.casa;
  const altura = projeto.altura * projeto.casa;
  let tela: OffscreenCanvas;
  let regiao: { x: number; y: number; w: number; h: number };
  let escala: number;
  if (chave === 'mini') {
    escala = Math.min(1, LADO_MINIATURA / Math.max(largura, altura));
    tela = new OffscreenCanvas(Math.max(1, Math.round(largura * escala)), Math.max(1, Math.round(altura * escala)));
    regiao = { x: 0, y: 0, w: largura, h: altura };
  } else {
    const [nivel, coluna, linha] = chave.split('/');
    const reduzido = nivel !== 'n0';
    escala = reduzido ? 0.25 : 1;
    // O reduzido tem um quarto do tamanho (arredondado para cima), cortado nos mesmos ladrilhos de 1024.
    const larguraNivel = reduzido ? Math.ceil(largura / 4) : largura;
    const alturaNivel = reduzido ? Math.ceil(altura / 4) : altura;
    const x = Number(coluna) * LADO_LADRILHO;
    const y = Number(linha) * LADO_LADRILHO;
    const w = Math.min(LADO_LADRILHO, larguraNivel - x);
    const h = Math.min(LADO_LADRILHO, alturaNivel - y);
    tela = new OffscreenCanvas(w, h);
    regiao = { x: x / escala, y: y / escala, w: w / escala, h: h / escala };
  }
  desenharTrecho(tela.getContext('2d')!, projeto.conteudo, projeto.casa, regiao, escala, imagensPecas);
  return tela.convertToBlob({ type: 'image/webp', quality: QUALIDADE });
}

export async function publicarProjeto(
  campanhaId: string,
  projeto: IProjeto,
  destino: { cenaId: string | null; nome?: string },
  aoProgresso?: (progresso: ProgressoPublicacao) => void,
): Promise<IEstadoMapa> {
  const largura = projeto.largura * projeto.casa;
  const altura = projeto.altura * projeto.casa;
  const imagensPecas = await carregarImagensPecas(projeto.conteudo.pecas);
  try {
    const pasta = await acervoApi.garantirCaminho(PASTA_DO_CONSTRUTOR);
    const { id, chaves } = await acervoApi.criarItem({ nome: projeto.nome, tipo: 'mapa', largura, altura, pasta_id: pasta.id });
    // Mesmo cálculo dos dois lados; se divergir, vale o que o servidor pediu.
    const lista = chaves.length ? chaves : chavesEsperadas(largura, altura);
    let feitos = 0;
    let proximo = 0;
    aoProgresso?.({ feitos, total: lista.length });
    const trabalhador = async () => {
      while (proximo < lista.length) {
        const chave = lista[proximo++];
        await acervoApi.subirPedaco(id, chave, await desenharPedaco(projeto, chave, imagensPecas));
        feitos++;
        aoProgresso?.({ feitos, total: lista.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(ENVIOS_SIMULTANEOS, lista.length) }, trabalhador));
    await acervoApi.concluirItem(id);
    // Sem imagem do Acervo dentro, o mapa é todo feito aqui: fica anotado como próprio.
    if (projeto.conteudo.pecas.every((peca) => peca.pacote)) {
      await acervoApi.editarItem(id, { autoria: 'Construtor de mapas do Jardim', licenca: 'propria' }).catch(() => undefined);
    }
    return await construtorApi.publicar(campanhaId, projeto.id, { mapa_id: id, cena_id: destino.cenaId, nome: destino.nome });
  } finally {
    for (const imagem of imagensPecas.values()) imagem.close();
  }
}
