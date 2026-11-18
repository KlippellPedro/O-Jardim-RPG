import { useEffect, useState, type CSSProperties } from 'react';
import { BookOpen, Crown, Trophy } from 'lucide-react';
import { engajamentoApi, type IRank, type PeriodoRank } from '../../services/engajamentoApi';
import { lideresDoRank, type ColunaRank } from './quadro';
import { CORES_DO_RANK as CORES, ICONES_DO_RANK as ICONES } from './titulosDoRank';

const PERIODOS: Array<{ valor: PeriodoRank; rotulo: string }> = [
  { valor: 'campanha', rotulo: 'A campanha toda' },
  { valor: 'ultima', rotulo: 'Última sessão' },
  { valor: 'atual', rotulo: 'Ao vivo agora' },
];

const COLUNAS: Array<{ chave: ColunaRank; rotulo: string; cor: string }> = [
  { chave: 'rolagens', rotulo: 'Rolagens', cor: '#93c5fd' },
  { chave: 'criticos', rotulo: '20 natural', cor: '#fde047' },
  { chave: 'falhas', rotulo: '1 natural', cor: '#c4b5fd' },
  { chave: 'dano_maximo', rotulo: 'Maior golpe', cor: '#fdba74' },
  { chave: 'lunaris_gastos', rotulo: 'Lunaris gastos', cor: '#fcd34d' },
];

const numero = (valor: number) => valor.toLocaleString('pt-BR');

export const AbaRank = ({ campanhaId }: { campanhaId: string }) => {
  const [periodo, setPeriodo] = useState<PeriodoRank>('campanha');
  const [rank, setRank] = useState<IRank | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    setRank(null);
    engajamentoApi.rank(campanhaId, periodo)
      .then((resposta) => { if (ativo) { setRank(resposta); setErro(''); } })
      .catch((falha) => { if (ativo) setErro(falha instanceof Error ? falha.message : 'Não foi possível montar o rank.'); });
    return () => { ativo = false; };
  }, [campanhaId, periodo]);

  const lideres = rank ? lideresDoRank(rank.jogadores) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="qd-rank__topo">
        <p>Números da mesa, em tom de brincadeira. Ninguém ganha nada além do título e da fama de contar essa história depois.</p>
        <div className="qd-segmentos" role="group" aria-label="Período do rank">
          {PERIODOS.map((item) => (
            <button key={item.valor} type="button" aria-pressed={periodo === item.valor} onClick={() => setPeriodo(item.valor)} className={`qd-segmento ${periodo === item.valor ? 'is-ativo' : ''}`}>{item.rotulo}</button>
          ))}
        </div>
      </div>

      {erro ? <p role="alert" className="qd-erro">{erro}</p> : null}
      {!rank && !erro ? <p className="qd-carregando" aria-busy="true">Contando os dados...</p> : null}

      {rank && rank.titulos.length === 0 ? (
        <div className="qd-vazio">
          <Trophy size={28} aria-hidden="true" />
          <strong>Nenhum título ainda</strong>
          <p>{periodo === 'campanha' ? 'Ainda não há números para premiar. Role uns dados e volte aqui.' : periodo === 'atual' ? 'Não há sessão ao vivo com números ainda.' : 'Nenhuma sessão encerrada com números ainda.'}</p>
        </div>
      ) : null}

      {rank && rank.titulos.length ? (
        <div className="qd-medalhas">
          {rank.titulos.map((titulo) => {
            const Icone = ICONES[titulo.chave] ?? Crown;
            const cor = CORES[titulo.chave] ?? '#c7a44c';
            return (
              <article key={titulo.chave} className="qd-medalha" style={{ '--cor': cor } as CSSProperties}>
                <div className="qd-medalha__emblema" aria-hidden="true">
                  <span className="qd-medalha__fita qd-medalha__fita--esq" />
                  <span className="qd-medalha__fita qd-medalha__fita--dir" />
                  <span className="qd-medalha__disco"><Icone size={26} /></span>
                </div>
                <h3 className="qd-medalha__titulo">{titulo.titulo}</h3>
                <p className="qd-medalha__nome">{titulo.nome}</p>
                <p className="qd-medalha__frase">{titulo.frase}</p>
                {titulo.empatados > 1 ? <span className="qd-medalha__empate">Empate com mais {titulo.empatados - 1}</span> : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {rank && rank.jogadores.length > 0 && lideres ? (
        <section aria-label="Livro da mesa" className="qd-painel qd-livro">
          <div className="qd-livro__cabeca">
            <h3 className="qd-painel__titulo"><BookOpen size={16} aria-hidden="true" /> Livro da mesa</h3>
            <small>A coroa marca quem lidera cada coluna.</small>
          </div>
          <div className="qd-livro__rolagem">
            <table>
              <thead>
                <tr>
                  <th scope="col">Personagem</th>
                  {COLUNAS.map((coluna) => <th key={coluna.chave} scope="col">{coluna.rotulo}</th>)}
                </tr>
              </thead>
              <tbody>
                {rank.jogadores.map((jogador) => (
                  <tr key={jogador.personagem_id}>
                    <td>{jogador.nome}</td>
                    {COLUNAS.map((coluna) => {
                      const valor = Number(jogador[coluna.chave]) || 0;
                      const lider = valor > 0 && valor === lideres[coluna.chave];
                      return (
                        <td key={coluna.chave} className={lider ? 'is-lider' : ''} style={lider ? { '--lider': coluna.cor } as CSSProperties : undefined}>
                          {lider ? <Crown size={11} aria-label="Lidera" /> : null}{numero(valor)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
};
