import { useEffect, useState } from 'react';
import { Archive, Crown, Dices, Flame, Hourglass, Skull, Users, X } from 'lucide-react';
import { campanhaPainelApi, type IEpilogo } from '../../services/campanhaPainelApi';
import { textoDeDuracao } from './campanha';

interface IEpilogoModalProps {
  campanhaId: string;
  campanhaNome: string;
  cor: string;
  /** Só o Mestre encerra; os outros só veem os números. */
  podeEncerrar: boolean;
  onEncerrar: () => Promise<void>;
  onFechar: () => void;
}

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** A retrospectiva da campanha. Para o Mestre, é também a tela de confirmação antes de arquivar. */
export const EpilogoModal = ({ campanhaId, campanhaNome, cor, podeEncerrar, onEncerrar, onFechar }: IEpilogoModalProps) => {
  const [dados, setDados] = useState<IEpilogo | null>(null);
  const [erro, setErro] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);

  useEffect(() => {
    let ativo = true;
    campanhaPainelApi.epilogo(campanhaId)
      .then((resposta) => { if (ativo) setDados(resposta); })
      .catch((falha) => { if (ativo) setErro(falha instanceof Error ? falha.message : 'Não foi possível montar o epílogo.'); });
    return () => { ativo = false; };
  }, [campanhaId]);

  const encerrar = async () => {
    setEncerrando(true);
    try {
      await onEncerrar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível encerrar.');
      setEncerrando(false);
    }
  };

  const numeros = dados ? [
    { icone: Hourglass, valor: String(dados.sessoes), rotulo: dados.sessoes === 1 ? 'noite jogada' : 'noites jogadas' },
    { icone: Hourglass, valor: textoDeDuracao(dados.minutos) || '0 min', rotulo: 'de história' },
    { icone: Users, valor: String(dados.jogadores), rotulo: dados.jogadores === 1 ? 'jogador' : 'jogadores' },
    { icone: Dices, valor: String(dados.rolagens), rotulo: 'dados rolados' },
    { icone: Flame, valor: String(dados.criticos), rotulo: '20 naturais' },
    { icone: Skull, valor: String(dados.falhas), rotulo: 'falhas críticas' },
  ] : [];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Epílogo da campanha" onClick={onFechar}>
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl border bg-[#0d0c12] p-6 shadow-2xl sm:p-8" style={{ borderColor: `${cor}55` }} onClick={(evento) => evento.stopPropagation()}>
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: cor }}>Epílogo</p>
            <h2 className="mt-1 text-3xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{campanhaNome}</h2>
            {dados?.primeira ? <p className="mt-1 text-sm text-gray-400">De {data(dados.primeira)}{dados.ultima ? ` a ${data(dados.ultima)}` : ''}</p> : null}
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"><X size={18} /></button>
        </header>

        {erro ? <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{erro}</p> : null}
        {!dados && !erro ? <p className="py-10 text-center text-sm text-gray-500" aria-busy="true">Contando a história...</p> : null}

        {dados ? (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {numeros.map(({ icone: Icone, valor, rotulo }) => (
                <li key={rotulo} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <Icone size={16} style={{ color: cor }} aria-hidden="true" />
                  <p className="mt-2 text-2xl font-bold text-white">{valor}</p>
                  <p className="text-[11px] uppercase tracking-widest text-gray-500">{rotulo}</p>
                </li>
              ))}
            </ul>

            {dados.mvp ? (
              <p className="mt-5 flex items-center gap-3 rounded-2xl border p-4 text-sm text-gray-200" style={{ borderColor: `${cor}44`, backgroundColor: `${cor}12` }}>
                <Crown size={20} style={{ color: cor }} aria-hidden="true" />
                <span><strong className="text-white">{dados.mvp.nome}</strong> foi o MVP da campanha, com {dados.mvp.votos} {dados.mvp.votos === 1 ? 'voto' : 'votos'} ao longo das noites.</span>
              </p>
            ) : null}

            {dados.titulos.length ? (
              <section className="mt-5" aria-label="Títulos da mesa">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500">Títulos da mesa</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {dados.titulos.map((titulo) => (
                    <li key={titulo.chave} className="rounded-xl border border-white/[0.07] bg-black/25 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cor }}>{titulo.titulo}</p>
                      <p className="font-bold text-white">{titulo.nome}</p>
                      <p className="text-xs text-gray-500">{titulo.frase}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}

        {podeEncerrar ? (
          <footer className="mt-7 border-t border-white/10 pt-5">
            {confirmando ? (
              <div className="space-y-3">
                <p className="text-sm leading-6 text-gray-300">Encerrar tira <strong className="text-white">{campanhaNome}</strong> do acesso normal de todos. Fichas e histórico continuam salvos. Tem certeza?</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void encerrar()} disabled={encerrando} className="min-h-11 rounded-xl border border-red-400/40 bg-red-400/10 px-5 text-sm font-bold text-red-200 disabled:opacity-50">{encerrando ? 'Encerrando...' : 'Sim, encerrar a campanha'}</button>
                  <button type="button" onClick={() => setConfirmando(false)} className="min-h-11 rounded-xl px-4 text-sm text-gray-400 hover:text-white">Voltar</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmando(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-bold text-gray-300 hover:border-red-400/40 hover:text-red-200"><Archive size={15} /> Encerrar esta campanha</button>
            )}
          </footer>
        ) : null}
      </div>
    </div>
  );
};
