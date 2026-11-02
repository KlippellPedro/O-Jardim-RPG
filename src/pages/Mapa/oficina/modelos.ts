// Modelos da Oficina: baixados uma vez e guardados no navegador (Cache API).
// Rodam no PC de quem usa, com ONNX Runtime Web; nada passa pelo servidor.

import type * as Ort from 'onnxruntime-web';

const VERSAO_ORT = '1.31.1';
const CACHE = 'jardim-oficina-modelos-v1';

/** MODNet (Apache 2.0), do Hugging Face. ~26 MB. */
export const URL_MODNET = 'https://huggingface.co/Xenova/modnet/resolve/main/onnx/model.onnx';
/** Real-ESRGAN geral (BSD 3), exportado por nós dos pesos oficiais (ver modelos/LEIAME.md). ~5 MB.
 * Fica fora do ZIP do site: em produção vem do repositório pelo jsDelivr. */
export const URL_ESRGAN = import.meta.env?.DEV
  ? '/modelos/realesr-general-x4v3.onnx'
  : 'https://cdn.jsdelivr.net/gh/KlippellPedro/O-Jardim-RPG@master/modelos/realesr-general-x4v3.onnx';

export type AoProgresso = (texto: string, fracao?: number) => void;

let ort: Promise<typeof Ort> | null = null;

export function carregarOrt(): Promise<typeof Ort> {
  ort ??= import('onnxruntime-web/webgpu').then((modulo) => {
    // Os .wasm do ONNX Runtime vêm do CDN, na mesma versão do pacote.
    modulo.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${VERSAO_ORT}/dist/`;
    return modulo;
  });
  return ort;
}

async function baixar(url: string, rotulo: string, aoProgresso?: AoProgresso): Promise<Uint8Array> {
  let cache: Cache | null = null;
  try {
    cache = await caches.open(CACHE);
    const guardado = await cache.match(url);
    if (guardado) return new Uint8Array(await guardado.arrayBuffer());
  } catch {
    cache = null;
  }
  const resposta = await fetch(url);
  if (!resposta.ok || !resposta.body) throw new Error(`Não deu para baixar o modelo (${resposta.status}).`);
  const total = Number(resposta.headers.get('content-length')) || 0;
  const leitor = resposta.body.getReader();
  const partes: Uint8Array[] = [];
  let recebido = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    partes.push(value);
    recebido += value.length;
    aoProgresso?.(`Baixando ${rotulo} (uma vez só): ${Math.round(recebido / 1e6)} MB`, total ? recebido / total : undefined);
  }
  const bytes = new Uint8Array(recebido);
  let posicao = 0;
  for (const parte of partes) {
    bytes.set(parte, posicao);
    posicao += parte.length;
  }
  try {
    await cache?.put(url, new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream' } }));
  } catch {
    // Sem espaço ou sem Cache API: baixa de novo da próxima vez.
  }
  return bytes;
}

const sessoes = new Map<string, Promise<Ort.InferenceSession>>();

/** Uma sessão por modelo e por provedor; a primeira tentativa que funcionar fica. */
export function sessaoDoModelo(url: string, rotulo: string, provedores: string[], aoProgresso?: AoProgresso): Promise<Ort.InferenceSession> {
  const chave = `${url}|${provedores.join(',')}`;
  if (!sessoes.has(chave)) {
    sessoes.set(chave, (async () => {
      const biblioteca = await carregarOrt();
      const bytes = await baixar(url, rotulo, aoProgresso);
      aoProgresso?.(`Preparando ${rotulo}...`);
      let ultimoErro: unknown = null;
      for (const provedor of provedores) {
        try {
          return await biblioteca.InferenceSession.create(bytes, { executionProviders: [provedor] });
        } catch (erro) {
          ultimoErro = erro;
        }
      }
      throw ultimoErro instanceof Error ? ultimoErro : new Error('Este navegador não abriu o modelo.');
    })().catch((erro) => {
      sessoes.delete(chave);
      throw erro;
    }));
  }
  return sessoes.get(chave)!;
}
