import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Send, X } from 'lucide-react';
import { personagensApi } from '../../../services/personagensApi';

interface IMandarItemModalProps {
  personagemId: string;
  itemId: string;
  nome: string;
  quantidade: number;
  /** Salva o que estiver pendente na ficha antes de o item sair. */
  antesDeMandar: () => Promise<boolean>;
  onMandado: (texto: string) => void;
  onFechar: () => void;
}

/** Manda um item do inventário para outro personagem da campanha. */
export const MandarItemModal = ({ personagemId, itemId, nome, quantidade, antesDeMandar, onMandado, onFechar }: IMandarItemModalProps) => {
  const [destinos, setDestinos] = useState<Array<{ id: string; nome: string; dono_nome: string | null }> | null>(null);
  const [destino, setDestino] = useState('');
  const [mandar, setMandar] = useState(1);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Uma chave por abertura da janela: clicar duas vezes não manda duas vezes.
  const chave = useRef(`troca-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

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
    if (!destino || busy) return;
    setBusy(true);
    setErro(null);
    try {
      if (!(await antesDeMandar())) throw new Error('Não foi possível salvar as alterações pendentes da ficha.');
      const resultado = await personagensApi.mandarItem(personagemId, itemId, destino, mandar, chave.current);
      onMandado(`${resultado.quantidade}x ${resultado.titulo} foi para ${resultado.destino.nome}.`);
    } catch (error) {
      setErro(error instanceof Error && error.message ? error.message : 'Não foi possível mandar o item.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={`Mandar ${nome}`} onClick={onFechar}>
      <div className="w-full max-w-md rounded-3xl border border-sky-300/20 bg-[#0d1014] p-6 shadow-2xl" onClick={(evento) => evento.stopPropagation()}>
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-300"><Send size={14} aria-hidden="true" /> Mandar para outro personagem</p>
            <h2 className="mt-1 text-xl font-bold text-white">{nome}</h2>
            <p className="text-xs text-gray-400">Você tem {quantidade}. O item chega desequipado.</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"><X size={18} /></button>
        </header>

        {destinos === null && !erro ? (
          <p className="flex items-center gap-2 text-sm text-gray-400"><RefreshCw size={14} className="animate-spin" /> Carregando a mesa…</p>
        ) : destinos && destinos.length === 0 ? (
          <p className="text-sm text-gray-400">Não há outro personagem ativo nesta campanha.</p>
        ) : destinos ? (
          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Para quem?</legend>
            <div className="custom-scrollbar grid max-h-60 gap-2 overflow-y-auto">
              {destinos.map((opcao) => (
                <label key={opcao.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${destino === opcao.id ? 'border-sky-300/50 bg-sky-300/10 text-white' : 'border-white/10 text-gray-300'}`}>
                  <input type="radio" name="destino-do-item" checked={destino === opcao.id} onChange={() => setDestino(opcao.id)} />
                  <span className="min-w-0 flex-1 truncate">{opcao.nome}</span>
                  {opcao.dono_nome ? <span className="shrink-0 text-xs text-gray-500">{opcao.dono_nome}</span> : null}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {quantidade > 1 && destinos?.length ? (
          <div className="mb-4 flex items-center gap-3">
            <label htmlFor="qtd-mandar" className="text-xs font-bold uppercase tracking-widest text-gray-500">Quantos</label>
            <input id="qtd-mandar" type="number" min={1} max={quantidade} value={mandar} onChange={(evento) => setMandar(Math.max(1, Math.min(quantidade, Math.trunc(Number(evento.target.value) || 1))))} className="h-11 w-20 rounded-xl border border-white/10 bg-black/40 text-center text-sm font-bold text-white outline-none focus:border-sky-300/50" />
            <button type="button" onClick={() => setMandar(quantidade)} className="text-xs font-bold text-sky-300/80 hover:text-sky-200">todos</button>
          </div>
        ) : null}

        {erro ? <p role="alert" className="mb-3 rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-200">{erro}</p> : null}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:text-white">Cancelar</button>
          <button type="button" onClick={() => void confirmar()} disabled={!destino || busy} className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-sky-400 disabled:opacity-40">
            {busy ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />} Mandar
          </button>
        </div>
      </div>
    </div>
  );
};
