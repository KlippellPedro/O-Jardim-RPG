// Os shaders do clima, escritos por nós em GLSL (WebGL) e WGSL (WebGPU), o
// mesmo desenho nos dois.
//
// `Atmosfera` é um retângulo em cima do pedaço do mapa que está na tela, com
// três partes que cada efeito liga ou desliga pelos uniformes:
// - chuva em três camadas de profundidade (a de trás menor, mais fraca e mais
//   lenta) e respingos que abrem no chão, só com o zoom de perto;
// - sombras de nuvens que andam com o vento, e o clarão do relâmpago passando
//   mais forte onde as nuvens abrem;
// - um véu de ruído que ondula: neblina, poeira de areia (esticada na direção do
//   vento), o Véu do Vazio (que pulsa) e o brilho de um Fluxo (que soma luz).
//
// `FiltroCalor` faz o mapa tremer como ar quente, subindo devagar. É um filtro
// na camada do mapa e da grade: os tokens continuam firmes.

import { Filter, Mesh, MeshGeometry, Shader, UniformGroup, type Rectangle } from 'pixi.js';
import { obterRuido } from './ruido';

// ------------------------------------------------------------- atmosfera

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

// uParam: tempo, (livre), zoom, tamanho da casa. uVento: direção x e y (unitária), força, clarão.
// uVista: o pedaço do mapa coberto (x, y, largura, altura). uChuva: densidade, velocidade,
// comprimento, respingos. uNuvem: cobertura, sombra, escala em casas, escurecer.
// uVeu: alfa, escala em casas, velocidade, listras. uVeuForma: começo e fim da borda (quanto
// maior a distância, mais macio), torção e um fundo leve por baixo. uCorVeu.a: 0 normal, 1 soma luz, 2 pulsa.
const ATMOSFERA_GL = `#version 300 es
precision highp float;
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uRuido;
uniform vec4 uParam;
uniform vec4 uVento;
uniform vec4 uVista;
uniform vec4 uChuva;
uniform vec4 uNuvem;
uniform vec4 uVeu;
uniform vec4 uVeuForma;
uniform vec4 uCorVeu;
uniform vec4 uCorChuva;

vec3 sorteio(vec2 c) {
  return fract(sin(vec3(dot(c, vec2(127.1, 311.7)), dot(c, vec2(269.5, 183.3)), dot(c, vec2(419.2, 371.9)))) * 43758.5453);
}

vec4 sobre(vec4 cima, vec4 baixo) {
  return cima + baixo * (1.0 - cima.a);
}

void main() {
  float t = uParam.x;
  float zoom = uParam.z;
  float casa = uParam.w;
  vec2 mundo = uVista.xy + vUV * uVista.zw;
  vec2 dir = uVento.xy;
  vec4 cor = vec4(0.0);
  float nuvem = 0.5;

  if (uNuvem.x > 0.0 || uNuvem.w > 0.0) {
    vec2 nc = mundo / (casa * uNuvem.z) - dir * (0.2 + uVento.z) * t * 0.012;
    nuvem = texture(uRuido, nc).b * 0.6 + texture(uRuido, nc * 2.3 + vec2(1.7, 4.1)).r * 0.4;
    float sombra = smoothstep(0.62 - uNuvem.x * 0.3, 0.86 - uNuvem.x * 0.2, nuvem) * uNuvem.y + uNuvem.w;
    cor = sobre(vec4(0.0, 0.0, 0.0, clamp(sombra, 0.0, 0.85)), cor);
  }

  if (uVeu.x > 0.0) {
    vec2 p0 = mundo / (casa * uVeu.y);
    float avanco = t * uVeu.z * (0.35 + uVento.z);
    vec2 lateral = vec2(-dir.y, dir.x);
    vec2 livre = p0 - dir * avanco;
    vec2 alinhado = vec2((dot(p0, dir) - avanco) * 0.25, dot(p0, lateral) * 2.0);
    vec2 p = mix(livre, alinhado, uVeu.w);
    vec2 torcao = (texture(uRuido, p * 0.5 + vec2(t * 0.011, -t * 0.007)).rg - 0.5) * uVeuForma.z;
    float n = texture(uRuido, p + torcao).b * 0.65 + texture(uRuido, p * 2.1 - torcao * 0.6 + vec2(0.0, t * 0.012)).g * 0.35;
    float a = (uVeuForma.w + smoothstep(uVeuForma.x, uVeuForma.y, n) * (1.0 - uVeuForma.w)) * uVeu.x;
    if (uCorVeu.a > 1.5) a *= 0.72 + 0.28 * sin(t * 0.8 + n * 9.0);
    vec3 c = uCorVeu.rgb * (0.85 + 0.3 * n);
    if (uCorVeu.a > 0.5 && uCorVeu.a < 1.5) {
      cor = vec4(cor.rgb + c * a, cor.a);
    } else {
      cor = sobre(vec4(c * a, a), cor);
    }
  }

  if (uChuva.x > 0.0) {
    float pixel = 1.0 / sqrt(zoom);
    vec2 base = mundo * sqrt(zoom);
    vec2 queda = normalize(vec2(dir.x * uVento.z * 0.7, 1.0));
    vec2 lado = vec2(queda.y, -queda.x);
    float chuva = 0.0;
    for (int i = 0; i < 3; i++) {
      float k = 1.0 + float(i) * 0.6;
      vec2 q = vec2(dot(base, lado), dot(base, queda)) * k + vec2(float(i) * 37.0, float(i) * 91.0);
      q.y -= t * uChuva.y;
      vec2 tamanho = vec2(22.0, 150.0);
      vec2 cel = floor(q / tamanho);
      vec2 local = q - cel * tamanho;
      vec3 h = sorteio(cel + float(i) * 17.0);
      float comprimento = (0.3 + 0.3 * h.z) * tamanho.y * uChuva.z;
      float x0 = (0.15 + 0.7 * h.x) * tamanho.x;
      float y0 = comprimento + h.y * (tamanho.y - comprimento);
      float largura = pixel * k;
      float linha = 1.0 - smoothstep(0.6 * largura, 1.6 * largura, abs(local.x - x0));
      float dy = y0 - local.y;
      float rabo = step(0.0, dy) * step(dy, comprimento) * (1.0 - dy / comprimento);
      float existe = step(fract(h.x * 13.37 + h.y * 7.11), uChuva.x);
      chuva = max(chuva, linha * rabo * existe * (1.0 - float(i) * 0.32));
    }
    vec2 s = mundo / (casa * 0.45);
    vec2 cs = floor(s);
    vec2 fs = fract(s) - 0.5;
    vec3 hs = sorteio(cs + 71.0);
    float fase = fract(t * 1.4 + hs.x);
    vec2 centro = (hs.yz - 0.5) * 0.6;
    float anel = 1.0 - smoothstep(0.0, 0.04, abs(length(fs - centro) - fase * 0.32));
    float respingo = anel * (1.0 - fase) * step(fract(hs.x * 91.7), uChuva.w) * smoothstep(0.25, 0.7, zoom);
    float a = clamp(chuva * 0.55 + respingo * 0.3, 0.0, 1.0);
    cor = sobre(vec4(uCorChuva.rgb * a, a), cor);
  }

  if (uVento.w > 0.0) {
    cor = vec4(cor.rgb + vec3(0.78, 0.85, 1.0) * uVento.w * (0.5 + 0.9 * (1.0 - nuvem)), cor.a);
  }
  finalColor = cor;
}`;

const ATMOSFERA_WGSL = `
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
struct ClimaUniforms {
  uParam: vec4<f32>,
  uVento: vec4<f32>,
  uVista: vec4<f32>,
  uChuva: vec4<f32>,
  uNuvem: vec4<f32>,
  uVeu: vec4<f32>,
  uVeuForma: vec4<f32>,
  uCorVeu: vec4<f32>,
  uCorChuva: vec4<f32>,
}
@group(0) @binding(0) var<uniform> globalUniforms: GlobalUniforms;
@group(1) @binding(0) var<uniform> localUniforms: LocalUniforms;
@group(2) @binding(0) var<uniform> climaUniforms: ClimaUniforms;
@group(2) @binding(1) var uRuido: texture_2d<f32>;
@group(2) @binding(2) var uRuidoAmostra: sampler;

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

fn sorteio(c: vec2<f32>) -> vec3<f32> {
  return fract(sin(vec3<f32>(dot(c, vec2<f32>(127.1, 311.7)), dot(c, vec2<f32>(269.5, 183.3)), dot(c, vec2<f32>(419.2, 371.9)))) * 43758.5453);
}

fn sobre(cima: vec4<f32>, baixo: vec4<f32>) -> vec4<f32> {
  return cima + baixo * (1.0 - cima.a);
}

@fragment
fn principalFragmento(@location(0) vUV: vec2<f32>) -> @location(0) vec4<f32> {
  let u = climaUniforms;
  let t = u.uParam.x;
  let zoom = u.uParam.z;
  let casa = u.uParam.w;
  let mundo = u.uVista.xy + vUV * u.uVista.zw;
  let dir = u.uVento.xy;
  var cor = vec4<f32>(0.0);
  var nuvem = 0.5;

  if (u.uNuvem.x > 0.0 || u.uNuvem.w > 0.0) {
    let nc = mundo / (casa * u.uNuvem.z) - dir * (0.2 + u.uVento.z) * t * 0.012;
    nuvem = textureSample(uRuido, uRuidoAmostra, nc).b * 0.6 + textureSample(uRuido, uRuidoAmostra, nc * 2.3 + vec2<f32>(1.7, 4.1)).r * 0.4;
    let sombra = smoothstep(0.62 - u.uNuvem.x * 0.3, 0.86 - u.uNuvem.x * 0.2, nuvem) * u.uNuvem.y + u.uNuvem.w;
    cor = sobre(vec4<f32>(0.0, 0.0, 0.0, clamp(sombra, 0.0, 0.85)), cor);
  }

  if (u.uVeu.x > 0.0) {
    let p0 = mundo / (casa * u.uVeu.y);
    let avanco = t * u.uVeu.z * (0.35 + u.uVento.z);
    let lateral = vec2<f32>(-dir.y, dir.x);
    let livre = p0 - dir * avanco;
    let alinhado = vec2<f32>((dot(p0, dir) - avanco) * 0.25, dot(p0, lateral) * 2.0);
    let p = mix(livre, alinhado, u.uVeu.w);
    let torcao = (textureSample(uRuido, uRuidoAmostra, p * 0.5 + vec2<f32>(t * 0.011, -t * 0.007)).rg - vec2<f32>(0.5)) * u.uVeuForma.z;
    let n = textureSample(uRuido, uRuidoAmostra, p + torcao).b * 0.65
      + textureSample(uRuido, uRuidoAmostra, p * 2.1 - torcao * 0.6 + vec2<f32>(0.0, t * 0.012)).g * 0.35;
    var a = (u.uVeuForma.w + smoothstep(u.uVeuForma.x, u.uVeuForma.y, n) * (1.0 - u.uVeuForma.w)) * u.uVeu.x;
    if (u.uCorVeu.a > 1.5) {
      a = a * (0.72 + 0.28 * sin(t * 0.8 + n * 9.0));
    }
    let c = u.uCorVeu.rgb * (0.85 + 0.3 * n);
    if (u.uCorVeu.a > 0.5 && u.uCorVeu.a < 1.5) {
      cor = vec4<f32>(cor.rgb + c * a, cor.a);
    } else {
      cor = sobre(vec4<f32>(c * a, a), cor);
    }
  }

  if (u.uChuva.x > 0.0) {
    let pixel = 1.0 / sqrt(zoom);
    let base = mundo * sqrt(zoom);
    let queda = normalize(vec2<f32>(dir.x * u.uVento.z * 0.7, 1.0));
    let lado = vec2<f32>(queda.y, -queda.x);
    var chuva = 0.0;
    for (var i = 0; i < 3; i = i + 1) {
      let fi = f32(i);
      let k = 1.0 + fi * 0.6;
      var q = vec2<f32>(dot(base, lado), dot(base, queda)) * k + vec2<f32>(fi * 37.0, fi * 91.0);
      q.y = q.y - t * u.uChuva.y;
      let tamanho = vec2<f32>(22.0, 150.0);
      let cel = floor(q / tamanho);
      let local = q - cel * tamanho;
      let h = sorteio(cel + fi * 17.0);
      let comprimento = (0.3 + 0.3 * h.z) * tamanho.y * u.uChuva.z;
      let x0 = (0.15 + 0.7 * h.x) * tamanho.x;
      let y0 = comprimento + h.y * (tamanho.y - comprimento);
      let largura = pixel * k;
      let linha = 1.0 - smoothstep(0.6 * largura, 1.6 * largura, abs(local.x - x0));
      let dy = y0 - local.y;
      let rabo = step(0.0, dy) * step(dy, comprimento) * (1.0 - dy / comprimento);
      let existe = step(fract(h.x * 13.37 + h.y * 7.11), u.uChuva.x);
      chuva = max(chuva, linha * rabo * existe * (1.0 - fi * 0.32));
    }
    let s = mundo / (casa * 0.45);
    let cs = floor(s);
    let fs = fract(s) - vec2<f32>(0.5);
    let hs = sorteio(cs + vec2<f32>(71.0));
    let fase = fract(t * 1.4 + hs.x);
    let centro = (hs.yz - vec2<f32>(0.5)) * 0.6;
    let anel = 1.0 - smoothstep(0.0, 0.04, abs(length(fs - centro) - fase * 0.32));
    let respingo = anel * (1.0 - fase) * step(fract(hs.x * 91.7), u.uChuva.w) * smoothstep(0.25, 0.7, zoom);
    let a = clamp(chuva * 0.55 + respingo * 0.3, 0.0, 1.0);
    cor = sobre(vec4<f32>(u.uCorChuva.rgb * a, a), cor);
  }

  if (u.uVento.w > 0.0) {
    cor = vec4<f32>(cor.rgb + vec3<f32>(0.78, 0.85, 1.0) * u.uVento.w * (0.5 + 0.9 * (1.0 - nuvem)), cor.a);
  }
  return cor;
}
`;

type Vec4 = { value: Float32Array; type: 'vec4<f32>' };
const vec4 = (a = 0, b = 0, c = 0, d = 0): Vec4 => ({ value: new Float32Array([a, b, c, d]), type: 'vec4<f32>' });

export interface ReceitaAtmosfera {
  chuva?: { densidade: number; velocidade: number; comprimento: number; respingos: number; cor: [number, number, number] };
  nuvem?: { cobertura: number; sombra: number; escala: number; escurecer: number };
  /** modo: 0 cobre, 1 soma luz, 2 cobre pulsando. borda: onde o véu começa e termina no ruído (mais
   * distante, mais macio); torcao: quanto o desenho se retorce; fundo: véu leve por baixo de tudo. */
  veu?: {
    alfa: number; escala: number; velocidade: number; listras: number; cor: [number, number, number]; modo: 0 | 1 | 2;
    borda: [number, number]; torcao: number; fundo: number;
  };
}

export class Atmosfera {
  readonly malha: Mesh<MeshGeometry, Shader>;
  private shader: Shader;
  private uniformes: UniformGroup<Record<'uParam' | 'uVento' | 'uVista' | 'uChuva' | 'uNuvem' | 'uVeu' | 'uVeuForma' | 'uCorVeu' | 'uCorChuva', Vec4>>;

  constructor() {
    const ruido = obterRuido();
    this.uniformes = new UniformGroup({
      uParam: vec4(0, 0, 1, 100),
      uVento: vec4(0, 1, 0, 0),
      uVista: vec4(0, 0, 1, 1),
      uChuva: vec4(),
      uNuvem: vec4(0, 0, 30, 0),
      uVeu: vec4(0, 14, 0, 0),
      uVeuForma: vec4(0.32, 0.78, 0.8, 0),
      uCorVeu: vec4(1, 1, 1, 0),
      uCorChuva: vec4(0.75, 0.82, 0.9, 1),
    });
    this.shader = Shader.from({
      gl: { vertex: VERTICE_GL, fragment: ATMOSFERA_GL, name: 'clima-atmosfera', preferredFragmentPrecision: 'highp' },
      gpu: {
        vertex: { entryPoint: 'principalVertice', source: ATMOSFERA_WGSL },
        fragment: { entryPoint: 'principalFragmento', source: ATMOSFERA_WGSL },
        name: 'clima-atmosfera',
      },
      resources: { climaUniforms: this.uniformes, uRuido: ruido.source, uRuidoAmostra: ruido.source.style },
    });
    const geometria = new MeshGeometry({
      positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });
    this.malha = new Mesh({ geometry: geometria, shader: this.shader });
    this.malha.eventMode = 'none';
  }

  definir(receita: ReceitaAtmosfera) {
    const u = this.uniformes.uniforms;
    const { chuva, nuvem, veu } = receita;
    u.uChuva.set(chuva ? [chuva.densidade, chuva.velocidade, chuva.comprimento, chuva.respingos] : [0, 0, 0, 0]);
    if (chuva) u.uCorChuva.set([...chuva.cor, 1]);
    u.uNuvem.set(nuvem ? [nuvem.cobertura, nuvem.sombra, nuvem.escala, nuvem.escurecer] : [0, 0, 30, 0]);
    u.uVeu.set(veu ? [veu.alfa, veu.escala, veu.velocidade, veu.listras] : [0, 14, 0, 0]);
    if (veu) {
      u.uCorVeu.set([...veu.cor, veu.modo]);
      u.uVeuForma.set([veu.borda[0], veu.borda[1], veu.torcao, veu.fundo]);
    }
    this.uniformes.update();
  }

  /** `vento`: direção unitária (x, y) e força; sem vento, a direção vale para baixo. */
  atualizar(vista: Rectangle, tempo: number, zoom: number, casa: number, vento: { x: number; y: number; forca: number }, clarao: number) {
    const u = this.uniformes.uniforms;
    const comprimento = Math.hypot(vento.x, vento.y);
    const dx = comprimento > 1e-4 ? vento.x / comprimento : 0;
    const dy = comprimento > 1e-4 ? vento.y / comprimento : 1;
    u.uParam.set([tempo % 10000, 0, zoom, Math.max(10, casa)]);
    u.uVento.set([dx, dy, vento.forca, clarao]);
    u.uVista.set([vista.x, vista.y, vista.width, vista.height]);
    this.uniformes.update();
    this.malha.position.set(vista.x, vista.y);
    this.malha.scale.set(vista.width, vista.height);
  }

  destruir() {
    this.malha.destroy();
    this.shader.destroy();
  }
}

// ----------------------------------------------------------------- calor

// O vértice padrão dos filtros do Pixi (o mesmo de pixi.js, MIT).
const VERTICE_FILTRO_GL = `#version 300 es
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
void main() {
  vec2 posicao = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  posicao.x = posicao.x * (2.0 / uOutputTexture.x) - 1.0;
  posicao.y = posicao.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  gl_Position = vec4(posicao, 0.0, 1.0);
  vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
}`;

// uCalor: tempo, intensidade, tamanho da casa. uTela: onde o mapa está na tela (x, y) e o zoom.
// uArea: x, y, largura, altura em px do mapa; largura negativa vale o mapa inteiro.
const CALOR_GL = `#version 300 es
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uRuido;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uInputClamp;
uniform vec4 uCalor;
uniform vec4 uTela;
uniform vec4 uArea;
void main() {
  vec2 tela = vTextureCoord * uInputSize.xy + uOutputFrame.xy;
  vec2 mundo = (tela - uTela.xy) / uTela.z;
  float dentro = 1.0;
  if (uArea.z > 0.0) {
    float borda = min(uArea.z, uArea.w) * 0.2;
    vec2 entrada = smoothstep(uArea.xy, uArea.xy + borda, mundo);
    vec2 saida = 1.0 - smoothstep(uArea.xy + uArea.zw - borda, uArea.xy + uArea.zw, mundo);
    dentro = entrada.x * entrada.y * saida.x * saida.y;
  }
  float t = uCalor.x;
  vec2 q = mundo / (uCalor.z * 2.5);
  vec2 onda = texture(uRuido, q + vec2(0.0, t * 0.35)).rg - 0.5;
  vec2 fina = texture(uRuido, q * 2.7 + vec2(t * 0.05, t * 0.8)).gb - 0.5;
  vec2 desvio = (onda * 0.65 + fina * 0.35) * uCalor.z * 0.09 * uCalor.y * dentro;
  vec2 uv = vTextureCoord + desvio * uTela.z / uInputSize.xy;
  finalColor = texture(uTexture, clamp(uv, uInputClamp.xy, uInputClamp.zw));
}`;

const CALOR_WGSL = `
struct GlobalFilterUniforms {
  uInputSize: vec4<f32>,
  uInputPixel: vec4<f32>,
  uInputClamp: vec4<f32>,
  uOutputFrame: vec4<f32>,
  uGlobalFrame: vec4<f32>,
  uOutputTexture: vec4<f32>,
}
struct CalorUniforms {
  uCalor: vec4<f32>,
  uTela: vec4<f32>,
  uArea: vec4<f32>,
}
@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> calorUniforms: CalorUniforms;
@group(1) @binding(1) var uRuido: texture_2d<f32>;
@group(1) @binding(2) var uRuidoAmostra: sampler;

struct Saida {
  @builtin(position) posicao: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn principalVertice(@location(0) aPosition: vec2<f32>) -> Saida {
  var posicao = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;
  posicao.x = posicao.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
  posicao.y = posicao.y * (2.0 * gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;
  return Saida(vec4<f32>(posicao, 0.0, 1.0), aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw));
}

@fragment
fn principalFragmento(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let u = calorUniforms;
  let tela = uv * gfu.uInputSize.xy + gfu.uOutputFrame.xy;
  let mundo = (tela - u.uTela.xy) / u.uTela.z;
  var dentro = 1.0;
  if (u.uArea.z > 0.0) {
    let borda = min(u.uArea.z, u.uArea.w) * 0.2;
    let entrada = smoothstep(u.uArea.xy, u.uArea.xy + vec2<f32>(borda), mundo);
    let saida = vec2<f32>(1.0) - smoothstep(u.uArea.xy + u.uArea.zw - vec2<f32>(borda), u.uArea.xy + u.uArea.zw, mundo);
    dentro = entrada.x * entrada.y * saida.x * saida.y;
  }
  let t = u.uCalor.x;
  let q = mundo / (u.uCalor.z * 2.5);
  let onda = textureSample(uRuido, uRuidoAmostra, q + vec2<f32>(0.0, t * 0.35)).rg - vec2<f32>(0.5);
  let fina = textureSample(uRuido, uRuidoAmostra, q * 2.7 + vec2<f32>(t * 0.05, t * 0.8)).gb - vec2<f32>(0.5);
  let desvio = (onda * 0.65 + fina * 0.35) * u.uCalor.z * 0.09 * u.uCalor.y * dentro;
  let alvo = uv + desvio * u.uTela.z / gfu.uInputSize.xy;
  return textureSample(uTexture, uSampler, clamp(alvo, gfu.uInputClamp.xy, gfu.uInputClamp.zw));
}
`;

export class FiltroCalor {
  readonly filtro: Filter;
  private uniformes: UniformGroup<Record<'uCalor' | 'uTela' | 'uArea', Vec4>>;

  constructor() {
    const ruido = obterRuido();
    this.uniformes = new UniformGroup({ uCalor: vec4(0, 0.5, 100, 0), uTela: vec4(0, 0, 1, 0), uArea: vec4(0, 0, -1, -1) });
    this.filtro = Filter.from({
      gl: { vertex: VERTICE_FILTRO_GL, fragment: CALOR_GL, name: 'clima-calor', preferredFragmentPrecision: 'highp' },
      gpu: {
        vertex: { entryPoint: 'principalVertice', source: CALOR_WGSL },
        fragment: { entryPoint: 'principalFragmento', source: CALOR_WGSL },
        name: 'clima-calor',
      },
      resources: { calorUniforms: this.uniformes, uRuido: ruido.source, uRuidoAmostra: ruido.source.style },
    });
  }

  /** `area` null: o mapa inteiro. */
  atualizar(tempo: number, intensidade: number, casa: number, vista: Rectangle, zoom: number, area: { x: number; y: number; w: number; h: number } | null) {
    const u = this.uniformes.uniforms;
    u.uCalor.set([tempo % 10000, intensidade, Math.max(10, casa), 0]);
    // A tela mostra o mundo a partir de vista.x/y: o canto do mapa fica em -vista * zoom.
    u.uTela.set([-vista.x * zoom, -vista.y * zoom, zoom, 0]);
    u.uArea.set(area ? [area.x, area.y, area.w, area.h] : [0, 0, -1, -1]);
    this.uniformes.update();
  }

  destruir() {
    this.filtro.destroy();
  }
}
