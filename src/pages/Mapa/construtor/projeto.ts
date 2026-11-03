// O projeto do construtor de mapas e as operações do editor, sem o motor (testáveis).
// O formato é o mesmo do servidor (plataforma/core/construtor.py):
// - chão: uma letra por casa, uma linha de texto por fileira ('.' é vazio);
// - parede: aresta de uma casa entre dois cantos da grade. "h,x,y" vai de (x, y) a (x+1, y),
//   e "v,x,y" vai de (x, y) a (x, y+1);
// - abertura: porta, janela ou porta secreta numa aresta que tem parede.
// Toda operação devolve um conteúdo novo (o antigo fica para o Desfazer).

export const VAZIO = '.';

export type MaterialChao = 'L' | 'P' | 'T' | 'R' | 'G' | 'A' | 'M' | 'C' | 'N' | 'W' | 'V';
export type MaterialParede = 'pedra' | 'tijolo' | 'madeira' | 'caverna' | 'cerca' | 'sebe';
export type TipoAbertura = 'porta' | 'janela' | 'secreta';
export type EstadoPorta = 'fechada' | 'aberta' | 'trancada';

export interface IAberturaProjeto {
  tipo: TipoAbertura;
  estado: EstadoPorta;
}

export interface IPecaProjeto {
  id: string;
  imagem_id: string;
  rotulo: string;
  imagem_largura: number;
  imagem_altura: number;
  /** Centro da peça em casas da grade. */
  x: number;
  y: number;
  /** Largura em casas; a altura acompanha a proporção da imagem. */
  escala: number;
  rotacao: number;
  espelhada: boolean;
}

export interface IConteudoProjeto {
  versao: number;
  chao: string[];
  paredes: Record<string, MaterialParede>;
  aberturas: Record<string, IAberturaProjeto>;
  pecas: IPecaProjeto[];
}

export interface ICasa {
  x: number;
  y: number;
}

/** Área em casas: de (x0, y0) até antes de (x1, y1). */
export interface IAreaCasas {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const MATERIAIS_CHAO: Array<{ codigo: MaterialChao; nome: string; cor: string }> = [
  { codigo: 'L', nome: 'Laje de pedra', cor: '#6f7279' },
  { codigo: 'P', nome: 'Pedra bruta', cor: '#7a756c' },
  { codigo: 'T', nome: 'Tábua', cor: '#8a5a34' },
  { codigo: 'R', nome: 'Terra', cor: '#6b4a2f' },
  { codigo: 'G', nome: 'Grama', cor: '#466f31' },
  { codigo: 'A', nome: 'Areia', cor: '#c4a671' },
  { codigo: 'M', nome: 'Mármore', cor: '#d6d2c9' },
  { codigo: 'C', nome: 'Caverna', cor: '#4d4742' },
  { codigo: 'N', nome: 'Neve', cor: '#e6edf4' },
  { codigo: 'W', nome: 'Água', cor: '#2c5d7c' },
  { codigo: 'V', nome: 'Lava', cor: '#a8431a' },
];

/** `espessura` em fração da casa. */
export const MATERIAIS_PAREDE: Array<{ id: MaterialParede; nome: string; cor: string; espessura: number }> = [
  { id: 'pedra', nome: 'Pedra', cor: '#8b8d93', espessura: 0.24 },
  { id: 'tijolo', nome: 'Tijolo', cor: '#9a4a36', espessura: 0.22 },
  { id: 'madeira', nome: 'Madeira', cor: '#7a5230', espessura: 0.16 },
  { id: 'caverna', nome: 'Rocha', cor: '#5a524b', espessura: 0.34 },
  { id: 'cerca', nome: 'Cerca', cor: '#8a6440', espessura: 0.08 },
  { id: 'sebe', nome: 'Sebe', cor: '#3f6a2c', espessura: 0.36 },
];

export function espessuraDaParede(material: MaterialParede): number {
  return MATERIAIS_PAREDE.find((m) => m.id === material)?.espessura ?? 0.22;
}

export function conteudoVazio(largura: number, altura: number): IConteudoProjeto {
  return { versao: 1, chao: Array.from({ length: altura }, () => VAZIO.repeat(largura)), paredes: {}, aberturas: {}, pecas: [] };
}

export function adicionarPeca(conteudo: IConteudoProjeto, peca: IPecaProjeto): IConteudoProjeto {
  if (conteudo.pecas.some((atual) => atual.id === peca.id) || conteudo.pecas.length >= 256) return conteudo;
  return { ...conteudo, pecas: [...conteudo.pecas, peca] };
}

export function editarPeca(conteudo: IConteudoProjeto, id: string, mudanca: Partial<IPecaProjeto>): IConteudoProjeto {
  let mudou = false;
  const pecas = conteudo.pecas.map((peca) => {
    if (peca.id !== id) return peca;
    mudou = true;
    return { ...peca, ...mudanca, id: peca.id, imagem_id: peca.imagem_id };
  });
  return mudou ? { ...conteudo, pecas } : conteudo;
}

export function apagarPeca(conteudo: IConteudoProjeto, id: string): IConteudoProjeto {
  const pecas = conteudo.pecas.filter((peca) => peca.id !== id);
  return pecas.length === conteudo.pecas.length ? conteudo : { ...conteudo, pecas };
}

export function chaveAresta(eixo: 'h' | 'v', x: number, y: number): string {
  return `${eixo},${x},${y}`;
}

export function lerAresta(chave: string): { eixo: 'h' | 'v'; x: number; y: number } {
  const [eixo, x, y] = chave.split(',');
  return { eixo: eixo as 'h' | 'v', x: Number(x), y: Number(y) };
}

/** As duas pontas da aresta, em casas. */
export function pontasDaAresta(chave: string): [ICasa, ICasa] {
  const { eixo, x, y } = lerAresta(chave);
  return [{ x, y }, eixo === 'h' ? { x: x + 1, y } : { x, y: y + 1 }];
}

export function arestaNaGrade(chave: string, largura: number, altura: number): boolean {
  const { eixo, x, y } = lerAresta(chave);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  return eixo === 'h' ? x >= 0 && x < largura && y >= 0 && y <= altura : x >= 0 && x <= largura && y >= 0 && y < altura;
}

export function materialEm(conteudo: IConteudoProjeto, x: number, y: number): string {
  return conteudo.chao[y]?.[x] ?? VAZIO;
}

function dimensoes(conteudo: IConteudoProjeto): { largura: number; altura: number } {
  return { largura: conteudo.chao[0]?.length ?? 0, altura: conteudo.chao.length };
}

/** Pinta casas de um material (ou de vazio). Casa fora do mapa é ignorada. */
export function pintar(conteudo: IConteudoProjeto, casas: ICasa[], material: MaterialChao | typeof VAZIO): IConteudoProjeto {
  const { largura, altura } = dimensoes(conteudo);
  const linhas = new Map<number, string[]>();
  for (const { x, y } of casas) {
    if (x < 0 || y < 0 || x >= largura || y >= altura) continue;
    if (!linhas.has(y)) linhas.set(y, conteudo.chao[y].split(''));
    linhas.get(y)![x] = material;
  }
  if (!linhas.size) return conteudo;
  const chao = conteudo.chao.slice();
  let mudou = false;
  for (const [y, letras] of linhas) {
    const nova = letras.join('');
    if (nova !== chao[y]) {
      chao[y] = nova;
      mudou = true;
    }
  }
  return mudou ? { ...conteudo, chao } : conteudo;
}

/** As casas do pincel quadrado de `tamanho` casas em volta do ponto (em casas, pode ser fracionário). */
export function casasDoPincel(ponto: { x: number; y: number }, tamanho: number): ICasa[] {
  const inicioX = Math.floor(ponto.x - (tamanho - 1) / 2);
  const inicioY = Math.floor(ponto.y - (tamanho - 1) / 2);
  const casas: ICasa[] = [];
  for (let dy = 0; dy < tamanho; dy++) for (let dx = 0; dx < tamanho; dx++) casas.push({ x: inicioX + dx, y: inicioY + dy });
  return casas;
}

export function areaEntre(a: ICasa, b: ICasa): IAreaCasas {
  return { x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x) + 1, y1: Math.max(a.y, b.y) + 1 };
}

/** Sala: o chão do retângulo e a parede em volta. A parede que já estava por dentro some (duas
 * salas encostadas viram uma), e a que já estava na borda fica como era (com a porta dela). */
export function sala(conteudo: IConteudoProjeto, a: ICasa, b: ICasa, chao: MaterialChao, parede: MaterialParede): IConteudoProjeto {
  const { largura, altura } = dimensoes(conteudo);
  const area = areaEntre(a, b);
  const x0 = Math.max(0, area.x0);
  const y0 = Math.max(0, area.y0);
  const x1 = Math.min(largura, area.x1);
  const y1 = Math.min(altura, area.y1);
  if (x1 <= x0 || y1 <= y0) return conteudo;
  const casas: ICasa[] = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) casas.push({ x, y });
  const pintado = pintar(conteudo, casas, chao);
  const paredes = { ...pintado.paredes };
  const aberturas = { ...pintado.aberturas };
  for (const chave of Object.keys(paredes)) {
    const { eixo, x, y } = lerAresta(chave);
    const dentro = eixo === 'h'
      ? x >= x0 && x < x1 && y > y0 && y < y1
      : y >= y0 && y < y1 && x > x0 && x < x1;
    if (dentro) {
      delete paredes[chave];
      delete aberturas[chave];
    }
  }
  for (let x = x0; x < x1; x++) {
    for (const y of [y0, y1]) paredes[chaveAresta('h', x, y)] ??= parede;
  }
  for (let y = y0; y < y1; y++) {
    for (const x of [x0, x1]) paredes[chaveAresta('v', x, y)] ??= parede;
  }
  return { ...pintado, paredes, aberturas };
}

/** As arestas de uma linha reta de um canto a outro da grade, no eixo que andou mais. */
export function arestasDaLinha(a: ICasa, b: ICasa): string[] {
  const chaves: string[] = [];
  if (Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)) {
    for (let x = Math.min(a.x, b.x); x < Math.max(a.x, b.x); x++) chaves.push(chaveAresta('h', x, a.y));
  } else {
    for (let y = Math.min(a.y, b.y); y < Math.max(a.y, b.y); y++) chaves.push(chaveAresta('v', a.x, y));
  }
  return chaves;
}

/** O ponto final da linha de parede, preso no eixo que andou mais. */
export function fimDaLinha(a: ICasa, b: ICasa): ICasa {
  return Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
}

export function poremParedes(conteudo: IConteudoProjeto, chaves: string[], material: MaterialParede): IConteudoProjeto {
  const { largura, altura } = dimensoes(conteudo);
  const paredes = { ...conteudo.paredes };
  let mudou = false;
  for (const chave of chaves) {
    if (!arestaNaGrade(chave, largura, altura) || paredes[chave] === material) continue;
    paredes[chave] = material;
    mudou = true;
  }
  return mudou ? { ...conteudo, paredes } : conteudo;
}

export function tirarParedes(conteudo: IConteudoProjeto, chaves: string[]): IConteudoProjeto {
  const paredes = { ...conteudo.paredes };
  const aberturas = { ...conteudo.aberturas };
  let mudou = false;
  for (const chave of chaves) {
    if (!(chave in paredes)) continue;
    delete paredes[chave];
    delete aberturas[chave];
    mudou = true;
  }
  return mudou ? { ...conteudo, paredes, aberturas } : conteudo;
}

/** A aresta mais perto do ponto (em casas), dentro de `limite` casas; `soComParede` olha só as que têm parede. */
export function arestaPerto(
  conteudo: IConteudoProjeto, ponto: { x: number; y: number }, limite = 0.3, soComParede = false,
): string | null {
  const { largura, altura } = dimensoes(conteudo);
  const candidatas: string[] = [];
  const cx = Math.floor(ponto.x);
  const cy = Math.floor(ponto.y);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      candidatas.push(chaveAresta('h', cx + dx, cy + dy), chaveAresta('v', cx + dx, cy + dy));
    }
  }
  let melhor: { chave: string; distancia: number } | null = null;
  for (const chave of candidatas) {
    if (!arestaNaGrade(chave, largura, altura)) continue;
    if (soComParede && !(chave in conteudo.paredes)) continue;
    const [p, q] = pontasDaAresta(chave);
    const distancia = distanciaAoSegmento(ponto, p, q);
    if (distancia <= limite && (!melhor || distancia < melhor.distancia)) melhor = { chave, distancia };
  }
  return melhor?.chave ?? null;
}

function distanciaAoSegmento(ponto: { x: number; y: number }, a: ICasa, b: ICasa): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((ponto.x - a.x) * dx + (ponto.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(ponto.x - (a.x + t * dx), ponto.y - (a.y + t * dy));
}

/** Clique com a ferramenta de abertura numa parede. A porta anda de fechada para aberta, trancada
 * e some; janela e porta secreta entram e saem. Numa aresta sem parede, nada acontece. */
export function abrir(conteudo: IConteudoProjeto, chave: string, tipo: TipoAbertura): IConteudoProjeto {
  if (!(chave in conteudo.paredes)) return conteudo;
  const aberturas = { ...conteudo.aberturas };
  const atual = aberturas[chave];
  if (tipo === 'porta' && atual?.tipo === 'porta') {
    const proximo: Record<EstadoPorta, EstadoPorta | null> = { fechada: 'aberta', aberta: 'trancada', trancada: null };
    const estado = proximo[atual.estado];
    if (estado) aberturas[chave] = { tipo: 'porta', estado };
    else delete aberturas[chave];
  } else if (atual?.tipo === tipo) {
    delete aberturas[chave];
  } else {
    aberturas[chave] = { tipo, estado: 'fechada' };
  }
  return { ...conteudo, aberturas };
}

/** Borracha: no modo de paredes, tira a parede mais perto; no de chão, esvazia as casas do pincel. */
export function apagar(conteudo: IConteudoProjeto, ponto: { x: number; y: number }, modo: 'chao' | 'paredes', tamanho = 1): IConteudoProjeto {
  if (modo === 'paredes') {
    const chave = arestaPerto(conteudo, ponto, 0.35, true);
    return chave ? tirarParedes(conteudo, [chave]) : conteudo;
  }
  return pintar(conteudo, casasDoPincel(ponto, tamanho), VAZIO);
}

/** Muda o tamanho do mapa: o desenho fica no canto de cima e à esquerda; o que sobra fora some. */
export function redimensionar(conteudo: IConteudoProjeto, largura: number, altura: number): IConteudoProjeto {
  const chao = Array.from({ length: altura }, (_, y) => ((conteudo.chao[y] ?? '') + VAZIO.repeat(largura)).slice(0, largura));
  const paredes: Record<string, MaterialParede> = {};
  for (const [chave, material] of Object.entries(conteudo.paredes)) if (arestaNaGrade(chave, largura, altura)) paredes[chave] = material;
  const aberturas: Record<string, IAberturaProjeto> = {};
  for (const [chave, abertura] of Object.entries(conteudo.aberturas)) if (chave in paredes) aberturas[chave] = abertura;
  // As peças ficam onde estão: o servidor aceita peça um pouco fora do mapa, e encolher e voltar não as perde.
  return { versao: conteudo.versao, chao, paredes, aberturas, pecas: conteudo.pecas };
}

/** A área (em casas) em que dois conteúdos diferem, com uma casa de folga (a parede e a sombra
 * dela passam um pouco da aresta), ou null se são iguais. */
export function areaMudada(antes: IConteudoProjeto, depois: IConteudoProjeto): IAreaCasas | null {
  if (antes === depois) return null;
  let area: IAreaCasas | null = null;
  const incluir = (x0: number, y0: number, x1: number, y1: number) => {
    area = area
      ? { x0: Math.min(area.x0, x0), y0: Math.min(area.y0, y0), x1: Math.max(area.x1, x1), y1: Math.max(area.y1, y1) }
      : { x0, y0, x1, y1 };
  };
  const altura = Math.max(antes.chao.length, depois.chao.length);
  for (let y = 0; y < altura; y++) {
    const a = antes.chao[y] ?? '';
    const b = depois.chao[y] ?? '';
    if (a === b) continue;
    const largura = Math.max(a.length, b.length);
    for (let x = 0; x < largura; x++) if (a[x] !== b[x]) incluir(x, y, x + 1, y + 1);
  }
  const arestas = (fonte: Record<string, unknown>, outra: Record<string, unknown>) => {
    for (const chave of Object.keys(fonte)) {
      if (JSON.stringify(fonte[chave]) === JSON.stringify(outra[chave])) continue;
      const [p, q] = pontasDaAresta(chave);
      incluir(Math.min(p.x, q.x), Math.min(p.y, q.y), Math.max(p.x, q.x), Math.max(p.y, q.y));
    }
  };
  arestas(antes.paredes, depois.paredes);
  arestas(depois.paredes, antes.paredes);
  arestas(antes.aberturas, depois.aberturas);
  arestas(depois.aberturas, antes.aberturas);
  const pecasAntes = new Map(antes.pecas.map((peca) => [peca.id, peca]));
  const pecasDepois = new Map(depois.pecas.map((peca) => [peca.id, peca]));
  for (const id of new Set([...pecasAntes.keys(), ...pecasDepois.keys()])) {
    const a = pecasAntes.get(id);
    const b = pecasDepois.get(id);
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    for (const peca of [a, b]) {
      if (!peca) continue;
      const proporcao = peca.imagem_altura / peca.imagem_largura;
      const w = peca.escala;
      const h = w * proporcao;
      const raio = Math.hypot(w, h) / 2;
      incluir(Math.floor(peca.x - raio), Math.floor(peca.y - raio), Math.ceil(peca.x + raio), Math.ceil(peca.y + raio));
    }
  }
  if (!area) return null;
  const final = area as IAreaCasas;
  return { x0: final.x0 - 1, y0: final.y0 - 1, x1: final.x1 + 1, y1: final.y1 + 1 };
}

/** As paredes em trechos retos e compridos [x1, y1, x2, y2] (em casas). A porta abre um vão;
 * janela e porta secreta continuam parede. Igual a `segmentos_de_parede` do servidor. */
export function trechosDeParede(conteudo: IConteudoProjeto): Array<{ trecho: [number, number, number, number]; material: MaterialParede }> {
  const grupos = new Map<string, number[]>();
  for (const [chave, material] of Object.entries(conteudo.paredes)) {
    if (conteudo.aberturas[chave]?.tipo === 'porta') continue;
    const { eixo, x, y } = lerAresta(chave);
    const linha = `${eixo}|${eixo === 'h' ? y : x}|${material}`;
    if (!grupos.has(linha)) grupos.set(linha, []);
    grupos.get(linha)!.push(eixo === 'h' ? x : y);
  }
  const saida: Array<{ trecho: [number, number, number, number]; material: MaterialParede }> = [];
  for (const [linha, posicoes] of grupos) {
    const [eixo, fixo, material] = linha.split('|');
    const fixa = Number(fixo);
    posicoes.sort((a, b) => a - b);
    let inicio = posicoes[0];
    let anterior = posicoes[0];
    const fechar = (fim: number) => {
      saida.push({
        trecho: eixo === 'h' ? [inicio, fixa, fim + 1, fixa] : [fixa, inicio, fixa, fim + 1],
        material: material as MaterialParede,
      });
    };
    for (const posicao of posicoes.slice(1)) {
      if (posicao === anterior + 1) {
        anterior = posicao;
        continue;
      }
      fechar(anterior);
      inicio = posicao;
      anterior = posicao;
    }
    fechar(anterior);
  }
  return saida;
}

/** Quantas casas têm chão, quantas arestas têm parede e quantas aberturas há (para o rodapé do editor). */
export function contagem(conteudo: IConteudoProjeto): { chao: number; paredes: number; portas: number; janelas: number; pecas: number } {
  let chao = 0;
  for (const linha of conteudo.chao) for (const letra of linha) if (letra !== VAZIO) chao++;
  const aberturas = Object.values(conteudo.aberturas);
  return {
    chao,
    paredes: Object.keys(conteudo.paredes).length,
    portas: aberturas.filter((a) => a.tipo !== 'janela').length,
    janelas: aberturas.filter((a) => a.tipo === 'janela').length,
    pecas: conteudo.pecas.length,
  };
}
