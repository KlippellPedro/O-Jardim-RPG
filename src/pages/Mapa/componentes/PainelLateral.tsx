import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ScrollText, Swords, UserRound } from 'lucide-react';
import { useSessaoStore, type EntidadeIniciativa } from '../../../store/useSessaoStore';
import { SessionLogPanel } from '../../Sessao/components/SessionLogPanel';
import type { ITokenMapa } from '../../../services/mapaApi';

export type AbaLateral = 'iniciativa' | 'ficha' | 'rolagens';

interface Props {
  aba: AbaLateral;
  onAba: (aba: AbaLateral) => void;
  tokens: ITokenMapa[];
  /** Personagens cuja ficha quem olha pode abrir aqui. */
  fichas: Array<{ id: string; nome: string }>;
  onCentralizar: (token: ITokenMapa) => void;
}

export function tokenDaEntidade(entidade: EntidadeIniciativa, tokens: ITokenMapa[]): ITokenMapa | undefined {
  return tokens.find((t) => t.participante_id === entidade.id)
    ?? (entidade.personagemId ? tokens.find((t) => t.personagem_id === entidade.personagemId) : undefined)
    ?? tokens.find((t) => t.nome === entidade.nome);
}

const Iniciativa = ({ tokens, onCentralizar }: Pick<Props, 'tokens' | 'onCentralizar'>) => {
  const { iniciativa, turnoAtualId, emCombate, rodada, comando, proximoTurno, turnoAnterior } = useSessaoStore();
  if (!iniciativa.length) return <p className="mapa-vazio">Ninguém na iniciativa ainda. O Mestre monta a cena na Sessão.</p>;
  return (
    <div className="mapa-iniciativa">
      {emCombate && (
        <div className="mapa-iniciativa-topo">
          <span>Rodada {rodada}</span>
          {comando && (
            <span className="mapa-iniciativa-controles">
              <button type="button" className="mapa-icone" aria-label="Turno anterior" onClick={() => void turnoAnterior()}><ChevronLeft size={16} /></button>
              <button type="button" className="mapa-botao" onClick={() => void proximoTurno()}>Próximo <ChevronRight size={14} /></button>
            </span>
          )}
        </div>
      )}
      <ol>
        {iniciativa.map((entidade) => {
          const token = tokenDaEntidade(entidade, tokens);
          const vida = entidade.hpTotal ? Math.max(0, Math.min(1, (entidade.hpAtual ?? 0) / entidade.hpTotal)) : null;
          return (
            <li key={entidade.id} className={`${entidade.id === turnoAtualId && emCombate ? 'vez' : ''} lado-${entidade.tipo}`}>
              <button type="button" disabled={!token} onClick={() => token && onCentralizar(token)} title={token ? 'Mostrar no mapa' : 'Sem token nesta cena'}>
                <span className="mapa-iniciativa-numero">{entidade.iniciativa}</span>
                <span className="mapa-iniciativa-nome">{entidade.nome}</span>
                {vida !== null ? (
                  <span className="mapa-iniciativa-vida" aria-label={`Vida ${entidade.hpAtual} de ${entidade.hpTotal}`}>
                    <span style={{ width: `${vida * 100}%` }} />
                  </span>
                ) : entidade.estado_vida ? (
                  <small>{entidade.estado_vida}</small>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const Ficha = ({ fichas }: Pick<Props, 'fichas'>) => {
  const [escolhida, setEscolhida] = useState<string | null>(fichas[0]?.id ?? null);
  useEffect(() => {
    if (!escolhida || !fichas.some((f) => f.id === escolhida)) setEscolhida(fichas[0]?.id ?? null);
  }, [fichas, escolhida]);
  if (!fichas.length) return <p className="mapa-vazio">Seu personagem ainda não está nesta cena.</p>;
  return (
    <div className="mapa-ficha">
      {fichas.length > 1 && (
        <select value={escolhida ?? ''} onChange={(e) => setEscolhida(e.target.value)} aria-label="Ficha">
          {fichas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
      )}
      {/* A ficha inteira, sem o menu do site: rolagens e abas funcionam como na página dela. */}
      {escolhida && <iframe key={escolhida} title="Ficha" src={`/ficha/${escolhida}?embutida=1`} />}
    </div>
  );
};

export const PainelLateral = ({ aba, onAba, tokens, fichas, onCentralizar }: Props) => {
  const abas = useMemo(() => [
    { id: 'iniciativa' as const, rotulo: 'Iniciativa', icone: Swords },
    { id: 'ficha' as const, rotulo: 'Ficha', icone: UserRound },
    { id: 'rolagens' as const, rotulo: 'Rolagens', icone: ScrollText },
  ], []);
  return (
    <div className="mapa-lateral-conteudo">
      <div className="mapa-abas" role="tablist">
        {abas.map(({ id, rotulo, icone: Icone }) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} className={aba === id ? 'ativo' : ''} onClick={() => onAba(id)}>
            <Icone size={14} /> {rotulo}
          </button>
        ))}
      </div>
      <div className="mapa-lateral-corpo">
        {aba === 'iniciativa' && <Iniciativa tokens={tokens} onCentralizar={onCentralizar} />}
        {aba === 'ficha' && <Ficha fichas={fichas} />}
        {aba === 'rolagens' && <SessionLogPanel />}
      </div>
    </div>
  );
};
