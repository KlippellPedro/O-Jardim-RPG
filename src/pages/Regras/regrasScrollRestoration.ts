export type TopicoCatalogoRegras = 'classes' | 'racas';

export interface PosicaoRetornoRegras {
  topico: TopicoCatalogoRegras;
  scrollTop: number;
}

export interface EstadoNavegacaoRegras {
  retornoRegras?: PosicaoRetornoRegras;
}

const CHAVE_RETORNO_REGRAS = 'jardim:regras:posicao-retorno';

const posicaoValida = (valor: unknown): valor is PosicaoRetornoRegras => {
  if (!valor || typeof valor !== 'object') return false;
  const candidato = valor as Partial<PosicaoRetornoRegras>;
  return (candidato.topico === 'classes' || candidato.topico === 'racas')
    && typeof candidato.scrollTop === 'number'
    && Number.isFinite(candidato.scrollTop)
    && candidato.scrollTop >= 0;
};

const obterArmazenamento = () => {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

export const salvarPosicaoRetornoRegras = (
  topico: TopicoCatalogoRegras,
  scrollTop: number,
): PosicaoRetornoRegras => {
  const posicao = {
    topico,
    scrollTop: Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0,
  };

  try {
    obterArmazenamento()?.setItem(CHAVE_RETORNO_REGRAS, JSON.stringify(posicao));
  } catch {
    // O estado da navegação ainda cobre o botão Voltar quando o armazenamento é bloqueado.
  }

  return posicao;
};

export const obterPosicaoRetornoRegras = (
  estado: unknown,
  topico: string,
): PosicaoRetornoRegras | null => {
  const posicaoDoEstado = (estado as EstadoNavegacaoRegras | null)?.retornoRegras;
  if (posicaoValida(posicaoDoEstado) && posicaoDoEstado.topico === topico) {
    return posicaoDoEstado;
  }

  try {
    const valorSalvo = obterArmazenamento()?.getItem(CHAVE_RETORNO_REGRAS);
    if (!valorSalvo) return null;
    const posicaoSalva: unknown = JSON.parse(valorSalvo);
    return posicaoValida(posicaoSalva) && posicaoSalva.topico === topico
      ? posicaoSalva
      : null;
  } catch {
    return null;
  }
};

export const limparPosicaoRetornoRegras = () => {
  try {
    obterArmazenamento()?.removeItem(CHAVE_RETORNO_REGRAS);
  } catch {
    // A restauração já ocorreu; não há impacto se o navegador bloquear a limpeza.
  }
};
