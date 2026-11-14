import { useMemo, type CSSProperties } from 'react';
import { urlPedaco } from '../../../services/mapaApi';
import { montagemDoVisor } from '../motor/visorConta';

interface Props {
  itemId: string;
  largura: number;
  altura: number;
  /** `contain` mostra a imagem inteira; `cover` preenche a área e corta o que sobra (o fundo da cena narrativa). */
  ajuste?: 'contain' | 'cover';
  /** Texto para leitores de tela. */
  descricao: string;
}

/**
 * Uma imagem do Acervo montada na tela a partir dos pedaços dela (1024 px cada), na posição certa em porcentagem, sem
 * baixar a imagem inteira de uma vez. As imagens maiores usam a versão em 1/4 (ver `montagemDoVisor`).
 */
export const ImagemMontada = ({ itemId, largura, altura, ajuste = 'contain', descricao }: Props) => {
  const montagem = useMemo(() => montagemDoVisor(largura, altura), [largura, altura]);
  if (!montagem) return null;
  const razao = `${montagem.largura} / ${montagem.altura}`;
  // `cover` preenche a área (o pai tem tamanho de sobra). `contain` precisa caber inteira numa área que só o pai conhece:
  // o pai é um container de consulta (container-type: size) e a largura sai do menor entre a largura e a altura dele vezes a razão.
  const estilo: CSSProperties = ajuste === 'cover'
    ? { aspectRatio: razao, minWidth: '100%', minHeight: '100%' }
    : ({ aspectRatio: razao, width: 'min(100cqw, calc(100cqh * var(--razao)))', '--razao': montagem.largura / montagem.altura } as CSSProperties);
  return (
    <div className={`imagem-montada imagem-montada--${ajuste}`} style={estilo} role="img" aria-label={descricao}>
      {montagem.pedacos.map((pedaco) => (
        <img
          key={pedaco.chave}
          src={urlPedaco(itemId, pedaco.chave)}
          alt=""
          draggable={false}
          style={{ left: `${pedaco.x * 100}%`, top: `${pedaco.y * 100}%`, width: `${pedaco.w * 100 + 0.08}%`, height: `${pedaco.h * 100 + 0.08}%` }}
        />
      ))}
    </div>
  );
};
