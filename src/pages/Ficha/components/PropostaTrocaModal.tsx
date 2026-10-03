import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Minus, Plus, RefreshCw, X } from 'lucide-react';
import { personagensApi } from '../../../services/personagensApi';
import { MOEDAS_TROCA, resumoDoLado, trocasApi, type ItemTrocavel, type LadoTroca, type MoedaTroca } from '../../../services/trocasApi';

interface IPropostaTrocaModalProps {
  personagemId: string;
  /** O que este personagem pode oferecer (já sem Aliado, Base e veículo completo). */
  meusItens: ItemTrocavel[];
  carteira: Array<{ moeda: string; saldo: number }>;
  onEnviada: (texto: string) => void;
  onFechar: () => void;
}

type Quantidades = Record<string, number>;

const Passo = ({ valor, maximo, onMudar, rotulo }: { valor: number; maximo: number; onMudar: (novo: number) => void; rotulo: string }) => (
  <div className="flex shrink-0 items-center rounded-lg border border-white/10">
    <button type="button" aria-label={`Menos ${rotulo}`} disabled={valor <= 0} onClick={() => onMudar(valor - 1)} className="flex h-7 w-7 items-center justify-center text-gray-500 hover:text-white disabled:opacity-30"><Minus size={11} /></button>
    <span className={`w-7 text-center text-xs font-bold tabular-nums ${valor ? 'text-white' : 'text-gray-600'}`}>{valor}</span>
    <button type="button" aria-label={`Mais ${rotulo}`} disabled={valor >= maximo} onClick={() => onMudar(valor + 1)} className="flex h-7 w-7 items-center justify-center text-gray-500 hover:text-white disabled:opacity-30"><Plus size={11} /></button>
  </div>
);

const ListaDeItens = ({ itens, quantidades, onMudar, vazio }: { itens: ItemTrocavel[]; quantidades: Quantidades; onMudar: (id: string, valor: number) => void; vazio: string }) => (
  itens.length ? (
    <ul className="custom-scrollbar max-h-56 space-y-1 overflow-y-auto pr-1">
      {itens.map((item) => (
        <li key={item.item_id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${quantidades[item.item_id] ? 'border-sky-300/30 bg-sky-300/[0.06]' : 'border-white/[0.06] bg-black/20'}`}>
          <span className="min-w-0 flex-1 truncate text-xs text-gray-200" title={item.titulo}>{item.titulo}</span>
          <span className="shrink-0 text-[10px] text-gray-500">tem {item.quantidade}</span>
          <Passo valor={quantidades[item.item_id] ?? 0} maximo={item.quantidade} rotulo={item.titulo} onMudar={(valor) => onMudar(item.item_id, valor)} />
        </li>
      ))}
    </ul>
  ) : <p className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-3 text-center text-xs text-gray-500">{vazio}</p>
);

const montarLado = (itens: ItemTrocavel[], quantidades: Quantidades, moedas: Partial<Record<MoedaTroca, number>>): LadoTroca => ({
  itens: itens.filter((item) => (quantidades[item.item_id] ?? 0) > 0).map((item) => ({ item_id: item.item_id, titulo: item.titulo, quantidade: quantidades[item.item_id] })),
  moedas: MOEDAS_TROCA.filter((moeda) => (moedas[moeda] ?? 0) > 0).map((moeda) => ({ moeda, valor: moedas[moeda]! })),
});

/** Propõe uma troca: o que você dá e o que pede. Nada muda até o outro aceitar. */
export const PropostaTrocaModal = ({ personagemId, meusItens, carteira, onEnviada, onFechar }: IPropostaTrocaModalProps) => {
  const [destinos, setDestinos] = useState<Array<{ id: string; nome: string; dono_nome: string | null }> | null>(null);
  const [destino, setDestino] = useState('');
  const [itensDele, setItensDele] = useState<ItemTrocavel[] | null>(null);
  const [dou, setDou] = useState<Quantidades>({});
  const [peco, setPeco] = useState<Quantidades>({});
  const [douMoedas, setDouMoedas] = useState<Partial<Record<MoedaTroca, number>>>({});
  const [pecoMoedas, setPecoMoedas] = useState<Partial<Record<MoedaTroca, number>>>({});
  const [mensagem, setMensagem] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const saldo = (moeda: string) => carteira.find((item) => item.moeda === moeda)?.saldo ?? 0;

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

  useEffect(() => {
    if (!destino) return undefined;
    let cancelado = false;
    setItensDele(null);
    setPeco({});
    trocasApi.itensParaPedir(destino, personagemId)
      .then((resposta) => { if (!cancelado) setItensDele(resposta.itens); })
      .catch(() => { if (!cancelado) setItensDele([]); });
    return () => { cancelado = true; };
  }, [destino, personagemId]);

  const oferta = useMemo(() => montarLado(meusItens, dou, douMoedas), [meusItens, dou, douMoedas]);
  const pedido = useMemo(() => montarLado(itensDele ?? [], peco, pecoMoedas), [itensDele, peco, pecoMoedas]);
  const vazia = !oferta.itens.length && !oferta.moedas.length && !pedido.itens.length && !pedido.moedas.length;
  const nomeDele = destinos?.find((item) => item.id === destino)?.nome ?? 'o outro personagem';

  const enviar = async () => {
    if (!destino || vazia || busy) return;
    setBusy(true);
    setErro(null);
    try {
      await trocasApi.propor({ dePersonagemId: personagemId, paraPersonagemId: destino, oferta, pedido, mensagem });
      onEnviada(`Proposta enviada para ${nomeDele}. Nada muda até aceitarem.`);
    } catch (error) {
      setErro(error instanceof Error && error.message ? error.message : 'Não foi possível enviar a proposta.');
      setBusy(false);
    }
  };

  const campoMoeda = (moeda: MoedaTroca, valor: number, maximo: number | null, onMudar: (novo: number) => void) => (
    <label key={moeda} className="flex items-center gap-2 text-xs text-gray-400">
      <span className="w-36 truncate">{moeda}{maximo != null ? <span className="text-gray-600"> (tem {maximo})</span> : null}</span>
      <input
        type="number"
        min={0}
        max={maximo ?? undefined}
        value={valor || ''}
        placeholder="0"
        onChange={(evento) => {
          const numero = Math.max(0, Math.trunc(Number(evento.target.value) || 0));
          onMudar(maximo != null ? Math.min(maximo, numero) : Math.min(1_000_000_000, numero));
        }}
        aria-label={`${moeda}`}
        className="h-8 w-24 rounded-md border border-white/10 bg-black/40 px-2 text-right text-xs font-bold text-amber-100 outline-none focus:border-amber-300/50"
      />
    </label>
  );

  return (
    // No celular a barra de baixo e o botão de configurações ficam por cima da janela: pb-24 e pt-16 a mantêm entre os dois.
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-2 pb-24 pt-16 sm:p-4" role="dialog" aria-modal="true" aria-label="Propor troca" onClick={onFechar}>
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-sky-300/20 bg-[#0d1014] shadow-2xl" onClick={(evento) => evento.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 border-b border-white/[0.06] p-5">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-300"><ArrowLeftRight size={14} aria-hidden="true" /> Propor troca</p>
            <p className="mt-1 text-xs text-gray-400">Escolha o que você dá e o que pede. Nada muda de mão até a outra pessoa aceitar.</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"><X size={18} /></button>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {destinos === null && !erro ? (
            <p className="flex items-center gap-2 text-sm text-gray-400"><RefreshCw size={14} className="animate-spin" /> Carregando a mesa…</p>
          ) : destinos && destinos.length === 0 ? (
            <p className="text-sm text-gray-400">Não há outro personagem ativo nesta campanha.</p>
          ) : destinos ? (
            <>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Trocar com">
                {destinos.map((opcao) => (
                  <button
                    key={opcao.id}
                    type="button"
                    role="radio"
                    aria-checked={destino === opcao.id}
                    onClick={() => setDestino(opcao.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${destino === opcao.id ? 'border-sky-300 bg-sky-400 text-black' : 'border-white/10 text-gray-300 hover:border-white/30'}`}
                  >
                    {opcao.nome}{opcao.dono_nome ? <span className={destino === opcao.id ? 'text-black/60' : 'text-gray-500'}> · {opcao.dono_nome}</span> : null}
                  </button>
                ))}
              </div>

              {destino ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <section className="space-y-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/80">Você dá</h3>
                    <ListaDeItens itens={meusItens} quantidades={dou} onMudar={(id, valor) => setDou((atual) => ({ ...atual, [id]: valor }))} vazio="Nada no inventário para trocar." />
                    <div className="space-y-1.5 pt-1">
                      {MOEDAS_TROCA.filter((moeda) => saldo(moeda) > 0).map((moeda) => campoMoeda(moeda, douMoedas[moeda] ?? 0, saldo(moeda), (novo) => setDouMoedas((atual) => ({ ...atual, [moeda]: novo }))))}
                    </div>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-sky-300/80">Você pede de {nomeDele}</h3>
                    {itensDele === null ? (
                      <p className="flex items-center gap-2 text-xs text-gray-500"><RefreshCw size={12} className="animate-spin" /> Vendo o que tem…</p>
                    ) : (
                      <ListaDeItens itens={itensDele} quantidades={peco} onMudar={(id, valor) => setPeco((atual) => ({ ...atual, [id]: valor }))} vazio="Não tem nada para trocar." />
                    )}
                    <div className="space-y-1.5 pt-1">
                      {MOEDAS_TROCA.slice(0, 2).map((moeda) => campoMoeda(moeda, pecoMoedas[moeda] ?? 0, null, (novo) => setPecoMoedas((atual) => ({ ...atual, [moeda]: novo }))))}
                    </div>
                  </section>
                </div>
              ) : <p className="text-xs text-gray-500">Escolha com quem trocar.</p>}

              {destino ? (
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Recado (opcional)
                  <input value={mensagem} maxLength={300} onChange={(evento) => setMensagem(evento.target.value)} placeholder="Ex.: pela adaga que você achou no cultista" className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm normal-case tracking-normal text-white outline-none focus:border-sky-300/50" />
                </label>
              ) : null}
            </>
          ) : null}
          {erro ? <p role="alert" className="rounded-lg bg-red-400/10 px-3 py-2 text-xs text-red-200">{erro}</p> : null}
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] p-4">
          {/* O resumo ocupa a linha inteira no celular; ao lado dos botões só de sm para cima. */}
          <p className="min-w-0 basis-full text-xs leading-5 text-gray-400 sm:basis-0 sm:flex-1">
            {destino ? <>Você dá <strong className="text-emerald-200">{resumoDoLado(oferta)}</strong> e recebe <strong className="text-sky-200">{resumoDoLado(pedido)}</strong>.</> : null}
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <button type="button" onClick={onFechar} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:text-white">Cancelar</button>
            <button type="button" onClick={() => void enviar()} disabled={!destino || vazia || busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-sky-400 disabled:opacity-40 sm:flex-none">
              {busy ? <RefreshCw size={14} className="animate-spin" /> : <ArrowLeftRight size={14} />} Enviar proposta
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
