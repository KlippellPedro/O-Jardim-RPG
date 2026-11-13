import { useMemo, useState } from 'react';
import { BookOpen, Plus, Search, Trash2, X } from 'lucide-react';
import type { IEstadoToken, ITokenMapa } from '../../../services/mapaApi';
import {
  buscarOpcoes, cartaDoEstado, chaveDoEstado, opcoesDeEstado, type IOpcaoDeEstado,
} from '../motor/estadosToken';
import './estadosDoToken.css';

export interface AcoesDeEstado {
  adicionar: (opcao: IOpcaoDeEstado) => void;
  remover: (estado: IEstadoToken) => void;
  /** Só condição: `null` tira o prazo. */
  mudarRodadas: (nome: string, turnos: number | null) => void;
  /** Só aflição. */
  mudarEstagio: (id: string, estagio: number) => void;
}

interface Props {
  token: ITokenMapa;
  /** O Mestre põe e tira pelo token quando ele está ligado a um participante da Sessão. */
  acoes: AcoesDeEstado | null;
}

/**
 * As condições e aflições do token, como chips; clicar num chip abre a carta, com o texto do Livro de Regras. O Mestre
 * também põe e tira estados por aqui, sem ir à Sessão. Quem recebe o token com identidade vê os estados dele; a aflição que
 * ainda incuba é só do Mestre (o servidor não a manda aos outros).
 */
export const EstadosDoToken = ({ token, acoes }: Props) => {
  const estados = token.estados ?? [];
  const [aberta, setAberta] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const [busca, setBusca] = useState('');
  const opcoes = useMemo(() => opcoesDeEstado(), []);
  const jaTem = useMemo(() => new Set(estados.map(chaveDoEstado)), [estados]);
  const resultados = useMemo(() => (adicionando ? buscarOpcoes(opcoes, busca, jaTem) : []), [adicionando, busca, opcoes, jaTem]);

  const doCard = estados.find((estado) => chaveDoEstado(estado) === aberta) ?? null;
  const carta = doCard ? cartaDoEstado(doCard) : null;

  if (!estados.length && !acoes) return null;

  return (
    <div className="mapa-estados" aria-label={`Condições e aflições de ${token.nome}`}>
      <ul className="mapa-estados-chips">
        {estados.map((estado) => {
          const chave = chaveDoEstado(estado);
          const c = cartaDoEstado(estado);
          return (
            <li key={chave}>
              <button
                type="button"
                className={`mapa-estado-chip tom-${c.tom}${aberta === chave ? ' ativo' : ''}`}
                aria-pressed={aberta === chave}
                title={`Abrir a carta: ${c.titulo}`}
                onClick={() => setAberta((atual) => (atual === chave ? null : chave))}
              >
                {c.chip}
                {estado.tipo === 'condicao' && estado.turnos !== null && <small>{estado.turnos}r</small>}
              </button>
            </li>
          );
        })}
        {acoes && (
          <li>
            <button type="button" className={`mapa-estado-chip novo${adicionando ? ' ativo' : ''}`} aria-pressed={adicionando} onClick={() => { setAdicionando((v) => !v); setBusca(''); }}>
              <Plus size={12} aria-hidden="true" /> Estado
            </button>
          </li>
        )}
      </ul>

      {adicionando && acoes && (
        <div className="mapa-estados-busca">
          <label>
            <Search size={13} aria-hidden="true" />
            <input value={busca} autoFocus placeholder="Condição ou aflição…" aria-label="Buscar condição ou aflição" onChange={(e) => setBusca(e.target.value)} />
          </label>
          {resultados.length ? (
            <ul>
              {resultados.map((opcao) => (
                <li key={opcao.chave}>
                  <button type="button" onClick={() => { acoes.adicionar(opcao); setAdicionando(false); setBusca(''); }}>
                    <span>{opcao.titulo}</span>
                    <small>{opcao.grupo}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="mapa-dica">Nada com esse nome.</p>}
        </div>
      )}

      {carta && doCard && (
        <article className={`mapa-estado-carta tom-${carta.tom}`}>
          <header>
            <span>
              <strong>{carta.titulo}</strong>
              <small>{carta.selo}</small>
            </span>
            <button type="button" className="mapa-icone" aria-label="Fechar a carta" onClick={() => setAberta(null)}><X size={14} /></button>
          </header>
          {carta.blocos.map((bloco) => (
            <section key={bloco.rotulo}>
              <h4>{bloco.rotulo}</h4>
              {bloco.linhas.map((linha) => <p key={linha}>{linha}</p>)}
            </section>
          ))}
          <footer>
            {carta.rota && (
              <a href={carta.rota} target="_blank" rel="noreferrer"><BookOpen size={12} aria-hidden="true" /> Ver no Livro</a>
            )}
            {acoes && doCard.tipo === 'condicao' && (
              <label>
                Rodadas
                <input
                  type="number"
                  min={1}
                  max={999}
                  defaultValue={doCard.turnos ?? ''}
                  placeholder="sem prazo"
                  key={`${carta.chave}-${doCard.turnos ?? 'x'}`}
                  onBlur={(e) => {
                    const valor = e.target.value.trim() === '' ? null : Math.max(1, Math.min(999, Math.trunc(Number(e.target.value)) || 1));
                    if (valor !== doCard.turnos) acoes.mudarRodadas(doCard.nome, valor);
                  }}
                />
              </label>
            )}
            {acoes && doCard.tipo === 'aflicao' && (
              <label>
                Estágio
                <input
                  type="number"
                  min={1}
                  max={9}
                  defaultValue={doCard.estagio}
                  key={`${carta.chave}-${doCard.estagio}`}
                  onBlur={(e) => {
                    const valor = Math.max(1, Math.min(9, Math.trunc(Number(e.target.value)) || 1));
                    if (valor !== doCard.estagio) acoes.mudarEstagio(doCard.id, valor);
                  }}
                />
              </label>
            )}
            {acoes && (
              <button type="button" className="perigo" onClick={() => { acoes.remover(doCard); setAberta(null); }}>
                <Trash2 size={12} aria-hidden="true" /> Tirar
              </button>
            )}
          </footer>
        </article>
      )}
    </div>
  );
};
