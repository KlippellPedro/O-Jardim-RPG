/* Prova que o apiClient sobrevive a 204 com content-type json.

   Este caso derrubava TODA acao de exclusao do site (13 rotas, incluindo o
   logout): o FastAPI manda `content-type: application/json` num 204 sem corpo,
   e o cliente tentava parsear antes de olhar o status. So apareceu quando o
   servidor de verdade entrou na jogada — o mock devolvia JSON em tudo. */
import { readFileSync } from 'node:fs';
import http from 'node:http';

const codigo = readFileSync(new URL('../src/plataforma/apiClient.js', import.meta.url), 'utf-8');
const modulo = await import('data:text/javascript,' + encodeURIComponent(codigo));

const servidor = http.createServer((req, res) => {
  if (req.url.endsWith('/vazio')) {
    // Exatamente como o FastAPI responde num status_code=204.
    res.writeHead(204, { 'Content-Type': 'application/json' });
    return res.end();
  }
  if (req.url.endsWith('/erro')) {
    res.writeHead(409, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ detail: 'conflito de teste' }));
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
});

await new Promise(r => servidor.listen(0, '127.0.0.1', r));
const porta = servidor.address().port;
globalThis.document = { cookie: 'oj_csrf=fake' };
globalThis.fetch = (caminho, opcoes) => http_fetch(`http://127.0.0.1:${porta}${caminho}`, opcoes);

async function http_fetch(url, opcoes = {}) {
  const resposta = await new Promise((resolve, reject) => {
    const req = http.request(url, { method: opcoes.method || 'GET' }, resolve);
    req.on('error', reject);
    req.end(opcoes.body);
  });
  const corpo = await new Promise(r => {
    let d = ''; resposta.on('data', c => { d += c; }); resposta.on('end', () => r(d));
  });
  return {
    ok: resposta.statusCode >= 200 && resposta.statusCode < 300,
    status: resposta.statusCode,
    headers: { get: nome => resposta.headers[nome.toLowerCase()] || null },
    json: async () => JSON.parse(corpo),
  };
}

let falhas = 0;
const checar = (nome, condicao) => {
  console.log(`  ${condicao ? '[ok]   ' : '[FALHA]'} ${nome}`);
  if (!condicao) falhas += 1;
};

console.log('apiClient contra respostas reais do FastAPI:');
checar('204 com content-type json devolve null sem lancar',
  await modulo.api('/vazio', { method: 'DELETE' }) === null);
checar('200 continua devolvendo o corpo',
  (await modulo.api('/normal')).ok === true);
try {
  await modulo.api('/erro', { method: 'POST' });
  checar('erro 409 lanca ApiError', false);
} catch (erro) {
  checar('erro 409 lanca ApiError com a mensagem do servidor',
    erro.name === 'ApiError' && erro.status === 409 && erro.message === 'conflito de teste');
}

servidor.close();
process.exit(falhas ? 1 : 0);
