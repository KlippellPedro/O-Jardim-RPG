import { useId } from 'react';
import type { CSSProperties } from 'react';
import { Camera } from 'lucide-react';
import type { EfeitoAtmosfericoFicha } from '../fichaTheme';
import { GLIFOS, escurecerHex, iniciaisDoNome, molduraDoRetrato } from '../utils/retrato';
import './retrato.css';

interface RetratoPersonagemProps {
  nome: string;
  foto?: string | null;
  nivel: number;
  /** Cor de destaque do tema visual (classe, ou raça se não houver classe). */
  destaque: string;
  segunda: string;
  efeito: EfeitoAtmosfericoFicha;
  /** Lado em px. O retrato é quadrado. */
  tamanho?: number;
  /** Quando informado, aparece o botão de trocar a foto. */
  onEditar?: () => void;
  mostrarNivel?: boolean;
}

/** Retrato do personagem: a foto quando existe, ou uma composição feita com as
 * cores da classe e da raça, o símbolo da atmosfera da classe e as iniciais.
 * A moldura muda a cada 5 níveis, até o 60. */
export const RetratoPersonagem = ({
  nome,
  foto,
  nivel,
  destaque,
  segunda,
  efeito,
  tamanho = 96,
  onEditar,
  mostrarNivel = true,
}: RetratoPersonagemProps) => {
  const moldura = molduraDoRetrato(nivel);
  const idGradiente = `retrato-fundo-${useId().replace(/:/g, '')}`;
  const glifo = GLIFOS[efeito] || GLIFOS.arcano;
  const iniciais = iniciaisDoNome(nome);

  const estilo = {
    width: tamanho,
    height: tamanho,
    '--moldura-fio': moldura.fio,
    '--moldura-fio2': moldura.fio2,
    '--moldura-brilho': moldura.brilho,
  } as CSSProperties;

  const posicoesJoias = (['tl', 'tr', 'bl', 'br'] as const).slice(0, moldura.joias);

  return (
    <div
      className={`retrato retrato--${moldura.chave}${moldura.aro ? ' retrato--aro' : ''}${moldura.animada ? ' retrato--animada' : ''}`}
      style={estilo}
      title={moldura.rotulo ? `${moldura.rotulo} • nível ${nivel}` : `Nível ${nivel}`}
    >
      <div className="retrato__miolo">
        {foto ? (
          <img src={foto} alt={`Retrato de ${nome || 'personagem'}`} loading="lazy" decoding="async" draggable={false} />
        ) : (
          <svg viewBox="0 0 100 100" role="img" aria-label={`Retrato composto de ${nome || 'personagem'}`} preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id={idGradiente} cx="50%" cy="38%" r="80%">
                <stop offset="0%" stopColor={destaque} stopOpacity="0.55" />
                <stop offset="55%" stopColor={escurecerHex(destaque, 0.32)} />
                <stop offset="100%" stopColor={escurecerHex(segunda, 0.16)} />
              </radialGradient>
            </defs>
            <rect width="100" height="100" fill={`url(#${idGradiente})`} />
            <circle cx="50" cy="50" r="41" fill="none" stroke={segunda} strokeOpacity="0.35" strokeWidth="0.8" strokeDasharray="1.5 3" />
            <path
              d={glifo.d}
              fill="none"
              stroke={destaque}
              strokeOpacity="0.42"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(12 12) scale(0.76)"
            />
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="Cinzel, Georgia, serif"
              fontWeight="700"
              fontSize={iniciais.length > 1 ? 34 : 44}
              fill="#fff"
              fillOpacity="0.94"
              stroke="rgba(0,0,0,0.45)"
              strokeWidth="0.8"
              paintOrder="stroke"
            >
              {iniciais}
            </text>
          </svg>
        )}
        {onEditar ? (
          <button
            type="button"
            className="retrato__editar"
            onClick={onEditar}
            aria-label={foto ? 'Trocar foto do personagem' : 'Adicionar foto do personagem'}
          >
            <Camera size={Math.max(16, Math.round(tamanho * 0.22))} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {posicoesJoias.map((posicao) => <span key={posicao} aria-hidden="true" className={`retrato__joia retrato__joia--${posicao} retrato__joia--${moldura.forma}`} />)}
      {mostrarNivel ? <span className="retrato__nivel">NV {nivel}</span> : null}
    </div>
  );
};
