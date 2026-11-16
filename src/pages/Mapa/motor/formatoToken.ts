// O formato do token: "redondo" (o retrato recortado num círculo, com moldura) ou "livre" (a arte inteira, como
// veio, sem círculo nem moldura: boneco de corpo inteiro, criatura comprida, objeto). Sem React nem Pixi, para testar.
//
// O formato mora no `enquadramento` do token (a chave `formato`, que só existe quando é "livre") e, como padrão
// de uma imagem do Acervo, numa etiqueta `formato:livre`. A etiqueta vale para os tokens novos feitos daquela
// imagem; cada token pode mudar depois pelo menu dele. O servidor repete a regra (core/mapa.py).

export type FormatoDoToken = 'redondo' | 'livre';

export const ETIQUETA_FORMATO_LIVRE = 'formato:livre';

export const FORMATOS_DO_TOKEN: Array<{ id: FormatoDoToken; rotulo: string; dica: string }> = [
  { id: 'redondo', rotulo: 'Redondo', dica: 'O retrato recortado num círculo, com moldura.' },
  { id: 'livre', rotulo: 'Corpo inteiro', dica: 'A imagem inteira, sem círculo: com o fundo transparente, só o personagem aparece, de pé na casa.' },
];

/** O formato que as etiquetas de uma imagem do Acervo pedem para tokens novos. */
export function formatoDasEtiquetas(etiquetas: readonly string[] | undefined): FormatoDoToken {
  return (etiquetas ?? []).includes(ETIQUETA_FORMATO_LIVRE) ? 'livre' : 'redondo';
}

/** As etiquetas com o formato escolhido (sem repetir, sem mexer nas outras). */
export function etiquetasComFormato(etiquetas: readonly string[], formato: FormatoDoToken): string[] {
  const outras = etiquetas.filter((etiqueta) => etiqueta !== ETIQUETA_FORMATO_LIVRE);
  return formato === 'livre' ? [...outras, ETIQUETA_FORMATO_LIVRE] : outras;
}

/** O formato de um token, lido do enquadramento dele. */
export function formatoDoEnquadramento(enquadramento: { formato?: string } | undefined): FormatoDoToken {
  return enquadramento?.formato === 'livre' ? 'livre' : 'redondo';
}

/** Etiquetas que o sistema usa (tamanho em casas, formato): ficam fora da lista que a pessoa edita, mas voltam ao salvar. */
export function ehEtiquetaDoSistema(etiqueta: string): boolean {
  return etiqueta === ETIQUETA_FORMATO_LIVRE || etiqueta.startsWith('casas:');
}

export function separarEtiquetas(etiquetas: readonly string[]): { visiveis: string[]; doSistema: string[] } {
  return {
    visiveis: etiquetas.filter((etiqueta) => !ehEtiquetaDoSistema(etiqueta)),
    doSistema: etiquetas.filter(ehEtiquetaDoSistema),
  };
}

/** "lobo, floresta , Lobo" vira ["lobo", "floresta"]: minúsculas, sem repetir, até 30 letras cada (o limite do servidor). */
export function etiquetasDoTexto(texto: string): string[] {
  const vistas: string[] = [];
  for (const parte of texto.split(/[,;\n]/)) {
    const limpa = parte.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 30);
    if (limpa && !ehEtiquetaDoSistema(limpa) && !vistas.includes(limpa)) vistas.push(limpa);
  }
  return vistas;
}

/** Quantos lados do quadrado do token a arte de corpo inteiro pode ter de altura (a largura cabe sempre no quadrado). */
export const ALTURA_MAXIMA_LIVRE = 1.6;
/** Onde ficam os pés da arte, abaixo do centro do token, em fração do lado. */
export const PES_DO_TOKEN_LIVRE = 0.44;

export interface MedidasDoTokenLivre {
  /** Tamanho da arte no mapa. */
  largura: number;
  altura: number;
  /** O ponto de baixo, no meio da arte (os pés), relativo ao centro do token. */
  pesX: number;
  pesY: number;
  /** O topo da arte, relativo ao centro do token (negativo: acima). */
  topo: number;
}

/**
 * Onde a arte de corpo inteiro fica: a largura cabe no quadrado do token e a altura vai até 1,6 quadrado, com os
 * pés perto da borda de baixo (o nome e as barras seguem a conta do quadrado). O zoom do enquadramento aumenta a arte
 * (1 é o ajuste automático) e x e y a empurram, como no retrato redondo.
 */
export function medidasDoTokenLivre(
  larguraDaArte: number,
  alturaDaArte: number,
  lado: number,
  enquadramento: { zoom: number; x: number; y: number },
): MedidasDoTokenLivre {
  const larguraBase = Math.max(1, larguraDaArte);
  const alturaBase = Math.max(1, alturaDaArte);
  const escala = Math.min(lado / larguraBase, (lado * ALTURA_MAXIMA_LIVRE) / alturaBase) * Math.max(0.1, enquadramento.zoom);
  const largura = larguraBase * escala;
  const altura = alturaBase * escala;
  const pesX = enquadramento.x * lado * 0.5;
  const pesY = lado * PES_DO_TOKEN_LIVRE + enquadramento.y * lado * 0.5;
  return { largura, altura, pesX, pesY, topo: pesY - altura };
}

/** O maior lado, em pixels, da textura de uma arte de corpo inteiro no mapa (acima disso ela é reduzida ao ir para a tela). */
export const LADO_MAXIMO_DA_TEXTURA_LIVRE = 1536;
