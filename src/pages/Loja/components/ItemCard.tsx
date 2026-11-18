import React from 'react';
import { Eye, Heart, Plus, Wrench, CircleGauge, Sparkles } from 'lucide-react';
import { LojaItem, NOMES_LOCAIS_LOJA, corDaRaridade, getCurrencySymbol, itemPermiteEscolherRaridade, rotuloCategoriaItem, rotuloSubtipoItem } from '../../../services/lojaCatalogService';
import { itemLojaContaComoEspecial } from '../../../services/itensEspeciaisService';
import { obterRegraRaridade } from '../../../../data/regras/raridadesEquipamentos';
import { temModeloFruto } from '../../../services/frutoEdenModelo';

interface ItemCardProps {
  item: LojaItem;
  onBuy: (item: LojaItem) => void;
  onView: (item: LojaItem) => void;
  podeComprar: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: (item: LojaItem) => void;
}

/** Em que mercado o item começa a aparecer, já com o artigo certo. */
const DESDE_O_MERCADO: Record<string, string> = {
  Feira: 'desde a Feira',
  'Metrópole': 'desde a Metrópole',
  'Mercado Negro': 'desde o Mercado Negro',
  'Banco Lunar': 'no Banco Lunar',
};

/** Cor do número do preço por moeda (mesma leitura da bolsa no topo da Loja). */
export const COR_MOEDA: Record<string, string> = {
  Solares: '#facc15',
  Lunaris: '#e5e7eb',
  'Fragmentos de Estrela': '#e879f9',
  'Créditos Sombrios': '#a5b4fc',
};

// Cartão da vitrine: identidade, uma linha de regra e o preço. O resto mora no
// detalhe. Sem brilho, desfoque nem animação de layout por cartão: a vitrine
// pode ter centenas deles e precisa rolar leve.
export const ItemCard: React.FC<ItemCardProps> = React.memo(function ItemCard({ item, onBuy, onView, podeComprar, isWishlisted, onToggleWishlist }) {
  const isModificacao = item.categoria === 'Modificações';
  // Mercenário tem dois preços (contratar/comprar) e a escolha acontece no
  // detalhe, como em Modificações (que pedem o equipamento de destino).
  const isMercenario = item.categoria === 'Mercenários';
  const escolheRaridade = itemPermiteEscolherRaridade(item);
  const exigeEscolhaNoModal = isModificacao || isMercenario || escolheRaridade;
  const grupoEspecial = itemLojaContaComoEspecial(item);
  // 'Desconhecida' fica no patamar mais alto da loja, então usa o orçamento de
  // Relíquia da Criação em vez do padrão (Comum).
  const regraRaridade = obterRegraRaridade(item.raridade === 'Desconhecida' ? 'reliquia da criacao' : item.raridade);
  const localMinimo = NOMES_LOCAIS_LOJA[Math.max(0, Math.min(3, item.nivelLoja - 1))];
  const subtipo = rotuloSubtipoItem(item);
  const precoExibido = isMercenario && item.contratacao
    ? item.contratacao
    : { valorOriginal: item.valorOriginal, moedaPreco: item.moedaPreco };
  const rotuloPreco = isMercenario ? 'Contratar a partir de' : escolheRaridade ? 'A partir de' : 'Preço';
  const reliquia = item.raridade === 'Relíquia da Criação';

  return (
    <article
      data-tour="loja-item"
      className={`loja-item content-auto-list-item ${reliquia ? 'is-reliquia' : ''} ${item.promocao ? 'is-promo' : ''}`}
      style={{ '--raridade': corDaRaridade(item.raridade) } as React.CSSProperties}
    >
      {item.promocao ? (
        <span className="loja-item__selo" title={item.promocao.rotulo}>-{item.promocao.descontoPercentual}%</span>
      ) : null}
      <div className="loja-item__topo">
        <span className="loja-item__raridade">{item.raridade}{escolheRaridade ? ' · sob encomenda' : ''}</span>
        {onToggleWishlist ? (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onToggleWishlist(item); }}
            aria-pressed={Boolean(isWishlisted)}
            aria-label={isWishlisted ? `Remover ${item.nome} da lista de desejos` : `Adicionar ${item.nome} à lista de desejos`}
            className={`loja-item__desejo ${isWishlisted ? 'is-ativo' : ''}`}
          >
            <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
        ) : null}
      </div>

      {temModeloFruto(item.id) ? (
        <div className="loja-item__fruto">
          <img src={`/assets/img/frutos/${item.id}.webp`} alt="" width={112} height={112} loading="lazy" decoding="async" />
        </div>
      ) : null}

      <h3 className="loja-item__titulo">
        <button type="button" onClick={() => onView(item)} data-sfx="off">{item.nome}</button>
      </h3>
      <span className="loja-item__categoria">
        {rotuloCategoriaItem(item)}{subtipo ? ` · ${subtipo}` : ''} · {DESDE_O_MERCADO[localMinimo] ?? localMinimo}
      </span>
      {item.descricao ? <p className="loja-item__descricao">{item.descricao}</p> : null}

      {(grupoEspecial || ['Armas', 'Armaduras', 'Escudos'].includes(item.categoria) || isModificacao || reliquia) ? (
        <ul className="loja-item__marcas">
          {grupoEspecial ? <li><CircleGauge size={12} /> usa 1 vaga ao equipar</li> : null}
          {['Armas', 'Armaduras', 'Escudos'].includes(item.categoria) ? <li><Wrench size={12} /> até {regraRaridade.modificacoesMaximas} modificação(ões)</li> : null}
          {isModificacao ? <li><Wrench size={12} /> pede um item compatível</li> : null}
          {reliquia ? <li><Sparkles size={12} /> objeto único</li> : null}
        </ul>
      ) : null}

      <div className="loja-item__pe">
        <div className="loja-preco">
          <small>{rotuloPreco}</small>
          {item.precoAnterior ? (
            <s>{item.precoAnterior.toLocaleString('pt-BR')} {getCurrencySymbol(item.moedaPreco)}</s>
          ) : null}
          <strong style={{ color: COR_MOEDA[precoExibido.moedaPreco] ?? '#e5e7eb' }}>
            {precoExibido.valorOriginal.toLocaleString('pt-BR')}
            <span>{getCurrencySymbol(precoExibido.moedaPreco)}</span>
          </strong>
          {isMercenario && item.mensalidade ? (
            <em>+ {item.mensalidade.valorOriginal.toLocaleString('pt-BR')} {getCurrencySymbol(item.mensalidade.moedaPreco)} por mês</em>
          ) : null}
        </div>

        <div className="loja-item__acoes">
          <button
            type="button"
            onClick={() => onView(item)}
            aria-label={`Ver detalhes de ${item.nome}`}
            data-sfx="off"
            className="loja-botao-icone"
          >
            <Eye size={17} />
          </button>
          <button
            type="button"
            onClick={() => (exigeEscolhaNoModal ? onView(item) : onBuy(item))}
            disabled={!podeComprar}
            title={isModificacao ? 'Escolher item para instalar a modificação' : isMercenario ? 'Escolher contratar ou comprar' : escolheRaridade ? 'Escolher a raridade' : 'Pôr no lote'}
            aria-label={isModificacao ? `Escolher item para instalar ${item.nome}` : isMercenario ? `Escolher contratar ou comprar ${item.nome}` : escolheRaridade ? `Escolher a raridade de ${item.nome}` : `Adicionar ${item.nome} ao carrinho`}
            className="loja-botao-icone loja-botao-icone--pegar"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </article>
  );
});
