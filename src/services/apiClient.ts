const API_BASE = '/api/v1';

export class ApiError extends Error {
  status: number;
  details: any;
  constructor(message: string, status: number, details: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const MENSAGEM_SEM_CONEXAO = 'Sem conexão com o servidor. Confira a internet e tente de novo.';
export const MENSAGEM_DEMORA = 'O servidor demorou demais para responder. Tente de novo em instantes.';

/** Falha de rede com texto que a pessoa entende (o navegador diz só "Failed to fetch"). Cancelamento
 * de propósito (`AbortError`) e qualquer outro erro seguem como vieram: quem cancela depende do nome. */
export function traduzirFalhaDeRede(erro: unknown): unknown {
  if (erro instanceof DOMException && erro.name === 'TimeoutError') return new ApiError(MENSAGEM_DEMORA, 0);
  if (erro instanceof TypeError) return new ApiError(MENSAGEM_SEM_CONEXAO, 0);
  return erro;
}

function extrairMensagem(detalhe: any, status: number): string {
  if (typeof detalhe === 'string') return detalhe;
  if (Array.isArray(detalhe)) {
    const partes = detalhe
      .map(item => {
        const campo = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : null;
        return item?.msg ? (typeof campo === 'string' ? `${campo}: ${item.msg}` : item.msg) : null;
      })
      .filter(Boolean);
    if (partes.length) return partes.join('; ');
  }
  if (detalhe?.mensagem) return detalhe.mensagem;
  return `Falha ${status} na plataforma.`;
}

function lerCookie(nome: string): string | null {
  const prefixo = `${encodeURIComponent(nome)}=`;
  const item = document.cookie
    .split(';')
    .map(parte => parte.trim())
    .find(parte => parte.startsWith(prefixo));
  return item ? decodeURIComponent(item.slice(prefixo.length)) : null;
}

const DEFAULT_TIMEOUT_MS = 15_000;

interface ApiOptions {
  method?: string;
  body?: any;
  signal?: AbortSignal;
  keepalive?: boolean;
}

// Componentes montados ao mesmo tempo podem pedir o mesmo recurso. Compartilhar
// apenas GETs simultâneos remove tráfego duplicado sem introduzir cache stale.
const inFlightGets = new Map<string, Promise<unknown>>();

async function executeRequest<T>(
  caminho: string,
  { method = 'GET', body, signal, keepalive }: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!['GET', 'HEAD'].includes(method.toUpperCase())) {
    const csrf = lerCookie('oj_csrf');
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  // Se o chamador não passou signal e não é uma requisição de keepalive
  // (keepalive + AbortSignal.timeout são incompatíveis em alguns browsers),
  // aplicamos um timeout padrão de 15 s para nunca ficar travado.
  const effectiveSignal =
    signal ?? (!keepalive ? AbortSignal.timeout(DEFAULT_TIMEOUT_MS) : undefined);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${caminho}`, {
      method,
      credentials: 'same-origin',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: effectiveSignal,
      ...(keepalive ? { keepalive: true } : {}),
    });
  } catch (erro) {
    throw traduzirFalhaDeRede(erro);
  }

  const semCorpo = response.status === 204 || response.status === 205;
  const tipo = response.headers.get('content-type') || '';
  const payload =
    !semCorpo && tipo.includes('application/json')
      ? await response.json().catch(() => null)
      : null;

  if (!response.ok) {
    const detalhe = payload?.detail;
    // Sinaliza sessão expirada de forma desacoplada - App.tsx escuta e aciona logout.
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('jardim:unauthorized'));
    }
    throw new ApiError(extrairMensagem(detalhe, response.status), response.status, detalhe);
  }
  return semCorpo ? (null as any) : payload;
}

export async function api<T = any>(
  caminho: string,
  options: ApiOptions = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const canDedupe = method === 'GET' && options.body === undefined && options.signal === undefined;
  if (!canDedupe) return executeRequest<T>(caminho, options);

  const key = `${method}:${caminho}`;
  const existing = inFlightGets.get(key);
  if (existing) return existing as Promise<T>;

  const request = executeRequest<T>(caminho, options);
  inFlightGets.set(key, request);
  try {
    return await request;
  } finally {
    if (inFlightGets.get(key) === request) inFlightGets.delete(key);
  }
}
