import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// Os shaders do clima existem em dobro (GLSL para o WebGL, WGSL para o WebGPU). Estes testes
// leem o arquivo e travam os dois juntos: um não pode ganhar um efeito que o outro não tem.
const fonte = readFileSync(new URL('../../src/pages/Mapa/motor/climaShader.ts', import.meta.url), 'utf-8');
const trecho = (inicio: string, fim: string) => {
  const comeco = fonte.indexOf(inicio);
  return fonte.slice(comeco, fonte.indexOf(fim, comeco));
};
const contar = (texto: string, padrao: RegExp) => (texto.match(padrao) ?? []).length;
const temNome = (texto: string, nome: string) => new RegExp(`\\b${nome}\\b`).test(texto);

test('atmosfera: o GLSL e o WGSL usam os mesmos uniformes e as mesmas leituras de ruído', () => {
  const gl = trecho('const ATMOSFERA_GL', 'const ATMOSFERA_WGSL');
  const wgsl = trecho('const ATMOSFERA_WGSL', 'type Vec4');
  for (const nome of ['uRuido', 'uParam', 'uVento', 'uVista', 'uChuva', 'uNuvem', 'uVeu', 'uVeuForma', 'uCorVeu', 'uCorChuva']) {
    assert.ok(temNome(gl, nome), `${nome} no GLSL`);
    assert.ok(temNome(wgsl, nome), `${nome} no WGSL`);
  }
  assert.equal(contar(gl, /texture\(uRuido/g), contar(wgsl, /textureSample\(uRuido/g));
  // As camadas de chuva, o sorteio e o clarão aparecem nos dois.
  for (const pedaco of ['sorteio(', 'sobre(', '0.32', '0.45']) {
    assert.ok(gl.includes(pedaco) && wgsl.includes(pedaco), pedaco);
  }
});

test('atmosfera: a ordem dos uniformes do WGSL é a mesma do grupo criado no código', () => {
  const struct = trecho('struct ClimaUniforms', '@group(0)');
  const doWgsl = [...struct.matchAll(/(u\w+):/g)].map((m) => m[1]);
  const grupo = trecho('this.uniformes = new UniformGroup({', 'this.shader = Shader.from');
  const doCodigo = [...grupo.matchAll(/(u\w+): vec4\(/g)].map((m) => m[1]);
  assert.deepEqual(doCodigo, doWgsl);
});

test('calor: o filtro lê o ruído e o mapa do mesmo jeito nos dois', () => {
  const gl = trecho('const CALOR_GL', 'const CALOR_WGSL');
  const wgsl = trecho('const CALOR_WGSL', 'export class FiltroCalor');
  for (const nome of ['uRuido', 'uCalor', 'uTela', 'uArea', 'uInputSize', 'uOutputFrame', 'uInputClamp']) {
    assert.ok(temNome(gl, nome), `${nome} no GLSL`);
    assert.ok(temNome(wgsl, nome), `${nome} no WGSL`);
  }
  assert.equal(contar(gl, /texture\(uRuido/g), contar(wgsl, /textureSample\(uRuido/g));
  assert.equal(contar(gl, /texture\(uTexture/g), contar(wgsl, /textureSample\(uTexture/g));
  const struct = trecho('struct CalorUniforms', '@group(0)');
  const grupo = trecho('this.uniformes = new UniformGroup({ uCalor', 'this.filtro = Filter.from');
  assert.deepEqual([...grupo.matchAll(/(u\w+): vec4\(/g)].map((m) => m[1]), [...struct.matchAll(/(u\w+):/g)].map((m) => m[1]));
});

test('cada efeito do catálogo tem como ser desenhado', async () => {
  const { EFEITOS_CLIMA } = await import('../../src/pages/Mapa/motor/climaCatalogo');
  const clima = readFileSync(new URL('../../src/pages/Mapa/motor/clima.ts', import.meta.url), 'utf-8');
  const casos = (inicio: number, fim: number) => [...clima.slice(inicio, fim).matchAll(/case '(\w+)'/g)].map((m) => m[1]);
  const receitas = clima.indexOf('function receitaAtmosfera');
  const naAtmosfera = casos(receitas, clima.indexOf('// ------------------------------------------------------------- efeitos', receitas));
  const particulas = clima.indexOf('this.relampeja = efeito.tipo');
  const emParticulas = casos(particulas, clima.indexOf('this.ajustar(efeito);', particulas));
  const proprios = ['escuridao', 'calor'];
  for (const { id } of EFEITOS_CLIMA) {
    assert.ok(naAtmosfera.includes(id) || emParticulas.includes(id) || proprios.includes(id), `${id} sem desenho`);
  }
});
