import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { normalizarMovimento, passouDoAlcance } from '../motor/alcanceConta';

interface Props {
  /** Quanto o token da vez já andou neste turno, na unidade da cena. */
  andados: number;
  /** Quanto ele anda por turno; nulo quando quem olha não move esse token (aí só aparece o que foi andado). */
  alcance: number | null;
  /** O alcance foi acertado à mão neste aparelho (diferente do que veio da ficha). */
  ajustado: boolean;
  /** De onde vem o número quando ninguém mexeu: a ficha do personagem ou o padrão da mesa. */
  daFicha: boolean;
  unidade: string;
  onAlcance: (metros: number) => void;
  onRestaurar: () => void;
}

const numero = (valor: number) => valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/**
 * O movimento do turno, no topo do mapa: "3 / 9 m". O segundo número vem da ficha do personagem (ou é o padrão
 * de seis casas, para quem não tem ficha) e pode ser acertado ali mesmo quando o turno pede outro valor. Passar
 * do alcance só muda a cor.
 */
export const MovimentoDoTurno = ({ andados, alcance, ajustado, daFicha, unidade, onAlcance, onRestaurar }: Props) => {
  const [texto, setTexto] = useState(alcance === null ? '' : numero(alcance));
  useEffect(() => {
    setTexto(alcance === null ? '' : numero(alcance));
  }, [alcance]);

  const gravar = () => {
    const novo = normalizarMovimento(texto);
    if (novo === null || alcance === null) setTexto(alcance === null ? '' : numero(alcance));
    else if (novo !== alcance) onAlcance(novo);
    else setTexto(numero(alcance));
  };

  const passou = alcance !== null && passouDoAlcance(alcance, andados);
  const origem = daFicha ? 'Vem da ficha do personagem.' : 'Sem ficha, vale o padrão de seis casas.';
  return (
    <span className={`mapa-movimento-turno${passou ? ' passou' : ''}`}>
      Movimento <strong>{numero(andados)}</strong>
      {alcance !== null && (
        <>
          {' / '}
          <input
            className={`mapa-movimento-alcance${ajustado ? ' ajustado' : ''}`}
            value={texto}
            inputMode="decimal"
            maxLength={5}
            aria-label={`Quanto anda por turno, em ${unidade}`}
            title={`Quanto anda por turno. ${origem} Mude aqui se este turno pedir outro valor: o ajuste vale só neste aparelho.`}
            onChange={(evento) => setTexto(evento.target.value)}
            onBlur={gravar}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') evento.currentTarget.blur();
              if (evento.key === 'Escape') {
                evento.stopPropagation();
                setTexto(numero(alcance));
                evento.currentTarget.blur();
              }
            }}
          />
        </>
      )}
      {' '}<strong>{unidade}</strong>
      {ajustado && (
        <button type="button" className="mapa-movimento-restaurar" aria-label={daFicha ? 'Voltar ao Movimento da ficha' : 'Voltar ao alcance padrão'} title={daFicha ? 'Voltar ao Movimento da ficha' : 'Voltar ao alcance padrão'} onClick={onRestaurar}>
          <RotateCcw size={11} />
        </button>
      )}
    </span>
  );
};
