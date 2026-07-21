const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// FastAPI devolve `detail` como STRING nos HTTPException que a plataforma
// levanta à mão (ex.: "chave de servico invalida"), mas como uma LISTA de
// {loc, msg, type} nos erros de validação automática do Pydantic (422) —
// sem tratar esse segundo formato, a mensagem real (ex.: "senha deve ter
// pelo menos 12 caracteres") se perdia e só sobrava o "Falha 422" genérico.
function extrairMensagem(detalhe, status) {
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

function lerCookie(nome) {
  const prefixo = `${encodeURIComponent(nome)}=`;
  const item = document.cookie
    .split(';')
    .map(parte => parte.trim())
    .find(parte => parte.startsWith(prefixo));
  return item ? decodeURIComponent(item.slice(prefixo.length)) : null;
}

export async function api(caminho, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
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

  // 204/205 não têm corpo, mas o FastAPI ainda manda `content-type: application/json`
  // neles. Checar o content-type antes do status fazia `response.json()` engasgar
  // num corpo vazio e derrubar TODA ação de exclusão do site — arquivar campanha,
  // revogar convite, encerrar sessão e até sair da conta.
  const semCorpo = response.status === 204 || response.status === 205;
  const tipo = response.headers.get('content-type') || '';
  const payload = !semCorpo && tipo.includes('application/json')
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok) {
    const detalhe = payload?.detail;
    throw new ApiError(extrairMensagem(detalhe, response.status), response.status, detalhe);
  }
  return semCorpo ? null : payload;
}
