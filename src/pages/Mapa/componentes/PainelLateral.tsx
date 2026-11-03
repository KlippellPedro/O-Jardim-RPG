import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Crosshair, ScrollText, Swords, UsersRound } from 'lucide-react';
import { useSessaoStore, type EntidadeIniciativa } from '../../../store/useSessaoStore';
import { SessionLogPanel } from '../../Sessao/components/SessionLogPanel';
import { urlImagemDoToken, type IBarraToken, type ITokenMapa } from '../../../services/mapaApi';
import { CORES_LADO } from '../motor/molduras';
import { iniciais } from '../motor/geometria';

export type AbaLateral = 'iniciativa' | 'fichas' | 'rolagens';

interface Props {
  aba: AbaLateral;
  onAba: (aba: AbaLateral) => void;
  campanhaId: string;
  tokens: ITokenMapa[];
  onCentralizar: (token: ITokenMapa) => void;
}

export function tokenDaEntidade(entidade: EntidadeIniciativa, tokens: ITokenMapa[]): ITokenMapa | undefined {
  return tokens.find((t) => t.participante_id === entidade.id)
    ?? (entidade.personagemId ? tokens.find((t) => t.personagem_id === entidade.personagemId) : undefined)
    ?? tokens.find((t) => t.nome === entidade.nome);
}

/** Os personagens de jogador que estão no mapa (um cartão por personagem). */
export function personagensDoMapa(tokens: ITokenMapa[]): ITokenMapa[] {
  const vistos = new Set<string>();
  const saida: ITokenMapa[] = [];
  for (const token of tokens) {
    if (token.lado !== 'jogador' && !token.personagem_id) continue;
    const chave = token.personagem_id ?? token.id;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(token);
  }
  // O próprio personagem primeiro; depois em ordem de nome.
  return saida.sort((a, b) => Number(b.e_meu) - Number(a.e_meu) || a.nome.localeCompare(b.nome, 'pt-BR'));
}

const Iniciativa = ({ tokens, onCentralizar }: Pick<Props, 'tokens' | 'onCentralizar'>) => {
  const { iniciativa, turnoAtualId, emCombate, rodada, comando, proximoTurno, turnoAnterior } = useSessaoStore();
  if (!iniciativa.length) return <p className="mapa-vazio">Ninguém na iniciativa ainda. O Mestre monta a ordem na Sessão.</p>;
  return (
    <div className="mapa-iniciativa">
      <div className="mapa-iniciativa-topo">
        <span>{emCombate ? <>Rodada <strong>{rodada}</strong></> : 'Ordem de iniciativa'}</span>
        {emCombate && comando && (
          <span className="mapa-iniciativa-controles">
            <button type="button" className="mapa-icone" aria-label="Turno anterior" onClick={() => void turnoAnterior()}><ChevronLeft size={16} /></button>
            <button type="button" className="mapa-botao" onClick={() => void proximoTurno()}>Próximo <ChevronRight size={14} /></button>
          </span>
        )}
      </div>
      <ol>
        {iniciativa.map((entidade) => {
          const token = tokenDaEntidade(entidade, tokens);
          const vez = emCombate && entidade.id === turnoAtualId;
          return (
            <li key={entidade.id} className={`${vez ? 'vez' : ''} lado-${entidade.tipo}${token ? '' : ' sem-token'}`}>
              <button type="button" disabled={!token} onClick={() => token && onCentralizar(token)} aria-label={token ? `${entidade.nome}: mostrar no mapa` : `${entidade.nome}: sem token nesta cena`}>
                <span className="mapa-iniciativa-numero">{entidade.iniciativa}</span>
                <span className="mapa-iniciativa-nome">{entidade.nome}</span>
                {vez && <span className="mapa-iniciativa-vez">Vez</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const NOMES_BARRA: Record<IBarraToken['tipo'], string> = { vida: 'Vida', mana: 'Mana', estamina: 'Estamina', sanidade: 'Sanidade' };

const Barra = ({ barra }: { barra: IBarraToken }) => {
  const fracao = barra.fracao ?? (barra.maximo ? Math.max(0, Math.min(1, (barra.atual ?? 0) / barra.maximo)) : 0);
  return (
    <div className={`mapa-cartao-barra barra-${barra.tipo}`}>
      <span className="mapa-cartao-barra-nome">{NOMES_BARRA[barra.tipo]}</span>
      <span className="mapa-cartao-barra-trilho"><span style={{ width: `${fracao * 100}%` }} /></span>
      <span className="mapa-cartao-barra-valor">{barra.rotulo ?? `${barra.atual}/${barra.maximo}`}</span>
    </div>
  );
};

const Cartao = ({ token, campanhaId, onAbrir, onCentralizar }: { token: ITokenMapa; campanhaId: string; onAbrir: (() => void) | null; onCentralizar: () => void }) => (
  <article className={`mapa-cartao${token.e_meu ? ' meu' : ''}`}>
    <button type="button" className="mapa-cartao-corpo" onClick={onAbrir ?? onCentralizar} aria-label={onAbrir ? `Abrir a ficha de ${token.nome}` : `Mostrar ${token.nome} no mapa`}>
      <span className="mapa-cartao-retrato" style={{ borderColor: CORES_LADO[token.lado] }}>
        {token.imagem ? <img src={urlImagemDoToken(campanhaId, token.id, token.imagem)} alt="" loading="lazy" /> : <span>{iniciais(token.nome)}</span>}
      </span>
      <span className="mapa-cartao-titulo">
        <strong>{token.nome}</strong>
        <small>{[token.nivel ? `Nível ${token.nivel}` : null, token.e_meu ? 'Seu personagem' : null].filter(Boolean).join(' · ') || 'Personagem'}</small>
      </span>
    </button>
    {token.barras.length > 0 && (
      <div className="mapa-cartao-barras">
        {token.barras.map((barra) => <Barra key={barra.tipo} barra={barra} />)}
      </div>
    )}
    {token.condicoes.length > 0 && (
      <ul className="mapa-cartao-condicoes" aria-label="Condições">
        {token.condicoes.map((condicao) => <li key={condicao}>{condicao}</li>)}
      </ul>
    )}
    <div className="mapa-cartao-acoes">
      {onAbrir && <button type="button" className="mapa-botao" onClick={onAbrir}>Abrir ficha</button>}
      <button type="button" className="mapa-botao-leve" onClick={onCentralizar}><Crosshair size={13} /> No mapa</button>
    </div>
  </article>
);

const Fichas = ({ tokens, campanhaId, onCentralizar }: Pick<Props, 'tokens' | 'campanhaId' | 'onCentralizar'>) => {
  const personagens = useMemo(() => personagensDoMapa(tokens), [tokens]);
  const [aberta, setAberta] = useState<{ id: string; nome: string } | null>(null);
  // A ficha aberta que saiu da cena volta para a lista.
  useEffect(() => {
    if (aberta && !personagens.some((t) => t.personagem_id === aberta.id)) setAberta(null);
  }, [personagens, aberta]);

  if (aberta) {
    return (
      <div className="mapa-ficha">
        <div className="mapa-ficha-topo">
          <button type="button" className="mapa-botao-leve" onClick={() => setAberta(null)}><ArrowLeft size={14} /> Fichas</button>
          <strong>{aberta.nome}</strong>
        </div>
        {/* A ficha inteira, sem o menu do site: rolagens e abas funcionam como na página dela. */}
        <iframe key={aberta.id} title={`Ficha de ${aberta.nome}`} src={`/ficha/${aberta.id}?embutida=1`} />
      </div>
    );
  }
  if (!personagens.length) return <p className="mapa-vazio">Nenhum personagem de jogador nesta cena ainda.</p>;
  return (
    <div className="mapa-cartoes">
      {personagens.map((token) => (
        <Cartao
          key={token.personagem_id ?? token.id}
          token={token}
          campanhaId={campanhaId}
          // A ficha abre para o dono e para o Mestre (só eles recebem o id do personagem).
          onAbrir={token.personagem_id ? () => setAberta({ id: token.personagem_id!, nome: token.nome }) : null}
          onCentralizar={() => onCentralizar(token)}
        />
      ))}
    </div>
  );
};

export const PainelLateral = ({ aba, onAba, campanhaId, tokens, onCentralizar }: Props) => {
  const quantos = useMemo(() => personagensDoMapa(tokens).length, [tokens]);
  const abas = [
    { id: 'iniciativa' as const, rotulo: 'Iniciativa', icone: Swords, contagem: 0 },
    { id: 'fichas' as const, rotulo: 'Fichas', icone: UsersRound, contagem: quantos },
    { id: 'rolagens' as const, rotulo: 'Rolagens', icone: ScrollText, contagem: 0 },
  ];
  return (
    <div className="mapa-lateral-conteudo">
      <div className="mapa-abas" role="tablist">
        {abas.map(({ id, rotulo, icone: Icone, contagem }) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} className={aba === id ? 'ativo' : ''} onClick={() => onAba(id)}>
            <Icone size={14} /> {rotulo}
            {contagem > 0 && <span className="mapa-aba-contagem">{contagem}</span>}
          </button>
        ))}
      </div>
      <div className="mapa-lateral-corpo">
        {aba === 'iniciativa' && <Iniciativa tokens={tokens} onCentralizar={onCentralizar} />}
        {aba === 'fichas' && <Fichas tokens={tokens} campanhaId={campanhaId} onCentralizar={onCentralizar} />}
        {aba === 'rolagens' && <SessionLogPanel />}
      </div>
    </div>
  );
};
