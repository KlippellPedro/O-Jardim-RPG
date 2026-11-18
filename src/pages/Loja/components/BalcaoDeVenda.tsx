import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Lock, Minus, PackageOpen, Plus, RotateCcw, Search, ShoppingBag } from 'lucide-react';
import type { ICharacter } from '../../../types/character';
import { lojaApi, MAX_SHOP_UNITS, type ItemCotacaoVenda } from '../../../services/lojaApi';
import {
  categoriaDoInventario,
  corDaRaridade,
  getCurrencySymbol,
  rotuloRaridadeChave,
  type ItemCategoria,
  type LojaItem,
  type MoedaTipo,
} from '../../../services/lojaCatalogService';
import type { CartItem } from './CartDrawer';
import { COR_MOEDA } from './ItemCard';
import { iconeDaCategoria } from '../lojaVisual';

interface BalcaoDeVendaProps {
  campanhaId: string;
  personagem: ICharacter | undefined;
  cart: CartItem[];
  /** Põe (ou troca) a quantidade deste item no lote de venda; zero tira. */
  onDefinirQuantidade: (item: LojaItem, quantidade: number) => void;
  onAbrirLote: () => void;
}

interface LinhaDeVenda {
  cotacao: ItemCotacaoVenda;
  item: LojaItem | null;
  categoria: ItemCategoria;
  raridade: string;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function somarPorMoeda(entradas: Array<{ moeda: string; valor: number }>): Array<{ moeda: string; valor: number }> {
  const totais = new Map<string, number>();
  for (const { moeda, valor } of entradas) totais.set(moeda, (totais.get(moeda) ?? 0) + valor);
  return [...totais.entries()].filter(([, valor]) => valor > 0).map(([moeda, valor]) => ({ moeda, valor }));
}

const Valor: React.FC<{ moeda: string; valor: number; grande?: boolean }> = ({ moeda, valor, grande }) => (
  <strong className={`loja-valor ${grande ? 'loja-valor--grande' : ''}`} style={{ color: COR_MOEDA[moeda] ?? '#e5e7eb' }}>
    {valor.toLocaleString('pt-BR')}
    <span>{getCurrencySymbol(moeda as MoedaTipo)}</span>
  </strong>
);

// Balcão de venda: o mercador olha a bolsa inteira do personagem. Cada item
// aparece com o preço que o balcão paga por unidade (o servidor calcula com a
// mesma conta da venda) ou com o motivo de não ter preço.
export const BalcaoDeVenda: React.FC<BalcaoDeVendaProps> = ({ campanhaId, personagem, cart, onDefinirQuantidade, onAbrirLote }) => {
  const [itens, setItens] = useState<ItemCotacaoVenda[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<string>('Todas');
  const [recarregar, setRecarregar] = useState(0);
  const personagemId = personagem?.id;
  const versao = personagem?.economiaVersao;

  useEffect(() => {
    if (!personagemId) {
      setItens([]);
      return undefined;
    }
    const controller = new AbortController();
    setCarregando(true);
    setErro(null);
    lojaApi.cotarVenda(campanhaId, personagemId, controller.signal)
      .then((resposta) => setItens(resposta.itens))
      .catch((falha: unknown) => {
        if (isAbortError(falha)) return;
        setItens([]);
        setErro(falha instanceof Error ? falha.message : 'Não foi possível avaliar a bolsa agora.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });
    return () => controller.abort();
  }, [campanhaId, personagemId, versao, recarregar]);

  const linhas = useMemo<LinhaDeVenda[]>(() => {
    const inventario = new Map((personagem?.inventarioCentral ?? []).map((entrada) => [entrada.item_id, entrada]));
    return itens.map((cotacao) => {
      const dados = inventario.get(cotacao.item_id)?.dados ?? {};
      const categoriaDoItem = categoriaDoInventario(cotacao.tipo, dados, cotacao.catalogo_item_id, cotacao.titulo);
      const raridade = cotacao.raridade ? rotuloRaridadeChave(cotacao.raridade) : 'Comum';
      const item: LojaItem | null = cotacao.vendavel && cotacao.preco_unitario
        ? {
          id: cotacao.item_id,
          tipoOrigem: cotacao.tipo ?? 'inventario',
          nome: cotacao.titulo,
          categoria: categoriaDoItem,
          raridade: raridade === 'Desconhecida' ? 'Comum' : raridade,
          moedaPreco: cotacao.preco_unitario.moeda as MoedaTipo,
          valorOriginal: cotacao.preco_unitario.valor,
          nivelLoja: 1,
          descricao: cotacao.descricao,
          quantidadeDisponivel: Math.min(cotacao.max_venda, MAX_SHOP_UNITS),
          dadosBrutos: dados,
        }
        : null;
      return { cotacao, item, categoria: categoriaDoItem, raridade };
    });
  }, [itens, personagem?.inventarioCentral]);

  const noLote = useMemo(() => new Map(cart.map((entrada) => [entrada.item.id, entrada.quantidade])), [cart]);

  const categorias = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const linha of linhas) contagem.set(linha.categoria, (contagem.get(linha.categoria) ?? 0) + 1);
    return [...contagem.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  }, [linhas]);

  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const visiveis = linhas.filter((linha) => (
    (categoria === 'Todas' || linha.categoria === categoria)
    && (!termo || linha.cotacao.titulo.toLocaleLowerCase('pt-BR').includes(termo))
  ));
  const vendaveis = visiveis.filter((linha) => linha.item);
  const bloqueadas = visiveis.filter((linha) => !linha.item);

  const totalDaBolsa = somarPorMoeda(
    linhas.flatMap((linha) => (linha.item ? [{ moeda: linha.item.moedaPreco, valor: linha.item.valorOriginal * linha.cotacao.max_venda }] : [])),
  );
  const totalDoLote = somarPorMoeda(cart.map((entrada) => ({ moeda: entrada.item.moedaPreco, valor: entrada.item.valorOriginal * entrada.quantidade })));
  const unidadesNoLote = cart.reduce((soma, entrada) => soma + entrada.quantidade, 0);

  const porTudoNoLote = () => {
    for (const linha of vendaveis) {
      if (linha.item && !linha.cotacao.equipado) onDefinirQuantidade(linha.item, linha.cotacao.max_venda);
    }
  };

  if (!personagem) {
    return (
      <div className="loja-vazio">
        <ShoppingBag size={40} />
        <strong>Escolha um personagem</strong>
        <p>O balcão avalia a bolsa de quem vai vender.</p>
      </div>
    );
  }

  return (
    <section className="loja-venda" aria-labelledby="loja-venda-titulo" data-tour="loja-catalogo">
      <div className="loja-venda__resumo">
        <div>
          <span className="loja-eyebrow">O mercador abre a sua bolsa</span>
          <h2 id="loja-venda-titulo">Vender o que {personagem.nome} carrega</h2>
          <p>Cada item mostra quanto o balcão paga por unidade, metade do que custa novo. Equipamento usado também vale.</p>
        </div>
        <div className="loja-venda__totais">
          <div>
            <small>A bolsa inteira vale</small>
            <div className="loja-venda__valores">
              {totalDaBolsa.length ? totalDaBolsa.map((total) => <Valor key={total.moeda} {...total} grande />) : <span className="loja-apagado">nada no balcão</span>}
            </div>
          </div>
          <div>
            <small>No lote agora</small>
            <div className="loja-venda__valores">
              {totalDoLote.length ? totalDoLote.map((total) => <Valor key={total.moeda} {...total} grande />) : <span className="loja-apagado">vazio</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="loja-ferramentas">
        <label className="loja-busca">
          <Search size={16} aria-hidden="true" />
          <input type="search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Procurar na bolsa..." aria-label="Procurar na bolsa" />
        </label>
        <div className="loja-ferramentas__acoes">
          <button type="button" className="loja-botao loja-botao--fantasma" onClick={porTudoNoLote} disabled={!vendaveis.length}>
            <Coins size={15} /> Pôr tudo no lote
          </button>
          {unidadesNoLote > 0 ? (
            <button type="button" className="loja-botao" onClick={onAbrirLote}>
              <ShoppingBag size={15} /> Revisar lote ({unidadesNoLote})
            </button>
          ) : null}
        </div>
      </div>
      {categorias.length > 1 ? (
        <div className="loja-chips" role="group" aria-label="Filtrar a bolsa por categoria">
          {[['Todas', linhas.length] as const, ...categorias].map(([nome, quantos]) => (
            <button key={nome} type="button" className={`loja-chip ${categoria === nome ? 'is-ativo' : ''}`} aria-pressed={categoria === nome} onClick={() => setCategoria(nome)}>
              {nome} <span className="loja-chip__conta">{quantos}</span>
            </button>
          ))}
        </div>
      ) : null}

      {erro ? (
        <div role="alert" className="loja-alerta">
          {erro}
          <button type="button" className="loja-botao loja-botao--fantasma" onClick={() => setRecarregar((n) => n + 1)}><RotateCcw size={14} /> Tentar de novo</button>
        </div>
      ) : null}

      {carregando && !itens.length ? (
        <div className="loja-venda__lista" aria-busy="true">
          {[0, 1, 2, 3].map((n) => <div key={n} className="loja-venda__linha loja-venda__linha--esqueleto" />)}
        </div>
      ) : null}

      {!carregando && !erro && !linhas.length ? (
        <div className="loja-vazio">
          <PackageOpen size={40} />
          <strong>A bolsa está vazia</strong>
          <p>{personagem.nome} não carrega nada que dê para pôr no balcão.</p>
        </div>
      ) : null}

      {vendaveis.length ? (
        <ul className="loja-venda__lista">
          {vendaveis.map(({ cotacao, item, categoria: categoriaDoItem, raridade }) => {
            if (!item) return null;
            const quantidade = noLote.get(item.id) ?? 0;
            const Icone = iconeDaCategoria(categoriaDoItem);
            return (
              <li key={cotacao.item_id} className={`loja-venda__linha ${quantidade > 0 ? 'is-no-lote' : ''}`} style={{ '--raridade': corDaRaridade(raridade) } as React.CSSProperties}>
                <div className="loja-venda__item">
                  <span className="loja-venda__icone" aria-hidden="true"><Icone size={17} /></span>
                  <div className="min-w-0">
                    <strong className="loja-venda__nome">{cotacao.titulo}</strong>
                    <span className="loja-venda__meta">
                      <span style={{ color: 'var(--raridade)' }}>{raridade}</span>
                      <span>{categoriaDoItem}</span>
                      <span>tem {cotacao.quantidade}</span>
                      {cotacao.equipado ? <span className="loja-venda__marca">equipado</span> : null}
                      {cotacao.modificacoes.length ? <span className="loja-venda__marca">{cotacao.modificacoes.length} modificação(ões)</span> : null}
                      {cotacao.preco_compra ? <span>novo: {cotacao.preco_compra.valor.toLocaleString('pt-BR')} {getCurrencySymbol(cotacao.preco_compra.moeda as MoedaTipo)}</span> : null}
                    </span>
                  </div>
                </div>
                <div className="loja-venda__preco">
                  <Valor moeda={item.moedaPreco} valor={item.valorOriginal} />
                  <small>por unidade</small>
                </div>
                <div className="loja-venda__acoes">
                  <div className="loja-qtd" role="group" aria-label={`Quantidade de ${cotacao.titulo} no lote`}>
                    <button type="button" onClick={() => onDefinirQuantidade(item, quantidade - 1)} disabled={quantidade <= 0} aria-label={`Tirar uma unidade de ${cotacao.titulo} do lote`}><Minus size={14} /></button>
                    <output aria-live="polite">{quantidade}</output>
                    <button type="button" onClick={() => onDefinirQuantidade(item, quantidade + 1)} disabled={quantidade >= cotacao.max_venda} aria-label={`Pôr mais uma unidade de ${cotacao.titulo} no lote`}><Plus size={14} /></button>
                  </div>
                  {cotacao.max_venda > 1 ? (
                    <button type="button" className="loja-botao loja-botao--mini" onClick={() => onDefinirQuantidade(item, quantidade >= cotacao.max_venda ? 0 : cotacao.max_venda)}>
                      {quantidade >= cotacao.max_venda ? 'Nenhum' : 'Todos'}
                    </button>
                  ) : <span aria-hidden="true" />}
                  <span className="loja-venda__subtotal">
                    {quantidade > 0 ? <>= <Valor moeda={item.moedaPreco} valor={item.valorOriginal * quantidade} /></> : null}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {bloqueadas.length ? (
        <details className="loja-venda__bloqueadas" open={bloqueadas.length <= 4}>
          <summary><Lock size={14} /> Sem preço no balcão ({bloqueadas.length})</summary>
          <ul className="loja-venda__lista">
            {bloqueadas.map(({ cotacao, categoria: categoriaDoItem }) => {
              const Icone = iconeDaCategoria(categoriaDoItem);
              return (
                <li key={cotacao.item_id} className="loja-venda__linha is-bloqueada">
                  <div className="loja-venda__item">
                    <span className="loja-venda__icone" aria-hidden="true"><Icone size={17} /></span>
                    <div className="min-w-0">
                      <strong className="loja-venda__nome">{cotacao.titulo}</strong>
                      <span className="loja-venda__meta"><span>tem {cotacao.quantidade}</span>{cotacao.equipado ? <span className="loja-venda__marca">equipado</span> : null}</span>
                      <p className="loja-venda__motivo">{cotacao.motivo_texto}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </section>
  );
};
