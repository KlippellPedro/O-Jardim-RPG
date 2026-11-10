// Fatiador de folhas: acha cada objeto de uma imagem com fundo liso (ou transparente) e o separa.
// Tudo aqui é puro (sem DOM), para dar para testar. A tela fica em FatiadorFolha.tsx.
//
// O caminho: cor do fundo -> máscara do que é frente (fundo ligado à borda sai) -> rótulo por
// objeto (partes próximas se juntam) -> lista de peças. Juntar, separar e recortar uma área mexem
// só no mapa de rótulos; `extrairPeca` monta o PNG de uma peça, sem o halo do fundo nas bordas.

export interface Pixels {
  largura: number;
  altura: number;
  /** RGBA, 4 bytes por pixel. */
  dados: Uint8ClampedArray;
}

/** Cor do fundo (RGB), ou null quando a folha já tem fundo transparente. */
export type CorFundo = [number, number, number] | null;

export interface AjusteFundo {
  cor: CorFundo;
  /** Diferença máxima por canal (0 a 255) para um pixel ainda contar como fundo. */
  tolerancia: number;
  /** Fundo "de dentro" (furo de argola, alça) com pelo menos esta área some também; 0 deixa como está. */
  furos: number;
}

export interface PecaCortada {
  id: number;
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** Pixels de frente que a peça tem. */
  area: number;
}

export interface Retangulo {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/** Abaixo disto de alfa o pixel já conta como vazio. */
const ALFA_VAZIO = 24;
/** Folhas maiores que isto não cabem folgadas na memória do navegador. */
export const PIXELS_MAXIMOS = 48_000_000;

// ------------------------------------------------------------------ fundo

/** A cor que mais aparece na borda da imagem; null se a borda é transparente. */
export function corDoFundo(img: Pixels): CorFundo {
  const { largura: w, altura: h, dados: d } = img;
  const grupos = new Map<number, { n: number; r: number; g: number; b: number }>();
  let total = 0;
  let vazios = 0;
  const ver = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    total++;
    if (d[i + 3] < ALFA_VAZIO) {
      vazios++;
      return;
    }
    const chave = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    const grupo = grupos.get(chave) ?? { n: 0, r: 0, g: 0, b: 0 };
    grupo.n++;
    grupo.r += d[i];
    grupo.g += d[i + 1];
    grupo.b += d[i + 2];
    grupos.set(chave, grupo);
  };
  for (let x = 0; x < w; x++) {
    ver(x, 0);
    if (h > 1) ver(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    ver(0, y);
    if (w > 1) ver(w - 1, y);
  }
  if (vazios > total * 0.5) return null;
  let melhor: { n: number; r: number; g: number; b: number } | null = null;
  for (const grupo of grupos.values()) if (!melhor || grupo.n > melhor.n) melhor = grupo;
  if (!melhor) return null;
  return [Math.round(melhor.r / melhor.n), Math.round(melhor.g / melhor.n), Math.round(melhor.b / melhor.n)];
}

/** 1 onde há frente. Fundo é o que se parece com a cor do fundo E se liga à borda da imagem. */
export function mascaraDeFrente(img: Pixels, fundo: AjusteFundo): Uint8Array {
  const { largura: w, altura: h, dados: d } = img;
  const n = w * h;
  const parecido = new Uint8Array(n);
  const [fr, fg, fb] = fundo.cor ?? [0, 0, 0];
  const tol = fundo.tolerancia;
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    if (d[j + 3] < ALFA_VAZIO) parecido[i] = 1;
    else if (fundo.cor && Math.abs(d[j] - fr) <= tol && Math.abs(d[j + 1] - fg) <= tol && Math.abs(d[j + 2] - fb) <= tol) parecido[i] = 1;
  }

  const ligado = new Uint8Array(n);
  const pilha = new Int32Array(n);
  let topo = 0;
  const empurrar = (i: number) => {
    if (parecido[i] && !ligado[i]) {
      ligado[i] = 1;
      pilha[topo++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    empurrar(x);
    empurrar((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    empurrar(y * w);
    empurrar(y * w + w - 1);
  }
  while (topo) {
    const i = pilha[--topo];
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) empurrar(i - 1);
    if (x < w - 1) empurrar(i + 1);
    if (y > 0) empurrar(i - w);
    if (y < h - 1) empurrar(i + w);
  }

  if (fundo.furos > 0) {
    // Bolsões do cor do fundo cercados por frente: os grandes viram furo de verdade.
    const lista = new Int32Array(n);
    const visto = new Uint8Array(n);
    for (let ini = 0; ini < n; ini++) {
      if (!parecido[ini] || ligado[ini] || visto[ini]) continue;
      let tam = 0;
      let t = 0;
      pilha[t++] = ini;
      visto[ini] = 1;
      while (t) {
        const i = pilha[--t];
        lista[tam++] = i;
        const x = i % w;
        const y = (i - x) / w;
        const viz = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
        for (const j of viz) {
          if (j >= 0 && parecido[j] && !ligado[j] && !visto[j]) {
            visto[j] = 1;
            pilha[t++] = j;
          }
        }
      }
      if (tam >= fundo.furos) for (let k = 0; k < tam; k++) ligado[lista[k]] = 1;
    }
  }

  const frente = new Uint8Array(n);
  for (let i = 0; i < n; i++) frente[i] = ligado[i] ? 0 : 1;
  return frente;
}

// ---------------------------------------------------------------- rótulos

/** Engorda a máscara em `raio` pixels (quadrado), em duas passadas com soma acumulada. */
export function dilatar(mascara: Uint8Array, w: number, h: number, raio: number): Uint8Array {
  if (raio <= 0) return mascara;
  const meio = new Uint8Array(w * h);
  const saida = new Uint8Array(w * h);
  const soma = new Int32Array(Math.max(w, h) + 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) soma[x + 1] = soma[x] + mascara[y * w + x];
    for (let x = 0; x < w; x++) {
      meio[y * w + x] = soma[Math.min(w, x + raio + 1)] - soma[Math.max(0, x - raio)] > 0 ? 1 : 0;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) soma[y + 1] = soma[y] + meio[y * w + x];
    for (let y = 0; y < h; y++) {
      saida[y * w + x] = soma[Math.min(h, y + raio + 1)] - soma[Math.max(0, y - raio)] > 0 ? 1 : 0;
    }
  }
  return saida;
}

/**
 * Um rótulo (1, 2, 3...) por objeto; 0 é o que não é de ninguém. Partes a até `2 * juntar` pixels
 * de distância ficam no mesmo objeto (a franja do tapete, o pino da cama). Objeto com menos de
 * `areaMinima` pixels é poeira e fica sem rótulo.
 */
export function rotular(frente: Uint8Array, w: number, h: number, juntar: number, areaMinima: number): Int32Array {
  const n = w * h;
  const base = dilatar(frente, w, h, juntar);
  const comp = new Int32Array(n);
  const pilha = new Int32Array(n);
  let total = 0;
  for (let ini = 0; ini < n; ini++) {
    if (!base[ini] || comp[ini]) continue;
    total++;
    let topo = 0;
    pilha[topo++] = ini;
    comp[ini] = total;
    while (topo) {
      const i = pilha[--topo];
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if ((!dx && !dy) || nx < 0 || nx >= w) continue;
          const j = ny * w + nx;
          if (base[j] && !comp[j]) {
            comp[j] = total;
            pilha[topo++] = j;
          }
        }
      }
    }
  }
  const area = new Int32Array(total + 1);
  for (let i = 0; i < n; i++) if (frente[i]) area[comp[i]]++;
  const rotulos = new Int32Array(n);
  for (let i = 0; i < n; i++) rotulos[i] = frente[i] && area[comp[i]] >= areaMinima ? comp[i] : 0;
  return rotulos;
}

function maiorRotulo(rotulos: Int32Array): number {
  let maior = 0;
  for (let i = 0; i < rotulos.length; i++) if (rotulos[i] > maior) maior = rotulos[i];
  return maior;
}

/** As peças do mapa de rótulos, na ordem de leitura (de cima para baixo, da esquerda para a direita). */
export function pecasDe(rotulos: Int32Array, w: number, h: number): PecaCortada[] {
  const maior = maiorRotulo(rotulos);
  if (!maior) return [];
  const x0 = new Int32Array(maior + 1).fill(w);
  const y0 = new Int32Array(maior + 1).fill(h);
  const x1 = new Int32Array(maior + 1).fill(-1);
  const y1 = new Int32Array(maior + 1).fill(-1);
  const area = new Int32Array(maior + 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = rotulos[y * w + x];
      if (!r) continue;
      if (x < x0[r]) x0[r] = x;
      if (x > x1[r]) x1[r] = x;
      if (y < y0[r]) y0[r] = y;
      if (y > y1[r]) y1[r] = y;
      area[r]++;
    }
  }
  const pecas: PecaCortada[] = [];
  for (let id = 1; id <= maior; id++) {
    if (!area[id]) continue;
    pecas.push({ id, x: x0[id], y: y0[id], largura: x1[id] - x0[id] + 1, altura: y1[id] - y0[id] + 1, area: area[id] });
  }
  return ordemDeLeitura(pecas);
}

export function ordemDeLeitura(pecas: PecaCortada[]): PecaCortada[] {
  if (pecas.length < 2) return [...pecas];
  const alturas = pecas.map((p) => p.altura).sort((a, b) => a - b);
  const faixa = Math.max(12, alturas[Math.floor(alturas.length / 2)] * 0.6);
  return [...pecas].sort((a, b) => {
    const fa = Math.round((a.y + a.altura / 2) / faixa);
    const fb = Math.round((b.y + b.altura / 2) / faixa);
    return fa - fb || a.x - b.x || a.y - b.y;
  });
}

// ----------------------------------------------------------- edição manual

/** Junta várias peças numa só (a primeira da lista fica com o rótulo). Devolve o rótulo que ficou. */
export function juntarPecas(rotulos: Int32Array, ids: number[]): number {
  const [primeiro, ...resto] = ids;
  if (!resto.length) return primeiro;
  const outros = new Set(resto);
  for (let i = 0; i < rotulos.length; i++) if (outros.has(rotulos[i])) rotulos[i] = primeiro;
  return primeiro;
}

/** Desfaz a junção: cada pedaço solto da peça vira uma peça própria. Devolve os rótulos novos. */
export function separarPeca(rotulos: Int32Array, w: number, h: number, id: number): number[] {
  const n = w * h;
  const meus = new Uint8Array(n);
  let qtd = 0;
  for (let i = 0; i < n; i++) {
    if (rotulos[i] === id) {
      meus[i] = 1;
      qtd++;
    }
  }
  if (!qtd) return [];
  let proximo = maiorRotulo(rotulos);
  const novos: number[] = [];
  const pilha = new Int32Array(qtd);
  const marcado = new Uint8Array(n);
  for (let ini = 0; ini < n; ini++) {
    if (!meus[ini] || marcado[ini]) continue;
    proximo++;
    novos.push(proximo);
    let topo = 0;
    pilha[topo++] = ini;
    marcado[ini] = 1;
    while (topo) {
      const i = pilha[--topo];
      rotulos[i] = proximo;
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if ((!dx && !dy) || nx < 0 || nx >= w) continue;
          const j = ny * w + nx;
          if (meus[j] && !marcado[j]) {
            marcado[j] = 1;
            pilha[topo++] = j;
          }
        }
      }
    }
  }
  if (novos.length === 1) {
    // Era um corpo só: devolve o rótulo de antes.
    for (let i = 0; i < n; i++) if (rotulos[i] === novos[0]) rotulos[i] = id;
    return [id];
  }
  return novos;
}

/** Tudo que é frente dentro do retângulo vira uma peça só (tirando dos vizinhos). 0 se não havia frente. */
export function recortarArea(rotulos: Int32Array, frente: Uint8Array, w: number, h: number, area: Retangulo): number {
  const xa = Math.max(0, Math.floor(area.x));
  const ya = Math.max(0, Math.floor(area.y));
  const xb = Math.min(w, Math.ceil(area.x + area.largura));
  const yb = Math.min(h, Math.ceil(area.y + area.altura));
  const id = maiorRotulo(rotulos) + 1;
  let achou = 0;
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const i = y * w + x;
      if (frente[i]) {
        rotulos[i] = id;
        achou++;
      }
    }
  }
  return achou ? id : 0;
}

// -------------------------------------------------------------- extração

/**
 * O PNG de uma peça: só os pixels dela, com a borda suave e a cor da borda tirada de dentro da peça
 * (o branco do fundo, misturado nos pixels de contorno, não vira halo claro em volta).
 */
export function extrairPeca(img: Pixels, fundo: CorFundo, rotulos: Int32Array, peca: PecaCortada, margem = 1): Pixels {
  const { largura: w, altura: h, dados: d } = img;
  const xa = Math.max(0, peca.x - margem);
  const ya = Math.max(0, peca.y - margem);
  const xb = Math.min(w, peca.x + peca.largura + margem);
  const yb = Math.min(h, peca.y + peca.altura + margem);
  const lw = xb - xa;
  const lh = yb - ya;
  const ln = lw * lh;
  const meu = new Uint8Array(ln);
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) meu[y * lw + x] = rotulos[(ya + y) * w + xa + x] === peca.id ? 1 : 0;
  }
  const saida = new Uint8ClampedArray(ln * 4);

  if (fundo === null) {
    // Folha que já vem com transparência: só separa os pixels da peça.
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const i = y * lw + x;
        if (!meu[i]) continue;
        const s = ((ya + y) * w + xa + x) * 4;
        saida[i * 4] = d[s];
        saida[i * 4 + 1] = d[s + 1];
        saida[i * 4 + 2] = d[s + 2];
        saida[i * 4 + 3] = d[s + 3];
      }
    }
    return { largura: lw, altura: lh, dados: saida };
  }

  // Miolo: pixel da peça cujos quatro vizinhos também são. A cor do contorno vem dele.
  const conhecido = new Uint8Array(ln);
  const cor = new Uint8ClampedArray(ln * 3);
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      const i = y * lw + x;
      if (!meu[i]) continue;
      const dentro = x > 0 && x < lw - 1 && y > 0 && y < lh - 1 && meu[i - 1] && meu[i + 1] && meu[i - lw] && meu[i + lw];
      if (!dentro) continue;
      const s = ((ya + y) * w + xa + x) * 4;
      cor[i * 3] = d[s];
      cor[i * 3 + 1] = d[s + 1];
      cor[i * 3 + 2] = d[s + 2];
      conhecido[i] = 1;
    }
  }
  const perto = (i: number): boolean => {
    const x = i % lw;
    const y = (i - x) / lw;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < lw && ny >= 0 && ny < lh && meu[ny * lw + nx]) return true;
      }
    }
    return false;
  };
  for (let passada = 0; passada < 2; passada++) {
    const novos: Array<[number, number, number, number]> = [];
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const i = y * lw + x;
        if (conhecido[i] || !(meu[i] || perto(i))) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let q = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= lw || ny < 0 || ny >= lh) continue;
            const j = ny * lw + nx;
            if (!conhecido[j]) continue;
            r += cor[j * 3];
            g += cor[j * 3 + 1];
            b += cor[j * 3 + 2];
            q++;
          }
        }
        if (q) novos.push([i, Math.round(r / q), Math.round(g / q), Math.round(b / q)]);
      }
    }
    for (const [i, r, g, b] of novos) {
      cor[i * 3] = r;
      cor[i * 3 + 1] = g;
      cor[i * 3 + 2] = b;
      conhecido[i] = 1;
    }
  }

  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      const i = y * lw + x;
      // Opacidade: média da peça na vizinhança 3x3, um pouco reforçada (contorno firme, ponta macia).
      let soma = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < lw && ny >= 0 && ny < lh) soma += meu[ny * lw + nx];
        }
      }
      if (!soma) continue;
      const alfa = meu[i] ? Math.min(1, (soma / 9) * 1.5 + 0.2) : Math.min(1, (soma / 9) * 1.2);
      const s = ((ya + y) * w + xa + x) * 4;
      saida[i * 4] = conhecido[i] ? cor[i * 3] : d[s];
      saida[i * 4 + 1] = conhecido[i] ? cor[i * 3 + 1] : d[s + 1];
      saida[i * 4 + 2] = conhecido[i] ? cor[i * 3 + 2] : d[s + 2];
      saida[i * 4 + 3] = Math.round(alfa * 255);
    }
  }
  return { largura: lw, altura: lh, dados: saida };
}

// ------------------------------------------------------------ melhoria

/**
 * Uma cópia opaca da peça para o ampliador: a cor da borda é esticada para dentro do que era
 * transparente (o ampliador só vê RGB; com preto ali, a borda ganharia um contorno escuro). O que
 * sobrar longe demais da peça leva a cor média dela.
 */
export function preencherCor(img: Pixels, camadas = 16): Pixels {
  const { largura: w, altura: h, dados: d } = img;
  const n = w * h;
  const saida = new Uint8ClampedArray(n * 4);
  const conhecido = new Uint8Array(n);
  let somaR = 0;
  let somaG = 0;
  let somaB = 0;
  let qtd = 0;
  let ultimos: number[] = [];
  for (let i = 0; i < n; i++) {
    saida[i * 4 + 3] = 255;
    if (d[i * 4 + 3] === 0) continue;
    conhecido[i] = 1;
    saida[i * 4] = d[i * 4];
    saida[i * 4 + 1] = d[i * 4 + 1];
    saida[i * 4 + 2] = d[i * 4 + 2];
    somaR += d[i * 4];
    somaG += d[i * 4 + 1];
    somaB += d[i * 4 + 2];
    qtd++;
    ultimos.push(i);
  }
  const medio: [number, number, number] = qtd ? [Math.round(somaR / qtd), Math.round(somaG / qtd), Math.round(somaB / qtd)] : [128, 128, 128];
  const marca = new Uint8Array(n);
  for (let camada = 0; camada < camadas && ultimos.length; camada++) {
    const candidatos: number[] = [];
    for (const i of ultimos) {
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const j = ny * w + nx;
          if (!conhecido[j] && !marca[j]) {
            marca[j] = 1;
            candidatos.push(j);
          }
        }
      }
    }
    for (const j of candidatos) {
      const x = j % w;
      const y = (j - x) / w;
      let r = 0;
      let g = 0;
      let b = 0;
      let q = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const k = ny * w + nx;
          if (!conhecido[k]) continue;
          r += saida[k * 4];
          g += saida[k * 4 + 1];
          b += saida[k * 4 + 2];
          q++;
        }
      }
      saida[j * 4] = Math.round(r / q);
      saida[j * 4 + 1] = Math.round(g / q);
      saida[j * 4 + 2] = Math.round(b / q);
    }
    for (const j of candidatos) conhecido[j] = 1;
    ultimos = candidatos;
  }
  for (let i = 0; i < n; i++) {
    if (conhecido[i]) continue;
    saida[i * 4] = medio[0];
    saida[i * 4 + 1] = medio[1];
    saida[i * 4 + 2] = medio[2];
  }
  return { largura: w, altura: h, dados: saida };
}

/**
 * A opacidade ampliada sai com uma rampa larga na borda (a ampliação suaviza). Esta curva (de 10% a
 * 90%) devolve o contorno firme sem serrilhar: 0 e 255 ficam onde estão.
 */
export function afinarAlfa(valor: number): number {
  const t = Math.min(1, Math.max(0, (valor / 255 - 0.1) / 0.8));
  return Math.round(t * t * (3 - 2 * t) * 255);
}
