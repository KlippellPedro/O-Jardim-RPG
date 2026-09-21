import { useState } from 'react';
import { Check, EyeOff, Plus, Vote, X } from 'lucide-react';
import type { IVotacao } from '../../../services/mesaApi';

interface IAbaVotacaoProps {
  votacao: IVotacao | null;
  ultima: IVotacao | null;
  gestor: boolean;
  ocupado: boolean;
  agir: (acao: string, dados?: Record<string, unknown>) => Promise<boolean>;
}

const percentual = (votos: number, maior: number) => (maior > 0 ? (votos / maior) * 100 : 0);

/** Barras de resultado: cada opção enche de acordo com os votos, a líder ganha ouro. */
const Resultado = ({ votacao, destaque }: { votacao: IVotacao; destaque: boolean }) => {
  const maior = Math.max(0, ...votacao.opcoes.map((opcao) => opcao.votos));
  return (
    <ul className="space-y-2">
      {votacao.opcoes.map((opcao) => {
        const lider = destaque && opcao.votos > 0 && opcao.votos === maior;
        return (
          <li key={opcao.id} className={`mesa-opcao ${lider ? 'mesa-opcao--lider' : ''}`}>
            <span className="mesa-opcao__preenchimento" style={{ width: `${percentual(opcao.votos, Math.max(1, votacao.total_votos))}%` }} aria-hidden="true" />
            <span className={lider ? 'text-[#f3dc8f]' : ''}>
              {opcao.texto}
              {opcao.votantes && opcao.votantes.length ? <span className="block text-[11px] font-normal text-gray-400">{opcao.votantes.join(', ')}</span> : null}
            </span>
            <span className="text-sm tabular-nums text-gray-200">{opcao.votos}{votacao.total_votos > 0 ? <small className="ml-1 text-gray-500">{Math.round(percentual(opcao.votos, votacao.total_votos))}%</small> : null}</span>
          </li>
        );
      })}
    </ul>
  );
};

export const AbaVotacao = ({ votacao, ultima, gestor, ocupado, agir }: IAbaVotacaoProps) => {
  const [pergunta, setPergunta] = useState('');
  const [opcoes, setOpcoes] = useState<string[]>(['', '']);
  const [anonima, setAnonima] = useState(false);

  const validas = opcoes.map((texto) => texto.trim()).filter(Boolean);

  const abrir = async () => {
    if (!pergunta.trim() || validas.length < 2) return;
    if (await agir('votacao_abrir', { pergunta, opcoes: validas, anonima })) {
      setPergunta('');
      setOpcoes(['', '']);
      setAnonima(false);
    }
  };

  return (
    <div className="space-y-6">
      {votacao ? (
        <section className="mesa-cartao mesa-cartao--ouro" aria-label="Votação em andamento">
          <p className="mesa-titulo !mb-2 !text-[#c7a44c]">
            <Vote size={14} /> Votação aberta
            {votacao.anonima ? <span className="ml-1 flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[10px] tracking-wider text-gray-300"><EyeOff size={11} /> voto secreto</span> : null}
          </p>
          <h3 className="mb-4 text-xl font-bold leading-snug text-white sm:text-2xl" style={{ fontFamily: 'Cinzel, serif' }}>{votacao.pergunta}</h3>
          {gestor ? (
            <Resultado votacao={votacao} destaque />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {votacao.opcoes.map((opcao) => {
                const meu = votacao.meu_voto === opcao.id;
                return (
                  <li key={opcao.id}>
                    <button type="button" aria-pressed={meu} disabled={ocupado} onClick={() => void agir('votar', { opcao_id: opcao.id })} className={`mesa-opcao ${meu ? 'mesa-opcao--minha' : ''}`}>
                      <span className="mesa-opcao__preenchimento" style={{ width: `${percentual(opcao.votos, Math.max(1, votacao.total_votos))}%` }} aria-hidden="true" />
                      <span>{opcao.texto}</span>
                      {meu ? <Check size={18} className="text-[#f3dc8f]" aria-label="Seu voto" /> : <span className="text-xs tabular-nums text-gray-400">{opcao.votos}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-400" role="status">
              <strong className="text-gray-200">{votacao.total_votos}</strong> de {votacao.total_elegiveis} já votaram.{gestor ? '' : ' Você pode trocar o voto até o Mestre encerrar.'}
            </p>
            {gestor ? <button type="button" disabled={ocupado} onClick={() => void agir('votacao_fechar')} className="mesa-botao mesa-botao--perigo">Encerrar votação</button> : null}
          </div>
        </section>
      ) : (
        <div className="mesa-cartao mesa-cartao--vazio">
          <Vote className="mx-auto mb-2 text-gray-600" size={26} aria-hidden="true" />
          Nenhuma votação aberta agora.{gestor ? ' Abra uma abaixo para o grupo decidir junto.' : ''}
        </div>
      )}

      {gestor && !votacao ? (
        <form className="mesa-cartao space-y-3" onSubmit={(evento) => { evento.preventDefault(); void abrir(); }}>
          <h3 className="mesa-titulo"><Plus size={14} /> Nova votação</h3>
          <input className="mesa-campo" value={pergunta} maxLength={200} onChange={(evento) => setPergunta(evento.target.value)} placeholder="O que o grupo decide?" aria-label="Pergunta da votação" />
          <div className="grid gap-2 sm:grid-cols-2">
            {opcoes.map((texto, indice) => (
              <div key={indice} className="flex gap-2">
                <input className="mesa-campo min-w-0 flex-1" value={texto} maxLength={80} onChange={(evento) => setOpcoes((atual) => atual.map((item, i) => (i === indice ? evento.target.value : item)))} placeholder={`Opção ${indice + 1}`} aria-label={`Opção ${indice + 1}`} />
                {opcoes.length > 2 ? <button type="button" className="mesa-botao mesa-botao--icone" aria-label={`Remover opção ${indice + 1}`} onClick={() => setOpcoes((atual) => atual.filter((_, i) => i !== indice))}><X size={15} /></button> : null}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {opcoes.length < 6 ? <button type="button" className="mesa-botao mesa-botao--pequeno" onClick={() => setOpcoes((atual) => [...atual, ''])}><Plus size={13} /> Opção</button> : null}
            <label className="flex items-center gap-2 text-xs text-gray-400"><input type="checkbox" checked={anonima} onChange={(evento) => setAnonima(evento.target.checked)} /> Voto secreto (só você vê quem votou em quê)</label>
          </div>
          <button type="submit" className="mesa-botao mesa-botao--ouro" disabled={ocupado || !pergunta.trim() || validas.length < 2}>Abrir votação</button>
        </form>
      ) : null}

      {ultima ? (
        <section aria-label="Última votação" className="mesa-cartao">
          <h3 className="mesa-titulo">Última votação</h3>
          <p className="mb-3 font-bold text-gray-100">{ultima.pergunta}</p>
          <Resultado votacao={ultima} destaque />
        </section>
      ) : null}
    </div>
  );
};
