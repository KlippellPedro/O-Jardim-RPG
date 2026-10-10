/** Canal ao vivo da campanha (SSE), um só por aba.
 *
 * Antes, cada tela que queria saber "algo mudou" abria o próprio `EventSource` no mesmo
 * endereço: a ficha chegava a abrir quatro. Navegadores em HTTP/1.1 deixam só seis conexões
 * por servidor, e conexão aberta que ninguém fecha trava as chamadas normais à API. Aqui
 * todo mundo assina o mesmo canal; ele abre quando chega o primeiro ouvinte e fecha um
 * instante depois que o último sai (o instante evita fechar e reabrir na troca de tela).
 *
 * O evento carrega só o tipo e a versão, nunca o estado: cada ouvinte refaz o GET que
 * precisa, e o recorte por papel continua no servidor. */

export type EstadoDoCanal = 'connecting' | 'connected' | 'reconnecting';

export interface OuvinteDeEventos {
  /** Chegou um evento do servidor (`tipo` e o resto do corpo). */
  aoEvento?: (tipo: string, carga: Record<string, unknown>) => void;
  /** O canal abriu ou reabriu: quem escuta deve se atualizar, porque pode ter perdido eventos. */
  aoConectar?: () => void;
  /** O canal mudou de estado (conectando, conectado, reconectando). */
  aoEstado?: (estado: EstadoDoCanal) => void;
}

/** Quanto o canal espera, sem ouvintes, antes de fechar. */
export const ESPERA_PARA_FECHAR_MS = 2000;

interface Canal {
  campanhaId: string;
  fonte: EventSource | null;
  ouvintes: Set<OuvinteDeEventos>;
  estado: EstadoDoCanal;
  fechar: ReturnType<typeof setTimeout> | null;
}

const canais = new Map<string, Canal>();

export const enderecoDoCanal = (campanhaId: string): string => `/api/v1/sessao/${encodeURIComponent(campanhaId)}/eventos`;

const avisar = (canal: Canal, acao: (ouvinte: OuvinteDeEventos) => void) => {
  // Um ouvinte com defeito não pode calar os outros.
  for (const ouvinte of [...canal.ouvintes]) {
    try {
      acao(ouvinte);
    } catch (erro) {
      console.error('Falha em um ouvinte do canal ao vivo', erro);
    }
  }
};

const mudarEstado = (canal: Canal, estado: EstadoDoCanal) => {
  canal.estado = estado;
  avisar(canal, (ouvinte) => ouvinte.aoEstado?.(estado));
};

const abrir = (canal: Canal) => {
  if (typeof EventSource === 'undefined') return;
  const fonte = new EventSource(enderecoDoCanal(canal.campanhaId));
  canal.fonte = fonte;
  fonte.onopen = () => {
    mudarEstado(canal, 'connected');
    avisar(canal, (ouvinte) => ouvinte.aoConectar?.());
  };
  fonte.onerror = () => mudarEstado(canal, 'reconnecting');
  fonte.onmessage = (evento) => {
    if (evento.data === 'ping' || evento.data === 'conectado') return;
    let carga: Record<string, unknown>;
    try {
      carga = JSON.parse(evento.data) as Record<string, unknown>;
    } catch {
      // Evento malformado: o próximo ping mantém a conexão viva.
      return;
    }
    if (!carga || typeof carga.tipo !== 'string') return;
    const tipo = carga.tipo;
    avisar(canal, (ouvinte) => ouvinte.aoEvento?.(tipo, carga));
  };
};

/** Escuta o canal da campanha. Devolve a função que para de escutar. */
export function assinarEventosDaCampanha(campanhaId: string, ouvinte: OuvinteDeEventos): () => void {
  let canal = canais.get(campanhaId);
  if (!canal) {
    canal = { campanhaId, fonte: null, ouvintes: new Set(), estado: 'connecting', fechar: null };
    canais.set(campanhaId, canal);
  }
  if (canal.fechar !== null) {
    clearTimeout(canal.fechar);
    canal.fechar = null;
  }
  canal.ouvintes.add(ouvinte);
  if (!canal.fonte) abrir(canal);

  // Quem chega conta o estado atual do canal. Entrar num canal que já estava aberto vale como
  // conectar agora: o ouvinte se atualiza, porque não viu o que passou antes dele.
  const atual = canal;
  queueMicrotask(() => {
    if (!atual.ouvintes.has(ouvinte)) return;
    ouvinte.aoEstado?.(atual.estado);
    if (atual.estado === 'connected') ouvinte.aoConectar?.();
  });

  return () => {
    const aberto = canais.get(campanhaId);
    if (!aberto || !aberto.ouvintes.delete(ouvinte) || aberto.ouvintes.size > 0) return;
    aberto.fechar = setTimeout(() => {
      if (aberto.ouvintes.size > 0) return;
      aberto.fonte?.close();
      canais.delete(campanhaId);
    }, ESPERA_PARA_FECHAR_MS);
  };
}

/** Quantos canais estão abertos agora (serve para conferir que a aba só tem um). */
export function canaisAbertos(): number {
  return canais.size;
}

/** Fecha tudo na hora e esquece os canais; só para os testes. No logout os ouvintes saem com as telas e o canal fecha sozinho. */
export function encerrarTodosOsCanais(): void {
  for (const canal of canais.values()) {
    if (canal.fechar !== null) clearTimeout(canal.fechar);
    canal.fonte?.close();
  }
  canais.clear();
}
