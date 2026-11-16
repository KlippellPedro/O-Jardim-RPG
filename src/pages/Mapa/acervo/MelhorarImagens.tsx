import { useRef, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import type { IItemAcervo } from '../../../services/acervoApi';
import { cabeNoMelhorador, escalaSugerida, LADO_MAXIMO_DO_TOKEN, melhoriaDemorada, tamanhoDoResultado, tokenGrandeDemais, type EscalaDeMelhoria } from './imagemConta';
import { quantasImagens } from './organizacao';
import { useFecharComEscape } from './useFecharComEscape';

type Acao = 'ampliar' | 'ajustar';

interface Props {
  itens: readonly IItemAcervo[];
  onConcluir: (novos: IItemAcervo[], falhas: string[]) => void;
  onFechar: () => void;
}

/**
 * Melhora imagens que já estão no Acervo: amplia 2x ou 4x com o mesmo melhorador da Oficina (roda no seu computador) e
 * guarda o resultado como imagem nova, na mesma pasta. Token grande demais pode ser só reduzido ao tamanho que o mapa usa.
 */
export const MelhorarImagens = ({ itens, onConcluir, onFechar }: Props) => {
  const sugerida = escalaSugerida(itens[0].largura, itens[0].altura, itens[0].tipo) ?? 2;
  const algumTokenGrande = itens.some((i) => i.tipo === 'token' && tokenGrandeDemais(i.largura, i.altura));
  const [acao, setAcao] = useState<Acao>(algumTokenGrande && itens.every((i) => i.tipo === 'token') ? 'ajustar' : 'ampliar');
  const [escala, setEscala] = useState<EscalaDeMelhoria>(sugerida);
  const [andamento, setAndamento] = useState<{ indice: number; texto: string; fracao?: number } | null>(null);
  const [erro, setErro] = useState('');
  const ocupado = useRef(false);
  // Enquanto trabalha não há como cancelar: Escape só fecha antes de começar.
  useFecharComEscape(onFechar, !andamento);

  const naoCabem = itens.filter((i) => !cabeNoMelhorador(i.largura, i.altura, escala));
  const tokensMiudos = itens.filter((i) => i.tipo === 'token' && !tokenGrandeDemais(i.largura, i.altura));
  const demoradas = itens.filter((i) => cabeNoMelhorador(i.largura, i.altura, escala) && melhoriaDemorada(i.largura, i.altura));
  const resultado = itens.length === 1 ? tamanhoDoResultado(itens[0].largura, itens[0].altura, escala) : null;

  const iniciar = async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    setErro('');
    const novos: IItemAcervo[] = [];
    const falhas: string[] = [];
    try {
      // O melhorador e o envio só se carregam quando se pede: a Oficina pesa no navegador.
      const { enxugarTokenDoAcervo, melhorarItemDoAcervo } = await import('./qualidade');
      for (let i = 0; i < itens.length; i++) {
        const item = itens[i];
        const rotulo = itens.length > 1 ? `${i + 1} de ${itens.length}: ${item.nome}` : item.nome;
        setAndamento({ indice: i + 1, texto: `Abrindo ${rotulo}...` });
        try {
          if (acao === 'ajustar') {
            if (!(item.tipo === 'token' && tokenGrandeDemais(item.largura, item.altura))) continue;
            novos.push(await enxugarTokenDoAcervo(item, (p) => setAndamento({ indice: i + 1, texto: `Guardando ${rotulo}: ${p.feitos} de ${p.total}`, fracao: p.feitos / p.total })));
          } else {
            const { item: novo } = await melhorarItemDoAcervo(
              item,
              escala,
              (texto, fracao) => setAndamento({ indice: i + 1, texto: itens.length > 1 ? `${rotulo}: ${texto}` : texto, fracao }),
              (p) => setAndamento({ indice: i + 1, texto: `Guardando ${rotulo}: ${p.feitos} de ${p.total}`, fracao: p.feitos / p.total }),
            );
            novos.push(novo);
          }
        } catch (falha) {
          falhas.push(`${item.nome}: ${falha instanceof Error ? falha.message : 'não deu certo'}`);
        }
      }
      onConcluir(novos, falhas);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para abrir o melhorador.');
      setAndamento(null);
    } finally {
      ocupado.current = false;
    }
  };

  return (
    <section className="mapa-acervo-info acervo-melhorar" aria-label="Melhorar imagens">
      <header>
        <strong><Sparkles size={14} /> Melhorar {itens.length === 1 ? itens[0].nome : quantasImagens(itens.length)}</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar" disabled={Boolean(andamento)} onClick={onFechar}><X size={15} /></button>
      </header>

      {algumTokenGrande && (
        <div role="radiogroup" aria-label="O que fazer" className="mapa-menu-botoes">
          <button type="button" role="radio" aria-checked={acao === 'ajustar'} className={acao === 'ajustar' ? 'mapa-botao ativo' : 'mapa-botao-leve'} disabled={Boolean(andamento)} onClick={() => setAcao('ajustar')}>Ajustar para o mapa</button>
          <button type="button" role="radio" aria-checked={acao === 'ampliar'} className={acao === 'ampliar' ? 'mapa-botao ativo' : 'mapa-botao-leve'} disabled={Boolean(andamento)} onClick={() => setAcao('ampliar')}>Ampliar com IA</button>
        </div>
      )}

      {acao === 'ajustar' ? (
        <p className="mapa-dica">
          Token com mais de {LADO_MAXIMO_DO_TOKEN} px de lado aparece no mapa como miniatura (ficaria borrado). Isto guarda uma cópia reduzida a {LADO_MAXIMO_DO_TOKEN} px com boa suavização, nítida no zoom. O original continua no Acervo.
        </p>
      ) : (
        <>
          <div role="radiogroup" aria-label="Quanto ampliar" className="mapa-menu-botoes">
            {([2, 4] as EscalaDeMelhoria[]).map((e) => (
              <button key={e} type="button" role="radio" aria-checked={escala === e} className={escala === e ? 'mapa-botao ativo' : 'mapa-botao-leve'} disabled={Boolean(andamento)} onClick={() => setEscala(e)}>{e}x</button>
            ))}
          </div>
          <p className="mapa-dica">
            A IA recria os detalhes que faltam e pode mudar texturas: confira o resultado. Ele vira uma imagem nova ao lado da original; cenas e tokens que já usam a original continuam com ela.
            Na primeira vez o melhorador (5 MB) é baixado. Tudo roda no seu computador.
          </p>
          {resultado && <p className="mapa-dica">Resultado: {resultado.largura} x {resultado.altura} px.</p>}
          {demoradas.length > 0 && <p className="mapa-dica">{demoradas.length === 1 ? 'Esta imagem é grande' : `${demoradas.length} imagens são grandes`} e leva(m) alguns minutos. Deixe a aba aberta até terminar.</p>}
          {tokensMiudos.length > 0 && <p className="mapa-dica">O mapa mostra tokens de até {LADO_MAXIMO_DO_TOKEN} px de lado: acima disso, o resultado é reduzido a esse tamanho.</p>}
          {naoCabem.length > 0 && <p className="mapa-erro">{naoCabem.length === 1 ? `"${naoCabem[0].nome}" passaria` : `${naoCabem.length} imagens passariam`} do limite de tamanho com {escala}x ({naoCabem.length === 1 ? 'ela' : 'elas'} {naoCabem.length === 1 ? 'ficaria' : 'ficariam'} com mais de 100 milhões de pixels). {escala === 4 ? 'Escolha 2x.' : 'Use uma imagem menor.'}</p>}
        </>
      )}

      {andamento && (
        <div className="mapa-oficina-progresso acervo-progresso">
          <span><Loader2 size={14} className="girando" /> {andamento.texto}</span>
          {andamento.fracao !== undefined && <i style={{ width: `${Math.round(andamento.fracao * 100)}%` }} />}
        </div>
      )}
      {erro && <p className="mapa-erro">{erro}</p>}
      <button type="button" className="mapa-botao" disabled={Boolean(andamento) || (acao === 'ampliar' && naoCabem.length === itens.length)} onClick={() => void iniciar()}>
        {andamento ? 'Trabalhando...' : acao === 'ajustar' ? 'Ajustar' : `Melhorar ${escala}x`}
      </button>
    </section>
  );
};
