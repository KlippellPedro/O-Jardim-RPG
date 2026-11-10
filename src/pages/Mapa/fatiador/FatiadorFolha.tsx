// Fatiador de folhas do Mestre: uma imagem com vários objetos num fundo liso vira uma peça solta
// por objeto, já com fundo transparente, guardada no Acervo (tipo Objeto) com o tamanho em casas.
// O corte roda no PC de quem usa (corte.ts); nada da folha sai dele além das peças guardadas.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as TeclaReact, type PointerEvent as PonteiroReact } from 'react';
import { createPortal } from 'react-dom';
import { Crop, Eye, EyeOff, Loader2, Maximize2, Merge, MousePointer2, Pipette, Scissors, Split, X, ZoomIn, ZoomOut } from 'lucide-react';
import { acervoApi, LICENCAS_ACERVO, type LicencaAcervo } from '../../../services/acervoApi';
import { nomeSemExtensao, subirImagemPronta } from '../acervo/subirImagem';
import {
  corDoFundo, extrairPeca, juntarPecas, mascaraDeFrente, PIXELS_MAXIMOS, pecasDe, recortarArea, rotular, separarPeca,
  type CorFundo, type PecaCortada, type Pixels, type Retangulo,
} from './corte';
import { casasDaPeca, escalaDaMelhoria, etiquetaDaFolha, etiquetaDeCasas, nomeDaPeca, pxPorCasaDe, type EscalaMelhoria } from './escala';
import { ampliarSimples, melhorarPeca, telaDaPeca } from './melhorar';
import './fatiador.css';

interface Props {
  onFechar: () => void;
  /** Chamado depois de guardar peças, para o Acervo recarregar a lista. */
  onSalvo: () => void;
}

type Ferramenta = 'selecionar' | 'area' | 'fundo';

interface Dados {
  fonte: ImageBitmap;
  pixels: Pixels;
  frente: Uint8Array;
  rotulos: Int32Array;
}

interface Ajustes {
  cor: CorFundo;
  tolerancia: number;
  juntar: number;
  areaMinima: number;
  furos: number;
}

interface Gesto {
  modo: 'pendente' | 'pan' | 'area';
  x0: number;
  y0: number;
  vx0: number;
  vy0: number;
  soma: boolean;
  area?: Retangulo;
  inicioImg?: { x: number; y: number };
}

const AJUSTES_PADRAO = { tolerancia: 18, juntar: 1, areaMinima: 30, furos: 0 };
/** Pixels de folga em volta de cada peça guardada (a ponta suave da borda precisa de lugar). */
const MARGEM_PECA = 2;
const ENVIOS_SIMULTANEOS = 3;
/** Com mais peças que isto a lista não desenha as miniaturas (cada uma refaz a extração). */
const MINIATURAS_ATE = 220;

const nomeLimpo = (texto: string) => texto.replace(/[\\/]+/g, ' ').trim();
const corHex = (cor: CorFundo) => (cor ? `#${cor.map((v) => v.toString(16).padStart(2, '0')).join('')}` : '#000000');

/** Antes e depois da melhoria numa peça, lado a lado e no mesmo tamanho. */
const AntesDepois = ({ antes, depois }: { antes: OffscreenCanvas; depois: OffscreenCanvas }) => {
  const refAntes = useRef<HTMLCanvasElement>(null);
  const refDepois = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    // No tamanho real da peça melhorada (até 280 px), senão a comparação some na redução.
    const lado = 280;
    const escala = Math.min(1, lado / depois.width, lado / depois.height);
    const w = Math.max(1, Math.round(depois.width * escala));
    const h = Math.max(1, Math.round(depois.height * escala));
    for (const [ref, fonte] of [[refAntes, antes], [refDepois, depois]] as const) {
      const alvo = ref.current;
      if (!alvo) continue;
      alvo.width = w;
      alvo.height = h;
      const ctx = alvo.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(fonte, 0, 0, w, h);
    }
  }, [antes, depois]);
  return (
    <div className="mapa-fatiador-antes-depois">
      <figure><canvas ref={refAntes} /><figcaption>Ampliação comum</figcaption></figure>
      <figure><canvas ref={refDepois} /><figcaption>Com melhoria</figcaption></figure>
    </div>
  );
};

const Miniatura = ({ peca, dados, versao }: { peca: PecaCortada; dados: { current: Dados | null }; versao: number }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const d = dados.current;
    const alvo = ref.current;
    if (!d || !alvo) return;
    const ctx = alvo.getContext('2d')!;
    ctx.clearRect(0, 0, alvo.width, alvo.height);
    const px = extrairPeca(d.pixels, corDoFundoAtual(d), d.rotulos, peca, 0);
    const escala = Math.min(alvo.width / px.largura, alvo.height / px.altura, 3);
    const w = Math.max(1, px.largura * escala);
    const h = Math.max(1, px.altura * escala);
    ctx.imageSmoothingEnabled = escala < 1;
    ctx.drawImage(telaDaPeca(px), (alvo.width - w) / 2, (alvo.height - h) / 2, w, h);
  }, [peca, dados, versao]);
  return <canvas ref={ref} width={44} height={44} aria-hidden="true" />;
};

// A cor do fundo vale para a folha toda; fica guardada junto dos dados.
const coresDosDados = new WeakMap<Dados, CorFundo>();
const corDoFundoAtual = (d: Dados): CorFundo => coresDosDados.get(d) ?? null;

export const FatiadorFolha = ({ onFechar, onSalvo }: Props) => {
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [carregado, setCarregado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [cortando, setCortando] = useState(false);
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [pecas, setPecas] = useState<PecaCortada[]>([]);
  const [versao, setVersao] = useState(0);
  const [sel, setSel] = useState<number[]>([]);
  const [fora, setFora] = useState<Set<number>>(new Set());
  const [nomes, setNomes] = useState<Record<number, string>>({});
  const [ferramenta, setFerramenta] = useState<Ferramenta>('selecionar');
  const [previa, setPrevia] = useState(true);
  const [pxPorCasa, setPxPorCasa] = useState(100);
  const [casasCalibragem, setCasasCalibragem] = useState('');
  const [prefixo, setPrefixo] = useState('Peça');
  const [caminho, setCaminho] = useState('Fatiados');
  const [autoria, setAutoria] = useState('');
  const [origem, setOrigem] = useState('');
  const [licenca, setLicenca] = useState<LicencaAcervo | ''>('');
  const [melhoria, setMelhoria] = useState<'auto' | EscalaMelhoria>('auto');
  const [teste, setTeste] = useState<{ peca: number; antes: OffscreenCanvas; depois: OffscreenCanvas } | null>(null);
  const [testando, setTestando] = useState(false);
  const [statusModelo, setStatusModelo] = useState('');
  const [salvando, setSalvando] = useState<{ feitos: number; total: number } | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const dadosRef = useRef<Dados | null>(null);
  const previaRef = useRef<OffscreenCanvas | null>(null);
  const palcoRef = useRef<HTMLDivElement>(null);
  const telaRef = useRef<HTMLCanvasElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const vistaRef = useRef({ zoom: 1, x: 0, y: 0 });
  const gestoRef = useRef<Gesto | null>(null);
  const sobreRef = useRef(0);
  const desenhaRef = useRef<() => void>(() => undefined);

  const selSet = useMemo(() => new Set(sel), [sel]);
  const nomeDe = useCallback(
    (peca: PecaCortada, indice: number) => nomes[peca.id] ?? nomeDaPeca(prefixo, indice + 1, pecas.length),
    [nomes, prefixo, pecas.length],
  );

  // O desenho lê sempre o estado mais novo por aqui, sem refazer os ouvintes do ponteiro.
  const estadoRef = useRef({ pecas, selSet, fora, previa, ferramenta });
  estadoRef.current = { pecas, selSet, fora, previa, ferramenta };

  // ------------------------------------------------------------ desenho

  const desenhar = useCallback(() => {
    const tela = telaRef.current;
    if (!tela) return;
    const ctx = tela.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = tela.width / dpr;
    const ch = tela.height / dpr;
    ctx.fillStyle = '#17151d';
    ctx.fillRect(0, 0, cw, ch);
    const d = dadosRef.current;
    if (!d) return;
    const v = vistaRef.current;
    const e = estadoRef.current;
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.scale(v.zoom, v.zoom);
    ctx.fillStyle = '#2a2733';
    ctx.fillRect(0, 0, d.pixels.largura, d.pixels.altura);
    ctx.imageSmoothingEnabled = v.zoom < 1.5;
    ctx.drawImage(e.previa && previaRef.current ? previaRef.current : d.fonte, 0, 0);
    for (const p of e.pecas) {
      const escolhida = e.selSet.has(p.id);
      const tirada = e.fora.has(p.id);
      const sobre = sobreRef.current === p.id;
      ctx.setLineDash(tirada ? [4 / v.zoom, 3 / v.zoom] : []);
      ctx.lineWidth = (escolhida ? 2 : 1) / v.zoom;
      ctx.strokeStyle = escolhida ? '#c7a44c' : tirada ? 'rgba(239,68,68,0.75)' : sobre ? '#f1e3b0' : 'rgba(120,200,255,0.5)';
      ctx.strokeRect(p.x - 0.5, p.y - 0.5, p.largura + 1, p.altura + 1);
      if (escolhida) {
        ctx.fillStyle = 'rgba(199,164,76,0.16)';
        ctx.fillRect(p.x, p.y, p.largura, p.altura);
      }
    }
    const area = gestoRef.current?.modo === 'area' ? gestoRef.current.area : undefined;
    if (area) {
      ctx.setLineDash([5 / v.zoom, 4 / v.zoom]);
      ctx.lineWidth = 1.5 / v.zoom;
      ctx.strokeStyle = '#7dd3fc';
      ctx.strokeRect(area.x, area.y, area.largura, area.altura);
    }
    ctx.restore();
  }, []);
  desenhaRef.current = desenhar;

  const ajustarVista = useCallback(() => {
    const d = dadosRef.current;
    const palco = palcoRef.current;
    if (!d || !palco) return;
    const zoom = Math.min(palco.clientWidth / d.pixels.largura, palco.clientHeight / d.pixels.altura) * 0.96;
    vistaRef.current = {
      zoom,
      x: (palco.clientWidth - d.pixels.largura * zoom) / 2,
      y: (palco.clientHeight - d.pixels.altura * zoom) / 2,
    };
    desenhaRef.current();
  }, []);

  const aproximar = useCallback((fator: number, cx?: number, cy?: number) => {
    const palco = palcoRef.current;
    if (!palco) return;
    const v = vistaRef.current;
    const px = cx ?? palco.clientWidth / 2;
    const py = cy ?? palco.clientHeight / 2;
    const zoom = Math.min(60, Math.max(0.03, v.zoom * fator));
    const razao = zoom / v.zoom;
    vistaRef.current = { zoom, x: px - (px - v.x) * razao, y: py - (py - v.y) * razao };
    desenhaRef.current();
  }, []);

  // Tamanho da tela de desenho acompanha o palco.
  useEffect(() => {
    const palco = palcoRef.current;
    const tela = telaRef.current;
    if (!palco || !tela || !carregado) return;
    const medir = () => {
      const dpr = window.devicePixelRatio || 1;
      tela.width = Math.max(1, Math.round(palco.clientWidth * dpr));
      tela.height = Math.max(1, Math.round(palco.clientHeight * dpr));
      desenhaRef.current();
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(palco);
    return () => observador.disconnect();
  }, [carregado]);

  // A roda aproxima no ponto do cursor (precisa de ouvinte não passivo para segurar a rolagem da página).
  useEffect(() => {
    const tela = telaRef.current;
    if (!tela || !carregado) return;
    const roda = (e: WheelEvent) => {
      e.preventDefault();
      const caixa = tela.getBoundingClientRect();
      aproximar(Math.exp(-e.deltaY * 0.0015), e.clientX - caixa.left, e.clientY - caixa.top);
    };
    tela.addEventListener('wheel', roda, { passive: false });
    return () => tela.removeEventListener('wheel', roda);
  }, [carregado, aproximar]);

  // Prévia do recorte: a folha só com o que sai (o que você tirou fica esmaecido).
  useEffect(() => {
    const d = dadosRef.current;
    if (!d) return;
    const { largura: w, altura: h, dados } = d.pixels;
    const maior = d.rotulos.reduce((m, r) => (r > m ? r : m), 0);
    const tiradas = new Uint8Array(maior + 1);
    for (const id of fora) if (id <= maior) tiradas[id] = 1;
    const comAlfaProprio = corDoFundoAtual(d) === null;
    const imagem = new ImageData(w, h);
    const saida = imagem.data;
    for (let i = 0; i < w * h; i++) {
      const r = d.rotulos[i];
      if (!r) continue;
      const j = i * 4;
      saida[j] = dados[j];
      saida[j + 1] = dados[j + 1];
      saida[j + 2] = dados[j + 2];
      saida[j + 3] = tiradas[r] ? 56 : comAlfaProprio ? dados[j + 3] : 255;
    }
    const tela = previaRef.current && previaRef.current.width === w && previaRef.current.height === h ? previaRef.current : new OffscreenCanvas(w, h);
    tela.getContext('2d')!.putImageData(imagem, 0, 0);
    previaRef.current = tela;
    desenhaRef.current();
  }, [versao, fora, carregado]);

  useEffect(() => {
    desenhaRef.current();
  }, [pecas, selSet, fora, previa, ferramenta]);

  // ---------------------------------------------------------------- corte

  const refazer = useCallback((novos: Ajustes) => {
    const d = dadosRef.current;
    if (!d) return;
    setCortando(true);
    // Adia um quadro para o "Cortando..." aparecer antes do trabalho pesado.
    window.setTimeout(() => {
      const { largura: w, altura: h } = d.pixels;
      d.frente = mascaraDeFrente(d.pixels, { cor: novos.cor, tolerancia: novos.tolerancia, furos: novos.furos });
      d.rotulos = rotular(d.frente, w, h, novos.juntar, novos.areaMinima);
      coresDosDados.set(d, novos.cor);
      setPecas(pecasDe(d.rotulos, w, h));
      setSel([]);
      setFora(new Set());
      setNomes({});
      setVersao((n) => n + 1);
      setCortando(false);
    }, 16);
  }, []);

  useEffect(() => {
    if (!carregado || !ajustes) return;
    const adiar = window.setTimeout(() => refazer(ajustes), 140);
    return () => window.clearTimeout(adiar);
  }, [ajustes, carregado, refazer]);

  useEffect(() => {
    if (carregado) ajustarVista();
  }, [carregado, ajustarVista]);

  useEffect(() => () => dadosRef.current?.fonte.close(), []);

  const abrirArquivo = useCallback(async (arquivo: File | undefined | null) => {
    if (!arquivo) return;
    if (!/^image\//i.test(arquivo.type)) {
      setErro('Esse arquivo não é uma imagem.');
      return;
    }
    setErro('');
    setAviso('');
    setCarregando(true);
    try {
      const fonte = await createImageBitmap(arquivo);
      if (fonte.width * fonte.height > PIXELS_MAXIMOS) {
        fonte.close();
        throw new Error(`A folha tem ${(fonte.width * fonte.height / 1_000_000).toFixed(0)} milhões de pixels; o limite é ${PIXELS_MAXIMOS / 1_000_000}. Reduza a imagem e tente de novo.`);
      }
      const tela = new OffscreenCanvas(fonte.width, fonte.height);
      const ctx = tela.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(fonte, 0, 0);
      const imagem = ctx.getImageData(0, 0, fonte.width, fonte.height);
      const pixels: Pixels = { largura: fonte.width, altura: fonte.height, dados: imagem.data };
      dadosRef.current?.fonte.close();
      dadosRef.current = { fonte, pixels, frente: new Uint8Array(0), rotulos: new Int32Array(0) };
      const base = nomeSemExtensao(arquivo.name);
      setNomeArquivo(arquivo.name);
      setPrefixo(base);
      setCaminho(`Fatiados/${nomeLimpo(base)}`);
      setAjustes({ ...AJUSTES_PADRAO, cor: corDoFundo(pixels) });
      setCarregado(true);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para abrir a imagem.');
    } finally {
      setCarregando(false);
    }
  }, []);

  const mudar = (parte: Partial<Ajustes>) => setAjustes((atual) => (atual ? { ...atual, ...parte } : atual));

  // ------------------------------------------------------------- edição

  const atualizarPecas = useCallback(() => {
    const d = dadosRef.current;
    if (!d) return;
    setPecas(pecasDe(d.rotulos, d.pixels.largura, d.pixels.altura));
    setVersao((n) => n + 1);
  }, []);

  const juntarEscolhidas = () => {
    const d = dadosRef.current;
    if (!d || sel.length < 2) return;
    const ficou = juntarPecas(d.rotulos, sel);
    setFora((atual) => new Set([...atual].filter((id) => !sel.includes(id))));
    atualizarPecas();
    setSel([ficou]);
  };

  const separarEscolhida = () => {
    const d = dadosRef.current;
    if (!d || sel.length !== 1) return;
    const novos = separarPeca(d.rotulos, d.pixels.largura, d.pixels.altura, sel[0]);
    if (novos.length < 2) {
      setAviso('Essa peça é um corpo só: não há o que separar. Use a ferramenta Área para recortar uma parte.');
      return;
    }
    setAviso('');
    setFora((atual) => new Set([...atual].filter((id) => id !== sel[0])));
    atualizarPecas();
    setSel(novos);
  };

  const alternarTiradas = (ids = sel) => {
    if (!ids.length) return;
    setFora((atual) => {
      const todasFora = ids.every((id) => atual.has(id));
      const proximo = new Set(atual);
      for (const id of ids) {
        if (todasFora) proximo.delete(id);
        else proximo.add(id);
      }
      return proximo;
    });
  };

  const escolher = (id: number, soma: boolean) => {
    if (!id) {
      if (!soma) setSel([]);
      return;
    }
    setSel((atual) => (soma ? (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]) : [id]));
  };

  const centralizar = (peca: PecaCortada) => {
    const palco = palcoRef.current;
    if (!palco) return;
    const v = vistaRef.current;
    const x = (peca.x + peca.largura / 2) * v.zoom + v.x;
    const y = (peca.y + peca.altura / 2) * v.zoom + v.y;
    if (x > 20 && y > 20 && x < palco.clientWidth - 20 && y < palco.clientHeight - 20) return;
    vistaRef.current = { ...v, x: v.x + palco.clientWidth / 2 - x, y: v.y + palco.clientHeight / 2 - y };
    desenhaRef.current();
  };

  // ------------------------------------------------------------ ponteiro

  const pontoDaTela = (e: PonteiroReact<HTMLCanvasElement>) => {
    const caixa = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - caixa.left, y: e.clientY - caixa.top };
  };
  const paraImagem = (p: { x: number; y: number }) => {
    const v = vistaRef.current;
    return { x: (p.x - v.x) / v.zoom, y: (p.y - v.y) / v.zoom };
  };

  /** A peça sob o ponto: pelo pixel; se for um vazio da peça (alça, furo), a menor caixa que o contém. */
  const idEm = (ix: number, iy: number): number => {
    const d = dadosRef.current;
    if (!d) return 0;
    const x = Math.floor(ix);
    const y = Math.floor(iy);
    const { largura: w, altura: h } = d.pixels;
    if (x >= 0 && y >= 0 && x < w && y < h) {
      const r = d.rotulos[y * w + x];
      if (r) return r;
    }
    let melhor = 0;
    let menor = Infinity;
    for (const p of estadoRef.current.pecas) {
      if (ix >= p.x && iy >= p.y && ix <= p.x + p.largura && iy <= p.y + p.altura && p.largura * p.altura < menor) {
        menor = p.largura * p.altura;
        melhor = p.id;
      }
    }
    return melhor;
  };

  const aoApertar = (e: PonteiroReact<HTMLCanvasElement>) => {
    const p = pontoDaTela(e);
    const v = vistaRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);
    const base: Gesto = { modo: 'pendente', x0: p.x, y0: p.y, vx0: v.x, vy0: v.y, soma: e.shiftKey || e.ctrlKey || e.metaKey };
    if (e.button === 1 || e.button === 2) base.modo = 'pan';
    else if (estadoRef.current.ferramenta === 'area') {
      const i = paraImagem(p);
      base.modo = 'area';
      base.inicioImg = i;
      base.area = { x: i.x, y: i.y, largura: 0, altura: 0 };
    }
    gestoRef.current = base;
  };

  const aoMover = (e: PonteiroReact<HTMLCanvasElement>) => {
    const p = pontoDaTela(e);
    const g = gestoRef.current;
    if (!g) {
      const id = idEm(paraImagem(p).x, paraImagem(p).y);
      if (id !== sobreRef.current) {
        sobreRef.current = id;
        desenhar();
      }
      return;
    }
    if (g.modo === 'pendente' && Math.hypot(p.x - g.x0, p.y - g.y0) > 4) g.modo = 'pan';
    if (g.modo === 'pan') {
      vistaRef.current = { ...vistaRef.current, x: g.vx0 + p.x - g.x0, y: g.vy0 + p.y - g.y0 };
      desenhar();
    } else if (g.modo === 'area' && g.inicioImg) {
      const i = paraImagem(p);
      g.area = {
        x: Math.min(i.x, g.inicioImg.x),
        y: Math.min(i.y, g.inicioImg.y),
        largura: Math.abs(i.x - g.inicioImg.x),
        altura: Math.abs(i.y - g.inicioImg.y),
      };
      desenhar();
    }
  };

  const aoSoltar = (e: PonteiroReact<HTMLCanvasElement>) => {
    const g = gestoRef.current;
    gestoRef.current = null;
    const d = dadosRef.current;
    if (!g || !d) return;
    const p = pontoDaTela(e);
    if (g.modo === 'area' && g.area && g.area.largura > 2 && g.area.altura > 2) {
      const id = recortarArea(d.rotulos, d.frente, d.pixels.largura, d.pixels.altura, g.area);
      if (id) {
        atualizarPecas();
        setSel([id]);
        setAviso('');
      } else {
        setAviso('Não havia nada de frente nessa área.');
      }
      desenhar();
      return;
    }
    if (g.modo === 'pendente') {
      const i = paraImagem(p);
      if (estadoRef.current.ferramenta === 'fundo') {
        const x = Math.floor(i.x);
        const y = Math.floor(i.y);
        const { largura: w, altura: h, dados } = d.pixels;
        if (x >= 0 && y >= 0 && x < w && y < h) {
          const j = (y * w + x) * 4;
          mudar({ cor: dados[j + 3] < 24 ? null : [dados[j], dados[j + 1], dados[j + 2]] });
          setFerramenta('selecionar');
        }
        return;
      }
      escolher(idEm(i.x, i.y), g.soma);
    }
    desenhar();
  };

  const aoTeclar = (e: TeclaReact<HTMLElement>) => {
    // Os atalhos do mapa (H, N, M...) não valem enquanto o fatiador está aberto.
    e.stopPropagation();
    const alvo = e.target as HTMLElement;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(alvo.tagName)) return;
    const tecla = e.key.toLowerCase();
    if (tecla === 'delete' || tecla === 'backspace') alternarTiradas();
    else if (tecla === 'j') juntarEscolhidas();
    else if (tecla === 's') separarEscolhida();
    else if (tecla === 'a') setFerramenta('area');
    else if (tecla === 'v' || tecla === 'escape') setFerramenta('selecionar');
    else if (tecla === 'f') ajustarVista();
    else return;
    e.preventDefault();
  };

  // ------------------------------------------------------------- guardar

  const alvos = useMemo(
    () => (sel.length ? pecas.filter((p) => selSet.has(p.id)) : pecas.filter((p) => !fora.has(p.id))),
    [pecas, sel.length, selSet, fora],
  );

  const escalaMelhoria: EscalaMelhoria = melhoria === 'auto' ? escalaDaMelhoria(pxPorCasa) : melhoria;
  /** Do ampliador só interessa avisar o download e o preparo do modelo; o resto é ruído. */
  const avisoDoModelo = (texto: string) => setStatusModelo(/^(Baixando|Preparando)/.test(texto) ? texto : '');

  /** Mostra, na peça escolhida, a ampliação comum ao lado da melhorada, antes de guardar tudo. */
  const testarMelhoria = async () => {
    const d = dadosRef.current;
    const peca = sel.length === 1 ? pecas.find((p) => p.id === sel[0]) : undefined;
    if (!d || !peca || testando) return;
    setTestando(true);
    setErro('');
    try {
      const original = extrairPeca(d.pixels, corDoFundoAtual(d), d.rotulos, peca, MARGEM_PECA);
      const escala = escalaMelhoria !== 1 ? escalaMelhoria : 4;
      const melhor = await melhorarPeca(original, escala, avisoDoModelo);
      setTeste({ peca: peca.id, antes: ampliarSimples(original, melhor.largura / original.largura), depois: telaDaPeca(melhor) });
    } catch (falha) {
      setErro(`Não deu para melhorar a peça: ${falha instanceof Error ? falha.message : 'erro desconhecido'}.`);
    } finally {
      setTestando(false);
      setStatusModelo('');
    }
  };

  const guardar = async () => {
    const d = dadosRef.current;
    if (!d || !alvos.length || salvando) return;
    setErro('');
    setAviso('');
    setSalvando({ feitos: 0, total: alvos.length });
    let feitos = 0;
    let proximo = 0;
    let parou = false;
    try {
      const pasta = caminho.trim() ? await acervoApi.garantirCaminho(caminho.trim()) : null;
      const ordem = new Map(pecas.map((p, i) => [p.id, i]));
      const trabalhador = async () => {
        while (!parou && proximo < alvos.length) {
          const peca = alvos[proximo++];
          const original = extrairPeca(d.pixels, corDoFundoAtual(d), d.rotulos, peca, MARGEM_PECA);
          // O tamanho em casas vem da peça como ela é na folha, antes de ampliar.
          const casas = casasDaPeca(original.largura, pxPorCasa);
          const px = escalaMelhoria !== 1
            ? await melhorarPeca(original, escalaMelhoria, avisoDoModelo).catch((falha) => {
              throw new Error(`A melhoria de qualidade falhou (${falha instanceof Error ? falha.message : 'erro desconhecido'}). Escolha "Sem melhoria" para guardar do jeito que está.`);
            })
            : original;
          const bitmap = await createImageBitmap(telaDaPeca(px));
          try {
            const nome = nomes[peca.id] ?? nomeDaPeca(prefixo, (ordem.get(peca.id) ?? 0) + 1, pecas.length);
            const item = await subirImagemPronta(bitmap, nome, {
              tipo: 'objeto',
              pastaId: pasta?.id ?? null,
              etiquetas: ['fatiado', etiquetaDaFolha(nomeArquivo), etiquetaDeCasas(casas)],
            });
            if (autoria.trim() || origem.trim() || licenca) {
              await acervoApi.editarItem(item.id, { autoria: autoria.trim(), origem: origem.trim(), licenca });
            }
          } finally {
            bitmap.close();
          }
          feitos++;
          setSalvando({ feitos, total: alvos.length });
        }
      };
      await Promise.all(Array.from({ length: Math.min(ENVIOS_SIMULTANEOS, alvos.length) }, () => trabalhador().catch((falha) => {
        parou = true;
        throw falha;
      })));
      setAviso(`${feitos} ${feitos === 1 ? 'peça guardada' : 'peças guardadas'} no Acervo${pasta ? ` (pasta ${caminho.trim()})` : ''}. Elas aparecem em Objetos e no construtor de mapas, já com o tamanho em casas.`);
    } catch (falha) {
      setErro(`${falha instanceof Error ? falha.message : 'Não deu para guardar.'} ${feitos ? `${feitos} peças já foram guardadas antes do erro.` : ''}`.trim());
    } finally {
      setSalvando(null);
      setStatusModelo('');
      if (feitos) onSalvo();
    }
  };

  const calibrar = () => {
    const casas = Number(casasCalibragem.replace(',', '.'));
    const peca = sel.length === 1 ? pecas.find((p) => p.id === sel[0]) : undefined;
    if (!peca || !(casas > 0)) return;
    const novo = pxPorCasaDe(peca.largura + MARGEM_PECA * 2, casas);
    if (novo > 0) setPxPorCasa(novo);
  };

  // ---------------------------------------------------------------- tela

  const ocupado = carregando || cortando || Boolean(salvando);
  const unica = sel.length === 1 ? pecas.find((p) => p.id === sel[0]) : undefined;

  // Vai para a página do mapa (onde moram as cores e o empilhamento) para ocupar a tela toda, não só a gaveta do Acervo.
  const destino = document.querySelector('.mapa-pagina') ?? document.body;
  return createPortal(
    <section className="mapa-fatiador" aria-label="Fatiador de folhas" tabIndex={-1} onKeyDown={aoTeclar}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); void abrirArquivo(e.dataTransfer.files[0]); }}
      onPaste={(e) => { const arquivo = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/')); if (arquivo) void abrirArquivo(arquivo); }}
    >
      <header>
        <strong><Scissors size={16} /> Fatiador de folhas</strong>
        <span className="mapa-fatiador-arquivo">{carregado && dadosRef.current ? `${nomeArquivo} · ${dadosRef.current.pixels.largura} x ${dadosRef.current.pixels.altura} px` : ''}</span>
        {carregado && <button type="button" className="mapa-botao-leve" disabled={ocupado} onClick={() => arquivoRef.current?.click()}>Outra folha</button>}
        <button type="button" className="mapa-icone" aria-label="Fechar o fatiador" onClick={onFechar}><X size={18} /></button>
      </header>
      <input ref={arquivoRef} type="file" accept="image/*" hidden onChange={(e) => { void abrirArquivo(e.target.files?.[0]); e.target.value = ''; }} />

      {!carregado ? (
        <div className="mapa-fatiador-vazio">
          <Scissors size={34} aria-hidden="true" />
          <p>Escolha a imagem de uma folha com vários objetos num fundo liso (ou transparente). Cada objeto vira uma peça solta, com fundo transparente, pronta para o construtor de mapas.</p>
          <button type="button" className="mapa-botao" disabled={carregando} onClick={() => arquivoRef.current?.click()}>
            {carregando ? <Loader2 size={15} className="girando" /> : <Scissors size={15} />} Escolher a folha
          </button>
          <small>Também dá para soltar o arquivo aqui ou colar com Ctrl+V. O corte roda no seu computador.</small>
          {erro && <p className="mapa-erro">{erro}</p>}
        </div>
      ) : (
        <div className="mapa-fatiador-corpo">
          <div className="mapa-fatiador-palco" ref={palcoRef}>
            <canvas
              ref={telaRef}
              className={`ferramenta-${ferramenta}`}
              onPointerDown={aoApertar}
              onPointerMove={aoMover}
              onPointerUp={aoSoltar}
              onPointerCancel={() => { gestoRef.current = null; desenhar(); }}
              onPointerLeave={() => { if (!gestoRef.current && sobreRef.current) { sobreRef.current = 0; desenhar(); } }}
              onContextMenu={(e) => e.preventDefault()}
            />
            <div className="mapa-fatiador-barra" role="toolbar" aria-label="Ferramentas do fatiador">
              <button type="button" className={ferramenta === 'selecionar' ? 'ativo' : ''} title="Escolher peças (V). Clique escolhe, Shift soma outra, arrastar anda pela folha." onClick={() => setFerramenta('selecionar')}><MousePointer2 size={15} /></button>
              <button type="button" className={ferramenta === 'area' ? 'ativo' : ''} title="Área (A): arraste um retângulo e tudo que tem dentro vira uma peça só." onClick={() => setFerramenta('area')}><Crop size={15} /></button>
              <button type="button" className={ferramenta === 'fundo' ? 'ativo' : ''} title="Conta-gotas: clique no fundo da folha para dizer qual é a cor dele." onClick={() => setFerramenta('fundo')}><Pipette size={15} /></button>
              <span aria-hidden="true" />
              <button type="button" title="Aproximar" onClick={() => aproximar(1.4)}><ZoomIn size={15} /></button>
              <button type="button" title="Afastar" onClick={() => aproximar(1 / 1.4)}><ZoomOut size={15} /></button>
              <button type="button" title="Ver a folha inteira (F)" onClick={ajustarVista}><Maximize2 size={15} /></button>
              <button type="button" className={previa ? 'ativo' : ''} title="Mostra só o que sai de cada peça, sem o fundo" onClick={() => setPrevia((v) => !v)}>{previa ? <Eye size={15} /> : <EyeOff size={15} />}</button>
            </div>
            {cortando && <div className="mapa-fatiador-cortando"><Loader2 size={16} className="girando" /> Cortando...</div>}
          </div>

          <div className="mapa-fatiador-painel">
            <fieldset>
              <legend>Corte</legend>
              <label className="mapa-fatiador-linha">
                <span>Fundo</span>
                <span className="mapa-fatiador-cor">
                  <input type="color" value={corHex(ajustes?.cor ?? null)} disabled={!ajustes?.cor} aria-label="Cor do fundo" onChange={(e) => {
                    const hex = e.target.value;
                    mudar({ cor: [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)] });
                  }} />
                  <label><input type="checkbox" checked={!ajustes?.cor} onChange={(e) => mudar({ cor: e.target.checked ? null : (dadosRef.current ? corDoFundo(dadosRef.current.pixels) ?? [255, 255, 255] : [255, 255, 255]) })} /> transparente</label>
                </span>
              </label>
              <label className="mapa-fatiador-linha">
                <span>Tolerância do fundo <b>{ajustes?.tolerancia}</b></span>
                <input type="range" min={0} max={80} value={ajustes?.tolerancia ?? 0} disabled={!ajustes?.cor} onChange={(e) => mudar({ tolerancia: Number(e.target.value) })} />
              </label>
              <label className="mapa-fatiador-linha">
                <span>Juntar partes a até <b>{(ajustes?.juntar ?? 0) * 2}</b> px</span>
                <input type="range" min={0} max={12} value={ajustes?.juntar ?? 0} onChange={(e) => mudar({ juntar: Number(e.target.value) })} />
              </label>
              <label className="mapa-fatiador-linha">
                <span>Ignorar objetos com menos de (px)</span>
                <input type="number" min={1} max={100000} value={ajustes?.areaMinima ?? 1} onChange={(e) => mudar({ areaMinima: Math.max(1, Number(e.target.value) || 1) })} />
              </label>
              <label className="mapa-fatiador-linha mapa-fatiador-marcar">
                <input type="checkbox" checked={(ajustes?.furos ?? 0) > 0} disabled={!ajustes?.cor} onChange={(e) => mudar({ furos: e.target.checked ? 60 : 0 })} />
                <span>Abrir furos (alças e argolas ficam vazadas)</span>
              </label>
              <p className="mapa-dica">Mexer aqui refaz o corte e desfaz suas edições nas peças.</p>
            </fieldset>

            <fieldset>
              <legend>Peças ({pecas.length})</legend>
              <div className="mapa-fatiador-acoes">
                <button type="button" className="mapa-botao-leve" disabled={sel.length < 2} onClick={juntarEscolhidas} title="Junta as peças escolhidas numa só (J)"><Merge size={14} /> Juntar</button>
                <button type="button" className="mapa-botao-leve" disabled={sel.length !== 1} onClick={separarEscolhida} title="Desfaz a junção: cada pedaço solto vira uma peça (S)"><Split size={14} /> Separar</button>
                <button type="button" className="mapa-botao-leve" disabled={!sel.length} onClick={() => alternarTiradas()} title="Tira da lista (ou devolve) as peças escolhidas (Delete)">{sel.length && sel.every((id) => fora.has(id)) ? 'Devolver' : 'Tirar'}</button>
                <button type="button" className="mapa-botao-leve" onClick={() => setSel(pecas.map((p) => p.id))}>Todas</button>
                <button type="button" className="mapa-botao-leve" disabled={!sel.length} onClick={() => setSel([])}>Nenhuma</button>
              </div>
              {aviso && <p className="mapa-dica">{aviso}</p>}
              <ul className="mapa-fatiador-lista">
                {pecas.map((peca, indice) => {
                  const tirada = fora.has(peca.id);
                  return (
                    <li key={peca.id} className={`${selSet.has(peca.id) ? 'escolhida' : ''} ${tirada ? 'tirada' : ''}`}
                      onClick={() => { setSel([peca.id]); centralizar(peca); }}>
                      <input type="checkbox" checked={!tirada} aria-label={`Guardar ${nomeDe(peca, indice)}`} onClick={(e) => e.stopPropagation()} onChange={() => alternarTiradas([peca.id])} />
                      {pecas.length <= MINIATURAS_ATE ? <Miniatura peca={peca} dados={dadosRef} versao={versao} /> : <span className="mapa-fatiador-sem-mini" />}
                      <div>
                        <input value={nomeDe(peca, indice)} maxLength={120} aria-label={`Nome da peça ${indice + 1}`} onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setNomes((atual) => ({ ...atual, [peca.id]: e.target.value }))} />
                        <small>{peca.largura} x {peca.altura} px · {casasDaPeca(peca.largura + MARGEM_PECA * 2, pxPorCasa)} casas</small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </fieldset>

            <fieldset>
              <legend>Tamanho na grade</legend>
              <label className="mapa-fatiador-linha">
                <span>Pixels da folha por casa</span>
                <input type="number" min={1} max={4000} step={1} value={pxPorCasa} onChange={(e) => setPxPorCasa(Math.max(1, Number(e.target.value) || 1))} />
              </label>
              <div className="mapa-fatiador-calibrar">
                <input value={casasCalibragem} inputMode="decimal" placeholder="casas" aria-label="Quantas casas a peça escolhida mede" disabled={!unica} onChange={(e) => setCasasCalibragem(e.target.value)} />
                <button type="button" className="mapa-botao-leve" disabled={!unica || !(Number(casasCalibragem.replace(',', '.')) > 0)} onClick={calibrar}>Calibrar</button>
              </div>
              <p className="mapa-dica">Não sabe quantos pixels formam uma casa? Escolha uma peça de tamanho conhecido (uma cama de 1 x 2 casas, por exemplo), digite quantas casas ela mede de largura e calibre. As outras peças acompanham.</p>
            </fieldset>

            <fieldset disabled={Boolean(salvando)}>
              <legend>Qualidade</legend>
              <label className="mapa-fatiador-linha">
                <span>Melhorar a imagem das peças</span>
                <select value={String(melhoria)} onChange={(e) => setMelhoria(e.target.value === 'auto' ? 'auto' : (Number(e.target.value) as EscalaMelhoria))}>
                  <option value="auto">Automática ({escalaDaMelhoria(pxPorCasa) > 1 ? `${escalaDaMelhoria(pxPorCasa)}x` : 'sem melhoria'})</option>
                  <option value="1">Sem melhoria</option>
                  <option value="2">2x</option>
                  <option value="4">4x</option>
                </select>
              </label>
              <p className="mapa-dica">
                {escalaMelhoria > 1
                  ? `Cada peça é ampliada ${escalaMelhoria}x por uma inteligência artificial que roda no seu computador (o modelo, de 5 MB, é baixado uma vez só). A folha tem ${pxPorCasa} px por casa e as peças passam a ter ${Math.round(pxPorCasa * escalaMelhoria)}; no mapa, de 140 a 280 fica nítido. O tamanho em casas não muda.`
                  : `Sem melhoria, as peças ficam com o tamanho original da folha (${pxPorCasa} px por casa). Em folha de baixa resolução, elas aparecem borradas no mapa.`}
              </p>
              <button type="button" className="mapa-botao-leve" disabled={!unica || testando || Boolean(salvando)} onClick={() => void testarMelhoria()}>
                {testando ? <><Loader2 size={14} className="girando" /> Melhorando...</> : 'Ver a melhoria na peça escolhida'}
              </button>
              {statusModelo && <p className="mapa-dica">{statusModelo}</p>}
              {teste && unica && teste.peca === unica.id && <AntesDepois antes={teste.antes} depois={teste.depois} />}
            </fieldset>

            <fieldset disabled={Boolean(salvando)}>
              <legend>Guardar no Acervo</legend>
              <label className="mapa-fatiador-linha">
                <span>Pasta</span>
                <input value={caminho} maxLength={200} placeholder="Fora de pasta" onChange={(e) => setCaminho(e.target.value)} />
              </label>
              <label className="mapa-fatiador-linha">
                <span>Nome das peças</span>
                <input value={prefixo} maxLength={80} onChange={(e) => setPrefixo(e.target.value)} />
              </label>
              <label className="mapa-fatiador-linha">
                <span>Autoria</span>
                <input value={autoria} maxLength={120} placeholder="Quem fez a arte" onChange={(e) => setAutoria(e.target.value)} />
              </label>
              <label className="mapa-fatiador-linha">
                <span>Origem</span>
                <input value={origem} maxLength={300} placeholder="Nome do pacote ou endereço" onChange={(e) => setOrigem(e.target.value)} />
              </label>
              <label className="mapa-fatiador-linha">
                <span>Licença</span>
                <select value={licenca} onChange={(e) => setLicenca(e.target.value as LicencaAcervo | '')}>
                  <option value="">Não anotada</option>
                  {LICENCAS_ACERVO.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              </label>
              <p className="mapa-dica">{LICENCAS_ACERVO.find((l) => l.id === licenca)?.dica ?? 'Confira a licença do pacote. Muitos permitem usar na sua mesa e proíbem redistribuir; por isso as peças ficam só no seu Acervo.'}</p>
              {erro && <p className="mapa-erro">{erro}</p>}
              {salvando && statusModelo && <p className="mapa-dica">{statusModelo}</p>}
              <button type="button" className="mapa-botao destaque" disabled={!alvos.length || ocupado} onClick={() => void guardar()}>
                {salvando ? <><Loader2 size={15} className="girando" /> {escalaMelhoria > 1 ? 'Melhorando e guardando' : 'Guardando'} {salvando.feitos} de {salvando.total}</> : sel.length ? `Guardar ${alvos.length} ${alvos.length === 1 ? 'escolhida' : 'escolhidas'}` : `Guardar ${alvos.length} ${alvos.length === 1 ? 'peça' : 'peças'}`}
              </button>
            </fieldset>
          </div>
        </div>
      )}
    </section>,
    destino,
  );
};
