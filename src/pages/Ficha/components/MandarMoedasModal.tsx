import { useEffect, useRef, useState } from 'react';
import { Coins, RefreshCw, Send, X } from 'lucide-react';
import { personagensApi } from '../../../services/personagensApi';
import { Select } from '../../../components/ui/Select';
import { MOEDAS_TROCA } from '../../../services/trocasApi';

interface IMandarMoedasModalProps {
  personagemId: string;
  carteira: Array<{ moeda: string; saldo: number }>;
  /** Salva o que estiver pendente na ficha antes de as moedas saírem. */
  antesDeMandar: () => Promise<boolean>;
  onMandado: (texto: string) => void;
  onFechar: () => void;
}

/** Manda moedas da carteira para outro personagem da campanha. */
export const MandarMoedasModal = ({ personagemId, carteira, antesDeMandar, onMandado, onFechar }: IMandarMoedasModalProps) => {
  const comSaldo = MOEDAS_TROCA
    .map((moeda) => ({ moeda, saldo: carteira.find((item) => item.moeda === moeda)?.saldo ?? 0 }))
    .filter((item) => item.saldo > 0);
  const [destinos, setDestinos] = useState<Array<{ id: string; nome: string; dono_nome: string | null }> | null>(null);
  const [destino, setDestino] = useState('');
  const [moeda, setMoeda] = useState<string>(comSaldo[0]?.moeda ?? 'Lunaris');
  const [valor, setValor] = useState(1);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const chave = useRef(`moeda-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  const saldo = comSaldo.find((item) => item.moeda === moeda)?.saldo ?? 0;

  useEffect(() => {
    let cancelado = false;
    personagensApi.destinosDeEnvio(personagemId)
      .then((resposta) => {
        if (cancelado) return;
        setDestinos(resposta.personagens);
        if (resposta.personagens.length === 1) setDestino(resposta.personagens[0].id);
      })
      .catch(() => { if (!cancelado) setErro('Não foi possível carregar os personagens da campanha.'); });
    return () => { cancelado = true; };
  }, [personagemId]);

  const confirmar = async () => {
    if (!destino || busy || valor < 1 || valor > saldo) return;
    setBusy(true);
    setErro(null);
    try {
      if (!(await antesDeMandar())) throw new Error('Não foi possível salvar as alterações pendentes da ficha.');
      const resultado = await personagensApi.mandarMoedas(personagemId, destino, moeda, valor, chave.current);
      onMandado(`${resultado.valor} ${resultado.moeda} foram para ${resultado.destino.nome}.`);
    } catch (error) {
      setErro(error instanceof Error && error.message ? error.message : 'Não foi possível mandar as moedas.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Mandar moedas" onClick={onFechar}>
      <div className="w-full max-w-md rounded-3xl border border-amber-300/20 bg-[#100e0b] p-6 shadow-2xl" onClick={(evento) => evento.stopPropagation()}>
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300"><Coins size={14} aria-hidden="true" /> Mandar moedas</p>
            <p className="mt-1 text-xs text-gray-400">Sai da sua carteira e cai na carteira de quem você escolher.</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"><X size={18} /></button>
        </header>

        {comSaldo.length === 0 ? (
          <p className="text-sm text-gray-400">A carteira está vazia.</p>
        ) : destinos === null && !erro ? (
          <p className="flex items-center gap-2 text-sm text-gray-400"><RefreshCw size={14} className="animate-spin" /> Carregando a mesa…</p>
        ) : destinos && destinos.length === 0 ? (
          <p className="text-sm text-gray-400">Não há outro personagem ativo nesta campanha.</p>
        ) : destinos ? (
          <>
            <fieldset className="mb-4">
              <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Para quem?</legend>
              <div className="custom-scrollbar grid max-h-48 gap-2 overflow-y-auto">
                {destinos.map((opcao) => (
                  <label key={opcao.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${destino === opcao.id ? 'border-amber-300/50 bg-amber-300/10 text-white' : 'border-white/10 text-gray-300'}`}>
                    <input type="radio" name="destino-das-moedas" checked={destino === opcao.id} onChange={() => setDestino(opcao.id)} />
                    <span className="min-w-0 flex-1 truncate">{opcao.nome}</span>
                    {opcao.dono_nome ? <span className="shrink-0 text-xs text-gray-500">{opcao.dono_nome}</span> : null}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mb-1 flex items-end gap-3">
              <label className="flex-1 text-xs font-bold uppercase tracking-widest text-gray-500">
                Moeda
                <Select
                  value={moeda}
                  onChange={(valorEscolhido) => { setMoeda(valorEscolhido); setValor(1); }}
                  ariaLabel="Moeda"
                  options={comSaldo.map((item) => ({ value: item.moeda, label: `${item.moeda} (${item.saldo})` }))}
                  className="mt-1 w-full normal-case tracking-normal"
                />
              </label>
              <label className="w-28 text-xs font-bold uppercase tracking-widest text-gray-500">
                Quanto
                <input type="number" min={1} max={saldo} value={valor} onChange={(evento) => setValor(Math.max(1, Math.min(saldo, Math.trunc(Number(evento.target.value) || 1))))} className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-black/40 text-center text-sm font-bold text-white outline-none focus:border-amber-300/50" />
              </label>
            </div>
            <button type="button" onClick={() => setValor(saldo)} className="mb-4 text-xs font-bold text-amber-300/80 hover:text-amber-200">tudo ({saldo})</button>
          </>
        ) : null}

        {erro ? <p role="alert" className="mb-3 rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-200">{erro}</p> : null}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:text-white">Cancelar</button>
          <button type="button" onClick={() => void confirmar()} disabled={!destino || busy || saldo < 1} className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-amber-300 disabled:opacity-40">
            {busy ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />} Mandar
          </button>
        </div>
      </div>
    </div>
  );
};
