/**
 * Impressão de HTML em PDF pelo Chrome headless, falando o protocolo de
 * depuração direto.
 *
 * O caminho óbvio (`chrome --print-to-pdf`) não aceita rodapé nem numeração, e
 * props de mesa às vezes precisam de uma coisa e às vezes da outra. Aqui a
 * decisão fica com quem chama.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const CANDIDATOS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
export const paraUrl = (caminho) => `file:///${caminho.replace(/\\/g, '/')}`;

/** Sobe um Chrome headless e devolve um cliente do protocolo de depuração. */
export async function abrirChrome({ perfil, porta = 9411 } = {}) {
  const executavel = CANDIDATOS.find((c) => existsSync(c));
  if (!executavel) throw new Error('Nenhum Chrome ou Edge encontrado nos caminhos conhecidos.');

  const proc = spawn(executavel, [
    '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--no-sandbox', '--disable-extensions',
    `--remote-debugging-port=${porta}`,
    `--user-data-dir=${perfil}`,
    'about:blank',
  ], { stdio: 'ignore' });

  let versao = null;
  for (let i = 0; i < 60 && !versao; i++) {
    try { versao = await (await fetch(`http://127.0.0.1:${porta}/json/version`)).json(); }
    catch { await dormir(250); }
  }
  if (!versao) { proc.kill(); throw new Error('O Chrome não respondeu na porta de depuração.'); }

  const ws = new WebSocket(versao.webSocketDebuggerUrl);
  await new Promise((ok, falha) => {
    ws.onopen = ok;
    ws.onerror = () => falha(new Error('O WebSocket de depuração recusou a conexão.'));
  });

  let seq = 0;
  const pendentes = new Map();
  ws.onmessage = (evento) => {
    const msg = JSON.parse(evento.data);
    if (msg.id && pendentes.has(msg.id)) { pendentes.get(msg.id)(msg); pendentes.delete(msg.id); }
  };
  const enviar = (metodo, params = {}, sessionId) => new Promise((ok, falha) => {
    const id = ++seq;
    pendentes.set(id, (m) => (m.error ? falha(new Error(`${metodo}: ${m.error.message}`)) : ok(m.result)));
    ws.send(JSON.stringify({ id, method: metodo, params, sessionId }));
  });

  return {
    enviar,
    fechar() { try { ws.close(); } catch { /* já caiu */ } proc.kill(); },
  };
}

/**
 * Imprime um arquivo HTML local e devolve { pdf, inspecao }.
 * `rodape` recebe um template do Chrome (com .pageNumber) ou nada.
 * `inspecionar` recebe uma expressão avaliada na página antes da impressão.
 */
export async function imprimir(chrome, arquivoHtml, { rodape = null, espera = 1600, inspecionar = null } = {}) {
  const { targetId } = await chrome.enviar('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await chrome.enviar('Target.attachToTarget', { targetId, flatten: true });
  await chrome.enviar('Page.enable', {}, sessionId);
  await chrome.enviar('Page.navigate', { url: paraUrl(arquivoHtml) }, sessionId);

  // São arquivos locais, sem rede e sem webfont: o tempo aqui é o do próprio
  // layout do Chrome, e não de carregamento.
  await dormir(espera);

  // Chance de medir a página montada antes de virar PDF. É por aqui que o
  // gerador descobre sozinho que uma folha transbordou, em vez de o defeito
  // aparecer só quando alguém abre o arquivo.
  let inspecao = null;
  if (inspecionar) {
    const r = await chrome.enviar('Runtime.evaluate', {
      expression: inspecionar, returnByValue: true, awaitPromise: true,
    }, sessionId);
    inspecao = r?.result?.value ?? null;
  }

  const { data } = await chrome.enviar('Page.printToPDF', {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: Boolean(rodape),
    headerTemplate: '<div></div>',
    footerTemplate: rodape || '<div></div>',
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
  }, sessionId);

  await chrome.enviar('Target.closeTarget', { targetId });
  return { pdf: Buffer.from(data, 'base64'), inspecao };
}
