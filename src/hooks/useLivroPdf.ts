import { useEffect, useState } from 'react';
import { livroApi, type IEdicaoDoLivro } from '../services/livroApi';

// O PDF muda só quando alguém regera o livro e publica um pacote novo: guardar a resposta pela
// sessão inteira evita repetir o pedido a cada tópico que a pessoa abre. Falha não é guardada.
const respostas = new Map<string, IEdicaoDoLivro[]>();

export interface LivroPdf {
  edicoes: IEdicaoDoLivro[];
  jogador?: IEdicaoDoLivro;
  mestre?: IEdicaoDoLivro;
  carregando: boolean;
}

/** As edições em PDF que esta conta pode baixar. Sem PDF publicado a lista vem vazia, e a tela não mostra o botão. */
export function useLivroPdf(campanhaId?: string | null): LivroPdf {
  const chave = campanhaId || '';
  const [edicoes, setEdicoes] = useState<IEdicaoDoLivro[]>(() => respostas.get(chave) ?? []);
  const [carregando, setCarregando] = useState(() => !respostas.has(chave));

  useEffect(() => {
    const guardada = respostas.get(chave);
    if (guardada) {
      setEdicoes(guardada);
      setCarregando(false);
      return undefined;
    }
    let ativo = true;
    setCarregando(true);
    livroApi.edicoes(campanhaId)
      .then((resposta) => {
        const lista = resposta?.edicoes ?? [];
        respostas.set(chave, lista);
        if (ativo) setEdicoes(lista);
      })
      .catch(() => {
        if (ativo) setEdicoes([]);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [campanhaId, chave]);

  return {
    edicoes,
    jogador: edicoes.find((edicao) => edicao.edicao === 'jogador'),
    mestre: edicoes.find((edicao) => edicao.edicao === 'mestre'),
    carregando,
  };
}
