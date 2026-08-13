import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Select } from '../../../components/ui/Select';
import { LojaItem, getCurrencySymbol, itemEhVeiculoCompleto, obterBonusDefesaCatalogo, personagemAtendeRequisitosLoja } from '../../../services/lojaCatalogService';
import { X, ShoppingCart, Info, Swords, Activity, Skull, Sparkles, AlertTriangle } from 'lucide-react';
import { ICharacter } from '../../../types/character';
import { useModalSfx } from '../../../hooks/useSfx';
import { useDialogAccessibility } from '../../../hooks/useDialogAccessibility';

interface LojaItemModalProps {
  item: LojaItem;
  onClose: () => void;
  onBuy: (item: LojaItem, alvoItemId?: string, alvoItemNome?: string) => void;
  podeComprar: boolean;
  modoLoja?: 'Comprar' | 'Vender';
  compradorAtivo?: ICharacter;
}

export const LojaItemModal: React.FC<LojaItemModalProps> = ({ item, onClose, onBuy, podeComprar, modoLoja = 'Comprar', compradorAtivo }) => {
  const [alvoItemId, setAlvoItemId] = useState<string>('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Só existe montado enquanto aberto - equivale a isOpen sempre true.
  useModalSfx(true);
  useDialogAccessibility({ open: true, dialogRef, initialFocusRef: closeButtonRef, onClose });
  const { dadosBrutos = {} } = item;
  const veiculoCompleto = itemEhVeiculoCompleto(item);
  const bonusDefesa = obterBonusDefesaCatalogo(dadosBrutos);
  
  // Validação de Requisitos
  const meetsNivel = !item.requisitoNivel || Boolean(compradorAtivo && compradorAtivo.nivel >= item.requisitoNivel);
  const meetsClasse = !item.requisitoClasse?.length || personagemAtendeRequisitosLoja(
    { requisitoClasse: item.requisitoClasse },
    compradorAtivo,
  );
  
  const hasWarning = (!meetsNivel || !meetsClasse) && modoLoja === 'Comprar';


  // Renderização específica baseada na Categoria
  const renderDetails = () => {
    if (item.categoria === 'Consumíveis' && dadosBrutos.subtipo === 'selo') {
      return (
        <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6">
          <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-500">
            <Sparkles size={16} /> Inscrição mágica
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Fluxo', dadosBrutos.fluxo],
              ['Grau', dadosBrutos.grau],
              ['DT', dadosBrutos.dt_inscricao],
              ['Criação', `${dadosBrutos.custo_mana_criacao} Mana`],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <div className="text-[10px] uppercase tracking-widest text-gray-500">{rotulo}</div>
                <div className="mt-1 font-bold capitalize text-fuchsia-200">{valor}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Ativação</div>
            <p className="text-sm text-gray-300">{dadosBrutos.ativacao}</p>
          </div>
        </div>
      );
    }

    switch (item.categoria) {
      case 'Mercenários':
        return (
          <div className="flex flex-col gap-4 mt-6 border-t border-white/10 pt-6">
            <h4 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-2 flex items-center gap-2">
              <Activity size={16} /> Ficha de Combate
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-xs text-gray-400 uppercase">Nível</div>
                <div className="text-2xl text-white font-bold">{dadosBrutos.nivel || '?'}</div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-xs text-gray-400 uppercase">Classe</div>
                <div className="text-xl text-yellow-400 font-bold">{dadosBrutos.classe || 'Criatura'}</div>
              </div>
            </div>
            {/* Se houver dados parseáveis de Vida/Dano no futuro, podem ser injetados aqui */}
            {item.propriedades && (
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 mt-2">
                <div className="text-xs text-gray-400 uppercase mb-2">Atributos e Habilidades</div>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{item.propriedades}</p>
              </div>
            )}
          </div>
        );

      case 'Bens': {
        const propriedade = item.tipoOrigem === 'propriedade';
        if (propriedade) {
          const especificacoesPropriedade = [
            ['Tipo', dadosBrutos.tipoPropriedade],
            ['Localização', dadosBrutos.localizacao],
            ['Patamar', dadosBrutos.patamar],
            ['Qualidade dos Alojamentos', dadosBrutos.qualidadeQuartos],
            ['Manutenção mensal', dadosBrutos.manutencao != null && dadosBrutos.manutencao !== '' ? `${dadosBrutos.manutencao} L$/mês` : undefined],
          ].filter(([, valor]) => valor !== undefined && valor !== null && valor !== '');
          const instalacoes = Array.isArray(dadosBrutos.instalacoes) ? dadosBrutos.instalacoes : [];
          return (
            <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-500">
                <Info size={16} /> Ficha da propriedade
              </h4>
              {especificacoesPropriedade.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {especificacoesPropriedade.map(([rotulo, valor]) => (
                    <div key={String(rotulo)} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                      <div className="text-[10px] uppercase tracking-widest text-gray-400">{String(rotulo)}</div>
                      <div className="mt-1 text-sm font-bold capitalize text-white">{String(valor)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">As especificações completas estão publicadas na descrição acima.</p>
              )}
              {instalacoes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {instalacoes.map((instalacao: any, indice: number) => (
                    <span key={indice} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
                      {instalacao?.nome} {instalacao?.nivel ? `(Nível ${instalacao.nivel})` : ''}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500">Ao comprar, a propriedade entra pronta e editável na aba Bens da ficha.</p>
            </div>
          );
        }
        if (veiculoCompleto) {
          const especificacoes = [
            ['Categoria', dadosBrutos.categoria],
            ['Tamanho', dadosBrutos.tamanho],
            ['Vida', dadosBrutos.vidaMaxima ?? dadosBrutos.vida],
            ['Defesa', dadosBrutos.defesa],
            ['Resistência', dadosBrutos.resistencia],
            ['Deslocamento', dadosBrutos.deslocamentoMetros != null ? `${dadosBrutos.deslocamentoMetros} m` : undefined],
            ['Manobrabilidade', dadosBrutos.manobrabilidade],
            ['Capacidade', dadosBrutos.capacidade],
            ['Cobertura', dadosBrutos.coberturaOcupantes],
            ['Tripulação mínima', dadosBrutos.tripulacaoMinima],
            ['Sistemas ativos', dadosBrutos.sistemasAtivosMaximos],
            ['Espaços de base', dadosBrutos.espacosBase],
          ].filter(([, valor]) => valor !== undefined && valor !== null && valor !== '');
          const atributos = Array.isArray(dadosBrutos.atributos) ? dadosBrutos.atributos.map(String) : [];
          return (
            <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-500">
                <Info size={16} /> Ficha do veículo
              </h4>
              {especificacoes.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {especificacoes.map(([rotulo, valor]) => (
                    <div key={String(rotulo)} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                      <div className="text-[10px] uppercase tracking-widest text-gray-400">{String(rotulo)}</div>
                      <div className="mt-1 text-sm font-bold capitalize text-white">{String(valor)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">As especificações completas estão publicadas na descrição acima.</p>
              )}
              {atributos.length > 0 ? <p className="text-sm text-blue-200">{atributos.join(' · ')}</p> : null}
            </div>
          );
        }
        const camposSistema = [
          ['Sistema', dadosBrutos.sistema],
          ['Subtipo', dadosBrutos.subtipo],
          ['Tier', dadosBrutos.tier],
        ].filter(([, valor]) => valor !== undefined && valor !== null && valor !== '');
        return (
          <div className="flex flex-col gap-4 mt-6 border-t border-white/10 pt-6">
            <h4 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-2 flex items-center gap-2">
              <Info size={16} /> Peça ou módulo veicular
            </h4>
            {camposSistema.length > 0 ? <div className="grid grid-cols-3 gap-3">
              {camposSistema.map(([rotulo, valor]) => <div key={String(rotulo)} className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <div className="text-[10px] uppercase tracking-widest text-gray-400">{String(rotulo)}</div>
                <div className="text-sm font-bold text-white">{String(valor)}</div>
              </div>)}
            </div> : <p className="text-sm text-gray-400">Os detalhes do módulo estão publicados na descrição acima.</p>}
          </div>
        );
      }

      case 'Armas':
      case 'Armaduras e Escudos':
        return (
          <div className="flex flex-col gap-4 mt-6 border-t border-white/10 pt-6">
            <h4 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-2 flex items-center gap-2">
              <Swords size={16} /> Atributos Táticos
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {dadosBrutos.dano && (
                <div className={`p-4 rounded-xl border flex flex-col justify-center items-center text-center ${dadosBrutos.dano === 'Hit Kill' ? 'bg-red-900/20 border-red-500/50' : 'bg-white/5 border-white/10'}`}>
                  <div className="text-xs text-gray-400 uppercase mb-1">Dano</div>
                  {dadosBrutos.dano === 'Hit Kill' ? (
                    <span className="text-xl font-bold text-red-500 flex items-center gap-2 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] uppercase tracking-widest">
                      <Skull size={18} /> Hit Kill
                    </span>
                  ) : (
                    <span className={`font-bold text-red-400 break-words w-full ${dadosBrutos.dano.length > 15 ? 'text-sm leading-tight' : 'text-xl'}`}>
                      {dadosBrutos.dano}
                    </span>
                  )}
                </div>
              )}
              {dadosBrutos.critico && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="text-xs text-gray-400 uppercase">Crítico</div>
                  <div className="text-xl text-yellow-400 font-bold">{dadosBrutos.critico}</div>
                </div>
              )}
              {bonusDefesa !== undefined && bonusDefesa !== null && bonusDefesa !== '' && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="text-xs text-gray-400 uppercase">Defesa</div>
                  <div className="text-xl text-blue-400 font-bold">{String(bonusDefesa).startsWith('-') ? '' : '+'}{String(bonusDefesa).replace(/^\+/, '')}</div>
                </div>
              )}
              {dadosBrutos.alcance && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="text-xs text-gray-400 uppercase">Alcance</div>
                  <div className="text-xl text-white font-bold">{dadosBrutos.alcance}</div>
                </div>
              )}
            </div>
          </div>
        );
      
      default:
        // Consumíveis, Drops/Componentes e Outros
        if (!item.propriedades) return null;
        return (
          <div className="flex flex-col gap-4 mt-6 border-t border-white/10 pt-6">
            <h4 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-2 flex items-center gap-2">
              <Info size={16} /> Detalhes
            </h4>
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{item.propriedades}</p>
            </div>
          </div>
        );
    }
  };

  // Cores de Raridade para o Modal
  let accentColor = '';
  switch (item.raridade) {
    case 'Comum': accentColor = 'text-gray-300 border-gray-500 shadow-[0_0_20px_rgba(107,114,128,0.2)] bg-gray-500/10'; break;
    case 'Incomum': accentColor = 'text-emerald-400 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] bg-emerald-500/10'; break;
    case 'Raro': accentColor = 'text-blue-400 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)] bg-blue-500/10'; break;
    case 'Épico': accentColor = 'text-purple-400 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)] bg-purple-500/10'; break;
    case 'Lendário': accentColor = 'text-amber-400 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] bg-amber-500/10'; break;
    case 'Mítico': accentColor = 'text-red-400 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)] bg-red-500/10'; break;
    case 'Relíquia da Criação': accentColor = 'text-white border-white/70 shadow-[0_0_35px_rgba(255,255,255,0.3)] bg-gradient-to-br from-cyan-500/10 via-white/10 to-fuchsia-500/10'; break;
    case 'Desconhecida': accentColor = 'text-rose-300 border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.2)] bg-rose-500/10'; break;
    default: accentColor = 'text-gray-400 border-white/20 bg-white/5'; break;
  }

  return (
    <motion.div
      ref={dialogRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-viewport fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loja-item-modal-title"
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        className="modal-surface relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0a12] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* CABEÇALHO DO MODAL */}
        <div className={`flex items-start justify-between gap-3 border-b p-4 sm:p-8 ${accentColor.split(' ').slice(1).join(' ')}`}>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
              <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border ${accentColor.split(' ')[0]} border-current`}>
                {item.raridade}
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border border-white/20 text-gray-400 bg-white/5">
                {item.categoria}
              </span>
              {dadosBrutos.subtipo && (
                <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border border-white/20 text-blue-300 bg-blue-900/20">
                  {dadosBrutos.subtipo}
                </span>
              )}
              {item.promocao ? (
                <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border border-rose-400/50 text-rose-200 bg-rose-500/20">
                  {item.promocao.rotulo} · -{item.promocao.descontoPercentual}%
                </span>
              ) : null}
            </div>
            <h2 id="loja-item-modal-title" className="mt-2 text-[clamp(1.75rem,7vw,1.875rem)] font-bold leading-tight tracking-wide text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              {item.nome}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Fechar detalhes do item"
            data-sfx="off"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar sm:p-8">
          {hasWarning && (
            <div className="mb-6 p-4 rounded-xl bg-red-900/30 border border-red-500/50 flex items-start gap-3">
              <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-red-400 font-bold tracking-wide uppercase text-sm mb-1">Aviso de Requisitos</h4>
                <p className="text-red-200/80 text-sm">
                  Seu personagem atual não atende aos requisitos para equipar/usar este item perfeitamente. 
                  {!meetsNivel && ` Exige Nível ${item.requisitoNivel}.`}
                  {!meetsClasse && ` Exige Classe: ${item.requisitoClasse?.join(', ')}.`}
                  <br/><span className="italic text-xs opacity-75 font-bold">Se você prosseguir com a compra, uma notificação de infração será enviada ao Mestre da campanha.</span>
                </p>
              </div>
            </div>
          )}
          {dadosBrutos.requer_autorizacao_mestre === true ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-900/20 p-4">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={20} />
              <div>
                <h4 className="mb-1 text-sm font-bold uppercase tracking-wide text-amber-300">Autorização do Mestre</h4>
                <p className="text-sm text-amber-100/75">Este item é restrito e exige autorização do mestre. Se você prosseguir, uma notificação de infração será enviada ao mestre da campanha.</p>
              </div>
            </div>
          ) : null}
          <p className="text-gray-300 text-lg leading-relaxed italic border-l-2 border-[#c7a44c]/50 pl-4">
            "{item.descricao}"
          </p>

          {renderDetails()}
        </div>

        {dadosBrutos.efeito && (
          <div className="px-6 pb-6">
            <div className="bg-fuchsia-900/20 border border-fuchsia-500/30 p-4 rounded-xl flex flex-col shadow-[0_0_15px_rgba(232,121,249,0.1)]">
              <span className="text-[10px] text-fuchsia-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-2">
                <Sparkles size={14} /> {dadosBrutos.subtipo === 'selo' ? 'Efeito do selo' : 'Poder Primordial'}
              </span>
              <p className="text-fuchsia-100/90 text-sm leading-relaxed">{dadosBrutos.efeito}</p>
            </div>
          </div>
        )}

        {/* SELEÇÃO DE ALVO PARA MODIFICAÇÕES */}
        {modoLoja === 'Comprar' && item.categoria === 'Modificações' && compradorAtivo && (
          <div className="px-6 pb-6">
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Instalar modificação em:</span>
              <Select
                value={alvoItemId}
                onChange={setAlvoItemId}
                placeholder="Nenhum (Comprar avulso)"
                options={[
                  { value: '', label: 'Nenhum (Comprar avulso)' },
                  ...(compradorAtivo.inventarioCentral
                    ?.filter(invItem => invItem.dados?.categoria === 'arma' || invItem.dados?.categoria === 'armadura' || invItem.dados?.categoria === 'veiculo')
                    .map(invItem => ({
                      value: invItem.item_id,
                      label: invItem.titulo,
                    })) || [])
                ]}
              />
              <p className="text-xs text-gray-500 mt-2">Opcional. Se selecionado, a modificação será aplicada diretamente ao item e a quantidade comprada será fixada em 1.</p>
            </div>
          </div>
        )}

        {/* RODAPÉ E COMPRA */}
        <div className="relative flex items-center justify-end overflow-hidden border-t border-white/10 bg-black/40 p-4 sm:p-6">
          <div className="responsive-action-row flex w-full items-center justify-end gap-4 sm:w-auto sm:gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Preço estimado</span>
              {item.precoAnterior ? (
                <span className="text-xs font-bold text-gray-500 line-through">
                  {item.precoAnterior.toLocaleString('pt-BR')} {getCurrencySymbol(item.moedaPreco)}
                </span>
              ) : null}
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold flex items-center gap-1 ${item.moedaPreco === 'Solares' ? 'text-yellow-400' : item.moedaPreco === 'Lunaris' ? 'text-gray-200' : item.moedaPreco === 'Fragmentos de Estrela' ? 'text-fuchsia-400' : 'text-indigo-400'}`}>
                  {item.valorOriginal.toLocaleString('pt-BR')} <span className="text-sm">{getCurrencySymbol(item.moedaPreco)}</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                const alvoItemNome = alvoItemId
                  ? compradorAtivo?.inventarioCentral?.find(i => i.item_id === alvoItemId)?.titulo
                  : undefined;
                onBuy(item, alvoItemId || undefined, alvoItemNome);
              }}
              disabled={!podeComprar}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold tracking-widest uppercase transition-all shadow-xl sm:px-8 ${
                  podeComprar
                  ? 'bg-[#c7a44c] hover:bg-yellow-400 text-black hover:scale-105'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              <ShoppingCart size={20} />
              {!podeComprar ? 'Selecione um personagem' : (modoLoja === 'Comprar' ? 'Adicionar ao carrinho' : 'Adicionar à venda')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
