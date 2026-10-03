import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import { sessaoApi, type TabelaDeLoot } from '../../../services/sessaoApi';
import { Select } from '../../../components/ui/Select';

interface EditorLootCampanhaProps {
  campanhaId: string;
  monstroId: string;
  tabela: TabelaDeLoot;
  onSalvo: (tabela: TabelaDeLoot) => void;
  onCancelar: () => void;
}

interface LinhaEditavel {
  item_id: string;
  titulo: string;
  raridade: string | null;
  chance: number;
  quantidade: string;
}

interface ItemDoCatalogo {
  id: string;
  titulo: string;
  tipo: string;
  raridade: string | null;
}

const DADOS = /^\d{1,2}(d\d{1,3})?$/;
const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Carregado só quando o Mestre abre o editor: o catálogo é grande.
let catalogoEmCache: Promise<ItemDoCatalogo[]> | null = null;
const carregarCatalogo = () => {
  catalogoEmCache ??= import('../../../../data/loja/catalogo.json').then((modulo) => (
    (modulo.default as { entradas: Array<{ id: string; titulo: string; tipo: string; conteudo: Record<string, unknown> }> }).entradas
      .filter((entrada) => entrada.tipo !== 'monstro' && entrada.tipo !== 'propriedade')
      .map((entrada) => ({
        id: entrada.id,
        titulo: entrada.titulo,
        tipo: entrada.tipo,
        raridade: typeof entrada.conteudo?.raridade === 'string' ? entrada.conteudo.raridade : null,
      }))
  ));
  return catalogoEmCache;
};

/** O Mestre troca a tabela de loot de uma criatura só na campanha dele. */
export const EditorLootCampanha: React.FC<EditorLootCampanhaProps> = ({ campanhaId, monstroId, tabela, onSalvo, onCancelar }) => {
  const [linhas, setLinhas] = useState<LinhaEditavel[]>(() => tabela.itens.map((item) => ({
    item_id: item.item_id,
    titulo: item.titulo,
    raridade: item.raridade,
    chance: item.chance,
    quantidade: item.quantidade,
  })));
  const [comMoedas, setComMoedas] = useState(!!tabela.moedas);
  const [moeda, setMoeda] = useState<'Lunaris' | 'Solares'>(tabela.moedas?.moeda === 'Solares' ? 'Solares' : 'Lunaris');
  const [dadosMoeda, setDadosMoeda] = useState(tabela.moedas?.dados ?? '2d6');
  const [chanceMoeda, setChanceMoeda] = useState(tabela.moedas?.chance ?? 100);
  const [catalogo, setCatalogo] = useState<ItemDoCatalogo[] | null>(null);
  const [busca, setBusca] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    carregarCatalogo().then((itens) => { if (!cancelado) setCatalogo(itens); }).catch(() => { if (!cancelado) setCatalogo([]); });
    return () => { cancelado = true; };
  }, []);

  const resultados = useMemo(() => {
    const termo = semAcento(busca.trim());
    if (!catalogo || termo.length < 2) return [];
    const ja = new Set(linhas.map((linha) => linha.item_id));
    return catalogo.filter((item) => !ja.has(item.id) && semAcento(item.titulo).includes(termo)).slice(0, 8);
  }, [busca, catalogo, linhas]);

  const invalidas = linhas.filter((linha) => !DADOS.test(linha.quantidade) || linha.chance < 1 || linha.chance > 100);
  const moedaInvalida = comMoedas && (!DADOS.test(dadosMoeda) || chanceMoeda < 1 || chanceMoeda > 100);

  const mudar = (indice: number, campo: Partial<LinhaEditavel>) => {
    setLinhas((atual) => atual.map((linha, i) => (i === indice ? { ...linha, ...campo } : linha)));
  };

  const salvar = async () => {
    if (busy || invalidas.length || moedaInvalida) return;
    setBusy(true);
    setErro(null);
    try {
      const nova = await sessaoApi.ajustarTabelaDeLoot(campanhaId, monstroId, {
        itens: linhas.map((linha) => ({ item_id: linha.item_id, chance: linha.chance, quantidade: linha.quantidade })),
        moedas: comMoedas ? { moeda, dados: dadosMoeda, chance: chanceMoeda } : null,
      });
      onSalvo(nova);
    } catch (error) {
      setErro(error instanceof Error && error.message ? error.message : 'Não foi possível salvar a tabela.');
      setBusy(false);
    }
  };

  const campo = 'h-8 rounded-md border border-white/10 bg-black/40 px-2 text-xs text-white outline-none focus:border-[#c7a44c]/50';

  return (
    <div className="space-y-3 rounded-xl border border-[#c7a44c]/25 bg-[#c7a44c]/[0.04] p-3">
      <p className="text-[11px] leading-5 text-white/50">
        Vale só nesta campanha. As outras mesas continuam com a tabela oficial, e você pode voltar para ela quando quiser.
        Quantidade aceita número fixo (2) ou dados (1d4).
      </p>

      {linhas.length ? (
        <ul className="space-y-1.5">
          {linhas.map((linha, indice) => {
            const ruim = !DADOS.test(linha.quantidade) || linha.chance < 1 || linha.chance > 100;
            return (
              <li key={linha.item_id} className={`flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 ${ruim ? 'border-red-400/40 bg-red-400/[0.05]' : 'border-white/[0.07] bg-black/25'}`}>
                {/* No celular o nome ocupa a linha de cima, com a lixeira ao lado; os campos vêm embaixo. */}
                <div className="flex basis-full items-start gap-2 sm:contents">
                  <span className="min-w-0 flex-1 text-sm leading-5 text-white/85 sm:truncate" title={linha.titulo}>{linha.titulo}</span>
                  <button type="button" onClick={() => setLinhas((atual) => atual.filter((_, i) => i !== indice))} aria-label={`Tirar ${linha.titulo} da tabela`} className="shrink-0 rounded-md p-1.5 text-white/35 hover:bg-red-400/10 hover:text-red-300 sm:order-last">
                    <Trash2 size={13} />
                  </button>
                </div>
                <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/40">
                  Chance
                  <input type="number" min={1} max={100} value={linha.chance} onChange={(evento) => mudar(indice, { chance: Math.trunc(Number(evento.target.value) || 0) })} aria-label={`Chance de ${linha.titulo}`} className={`${campo} w-16 text-right`} />
                  %
                </label>
                <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/40">
                  Qtd.
                  <input value={linha.quantidade} onChange={(evento) => mudar(indice, { quantidade: evento.target.value.trim().toLowerCase() })} aria-label={`Quantidade de ${linha.titulo}`} className={`${campo} w-16 text-center font-mono`} />
                </label>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-xs text-white/40">Nenhum item. Busque abaixo para adicionar.</p>}

      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder={catalogo ? 'Adicionar item do catálogo (digite o nome)…' : 'Carregando o catálogo…'} disabled={!catalogo} aria-label="Buscar item para o loot" className={`${campo} h-9 w-full pl-8`} />
        {resultados.length ? (
          <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-[#17151f] py-1 shadow-2xl">
            {resultados.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setLinhas((atual) => [...atual, { item_id: item.id, titulo: item.titulo, raridade: item.raridade, chance: 25, quantidade: '1' }]);
                    setBusca('');
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-white/80 hover:bg-white/5 hover:text-white"
                >
                  <Plus size={12} className="text-[#c7a44c]" />
                  <span className="min-w-0 flex-1 truncate">{item.titulo}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/35">{item.tipo}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300/15 bg-amber-300/[0.04] px-2.5 py-2">
        <label className="flex items-center gap-1.5 text-xs text-amber-100">
          <input type="checkbox" checked={comMoedas} onChange={(evento) => setComMoedas(evento.target.checked)} />
          <Coins size={13} /> Deixa moedas
        </label>
        {comMoedas ? (
          <>
            <Select
              value={moeda}
              onChange={(valor) => setMoeda(valor as 'Lunaris' | 'Solares')}
              ariaLabel="Moeda do loot"
              options={[{ value: 'Lunaris', label: 'Lunaris' }, { value: 'Solares', label: 'Solares' }]}
              className="!h-8 !min-h-0 w-28 !py-0 px-2 text-xs"
            />
            <input value={dadosMoeda} onChange={(evento) => setDadosMoeda(evento.target.value.trim().toLowerCase())} aria-label="Quantas moedas (dados)" className={`${campo} w-20 text-center font-mono ${DADOS.test(dadosMoeda) ? '' : '!border-red-400/50'}`} />
            <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/40">
              Chance
              <input type="number" min={1} max={100} value={chanceMoeda} onChange={(evento) => setChanceMoeda(Math.trunc(Number(evento.target.value) || 0))} aria-label="Chance das moedas" className={`${campo} w-16 text-right`} />
              %
            </label>
          </>
        ) : null}
      </div>

      {invalidas.length || moedaInvalida ? <p className="text-[11px] text-red-200/80">Chance vai de 1 a 100 e quantidade é um número ou dados, como 2 ou 1d4.</p> : null}
      {erro ? <p role="alert" className="rounded-md bg-red-400/10 px-2 py-1.5 text-xs text-red-200">{erro}</p> : null}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white">
          <X size={12} /> Cancelar
        </button>
        <button type="button" onClick={() => void salvar()} disabled={busy || invalidas.length > 0 || moedaInvalida} className="flex items-center gap-1.5 rounded-lg bg-[#c7a44c] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#dec269] disabled:opacity-40">
          {busy ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />} Salvar nesta campanha
        </button>
      </div>
    </div>
  );
};
