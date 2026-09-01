import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Select } from '../../../components/ui/Select';
import { aplicarRaridadeCompra, classeTextoRaridade, getCurrencySymbol, itemEhVeiculoCompleto, itemPermiteEscolherRaridade, LojaItem, nivelLojaParaRaridadeCompra, NOMES_LOCAIS_LOJA, obterBonusDefesaCatalogo, personagemAtendeRequisitosLoja, RARIDADES_COMPRA_EQUIPAMENTO, RaridadeCompraEquipamento } from '../../../services/lojaCatalogService';
import { X, ShoppingCart, Info, Swords, Activity, Skull, Sparkles, AlertTriangle, Wrench, CircleGauge, BookOpen, ChevronRight } from 'lucide-react';
import { ICharacter } from '../../../types/character';
import { useModalSfx } from '../../../hooks/useSfx';
import { useDialogAccessibility } from '../../../hooks/useDialogAccessibility';
import { obterRegraRaridade } from '../../../../data/regras/raridadesEquipamentos';
import { itemLojaContaComoEspecial, resumirLimiteItensEspeciais } from '../../../services/itensEspeciaisService';
import { ehReliquiaCriacao, lerRessonanciaReliquia } from '../../../services/reliquiasCriacaoService';

interface LojaItemModalProps {
  item: LojaItem;
  onClose: () => void;
  onBuy: (item: LojaItem, alvoItemId?: string, alvoItemNome?: string, modo?: 'comprar' | 'contratar') => void;
  podeComprar: boolean;
  modoLoja?: 'Comprar' | 'Vender';
  compradorAtivo?: ICharacter;
  localizacaoAtual?: number;
  raridadesOcultas?: string[];
}

const normalizarRaridade = (valor: string): string => valor
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase('pt-BR');

export const LojaItemModal: React.FC<LojaItemModalProps> = ({ item, onClose, onBuy, podeComprar, modoLoja = 'Comprar', compradorAtivo, localizacaoAtual = 1, raridadesOcultas = [] }) => {
  const [alvoItemId, setAlvoItemId] = useState<string>('');
  const ehMercenario = item.categoria === 'Mercenários';
  const escolheRaridade = modoLoja === 'Comprar' && itemPermiteEscolherRaridade(item);
  const raridadesOcultasNormalizadas = useMemo(
    () => new Set(raridadesOcultas.map(normalizarRaridade)),
    [raridadesOcultas],
  );
  const opcoesRaridade = useMemo(() => RARIDADES_COMPRA_EQUIPAMENTO.map((opcao) => {
    const nivel = nivelLojaParaRaridadeCompra(item, opcao.value);
    const indisponivel = !item.precosRaridade?.[opcao.value]
      || raridadesOcultasNormalizadas.has(opcao.value)
      || nivel > localizacaoAtual;
    const local = NOMES_LOCAIS_LOJA[Math.max(0, Math.min(3, nivel - 1))];
    return {
      value: opcao.value,
      label: `${opcao.label} · ${local}`,
      triggerLabel: opcao.label,
      disabled: indisponivel,
      labelClassName: classeTextoRaridade(opcao.value),
    };
  }), [item, localizacaoAtual, raridadesOcultasNormalizadas]);
  const primeiraRaridadeDisponivel = opcoesRaridade.find((opcao) => !opcao.disabled)?.value as RaridadeCompraEquipamento | undefined;
  const [raridadeSelecionada, setRaridadeSelecionada] = useState<RaridadeCompraEquipamento>(() => (
    item.raridadeCompra && !opcoesRaridade.find((opcao) => opcao.value === item.raridadeCompra)?.disabled
      ? item.raridadeCompra
      : primeiraRaridadeDisponivel ?? 'comum'
  ));
  const itemParaCompra = useMemo(
    () => escolheRaridade ? aplicarRaridadeCompra(item, raridadeSelecionada) : item,
    [escolheRaridade, item, raridadeSelecionada],
  );
  const raridadeDisponivel = !escolheRaridade || opcoesRaridade.some((opcao) => opcao.value === raridadeSelecionada && !opcao.disabled);
  const [modoContratacao, setModoContratacao] = useState<'comprar' | 'contratar'>(
    ehMercenario && item.contratacao ? 'contratar' : 'comprar',
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Só existe montado enquanto aberto - equivale a isOpen sempre true.
  useModalSfx(true);
  useDialogAccessibility({ open: true, dialogRef, initialFocusRef: closeButtonRef, onClose });
  const { dadosBrutos = {} } = itemParaCompra;
  const melhoriasRaridade: string[] = Array.isArray(dadosBrutos.melhorias_raridade)
    ? dadosBrutos.melhorias_raridade.map((melhoria: unknown) => String(melhoria))
    : [];
  const resistenciasPorTipo = dadosBrutos.resistencias_por_tipo
    && typeof dadosBrutos.resistencias_por_tipo === 'object'
    && !Array.isArray(dadosBrutos.resistencias_por_tipo)
    ? Object.entries(dadosBrutos.resistencias_por_tipo as Record<string, unknown>)
    : [];
  const veiculoCompleto = itemEhVeiculoCompleto(itemParaCompra);
  const bonusDefesa = obterBonusDefesaCatalogo(dadosBrutos);
  const reliquiaCriacao = ehReliquiaCriacao({ ...dadosBrutos, tipo: itemParaCompra.tipoOrigem });
  const ressonanciaReliquia = lerRessonanciaReliquia(dadosBrutos);
  // 'Desconhecida' fica no patamar mais alto da loja (mapNivelLoja), então usa
  // o orçamento de Relíquia da Criação em vez do fallback padrão (Comum).
  const regraRaridade = obterRegraRaridade(itemParaCompra.raridade === 'Desconhecida' ? 'reliquia da criacao' : itemParaCompra.raridade);
  const grupoEspecial = itemLojaContaComoEspecial(item);
  const resumoItensEspeciais = useMemo(
    () => resumirLimiteItensEspeciais(compradorAtivo?.inventarioCentral || [], compradorAtivo?.ficha || {}),
    [compradorAtivo?.inventarioCentral, compradorAtivo?.ficha],
  );
  const alvosModificacao = useMemo(() => (compradorAtivo?.inventarioCentral || [])
    .filter((invItem) => ['arma', 'armadura', 'veiculo', 'geral'].includes(invItem.dados?.categoria))
    .map((invItem) => {
      const modificacoes = Array.isArray(invItem.dados?.modificacoes) ? invItem.dados.modificacoes.length : 0;
      const limiteRaridade = obterRegraRaridade(String(invItem.dados?.raridade || 'comum')).modificacoesMaximas;
      const limiteDeclarado = Number(invItem.dados?.limite_modificacoes);
      const limite = Number.isFinite(limiteDeclarado) && limiteDeclarado >= 0 ? Math.min(limiteRaridade, limiteDeclarado) : limiteRaridade;
      return { value: invItem.item_id, label: `${invItem.titulo} · ${modificacoes}/${limite} mods`, disabled: modificacoes >= limite };
    }), [compradorAtivo?.inventarioCentral]);
  
  // Validação de Requisitos
  const meetsNivel = !item.requisitoNivel || Boolean(compradorAtivo && compradorAtivo.nivel >= item.requisitoNivel);
  const meetsClasse = !item.requisitoClasse?.length || personagemAtendeRequisitosLoja(
    { requisitoClasse: item.requisitoClasse },
    compradorAtivo,
  );
  
  const hasWarning = (!meetsNivel || !meetsClasse) && modoLoja === 'Comprar';


  // Renderização específica baseada na Categoria
  const renderDetails = () => {
    if (reliquiaCriacao && ressonanciaReliquia) {
      const fichaArma = itemParaCompra.tipoOrigem === 'arma'
        ? [
            ['Dano', dadosBrutos.dano],
            ['Crítico', dadosBrutos.critico],
            ['Alcance', dadosBrutos.alcance],
            ['Tipo de dano', dadosBrutos.tipo_de_dano],
          ].filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
        : [];
      return (
        <div className="mt-6 flex flex-col gap-5 border-t border-white/10 pt-6">
          {fichaArma.length > 0 ? (
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-500"><Swords size={16} /> Ficha da relíquia</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {fichaArma.map(([rotulo, valor]) => <div key={String(rotulo)} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"><div className="text-[10px] uppercase tracking-widest text-gray-500">{String(rotulo)}</div><div className="mt-1 font-bold text-white">{String(valor)}</div></div>)}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Ressonância empunhada</div>
            <h4 className="mt-2 font-serif text-lg font-bold text-amber-50">{ressonanciaReliquia.nome}</h4>
            <p className="mt-2 text-sm leading-6 text-gray-300">{ressonanciaReliquia.efeito}</p>
          </div>
        </div>
      );
    }

    if (item.tipoOrigem === 'drop') {
      const propriedades = Array.isArray(dadosBrutos.propriedades) ? dadosBrutos.propriedades : [];
      const usos = Array.isArray(dadosBrutos.usos) ? dadosBrutos.usos : [];
      return (
        <div className="mt-6 flex flex-col gap-5 border-t border-white/10 pt-6">
          <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-500">
            <Info size={16} /> Ficha do material
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Categoria', dadosBrutos.categoria],
              ['Afinidade', dadosBrutos.afinidade],
            ].map(([rotulo, valor]) => (
              <div key={String(rotulo)} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-widest text-gray-500">{rotulo}</div>
                <div className="mt-1 font-bold capitalize text-emerald-100">{String(valor ?? '-')}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Características</div>
              <div className="flex flex-wrap gap-2">
                {propriedades.map((propriedade: unknown) => <span key={String(propriedade)} className="rounded-md bg-emerald-400/10 px-2.5 py-1.5 text-xs text-emerald-100">{String(propriedade)}</span>)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Usos</div>
              <div className="flex flex-wrap gap-2">
                {usos.map((uso: unknown) => <span key={String(uso)} className="rounded-md bg-violet-400/10 px-2.5 py-1.5 text-xs capitalize text-violet-100">{String(uso)}</span>)}
              </div>
            </div>
          </div>
          {dadosBrutos.origem && <div className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Origem</div><p className="text-sm leading-6 text-gray-300">{dadosBrutos.origem}</p></div>}
          <Link
            to={`/materiais?busca=${encodeURIComponent(item.nome)}`}
            onClick={onClose}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-bold text-emerald-100 hover:bg-emerald-400/20"
          >
            Ver receitas compatíveis
          </Link>
        </div>
      );
    }

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
      case 'Mercenários': {
        const numeros = [
          ['Nível', dadosBrutos.nivel],
          ['VD', dadosBrutos.vd],
          ['Vida', dadosBrutos.pv],
          ['Defesa', dadosBrutos.defesa],
          ['Iniciativa', dadosBrutos.iniciativa],
          ['Deslocamento', dadosBrutos.deslocamento],
        ].filter(([, valor]) => valor !== undefined && valor !== null && valor !== '');
        const ataques = Array.isArray(dadosBrutos.ataques) ? dadosBrutos.ataques : [];
        const habilidades = Array.isArray(dadosBrutos.habilidades) ? dadosBrutos.habilidades : [];
        const pericias = Array.isArray(dadosBrutos.pericias) ? dadosBrutos.pericias : [];
        return (
          <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-500">
              <Activity size={16} /> Ficha de Combate
            </h4>
            <div className="flex flex-wrap gap-2">
              {dadosBrutos.funcao && (
                <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                  {dadosBrutos.funcao}
                </span>
              )}
              <span className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-bold text-yellow-400">
                {dadosBrutos.classe || 'Criatura'}
              </span>
              {dadosBrutos.categoria && (
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
                  {dadosBrutos.categoria}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {numeros.map(([rotulo, valor]) => (
                <div key={String(rotulo)} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-gray-400">{String(rotulo)}</div>
                  <div className="mt-1 text-sm font-bold text-white">{String(valor)}</div>
                </div>
              ))}
            </div>
            {ataques.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-xs uppercase text-gray-400">Ataques</div>
                <ul className="flex flex-col gap-1 text-sm text-gray-300">
                  {ataques.map((ataque: any, indice: number) => (
                    <li key={indice}>
                      <span className="font-semibold text-white">{ataque?.nome}</span>
                      {ataque?.detalhe ? `: ${ataque.detalhe}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {habilidades.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-xs uppercase text-gray-400">Habilidades</div>
                <ul className="flex flex-col gap-1 text-sm text-gray-300">
                  {habilidades.map((habilidade: any, indice: number) => (
                    <li key={indice}>{String(habilidade)}</li>
                  ))}
                </ul>
              </div>
            )}
            {pericias.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-xs uppercase text-gray-400">Perícias</div>
                <p className="text-sm text-gray-300">{pericias.join(' · ')}</p>
              </div>
            )}
            {item.propriedades && (
              <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-xs uppercase text-gray-400">Atributos e Habilidades</div>
                <p className="whitespace-pre-wrap text-sm text-gray-300">{item.propriedades}</p>
              </div>
            )}
            <p className="text-xs text-gray-500">
              Contratado ou comprado, o ser entra pronto e editável na aba Aliados da ficha.
            </p>
          </div>
        );
      }

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
      case 'Armaduras':
      case 'Escudos':
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
              {resistenciasPorTipo.length > 0 && (
                <div className="col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4">
                  <div className="text-xs uppercase text-gray-400">Resistências da raridade</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {resistenciasPorTipo.map(([tipo, valor]) => (
                      <span key={tipo} className="rounded-lg border border-emerald-400/20 bg-black/20 px-3 py-1.5 text-sm font-bold text-emerald-200">
                        {tipo} {String(valor)}
                      </span>
                    ))}
                  </div>
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
  switch (itemParaCompra.raridade) {
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
                {itemParaCompra.raridade}
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
          {escolheRaridade ? (
            <div className="mb-6 rounded-2xl border border-[#c7a44c]/25 bg-[#c7a44c]/[0.06] p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="min-w-0">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#dbc16f]">Raridade da encomenda</span>
                  <Select
                    value={raridadeSelecionada}
                    onChange={(valor) => setRaridadeSelecionada(valor as RaridadeCompraEquipamento)}
                    options={opcoesRaridade}
                    disabled={!primeiraRaridadeDisponivel}
                    ariaLabel={`Raridade de ${item.nome}`}
                  />
                </label>
                <div className="sm:text-right">
                  <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Preço nesta raridade</span>
                  <strong className="mt-1 block text-xl text-[#ead48f]">
                    {itemParaCompra.valorOriginal.toLocaleString('pt-BR')} {getCurrencySymbol(itemParaCompra.moedaPreco)}
                  </strong>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-400">O preço Comum considera o modelo da peça: armas marciais e armaduras completas custam mais que armas simples e escudos básicos. Cada raridade também melhora a ficha mecânica, além de ampliar as modificações.</p>
              {melhoriasRaridade.length > 0 ? (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {melhoriasRaridade.map((melhoria) => (
                    <li key={melhoria} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-gray-300">
                      {melhoria}
                    </li>
                  ))}
                </ul>
              ) : null}
              {!primeiraRaridadeDisponivel ? <p className="mt-2 text-xs font-bold text-red-300">Nenhuma raridade deste equipamento está disponível neste balcão.</p> : null}
            </div>
          ) : null}
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#c7a44c]"><Wrench size={14} /> Orçamento de {itemParaCompra.raridade}</div>
              <p className="mt-2 text-sm leading-6 text-gray-300">Até <strong className="text-white">{regraRaridade.modificacoesMaximas} modificações</strong>, {regraRaridade.efeitosRaridadeMaximos} efeito(s) próprio(s) e valor máximo ±{regraRaridade.valorMaximoPorEfeito} por efeito.</p>
              <Link to="/regras?topico=raridades-modificacoes" onClick={onClose} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#d8bd75] hover:text-white"><BookOpen size={13} /> Ver regra da raridade <ChevronRight size={12} /></Link>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300"><CircleGauge size={14} /> Uso na ficha</div>
              {grupoEspecial ? <><p className="mt-2 text-sm leading-6 text-gray-300">Este {grupoEspecial === 'artefato' ? 'artefato' : 'item de perícia'} ocupa <strong className="text-white">1 vaga</strong> somente quando estiver equipado. {resumoItensEspeciais.usados}/{resumoItensEspeciais.limite} vagas estão em uso.</p><p className="mt-2 text-xs text-gray-500">Você pode comprar e guardar sem vaga livre.</p></> : <p className="mt-2 text-sm leading-6 text-gray-400">Este item não entra no limite compartilhado de itens de perícia e artefatos.</p>}
            </div>
          </div>
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

        {/* CONTRATAR (SERVIÇO, MENSALIDADE) OU COMPRAR (SERVO/ESCRAVO PERMANENTE) */}
        {modoLoja === 'Comprar' && ehMercenario && item.contratacao && (
          <div className="px-6 pb-6">
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Vínculo</span>
              <div className="flex gap-2 rounded-lg border border-white/10 bg-black/40 p-1">
                <button
                  type="button"
                  onClick={() => setModoContratacao('contratar')}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                    modoContratacao === 'contratar' ? 'bg-[#c7a44c] text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Contratar
                </button>
                <button
                  type="button"
                  onClick={() => setModoContratacao('comprar')}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                    modoContratacao === 'comprar' ? 'bg-[#c7a44c] text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Comprar (servo/escravo)
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {modoContratacao === 'contratar'
                  ? `Preço reduzido. Depois de contratado, cobra-se ${item.mensalidade?.valorOriginal.toLocaleString('pt-BR')} ${item.mensalidade ? getCurrencySymbol(item.mensalidade.moedaPreco) : ''}/mês de contrato enquanto ele estiver com você.`
                  : 'Preço cheio. O contratado se torna seu servo/escravo permanente: sem mensalidade, mas sem volta.'}
              </p>
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
                  ...alvosModificacao,
                ]}
              />
              <p className="text-xs text-gray-500 mt-2">A contagem mostra modificações instaladas/capacidade da raridade. Alvos cheios ficam desativados. Sem alvo, a modificação entra avulsa no inventário.</p>
              <Link to="/regras?topico=modificacoes-equipamentos" onClick={onClose} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#d8bd75] hover:text-white"><BookOpen size={13} /> Ler instalação e requisitos <ChevronRight size={12} /></Link>
            </div>
          </div>
        )}

        {/* RODAPÉ E COMPRA */}
        <div className="relative flex items-center justify-end overflow-hidden border-t border-white/10 bg-black/40 p-4 sm:p-6">
          <div className="responsive-action-row flex w-full items-center justify-end gap-4 sm:w-auto sm:gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">
                {ehMercenario && modoContratacao === 'contratar' ? 'Taxa de contratação' : 'Preço estimado'}
              </span>
              {itemParaCompra.precoAnterior && !(ehMercenario && modoContratacao === 'contratar') ? (
                <span className="text-xs font-bold text-gray-500 line-through">
                  {itemParaCompra.precoAnterior.toLocaleString('pt-BR')} {getCurrencySymbol(itemParaCompra.moedaPreco)}
                </span>
              ) : null}
              <div className="flex items-center gap-2">
                {(() => {
                  const precoExibido = ehMercenario && modoContratacao === 'contratar' && item.contratacao
                    ? item.contratacao
                    : { valorOriginal: itemParaCompra.valorOriginal, moedaPreco: itemParaCompra.moedaPreco };
                  return (
                    <span className={`text-2xl font-bold flex items-center gap-1 ${precoExibido.moedaPreco === 'Solares' ? 'text-yellow-400' : precoExibido.moedaPreco === 'Lunaris' ? 'text-gray-200' : precoExibido.moedaPreco === 'Fragmentos de Estrela' ? 'text-fuchsia-400' : 'text-indigo-400'}`}>
                      {precoExibido.valorOriginal.toLocaleString('pt-BR')}
                      <span className="text-sm">{getCurrencySymbol(precoExibido.moedaPreco)}</span>
                    </span>
                  );
                })()}
              </div>
              {ehMercenario && modoContratacao === 'contratar' && item.mensalidade ? (
                <span className="text-xs font-bold text-gray-500">
                  + {item.mensalidade.valorOriginal.toLocaleString('pt-BR')} {getCurrencySymbol(item.mensalidade.moedaPreco)}/mês
                </span>
              ) : null}
            </div>

            <button
              onClick={() => {
                const alvoItemNome = alvoItemId
                  ? compradorAtivo?.inventarioCentral?.find(i => i.item_id === alvoItemId)?.titulo
                  : undefined;
                onBuy(itemParaCompra, alvoItemId || undefined, alvoItemNome, ehMercenario ? modoContratacao : undefined);
              }}
              disabled={!podeComprar || !raridadeDisponivel}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold tracking-widest uppercase transition-all shadow-xl sm:px-8 ${
                  podeComprar && raridadeDisponivel
                  ? 'bg-[#c7a44c] hover:bg-yellow-400 text-black hover:scale-105'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              <ShoppingCart size={20} />
              {!podeComprar ? 'Selecione um personagem' : !raridadeDisponivel ? 'Raridade indisponível' : (modoLoja === 'Comprar' ? 'Adicionar ao carrinho' : 'Adicionar à venda')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
