// Névoa de guerra na tela. As formas, em ordem, são pintadas numa máscara do
// tamanho do mapa (reduzida até 2048 px): tudo coberto, "revelar" apaga e
// "esconder" cobre de novo. A máscara só é refeita quando a névoa muda.
//
// Quem desenha a névoa é um shader nosso (WebGPU e WebGL), a cada quadro: a
// fumaça se move devagar, a borda treme e esfiapa, e revelar ou esconder
// dissolve a névoa em vez de trocar de uma vez (duas máscaras, a anterior e a
// nova). A memória explorada fica escura, e a área fora dela recebe cobertura
// opaca. O segredo não depende desta camada: o servidor só libera os ladrilhos
// autorizados para aquela pessoa (plataforma/core/nevoa.py e routers/acervo.py).

import {
  BlurFilter, Container, Graphics, Mesh, MeshGeometry, RenderTexture, Shader, Texture, UniformGroup, type Renderer,
} from 'pixi.js';
import type { IFormaNevoa, INevoa } from '../../../services/mapaApi';
import { obterRuido } from './ruido';

const LADO_MAXIMO = 2048;
/** Cor do fundo e dos fiapos da névoa, em RGB de 0 a 1. */
const CORES = {
  jogador: { fundo: [0.027, 0.024, 0.043], fiapo: [0.13, 0.125, 0.17] },
  mestre: { fundo: [0.1, 0.082, 0.19], fiapo: [0.22, 0.2, 0.34] },
};
const ALFA_MESTRE = 0.6;
/** O fundo passa da borda do mapa: o desfoque não deixa a beirada clara. */
const SOBRA = 256;
const TRANSICAO_MS = 750;
const TRANSICAO_REDUZIDA_MS = 150;

/** Desenha a forma preenchida. O pincel é uma linha grossa de pontas redondas. */
export function desenharForma(g: Graphics, forma: IFormaNevoa, cor: number | string, alpha = 1) {
  if (forma.tipo === 'retangulo') {
    g.rect(forma.x, forma.y, forma.w, forma.h).fill({ color: cor, alpha });
  } else if (forma.tipo === 'poligono') {
    g.poly(forma.pontos.flat(), true).fill({ color: cor, alpha });
  } else if (forma.pontos.length === 1) {
    g.circle(forma.pontos[0][0], forma.pontos[0][1], forma.raio).fill({ color: cor, alpha });
  } else {
    g.moveTo(forma.pontos[0][0], forma.pontos[0][1]);
    for (const [x, y] of forma.pontos.slice(1)) g.lineTo(x, y);
    g.stroke({ width: forma.raio * 2, color: cor, alpha, cap: 'round', join: 'round' });
  }
}

// ---------------------------------------------------------------- shader
// O mesmo desenho em GLSL (WebGL) e WGSL (WebGPU). `uParametros`: tempo em
// segundos, progresso da transição (0 a 1), alfa máximo e tamanho da casa.
// Um ruído miúdo (`fino`) só mexe na borda: de perto ela continua esfiapada.
// O ruído é uma textura que emenda nas bordas: amostrar é bem mais barato que
// calcular ruído a cada pixel, e a névoa cobre a tela inteira (motor/ruido.ts).

const VERTICE_GL = `#version 300 es
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}`;

const FRAGMENTO_GL = `#version 300 es
precision highp float;
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uMascara;
uniform sampler2D uMascaraAnterior;
uniform sampler2D uRuido;
uniform vec4 uParametros;
uniform vec4 uTamanho;
uniform vec4 uCor;
uniform vec4 uCorFiapo;
void main() {
  float t = uParametros.x;
  float casa = uParametros.w;
  vec2 p = vUV * uTamanho.xy / (casa * 8.0);
  vec2 torcao = texture(uRuido, p * 0.5 + t * vec2(0.010, 0.006)).rg - 0.5;
  float fumaca = texture(uRuido, p + torcao * 0.6 + t * vec2(-0.008, 0.011)).b * 0.65
    + texture(uRuido, p * 2.3 - torcao * 0.4 + t * vec2(0.019, -0.012)).b * 0.35;
  vec2 tremor = (texture(uRuido, p * 1.7 + t * vec2(0.03, 0.021)).rg - 0.5) * casa * 1.4 / uTamanho.xy;
  float atual = texture(uMascara, vUV + tremor).a;
  float anterior = texture(uMascaraAnterior, vUV + tremor).a;
  float passo = smoothstep(fumaca - 0.2, fumaca + 0.2, uParametros.y * 1.4 - 0.2);
  float cobertura = mix(anterior, atual, passo);
  float borda = cobertura * (1.0 - cobertura) * 4.0;
  float fino = texture(uRuido, p * 5.0 + t * vec2(0.045, -0.03)).g * 0.6
    + texture(uRuido, p * 17.0 + t * vec2(-0.07, 0.05)).r * 0.4;
  cobertura = clamp(cobertura + ((fumaca - 0.5) * 0.9 + (fino - 0.5) * 0.6) * borda, 0.0, 1.0);
  vec3 cor = mix(uCor.rgb, uCorFiapo.rgb, clamp(smoothstep(0.45, 0.85, fumaca) * 0.6 + borda * 0.35, 0.0, 1.0));
  float alfa = cobertura * uParametros.z;
  finalColor = vec4(cor * alfa, alfa);
}`;

const SHADER_WGSL = `
struct GlobalUniforms {
  uProjectionMatrix: mat3x3<f32>,
  uWorldTransformMatrix: mat3x3<f32>,
  uWorldColorAlpha: vec4<f32>,
  uResolution: vec2<f32>,
}
struct LocalUniforms {
  uTransformMatrix: mat3x3<f32>,
  uColor: vec4<f32>,
  uRound: f32,
}
struct NevoaUniforms {
  uParametros: vec4<f32>,
  uTamanho: vec4<f32>,
  uCor: vec4<f32>,
  uCorFiapo: vec4<f32>,
}
@group(0) @binding(0) var<uniform> globalUniforms: GlobalUniforms;
@group(1) @binding(0) var<uniform> localUniforms: LocalUniforms;
@group(2) @binding(0) var<uniform> nevoaUniforms: NevoaUniforms;
@group(2) @binding(1) var uMascara: texture_2d<f32>;
@group(2) @binding(2) var uMascaraAmostra: sampler;
@group(2) @binding(3) var uMascaraAnterior: texture_2d<f32>;
@group(2) @binding(4) var uRuido: texture_2d<f32>;
@group(2) @binding(5) var uRuidoAmostra: sampler;

struct Saida {
  @builtin(position) posicao: vec4<f32>,
  @location(0) vUV: vec2<f32>,
}

@vertex
fn principalVertice(@location(0) aPosition: vec2<f32>, @location(1) aUV: vec2<f32>) -> Saida {
  let mvp = globalUniforms.uProjectionMatrix * globalUniforms.uWorldTransformMatrix * localUniforms.uTransformMatrix;
  var saida: Saida;
  saida.posicao = vec4<f32>((mvp * vec3<f32>(aPosition, 1.0)).xy, 0.0, 1.0);
  saida.vUV = aUV;
  return saida;
}

@fragment
fn principalFragmento(@location(0) vUV: vec2<f32>) -> @location(0) vec4<f32> {
  let u = nevoaUniforms;
  let t = u.uParametros.x;
  let casa = u.uParametros.w;
  let p = vUV * u.uTamanho.xy / (casa * 8.0);
  let torcao = textureSample(uRuido, uRuidoAmostra, p * 0.5 + t * vec2<f32>(0.010, 0.006)).rg - vec2<f32>(0.5);
  let fumaca = textureSample(uRuido, uRuidoAmostra, p + torcao * 0.6 + t * vec2<f32>(-0.008, 0.011)).b * 0.65
    + textureSample(uRuido, uRuidoAmostra, p * 2.3 - torcao * 0.4 + t * vec2<f32>(0.019, -0.012)).b * 0.35;
  let tremor = (textureSample(uRuido, uRuidoAmostra, p * 1.7 + t * vec2<f32>(0.03, 0.021)).rg - vec2<f32>(0.5)) * casa * 1.4 / u.uTamanho.xy;
  let atual = textureSample(uMascara, uMascaraAmostra, vUV + tremor).a;
  let anterior = textureSample(uMascaraAnterior, uMascaraAmostra, vUV + tremor).a;
  let passo = smoothstep(fumaca - 0.2, fumaca + 0.2, u.uParametros.y * 1.4 - 0.2);
  var cobertura = mix(anterior, atual, passo);
  let borda = cobertura * (1.0 - cobertura) * 4.0;
  let fino = textureSample(uRuido, uRuidoAmostra, p * 5.0 + t * vec2<f32>(0.045, -0.03)).g * 0.6
    + textureSample(uRuido, uRuidoAmostra, p * 17.0 + t * vec2<f32>(-0.07, 0.05)).r * 0.4;
  cobertura = clamp(cobertura + ((fumaca - 0.5) * 0.9 + (fino - 0.5) * 0.6) * borda, 0.0, 1.0);
  let cor = mix(u.uCor.rgb, u.uCorFiapo.rgb, clamp(smoothstep(0.45, 0.85, fumaca) * 0.6 + borda * 0.35, 0.0, 1.0));
  let alfa = cobertura * u.uParametros.z;
  return vec4<f32>(cor * alfa, alfa);
}
`;

function movimentoReduzido(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export class CamadaNevoa {
  readonly raiz = new Container();
  private malha: Mesh<MeshGeometry, Shader>;
  private shader: Shader;
  private uniformes: UniformGroup<{
    uParametros: { value: Float32Array; type: 'vec4<f32>' };
    uTamanho: { value: Float32Array; type: 'vec4<f32>' };
    uCor: { value: Float32Array; type: 'vec4<f32>' };
    uCorFiapo: { value: Float32Array; type: 'vec4<f32>' };
  }>;
  /** Duas máscaras que se revezam: a que está na tela e a que chega. */
  private mascaras: RenderTexture[] = [];
  private atual = 0;
  private renderer: Renderer;
  private formas: IFormaNevoa[] = [];
  private chave = '';
  private largura = 1;
  private altura = 1;
  private gestor = false;
  private origem: INevoa | null = null;
  private alfaVisao = 1;
  private desfoque = new BlurFilter({ strength: 4, quality: 3 });
  private inicioTransicao = -1e9;
  private apagando = false;
  private reduzido = movimentoReduzido();
  private relogio = 0;
  private ultimoQuadro = 0;
  /** O que o servidor diz: a névoa está ligada nesta cena. */
  ligada = false;

  constructor(renderer: Renderer, private readonly memoria = false) {
    this.renderer = renderer;
    const textoRuido = obterRuido();
    this.uniformes = new UniformGroup({
      uParametros: { value: new Float32Array([0, 1, 1, 100]), type: 'vec4<f32>' },
      uTamanho: { value: new Float32Array([1, 1, 0, 0]), type: 'vec4<f32>' },
      uCor: { value: new Float32Array([...CORES.jogador.fundo, 1]), type: 'vec4<f32>' },
      uCorFiapo: { value: new Float32Array([...CORES.jogador.fiapo, 1]), type: 'vec4<f32>' },
    });
    this.shader = Shader.from({
      gl: { vertex: VERTICE_GL, fragment: FRAGMENTO_GL, name: 'nevoa-viva', preferredFragmentPrecision: 'highp' },
      gpu: {
        vertex: { entryPoint: 'principalVertice', source: SHADER_WGSL },
        fragment: { entryPoint: 'principalFragmento', source: SHADER_WGSL },
        name: 'nevoa-viva',
      },
      resources: {
        nevoaUniforms: this.uniformes,
        uMascara: Texture.EMPTY.source,
        uMascaraAmostra: Texture.EMPTY.source.style,
        uMascaraAnterior: Texture.EMPTY.source,
        uRuido: textoRuido.source,
        uRuidoAmostra: textoRuido.source.style,
      },
    });
    const geometria = new MeshGeometry({
      positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });
    this.malha = new Mesh({ geometry: geometria, shader: this.shader });
    this.raiz.addChild(this.malha);
    this.raiz.visible = false;
    this.raiz.eventMode = 'none';
  }

  definir(nevoa: INevoa | null, largura: number, altura: number, gestor: boolean, tamanhoCasa: number) {
    // A página manda a cena de novo a cada token solto: só repinta se a névoa mudou.
    if (nevoa === this.origem && largura === this.largura && altura === this.altura && gestor === this.gestor) {
      this.uniformes.uniforms.uParametros[3] = Math.max(10, tamanhoCasa);
      return;
    }
    const primeiraVez = this.origem === null;
    this.origem = nevoa;
    const ligada = this.memoria ? Boolean(nevoa?.personalizada) : Boolean(nevoa?.ligada);
    const formas = this.memoria ? (nevoa?.exploradas ?? []) : (nevoa?.formas ?? []);
    const chave = JSON.stringify(formas);
    const mesmoMapa = largura === this.largura && altura === this.altura;
    const mudouPapel = gestor !== this.gestor;
    this.largura = Math.max(1, largura);
    this.altura = Math.max(1, altura);
    this.gestor = gestor;
    this.alfaVisao = !gestor && !this.memoria && nevoa?.personalizada ? 0.48 : 1;
    this.uniformes.uniforms.uParametros[3] = Math.max(10, tamanhoCasa);
    this.aplicarPapel();
    const estavaLigada = this.ligada;
    this.ligada = ligada;
    if (!ligada) {
      // Desligar some com a névoa aos poucos, em vez de num piscar.
      if (estavaLigada && mesmoMapa && this.mascaras.length) {
        this.formas = [];
        this.chave = '';
        this.trocarMascara(null);
        this.apagando = true;
      } else {
        this.raiz.visible = false;
      }
      return;
    }
    // O eco do servidor de uma forma que o Mestre acabou de soltar não recomeça a transição.
    if (estavaLigada && chave === this.chave && mesmoMapa && !mudouPapel) return;
    this.formas = formas;
    this.chave = chave;
    this.apagando = false;
    this.raiz.visible = true;
    // Ligar a névoa, ou mudar o que está revelado, dissolve; abrir a página ou trocar de mapa já aparece pronto.
    const animar = mesmoMapa && !primeiraVez && !mudouPapel;
    if (animar && !estavaLigada) this.trocarMascara(null, false);
    this.trocarMascara(formas, animar);
  }

  /** O Mestre soltou uma forma: ela aparece na hora, antes da resposta do servidor. */
  acrescentar(forma: IFormaNevoa) {
    if (!this.ligada) return;
    this.formas = [...this.formas, forma];
    this.chave = JSON.stringify(this.formas);
    this.trocarMascara(this.formas);
  }

  /** Chamado a cada quadro pelo palco: o tempo da fumaça e o andamento da transição. */
  quadro(agora: number) {
    if (!this.raiz.visible) {
      this.ultimoQuadro = agora;
      return;
    }
    const dt = Math.min(0.1, Math.max(0, (agora - (this.ultimoQuadro || agora)) / 1000));
    this.ultimoQuadro = agora;
    // Quem pede menos movimento vê a névoa parada; a transição continua, curta.
    if (!this.reduzido) this.relogio += dt;
    const duracao = this.reduzido ? TRANSICAO_REDUZIDA_MS : TRANSICAO_MS;
    const progresso = Math.min(1, (agora - this.inicioTransicao) / duracao);
    const parametros = this.uniformes.uniforms.uParametros;
    parametros[0] = this.relogio % 10000;
    parametros[1] = progresso;
    this.uniformes.update();
    if (this.apagando && progresso >= 1) {
      this.apagando = false;
      this.raiz.visible = false;
    }
  }

  private aplicarPapel() {
    const cores = this.gestor ? CORES.mestre : CORES.jogador;
    this.uniformes.uniforms.uCor.set([...cores.fundo, 1]);
    this.uniformes.uniforms.uCorFiapo.set([...cores.fiapo, 1]);
    this.uniformes.uniforms.uParametros[2] = this.gestor ? ALFA_MESTRE : this.alfaVisao;
    this.uniformes.uniforms.uTamanho.set([this.largura, this.altura, 0, 0]);
    this.malha.scale.set(this.largura, this.altura);
  }

  /** Pinta as formas na máscara livre e, com `animar`, dissolve da máscara da tela para ela. `null` pinta o mapa limpo. */
  private trocarMascara(formas: IFormaNevoa[] | null, animar = true) {
    const escala = Math.min(1, LADO_MAXIMO / Math.max(this.largura, this.altura));
    const w = Math.max(1, Math.ceil(this.largura * escala));
    const h = Math.max(1, Math.ceil(this.altura * escala));
    // As máscaras mudam de tamanho em vez de ser trocadas: destruir uma textura que o último
    // quadro desenhou deixa o Pixi reclamando no console.
    while (this.mascaras.length < 2) this.mascaras.push(RenderTexture.create({ width: w, height: h, resolution: 1 }));
    for (const mascara of this.mascaras) if (mascara.width !== w || mascara.height !== h) mascara.source.resize(w, h);
    const destino = animar ? 1 - this.atual : this.atual;
    const desenho = new Container();
    if (formas) {
      const conteudo = new Container();
      conteudo.scale.set(escala);
      desenho.addChild(conteudo);
      conteudo.addChild(new Graphics().rect(-SOBRA, -SOBRA, this.largura + SOBRA * 2, this.altura + SOBRA * 2).fill(0xffffff));
      const retangulosRevelados = formas.length > 0 && formas.every(
        (forma) => forma.op === 'revelar' && forma.tipo === 'retangulo',
      );
      if (retangulosRevelados) {
        // A visão individual gera retângulos por linhas da grade. Um único
        // Graphics evita milhares de objetos Pixi em mapas cheios de paredes.
        const g = new Graphics();
        for (const forma of formas) if (forma.tipo === 'retangulo') g.rect(forma.x, forma.y, forma.w, forma.h);
        g.fill(0xffffff);
        g.blendMode = 'erase';
        conteudo.addChild(g);
      } else {
        for (const forma of formas) {
          const g = new Graphics();
          desenharForma(g, forma, 0xffffff);
          // Revelar apaga a cobertura; esconder pinta por cima de novo.
          if (forma.op === 'revelar') g.blendMode = 'erase';
          conteudo.addChild(g);
        }
      }
      conteudo.filters = [this.desfoque];
    }
    this.renderer.render({ container: desenho, target: this.mascaras[destino], clear: true });
    for (const filho of desenho.children) filho.filters = [];
    desenho.destroy({ children: true });
    const anterior = this.atual;
    this.atual = destino;
    this.shader.resources.uMascara = this.mascaras[destino].source;
    this.shader.resources.uMascaraAmostra = this.mascaras[destino].source.style;
    this.shader.resources.uMascaraAnterior = this.mascaras[animar ? anterior : destino].source;
    this.inicioTransicao = animar ? performance.now() : -1e9;
  }

  /** Chamado depois de desmontar o renderizador. */
  destruir() {
    for (const mascara of this.mascaras) mascara.destroy(true);
    this.mascaras = [];
    this.desfoque.destroy();
    this.shader.destroy();
  }
}
