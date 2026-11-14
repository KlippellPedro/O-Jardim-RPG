import { useSessaoStore } from '../../../store/useSessaoStore';
import { urlImagemDoToken, type ITokenMapa } from '../../../services/mapaApi';
import { CORES_LADO } from '../motor/molduras';
import { iniciais } from '../motor/geometria';
import { tokenDaEntidade } from './PainelLateral';
import { ordemDaFaixa } from './faixaDeIniciativaConta';

interface Props {
  campanhaId: string;
  tokens: ITokenMapa[];
  onCentralizar: (token: ITokenMapa) => void;
}

/** Quantos retratos cabem na faixa; os outros entram no "+N". */
const MAXIMO_NA_FAIXA = 10;

/**
 * A ordem do turno em retratos, no alto do mapa: quem age agora à esquerda (aceso) e os próximos em seguida.
 * Só mostra quem a Sessão mostra a quem olha, então escondido e desconhecido seguem os degraus de sempre.
 * Clicar num retrato leva a tela ao token, se ele está nesta cena.
 */
export const FaixaDeIniciativa = ({ campanhaId, tokens, onCentralizar }: Props) => {
  const iniciativa = useSessaoStore((s) => s.iniciativa);
  const turnoAtualId = useSessaoStore((s) => s.turnoAtualId);
  const emCombate = useSessaoStore((s) => s.emCombate);
  const rodada = useSessaoStore((s) => s.rodada);
  if (!emCombate || iniciativa.length < 2) return null;

  const ordem = ordemDaFaixa(iniciativa, turnoAtualId);
  const visiveis = ordem.slice(0, MAXIMO_NA_FAIXA);
  const resto = ordem.length - visiveis.length;

  return (
    <nav className="mapa-faixa-iniciativa" aria-label="Ordem do turno">
      <span className="mapa-faixa-rodada">Rodada <strong>{rodada}</strong></span>
      <ol>
        {visiveis.map((entidade) => {
          const token = tokenDaEntidade(entidade, tokens);
          const vez = entidade.id === turnoAtualId;
          return (
            <li key={entidade.id} className={vez ? 'vez' : ''}>
              <button
                type="button"
                disabled={!token}
                title={`${entidade.nome} · iniciativa ${entidade.iniciativa}${vez ? ' · vez' : ''}${token ? '' : ' · sem token nesta cena'}`}
                aria-label={token ? `${entidade.nome}${vez ? ', é a vez' : ''}: mostrar no mapa` : `${entidade.nome}: sem token nesta cena`}
                onClick={() => token && onCentralizar(token)}
              >
                <span className="mapa-faixa-retrato" style={token ? { borderColor: CORES_LADO[token.lado] } : undefined}>
                  {token?.imagem
                    ? <img src={urlImagemDoToken(campanhaId, token.id, token.imagem)} alt="" loading="lazy" />
                    : <span>{iniciais(entidade.nome)}</span>}
                </span>
                <small>{entidade.iniciativa}</small>
              </button>
            </li>
          );
        })}
        {resto > 0 && <li className="mais" aria-label={`Mais ${resto} na ordem`}>+{resto}</li>}
      </ol>
    </nav>
  );
};
