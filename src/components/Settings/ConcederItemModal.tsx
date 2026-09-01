import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, Plus, Minus, PackagePlus, Ghost, CheckCircle2, X } from 'lucide-react';
import { FichaModal } from '../../pages/Ficha/components/FichaModal';
import { Select } from '../ui/Select';
import { lojaApi, prepareGrantAttempt, type LojaGrantResult } from '../../services/lojaApi';
import {
  mapearCatalogoLoja,
  itemCorrespondeBusca,
  getCurrencySymbol,
  type ItemCategoria,
  type LojaItem,
} from '../../services/lojaCatalogService';

interface ConcederItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  campanhaId: string;
  personagens: Array<{ id: string; nome: string }>;
  /** Pré-seleciona o alvo quando aberto a partir do card de um personagem
   * específico; fica livre para trocar dentro do modal mesmo assim. */
  personagemInicialId?: string;
}

const CATEGORIAS_FILTRO: Array<ItemCategoria | 'Todos'> = [
  'Todos', 'Mercenários', 'Armas', 'Armaduras', 'Escudos', 'Consumíveis', 'Bens',
  'Implantes Cibernéticos', 'Artefatos Mágicos', 'Componentes', 'Modificações',
  'Frutos do Éden', 'Relíquias da Criação', 'Itens Comuns', 'Outros',
];

/** As "coisas" que viram registro à parte na ficha, não item de inventário
 * comum: o jogador precisa saber disso antes de confirmar. */
const NOTA_POR_TIPO: Record<string, string> = {
  monstro: 'Vira um Aliado pronto na ficha, com Vida, Defesa e ataque já preenchidos.',
  propriedade: 'Vira uma Propriedade na ficha (base, veículo completo, imóvel).',
};

export const ConcederItemModal: React.FC<ConcederItemModalProps> = ({
  isOpen, onClose, campanhaId, personagens, personagemInicialId,
}) => {
  const [personagemId, setPersonagemId] = useState(personagemInicialId || '');
  const [itens, setItens] = useState<LojaItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<ItemCategoria | 'Todos'>('Todos');
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [resultado, setResultado] = useState<LojaGrantResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPersonagemId(personagemInicialId || '');
    setBusca('');
    setCategoria('Todos');
    setCarrinho({});
    setErroEnvio(null);
    setResultado(null);
    setCarregando(true);
    setErroCarregamento(null);
    const controller = new AbortController();
    lojaApi.listarCatalogo(campanhaId, controller.signal)
      .then((resposta) => setItens(mapearCatalogoLoja(resposta.itens)))
      .catch((err: any) => {
        if (err?.name === 'AbortError') return;
        setErroCarregamento(err?.message || 'Não foi possível carregar o catálogo.');
      })
      .finally(() => setCarregando(false));
    return () => controller.abort();
  }, [isOpen, campanhaId, personagemInicialId]);

  const itensFiltrados = useMemo(() => (
    itens
      .filter((item) => categoria === 'Todos' || item.categoria === categoria)
      .filter((item) => itemCorrespondeBusca(item, busca))
      .slice(0, 60)
  ), [itens, categoria, busca]);

  const itensDoCarrinho = useMemo(() => (
    Object.entries(carrinho)
      .filter(([, quantidade]) => quantidade > 0)
      .map(([id, quantidade]) => ({ item: itens.find((i) => i.id === id), quantidade }))
      .filter((entrada): entrada is { item: LojaItem; quantidade: number } => Boolean(entrada.item))
  ), [carrinho, itens]);

  const ajustar = (itemId: string, delta: number) => {
    setCarrinho((atual) => {
      const proxima = Math.max(0, Math.min(500, (atual[itemId] || 0) + delta));
      if (proxima === 0) {
        const { [itemId]: _removido, ...resto } = atual;
        return resto;
      }
      return { ...atual, [itemId]: proxima };
    });
  };

  const totalUnidades = itensDoCarrinho.reduce((soma, { quantidade }) => soma + quantidade, 0);
  const personagemAlvo = personagens.find((p) => p.id === personagemId);

  const handleConceder = async () => {
    if (!personagemId || !itensDoCarrinho.length) return;
    setEnviando(true);
    setErroEnvio(null);
    try {
      const payload = prepareGrantAttempt(
        campanhaId,
        personagemId,
        itensDoCarrinho.map(({ item, quantidade }) => ({ item_id: item.id, quantidade })),
      );
      const resposta = await lojaApi.conceder(payload);
      setResultado(resposta);
      setCarrinho({});
    } catch (err: any) {
      setErroEnvio(err?.message || 'Não foi possível conceder os itens.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <FichaModal isOpen={isOpen} onClose={onClose} title="Conceder da Loja" size="xl">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-gray-400">
          Entrega qualquer coisa do catálogo direto na ficha de um personagem — item, criatura, propriedade — sem
          cobrar moeda e sem olhar nível de loja ou requisito de classe. A escolha é sua.
        </p>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Personagem</label>
          <Select
            value={personagemId}
            onChange={setPersonagemId}
            placeholder="Selecione um personagem…"
            options={personagens.map((p) => ({ value: p.id, label: p.nome }))}
          />
        </div>

        {resultado ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <CheckCircle2 size={18} /> Concedido para {personagemAlvo?.nome || 'o personagem'}
            </div>
            <ul className="text-sm text-emerald-100/80 space-y-1">
              {resultado.itens.map((item) => {
                const tipoOrigem = itens.find((i) => i.id === item.item_id)?.tipoOrigem || '';
                const nota = NOTA_POR_TIPO[tipoOrigem];
                return (
                  <li key={item.item_id}>
                    {item.quantidade}x {item.titulo}
                    {nota && <span className="block text-xs text-emerald-100/50">{nota}</span>}
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => setResultado(null)}
              className="self-start text-xs font-bold text-primary/80 hover:text-primary"
            >
              Conceder mais alguma coisa
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar no catálogo…"
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {CATEGORIAS_FILTRO.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoria(cat)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${
                      categoria === cat
                        ? 'bg-primary/20 border-primary/40 text-primary'
                        : 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto custom-scrollbar rounded-xl border border-white/10 bg-black/20">
              {carregando ? (
                <div className="py-12 flex justify-center text-primary"><Loader2 size={28} className="animate-spin" /></div>
              ) : erroCarregamento ? (
                <p className="p-6 text-sm text-red-400">{erroCarregamento}</p>
              ) : itensFiltrados.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 text-center">Nada encontrado com esse filtro.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {itensFiltrados.map((item) => {
                    const quantidade = carrinho[item.id] || 0;
                    const ehCriatura = item.tipoOrigem === 'monstro';
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-white/[0.03]">
                        {ehCriatura && <Ghost size={16} className="text-violet-400 shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white truncate">{item.nome}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {item.categoria} · {item.raridade}
                            {item.dadosBrutos?.nivel ? ` · nível ${item.dadosBrutos.nivel}` : ''}
                            {' · '}{item.valorOriginal.toLocaleString('pt-BR')} {getCurrencySymbol(item.moedaPreco)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => ajustar(item.id, -1)}
                            disabled={quantidade === 0}
                            className="w-7 h-7 rounded-md bg-black/40 border border-white/10 text-gray-300 hover:text-white disabled:opacity-30 flex items-center justify-center"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-6 text-center text-sm font-mono text-white">{quantidade}</span>
                          <button
                            type="button"
                            onClick={() => ajustar(item.id, 1)}
                            className="w-7 h-7 rounded-md bg-black/40 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {itensDoCarrinho.length > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-primary/80">
                  {totalUnidades} unidade{totalUnidades > 1 ? 's' : ''} selecionada{totalUnidades > 1 ? 's' : ''}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {itensDoCarrinho.map(({ item, quantidade }) => (
                    <li key={item.id} className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg pl-2.5 pr-1.5 py-1 text-xs text-gray-300">
                      {quantidade}x {item.nome}
                      <button type="button" onClick={() => ajustar(item.id, -quantidade)} className="text-gray-500 hover:text-red-400">
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
                {itensDoCarrinho.some(({ item }) => NOTA_POR_TIPO[item.tipoOrigem]) && (
                  <p className="text-xs text-gray-500 pt-1 border-t border-white/5">
                    {Array.from(new Set(itensDoCarrinho.map(({ item }) => NOTA_POR_TIPO[item.tipoOrigem]).filter(Boolean))).join(' ')}
                  </p>
                )}
              </div>
            )}

            {erroEnvio && (
              <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">{erroEnvio}</div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
              <button
                onClick={onClose}
                disabled={enviando}
                className="px-5 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 text-sm font-bold transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleConceder}
                disabled={enviando || !personagemId || !itensDoCarrinho.length}
                className="px-5 py-2.5 rounded-lg bg-primary text-black text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {enviando ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />}
                Conceder
              </button>
            </div>
          </>
        )}
      </div>
    </FichaModal>
  );
};

export default ConcederItemModal;
