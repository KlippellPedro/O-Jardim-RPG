// Subir imagens do computador para o Acervo a partir do mapa (pela janela da barra de baixo ou soltando arquivos
// no mapa). Usa o mesmo envio em pedaços da gaveta do Acervo; aqui só se organiza a fila, o progresso e a pergunta
// "isto é um mapa ou um token?".

import type { IItemAcervo, TipoItemAcervo } from '../../../services/acervoApi';
import { escolher } from '../../../components/avisos/confirmacao';
import { imagensDaSelecao, subirParaOAcervo } from '../acervo/subirImagem';

/** Quantas imagens um envio aceita de uma vez (soltar uma pasta inteira de mapas pesaria o navegador). */
export const MAX_IMAGENS_POR_ENVIO = 24;

export interface AndamentoDoEnvio {
  /** A imagem de agora (1 a `total`) e o nome dela. */
  indice: number;
  total: number;
  nome: string;
  /** Pedaços já enviados dessa imagem e quantos ela tem. */
  feitos: number;
  pedacos: number;
}

export interface ResultadoDoEnvio {
  itens: IItemAcervo[];
  /** Nome das imagens que não subiram, com o motivo. */
  falhas: string[];
  /** Imagens deixadas de fora por passarem do limite do envio. */
  deixadas: number;
}

/** O que há de imagem numa seleção ou num soltar de arquivos, já cortado no limite do envio. */
export function imagensParaEnviar(arquivos: FileList | File[]): { imagens: File[]; deixadas: number } {
  const todas = imagensDaSelecao(arquivos);
  return { imagens: todas.slice(0, MAX_IMAGENS_POR_ENVIO), deixadas: Math.max(0, todas.length - MAX_IMAGENS_POR_ENVIO) };
}

/** O arrasto de agora leva arquivos do computador (e não uma imagem do Acervo)? */
export function arrastaArquivos(tipos: readonly string[] | DOMStringList): boolean {
  return Array.from(tipos).includes('Files');
}

/** Sobe as imagens uma a uma. Uma que falha não para as outras: vai para `falhas`. */
export async function enviarImagens(
  imagens: File[],
  opcoes: { tipo: TipoItemAcervo; pastaId: string | null; aoAndamento?: (andamento: AndamentoDoEnvio) => void },
): Promise<Omit<ResultadoDoEnvio, 'deixadas'>> {
  const itens: IItemAcervo[] = [];
  const falhas: string[] = [];
  for (let i = 0; i < imagens.length; i++) {
    const arquivo = imagens[i];
    try {
      itens.push(await subirParaOAcervo(arquivo, {
        tipo: opcoes.tipo,
        pastaId: opcoes.pastaId,
        aoProgresso: (p) => opcoes.aoAndamento?.({ indice: i + 1, total: imagens.length, nome: arquivo.name, feitos: p.feitos, pedacos: p.total }),
      }));
    } catch (falha) {
      falhas.push(`${arquivo.name}: ${falha instanceof Error ? falha.message : 'não subiu'}`);
    }
  }
  return { itens, falhas };
}

/** "Isto é um mapa ou um token?" para o que foi solto no mapa. Nulo se o Mestre desistir. */
export async function perguntarTipoDaImagem(quantas: number, nome: string): Promise<'mapa' | 'token' | null> {
  const resposta = await escolher({
    titulo: quantas === 1 ? 'O que é esta imagem?' : `O que são estas ${quantas} imagens?`,
    mensagem: quantas === 1
      ? `"${nome}" vai para o Acervo e já entra na cena. Um mapa é o desenho do lugar; um token é um personagem, criatura ou objeto.`
      : 'Elas vão para o Acervo e já entram na cena. Um mapa é o desenho do lugar; um token é um personagem, criatura ou objeto.',
    rotuloConfirmar: 'Mapa',
    alternativa: { rotulo: 'Token' },
    rotuloCancelar: 'Cancelar',
  });
  if (resposta === 'confirmar') return 'mapa';
  if (resposta === 'alternativa') return 'token';
  return null;
}

/** A frase de andamento para a janela ou para o aviso. */
export function textoDoAndamento(a: AndamentoDoEnvio): string {
  const parte = a.pedacos ? ` (${a.feitos}/${a.pedacos} pedaços)` : '';
  return a.total > 1 ? `Subindo ${a.indice} de ${a.total}: ${a.nome}${parte}` : `Subindo ${a.nome}${parte}`;
}

/** A frase do resultado, para quando o envio termina. */
export function textoDoResultado(r: ResultadoDoEnvio): string {
  const partes: string[] = [];
  if (r.itens.length) partes.push(r.itens.length === 1 ? `"${r.itens[0].nome}" está no Acervo.` : `${r.itens.length} imagens estão no Acervo.`);
  if (r.falhas.length) partes.push(`Não subiu: ${r.falhas.join('; ')}.`);
  if (r.deixadas) partes.push(`${r.deixadas} ficaram de fora (o limite é ${MAX_IMAGENS_POR_ENVIO} por vez).`);
  return partes.join(' ') || 'Nenhuma imagem (png, jpg, webp ou gif) nesse envio.';
}
