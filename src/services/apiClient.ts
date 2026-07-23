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

interface ApiOptions {
  method?: string;
  body?: any;
  signal?: AbortSignal;
}

export async function api<T = any>(caminho: string, { method = 'GET', body, signal }: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!['GET', 'HEAD'].includes(method.toUpperCase())) {
    const csrf = lerCookie('oj_csrf');
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  const response = await fetch(`${API_BASE}${caminho}`, {
    method,
    credentials: 'same-origin',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const semCorpo = response.status === 204 || response.status === 205;
  const tipo = response.headers.get('content-type') || '';
  const payload = !semCorpo && tipo.includes('application/json')
    ? await response.json().catch(() => null)
    : null;
    
  if (!response.ok) {
    const detalhe = payload?.detail;
    throw new ApiError(extrairMensagem(detalhe, response.status), response.status, detalhe);
  }
  return semCorpo ? (null as any) : payload;
}
