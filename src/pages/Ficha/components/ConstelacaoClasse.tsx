import { useMemo, useState, type CSSProperties } from 'react';
import type { IClasse, TipoRecompensaClasse } from '../../../types/catalogo';
import { formatarRecompensaClasse } from '../../../services/classeService';
import { posicaoDaEstrela, tipoPrincipalDoNivel } from '../utils/constelacaoClasse';
import './constelacaoClasse.css';

interface ConstelacaoClasseProps {
  classe: IClasse;
  nivel: number;
}

const COR: Record<TipoRecompensaClasse | 'vazio', string> = {
  poder: '#c4b5fd',
  habilidade: '#7dd3fc',
  grau_pericia: '#6ee7b7',
  evento: '#fdba74',
  habilidade_final: '#fde68a',
  vazio: '#94a3b8',
};

const ROTULO: Record<TipoRecompensaClasse | 'vazio', string> = {
  poder: 'Poder',
  habilidade: 'Habilidade',
  grau_pericia: 'Grau de perícia',
  evento: 'Evento',
  habilidade_final: 'Habilidade final',
  vazio: 'Sem recompensa',
};

/** Os 20 níveis da classe como um céu de estrelas: as conquistadas acendem, a
 * atual pulsa e as que faltam ficam apagadas. Só apresenta o que a tabela já diz. */
export function ConstelacaoClasse({ classe, nivel }: ConstelacaoClasseProps) {
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const niveis = useMemo(() => {
    const porNivel = new Map((classe.progressao ?? []).map((item) => [item.nivel, item]));
    return Array.from({ length: 20 }, (_, indice) => {
      const numero = indice + 1;
      const item = porNivel.get(numero);
      return { numero, recompensas: item?.recompensas ?? [], tipo: tipoPrincipalDoNivel(item?.recompensas), pos: posicaoDaEstrela(numero) };
    });
  }, [classe.progressao]);

  const foco = niveis.find((item) => item.numero === (escolhido ?? nivel)) ?? niveis[0];

  return (
    <div className="constelacao">
      <div className="constelacao__ceu" role="group" aria-label={`Progressão de ${classe.titulo}, nível ${nivel} de 20`}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="constelacao__linhas" aria-hidden="true">
          {niveis.slice(1).map((item, indice) => {
            const anterior = niveis[indice];
            const acesa = item.numero <= nivel;
            return (
              <line
                key={item.numero}
                x1={anterior.pos.x}
                y1={anterior.pos.y}
                x2={item.pos.x}
                y2={item.pos.y}
                vectorEffect="non-scaling-stroke"
                className={acesa ? 'constelacao__linha constelacao__linha--acesa' : 'constelacao__linha'}
              />
            );
          })}
        </svg>
        {niveis.map((item) => {
          const conquistado = item.numero <= nivel;
          const atual = item.numero === nivel;
          const chave = item.tipo ?? 'vazio';
          return (
            <button
              key={item.numero}
              type="button"
              onClick={() => setEscolhido((antes) => (antes === item.numero ? null : item.numero))}
              aria-pressed={foco.numero === item.numero}
              aria-label={`Nível ${item.numero}: ${ROTULO[chave]}${atual ? ', nível atual' : conquistado ? ', conquistado' : ', ainda não alcançado'}`}
              className={[
                'constelacao__estrela',
                `constelacao__estrela--${chave}`,
                conquistado ? 'constelacao__estrela--acesa' : '',
                atual ? 'constelacao__estrela--atual' : '',
                foco.numero === item.numero ? 'constelacao__estrela--foco' : '',
              ].join(' ')}
              style={{ left: `${item.pos.x}%`, top: `${item.pos.y}%`, '--estrela-cor': COR[chave], '--estrela-atraso': `${(item.numero * 370) % 2400}ms` } as CSSProperties}
            >
              <span className="constelacao__forma" />
              <span className="constelacao__numero">{item.numero}</span>
            </button>
          );
        })}
      </div>

      <div className="constelacao__legenda" aria-hidden="true">
        {(['poder', 'habilidade', 'grau_pericia', 'evento', 'habilidade_final'] as const).map((tipo) => (
          <span key={tipo}><i style={{ background: COR[tipo] }} />{ROTULO[tipo]}</span>
        ))}
      </div>

      <div className="constelacao__detalhe" aria-live="polite">
        <strong style={{ color: foco.numero <= nivel ? COR[foco.tipo ?? 'vazio'] : undefined }}>
          Nível {foco.numero}
          {foco.numero === nivel ? ' · você está aqui' : foco.numero < nivel ? ' · conquistado' : ' · à frente'}
        </strong>
        <p>{foco.recompensas.map(formatarRecompensaClasse).join(', ') || 'Sem recompensa registrada.'}</p>
      </div>
    </div>
  );
}
