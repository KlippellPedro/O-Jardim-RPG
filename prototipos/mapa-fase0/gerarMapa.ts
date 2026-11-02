// Mapa de teste da fase 0: um mosaico das ilustrações de fundo que o site já
// tem, cortado em ladrilhos do mesmo jeito que o acervo vai cortar os mapas.
// Nada daqui vai para o site; serve só para medir o motor no PC de verdade.

export interface Ladrilho {
  x: number;
  y: number;
  largura: number;
  altura: number;
  imagem: ImageBitmap;
}

export interface MapaGerado {
  lado: number;
  ladrilhos: Ladrilho[];
  ms: number;
}

const FUNDOS = [
  'anao_fantasy_bg',
  'bruxa_fantasy_bg',
  'alquimista_class_fantasy_bg',
  'atirador_class_fantasy_bg',
  'animalia_fantasy_bg',
  'amalgamo_fantasy_bg',
].map((nome) => `/assets/img/${nome}.webp`);

const IMAGENS_TOKEN = [
  '/assets/img/entidades/dama-solitaria.png',
  ...['chamas', 'colosso', 'comunicacao', 'dragao', 'espaco'].map((nome) => `/assets/img/frutos/fruto-${nome}.webp`),
];

async function carregar(url: string): Promise<ImageBitmap> {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`não carregou ${url}`);
  return createImageBitmap(await resposta.blob());
}

let mapaEmCurso: Promise<MapaGerado> | null = null;

/** Gera uma vez só por página: o StrictMode monta o componente duas vezes. */
export function gerarMapa(lado = 8000, ladrilho = 1024): Promise<MapaGerado> {
  mapaEmCurso ??= montarMapa(lado, ladrilho);
  return mapaEmCurso;
}

async function montarMapa(lado: number, ladrilho: number): Promise<MapaGerado> {
  const inicio = performance.now();
  const fundos = await Promise.all(FUNDOS.map(carregar));
  const colunas = 3;
  const linhas = 5;
  const largura = Math.ceil(lado / colunas);
  const altura = Math.ceil(lado / linhas);
  const pecas: Array<{ x: number; y: number; imagem: ImageBitmap }> = [];
  for (let l = 0; l < linhas; l++) {
    for (let c = 0; c < colunas; c++) {
      pecas.push({ x: c * largura, y: l * altura, imagem: fundos[(l * colunas + c) % fundos.length] });
    }
  }

  const ladrilhos: Ladrilho[] = [];
  for (let y = 0; y < lado; y += ladrilho) {
    for (let x = 0; x < lado; x += ladrilho) {
      const w = Math.min(ladrilho, lado - x);
      const h = Math.min(ladrilho, lado - y);
      const tela = new OffscreenCanvas(w, h);
      const ctx = tela.getContext('2d')!;
      for (const peca of pecas) {
        if (peca.x >= x + w || peca.x + largura <= x || peca.y >= y + h || peca.y + altura <= y) continue;
        ctx.drawImage(peca.imagem, peca.x - x, peca.y - y, largura, altura);
      }
      ladrilhos.push({ x, y, largura: w, altura: h, imagem: tela.transferToImageBitmap() });
    }
  }
  return { lado, ladrilhos, ms: performance.now() - inicio };
}

let tokensEmCurso: Promise<ImageBitmap[]> | null = null;

/** Retratos redondos já "assados", como a Oficina vai entregar: sem máscara no motor. */
export function gerarRetratos(lado = 256): Promise<ImageBitmap[]> {
  tokensEmCurso ??= Promise.all(
    IMAGENS_TOKEN.map(async (url) => {
      const imagem = await carregar(url);
      const tela = new OffscreenCanvas(lado, lado);
      const ctx = tela.getContext('2d')!;
      ctx.fillStyle = '#1b1b24';
      ctx.beginPath();
      ctx.arc(lado / 2, lado / 2, lado / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.clip();
      const escala = lado / Math.min(imagem.width, imagem.height);
      const w = imagem.width * escala;
      const h = imagem.height * escala;
      ctx.drawImage(imagem, (lado - w) / 2, (lado - h) / 2, w, h);
      return tela.transferToImageBitmap();
    }),
  );
  return tokensEmCurso;
}
