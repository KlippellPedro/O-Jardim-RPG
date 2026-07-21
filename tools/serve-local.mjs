import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const raiz = path.resolve(process.cwd());
const porta = Math.max(1, Math.min(65535, Number(process.argv[2]) || 8765));
const host = process.argv[3] || '127.0.0.1';
const tipos = {
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// Mesmos endereços limpos que a API serve em produção (plataforma/main.py),
// para que o preview local não divirja do site publicado.
const paginas = {
  'index.html': 'index.html',
  ficha: 'templates/ficha.html',
  mundo: 'templates/mundo.html',
  regras: 'templates/regras.html',
  loja: 'templates/loja.html',
  itens: 'templates/loja.html',
  sessao: 'templates/sessao.html',
};

http.createServer(async (requisicao, resposta) => {
  try {
    const url = new URL(requisicao.url || '/', 'http://127.0.0.1');
    const pedido = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const relativo = paginas[pedido.toLowerCase()] || pedido;
    let destino = path.resolve(raiz, relativo);
    if (destino !== raiz && !destino.startsWith(`${raiz}${path.sep}`)) {
      resposta.writeHead(403).end('Acesso negado.');
      return;
    }

    const estado = await fs.stat(destino);
    if (estado.isDirectory()) destino = path.join(destino, 'index.html');
    const conteudo = await fs.readFile(destino);
    resposta.writeHead(200, {
      'Content-Type': tipos[path.extname(destino).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    resposta.end(conteudo);
  } catch {
    resposta.writeHead(404).end('Arquivo não encontrado.');
  }
}).listen(porta, host, () => {
  console.log(`O Jardim disponível em http://${host}:${porta}`);
});
