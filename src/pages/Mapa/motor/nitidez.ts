// O filtro do Realce (ver realceConta.ts), escrito em GLSL (WebGL) e WGSL (WebGPU) como os do clima.
// Máscara de nitidez com a vizinhança em cruz: o pixel volta somado à diferença para a média dos quatro vizinhos,
// depois entram o contraste e a saturação. Só pixels opacos são mexidos (a borda do mapa e as partes vazias ficam).

import { Filter, UniformGroup } from 'pixi.js';
import { VERTICE_FILTRO_GL } from './climaShader';
import { parametrosDoRealce, passoDaVizinhanca, type NivelDeRealce } from './realceConta';

type Vec4 = { value: Float32Array; type: 'vec4<f32>' };
const vec4 = (a = 0, b = 0, c = 0, d = 0): Vec4 => ({ value: new Float32Array([a, b, c, d]), type: 'vec4<f32>' });

// uNitidez: força, contraste, saturação, passo da vizinhança.
const NITIDEZ_GL = `#version 300 es
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec4 uInputClamp;
uniform vec4 uNitidez;
void main() {
  vec2 passo = uInputSize.zw * uNitidez.w;
  vec4 centro = texture(uTexture, vTextureCoord);
  vec3 cima = texture(uTexture, clamp(vTextureCoord + vec2(0.0, -passo.y), uInputClamp.xy, uInputClamp.zw)).rgb;
  vec3 baixo = texture(uTexture, clamp(vTextureCoord + vec2(0.0, passo.y), uInputClamp.xy, uInputClamp.zw)).rgb;
  vec3 esquerda = texture(uTexture, clamp(vTextureCoord + vec2(-passo.x, 0.0), uInputClamp.xy, uInputClamp.zw)).rgb;
  vec3 direita = texture(uTexture, clamp(vTextureCoord + vec2(passo.x, 0.0), uInputClamp.xy, uInputClamp.zw)).rgb;
  vec3 media = (cima + baixo + esquerda + direita) * 0.25;
  vec3 cor = centro.rgb + (centro.rgb - media) * uNitidez.x;
  cor = (cor - 0.5) * uNitidez.y + 0.5;
  float luz = dot(cor, vec3(0.299, 0.587, 0.114));
  cor = mix(vec3(luz), cor, uNitidez.z);
  float opaco = step(0.999, centro.a);
  finalColor = vec4(mix(centro.rgb, clamp(cor, 0.0, 1.0), opaco), centro.a);
}`;

const NITIDEZ_WGSL = `
struct GlobalFilterUniforms {
  uInputSize: vec4<f32>,
  uInputPixel: vec4<f32>,
  uInputClamp: vec4<f32>,
  uOutputFrame: vec4<f32>,
  uGlobalFrame: vec4<f32>,
  uOutputTexture: vec4<f32>,
}
struct NitidezUniforms {
  uNitidez: vec4<f32>,
}
@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> nitidezUniforms: NitidezUniforms;

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
  let n = nitidezUniforms.uNitidez;
  let passo = gfu.uInputSize.zw * n.w;
  let limite_a = gfu.uInputClamp.xy;
  let limite_b = gfu.uInputClamp.zw;
  let centro = textureSample(uTexture, uSampler, uv);
  let cima = textureSample(uTexture, uSampler, clamp(uv + vec2<f32>(0.0, -passo.y), limite_a, limite_b)).rgb;
  let baixo = textureSample(uTexture, uSampler, clamp(uv + vec2<f32>(0.0, passo.y), limite_a, limite_b)).rgb;
  let esquerda = textureSample(uTexture, uSampler, clamp(uv + vec2<f32>(-passo.x, 0.0), limite_a, limite_b)).rgb;
  let direita = textureSample(uTexture, uSampler, clamp(uv + vec2<f32>(passo.x, 0.0), limite_a, limite_b)).rgb;
  let media = (cima + baixo + esquerda + direita) * 0.25;
  var cor = centro.rgb + (centro.rgb - media) * n.x;
  cor = (cor - vec3<f32>(0.5)) * n.y + vec3<f32>(0.5);
  let luz = dot(cor, vec3<f32>(0.299, 0.587, 0.114));
  cor = mix(vec3<f32>(luz), cor, n.z);
  let opaco = step(0.999, centro.a);
  return vec4<f32>(mix(centro.rgb, clamp(cor, vec3<f32>(0.0), vec3<f32>(1.0)), opaco), centro.a);
}
`;

/** O filtro de realce das imagens do mapa. Um só serve a todas as camadas de imagem. */
export class FiltroNitidez {
  readonly filtro: Filter;
  private uniformes: UniformGroup<Record<'uNitidez', Vec4>>;

  constructor() {
    this.uniformes = new UniformGroup({ uNitidez: vec4(0, 1, 1, 1) });
    this.filtro = Filter.from({
      gl: { vertex: VERTICE_FILTRO_GL, fragment: NITIDEZ_GL, name: 'mapa-nitidez', preferredFragmentPrecision: 'highp' },
      gpu: {
        vertex: { entryPoint: 'principalVertice', source: NITIDEZ_WGSL },
        fragment: { entryPoint: 'principalFragmento', source: NITIDEZ_WGSL },
        name: 'mapa-nitidez',
      },
      resources: { nitidezUniforms: this.uniformes },
    });
  }

  /** Põe os números do nível. Devolve falso quando o nível é desligado (quem chama tira o filtro das camadas). */
  definir(nivel: NivelDeRealce, densidade: number): boolean {
    const parametros = parametrosDoRealce(nivel);
    if (!parametros) return false;
    this.uniformes.uniforms.uNitidez.set([parametros.forca, parametros.contraste, parametros.saturacao, passoDaVizinhanca(densidade)]);
    this.uniformes.update();
    return true;
  }

  destruir() {
    this.filtro.destroy();
  }
}
