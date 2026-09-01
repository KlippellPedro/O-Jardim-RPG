import { useEffect, useState } from 'react';
import { Search, Crosshair, Dices, Pencil, Trash2, Flame, GripVertical, Star } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput, LabeledSelect } from '../components/SharedFichaComponents';
import { registrosApi } from '../../../services/registrosApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { useCharacterStore } from '../../../store/useCharacterStore';
import {
  ameacaCritico,
  formatarCritico,
  formulaDanoCritico,
  normalizarCriticoBalanceado,
} from '../../../services/criticalService';
import { carregarCatalogo } from '../../../services/catalogoService';
import { aplicarAjustesAtributosRaciais, BONUS_GRAU, modificador, obterAjustesPericiasRaciais } from '../../../services/calculoService';
import { obterAtributoPericia } from '../../../services/periciasFichaService';
import type { ICatalogo } from '../../../types/catalogo';
import { resumirEquipamentos } from '../../../services/equipamentoService';
import { desvantagensAutomaticasTeste, obterStatusFicha, penalidadeAtaqueCondicoes, penalidadeCansacoTeste } from '../../../services/statusService';
import { ajusteOrigem, chaveAjuste, totalAjustesManuais } from '../../../services/ajustesFichaService';

interface IAtaque {
  id: string;
  nome: string;
  tipo: string;
  bonusAcerto: number;
  dano: string;
  alcance: string;
  margemAmeaca: number;
  multiplicadorCritico: number;
  favorito?: boolean;
  isInventory?: boolean;
  subtipo?: string;
  municaoAtual?: number;
  municaoMaxima?: number;
}

interface IResultadoRolagem {
  ataqueId: string;
  tipo: 'acerto' | 'dano';
  resultado: number | null;
  detalhes: Record<string, any>;
}

const TIPOS_ATAQUE = ['Corpo a Corpo', 'Distância', 'Alcance'];

const TIPO_ATAQUE_COLORS: Record<string, string> = {
  'Corpo a Corpo': 'bg-red-500/10 border-red-500/30 text-red-400',
  'Distância': 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  'Alcance': 'bg-purple-500/10 border-purple-500/30 text-purple-400'
};

const FORM_VAZIO = {
  nome: '',
  tipo: 'Corpo a Corpo',
  bonusAcerto: '0',
  dano: '',
  alcance: '',
  margemAmeaca: '20',
  multiplicadorCritico: '2',
};

function gerarId(): string {
  return `ataques-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const AbaAtaques = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoInventario, setEditandoInventario] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [rolando, setRolando] = useState<string | null>(null);
  const [resultado, setResultado] = useState<IResultadoRolagem | null>(null);
  const [defesaAlvo, setDefesaAlvo] = useState('');
  const [catalogo, setCatalogo] = useState<ICatalogo | null>(null);

  useEffect(() => {
    carregarCatalogo().then(setCatalogo);
  }, []);

  const campanhaId = useAuthStore(state => state.campanhaAtiva?.id);
  const mutateEconomy = useCharacterStore((state) => state.mutateEconomy);

  const ataquesManuais: IAtaque[] = (character.ficha?.ataques || []).map((ataque: Partial<IAtaque>) => ({
    ...ataque,
    margemAmeaca: Number(ataque.margemAmeaca ?? 20),
    multiplicadorCritico: Number(ataque.multiplicadorCritico ?? 2),
  })) as IAtaque[];
  
  const armasEquipadas: IAtaque[] = (character.inventarioCentral || [])
    .filter((i: any) => i.dados?.categoria === 'arma' && i.dados?.equipado)
    .map((i: any) => ({
      id: i.item_id,
      nome: i.titulo,
      tipo: i.dados?.tipoAtaque || 'Corpo a Corpo',
      bonusAcerto: i.dados?.bonusAcerto || 0,
      dano: i.dados?.dano || '',
      alcance: i.dados?.alcance || '1,5m',
      margemAmeaca: Number(i.dados?.margem_ameaca ?? i.dados?.margemAmeaca ?? 20),
      multiplicadorCritico: Number(i.dados?.multiplicador_critico ?? i.dados?.multiplicadorCritico ?? 2),
      subtipo: String(i.dados?.subtipo || 'simples'),
      municaoAtual: Number(i.dados?.municaoAtual ?? i.dados?.municao_atual) || 0,
      municaoMaxima: Number(i.dados?.municaoMaxima ?? i.dados?.municao_maxima) || 0,
      favorito: i.dados?.favorito || false,
      isInventory: true
    }));

  const ordemAtaques: string[] = character.ficha?.ordemAtaques || [];
  const ataques: IAtaque[] = [...armasEquipadas, ...ataquesManuais];
  const ficha = character.ficha || {};
  const status = obterStatusFicha(ficha);
  const resumoEquipamento = resumirEquipamentos(character.inventarioCentral || [], ficha, character.aliadosCompartilhados || []);
  const racaAtual = catalogo?.racas.find(raca => raca.id === ficha.racaId) || null;
  const atributosBase = ficha.atributosFinais || character.atributosFinais || {};
  const atributosAntesRaca = Object.fromEntries(['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma', 'fluxo'].map((atributo) => [
    atributo,
    Number(atributosBase[atributo] ?? 10)
      + ajusteOrigem(ficha, 'atributo', atributo)
      + totalAjustesManuais(ficha, chaveAjuste('atributo', atributo))
      + (resumoEquipamento.bonusAtributos[atributo] || 0),
  ]));
  const atributos = racaAtual
    ? aplicarAjustesAtributosRaciais(atributosAntesRaca, racaAtual, ficha.escolhaRacial)
    : atributosAntesRaca;
  const ajustesRaciaisPericias = obterAjustesPericiasRaciais(racaAtual, ficha.escolhaRacial);
  const metadeNivel = Math.floor(Math.max(1, Number(character.nivel) || 1) / 2);
  const proficiencias = new Set((Array.isArray(ficha.proficiencias) ? ficha.proficiencias : []).map((item: unknown) => String(item).toLocaleLowerCase('pt-BR')));

  const penalidadeFaltaProficiencia = (item: IAtaque) => {
    if (!item.isInventory || !item.subtipo || item.subtipo.toLocaleLowerCase('pt-BR') === 'simples') return 0;
    const subtipo = item.subtipo.toLocaleLowerCase('pt-BR');
    return proficiencias.has(subtipo) || proficiencias.has(`armas_${subtipo}`) || proficiencias.has(`armas ${subtipo}`) ? 0 : -5;
  };

  const calcularBonusAtaque = (item: IAtaque) => {
    const periciaId = item.tipo === 'Corpo a Corpo' ? 'luta' : 'pontaria';
    // A ficha pode trocar o atributo base de Luta e Pontaria; o ataque segue a troca.
    const atributoId = obterAtributoPericia(ficha, periciaId, periciaId === 'luta' ? 'forca' : 'destreza');
    const grau = ficha.pericias?.[periciaId] || 'iniciante';
    return modificador(atributos[atributoId] ?? 10)
      + metadeNivel
      + (BONUS_GRAU[grau] || 0)
      + (ajustesRaciaisPericias[periciaId] || 0)
      + ajusteOrigem(ficha, 'pericia', periciaId)
      + totalAjustesManuais(ficha, chaveAjuste('pericia', periciaId))
      + (resumoEquipamento.bonusPericias[periciaId] || 0)
      + (resumoEquipamento.bonusCombate.ataque || 0)
      + (Number(item.bonusAcerto) || 0)
      + penalidadeFaltaProficiencia(item)
      + penalidadeCansacoTeste(status.cansacoAtual, true)
      + penalidadeAtaqueCondicoes(ficha.condicoesAtivas);
  };

  const desvantagensAutomaticasAtaque = desvantagensAutomaticasTeste(
    status.cansacoAtual,
    true,
    resumoEquipamento.sobrecarregado,
  );
  const periciaDoAtaque = (item: IAtaque) => item.tipo === 'Corpo a Corpo' ? 'luta' : 'pontaria';

  const ataquesVisiveis = ataques
    .filter((a: any) => !busca || a.nome?.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => {
      const ia = ordemAtaques.indexOf(a.id);
      const ib = ordemAtaques.indexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

  const handleReorder = (novosItens: IAtaque[]) => {
    onUpdate(['ficha', 'ordemAtaques'], novosItens.map(a => a.id));
  };

  const toggleFavorito = (id: string, isInventory?: boolean) => {
    const itemTarget = ataques.find(a => a.id === id);
    const wasFavorite = itemTarget?.favorito;

    if (isInventory) {
      void mutateEconomy(character.id, (current) => {
        const inventario = current.inventario.map((item) => (
          item.item_id === id
            ? { ...item, dados: { ...item.dados, favorito: !item.dados?.favorito } }
            : item
        ));
        return { carteira: current.carteira, inventario };
      });
    } else {
      const novaLista = ataquesManuais.map((a: IAtaque) => a.id === id ? { ...a, favorito: !a.favorito } : a);
      onUpdate(['ficha', 'ataques'], novaLista);
    }
    
    if (!wasFavorite) {
       const novaOrdem = [id, ...ordemAtaques.filter(x => x !== id)];
       onUpdate(['ficha', 'ordemAtaques'], novaOrdem);
    }
  };

  const abrirNovo = () => {
    setEditandoId(null);
    setEditandoInventario(false);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  };

  const abrirEditar = (item: IAtaque) => {
    setEditandoId(item.id);
    setEditandoInventario(Boolean(item.isInventory));
    setForm({
      nome: item.nome || '',
      tipo: item.tipo || 'Corpo a Corpo',
      bonusAcerto: String(item.bonusAcerto ?? 0),
      dano: item.dano || '',
      alcance: item.alcance || '',
      margemAmeaca: String(item.margemAmeaca ?? 20),
      multiplicadorCritico: String(item.multiplicadorCritico ?? 2),
    });
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditandoId(null);
    setEditandoInventario(false);
    setForm(FORM_VAZIO);
  };

  const salvar = () => {
    const nome = form.nome.trim();
    if (!nome) return;

    const bonusNumerico = Number(form.bonusAcerto);
    const critico = normalizarCriticoBalanceado(form.margemAmeaca, form.multiplicadorCritico);

    if (editandoId && editandoInventario) {
      void mutateEconomy(character.id, (current) => {
        const inventario = current.inventario.map((item) => {
          if (item.item_id !== editandoId) return item;
          return {
            ...item,
            titulo: nome,
            dados: {
              ...item.dados,
              tipoAtaque: form.tipo,
              bonusAcerto: Number.isFinite(bonusNumerico) ? bonusNumerico : 0,
              dano: form.dano.trim(),
              alcance: form.alcance.trim(),
              margem_ameaca: critico.margemAmeaca,
              multiplicador_critico: critico.multiplicadorCritico,
              critico: formatarCritico(critico.margemAmeaca, critico.multiplicadorCritico),
            }
          };
        });
        return { carteira: current.carteira, inventario };
      });
    } else {
      const item: IAtaque = {
        id: editandoId || gerarId(),
        nome,
        tipo: form.tipo || 'Corpo a Corpo',
        bonusAcerto: Number.isFinite(bonusNumerico) ? bonusNumerico : 0,
        dano: form.dano.trim(),
        alcance: form.alcance.trim(),
        margemAmeaca: critico.margemAmeaca,
        multiplicadorCritico: critico.multiplicadorCritico,
      };

      const novaLista = editandoId
        ? ataquesManuais.map((a: IAtaque) => (a.id === editandoId ? item : a))
        : [...ataquesManuais, item];

      onUpdate(['ficha', 'ataques'], novaLista);
    }
    
    fecharModal();
  };

  const excluir = (item: IAtaque) => {
    if (item.isInventory) {
      if (!window.confirm(`Desequipar a arma "${item.nome}"? Ela continuará na sua mochila.`)) return;
      void mutateEconomy(character.id, (current) => {
        const inventario = current.inventario.map((itemAtual) => (
          itemAtual.item_id === item.id
            ? { ...itemAtual, dados: { ...itemAtual.dados, equipado: false } }
            : itemAtual
        ));
        return { carteira: current.carteira, inventario };
      });
      if (resultado?.ataqueId === item.id) setResultado(null);
      return;
    }

    if (!window.confirm(`Excluir o ataque "${item.nome}"?`)) return;
    const novaLista = ataquesManuais.filter((a: IAtaque) => a.id !== item.id);
    onUpdate(['ficha', 'ataques'], novaLista);
    if (resultado?.ataqueId === item.id) setResultado(null);
  };

  const rolarAcerto = async (item: IAtaque) => {
    if (!campanhaId) {
      alert('Nenhuma campanha ativa. Selecione uma campanha para rolar dados.');
      return;
    }
    if (item.isInventory && Number(item.municaoMaxima) > 0 && Number(item.municaoAtual) <= 0) {
      alert('Esta arma está sem munição. Recarregue no Inventário antes de atacar.');
      return;
    }
    setRolando(`${item.id}-acerto`);
    try {
      const defesa = Number(defesaAlvo);
      const defesaInformada = defesaAlvo.trim() !== '' && Number.isFinite(defesa) && defesa >= 1;
      const { registro } = await registrosApi.rolar({
        campanhaId,
        personagemId: character.id,
        titulo: `Ataque: ${item.nome}`,
        bonus: calcularBonusAtaque(item),
        vantagens: (resumoEquipamento.vantagens[periciaDoAtaque(item)] || 0) + (resumoEquipamento.vantagens['ataque'] || 0),
        desvantagens: desvantagensAutomaticasAtaque + (resumoEquipamento.desvantagens[periciaDoAtaque(item)] || 0) + (resumoEquipamento.desvantagens['ataque'] || 0),
        dt: defesaInformada ? defesa : null,
        origem: {
          tipo: 'ataque',
          ataque_id: item.id,
          defesa_alvo: defesaInformada ? defesa : null,
          margem_ameaca: Math.max(2, item.margemAmeaca - (resumoEquipamento.bonusCombate.margemAmeaca || 0)),
          multiplicador_critico: item.multiplicadorCritico + (resumoEquipamento.bonusCombate.multiplicadorCritico || 0),
        },
      });
      if (item.isInventory && Number(item.municaoMaxima) > 0) {
        void mutateEconomy(character.id, (current) => ({
          carteira: current.carteira,
          inventario: current.inventario.map((entrada) => entrada.item_id === item.id
            ? { ...entrada, dados: { ...entrada.dados, municaoAtual: Math.max(0, Number(entrada.dados?.municaoAtual ?? entrada.dados?.municao_atual ?? 0) - 1) } }
            : entrada),
        }));
      }
      setResultado({ ataqueId: item.id, tipo: 'acerto', resultado: registro.resultado, detalhes: registro.detalhes });
    } catch (erro: any) {
      alert(erro?.message || 'Falha ao rolar o ataque.');
    } finally {
      setRolando(null);
    }
  };

  const rolarDano = async (item: IAtaque) => {
    if (!campanhaId) {
      alert('Nenhuma campanha ativa. Selecione uma campanha para rolar dados.');
      return;
    }
    if (!item.dano) return;
    const natural = resultado?.ataqueId === item.id && resultado.tipo === 'acerto'
      ? resultado.detalhes?.natural
      : null;
    const margemEfetiva = Math.max(2, item.margemAmeaca - (resumoEquipamento.bonusCombate.margemAmeaca || 0));
    const multiplicadorEfetivo = item.multiplicadorCritico + (resumoEquipamento.bonusCombate.multiplicadorCritico || 0);
    const critico = ameacaCritico(natural, margemEfetiva);
    const bonusDano = resumoEquipamento.bonusCombate.dano || 0;
    const formulaExtra = item.dano && bonusDano ? `${item.dano}${bonusDano > 0 ? '+' : ''}${bonusDano}` : item.dano;
    const formulaCritica = critico ? formulaDanoCritico(formulaExtra, multiplicadorEfetivo) : null;
    const formula = formulaCritica || formulaExtra;
    setRolando(`${item.id}-dano`);
    try {
      const { registro } = await registrosApi.rolar({
        campanhaId,
        personagemId: character.id,
        titulo: critico ? `Dano crítico x${item.multiplicadorCritico}: ${item.nome}` : `Dano: ${item.nome}`,
        formula,
        origem: {
          tipo: critico ? 'dano_critico' : 'dano',
          ataque_id: item.id,
          formula_base: formulaExtra,
          margem_ameaca: margemEfetiva,
          multiplicador_critico: multiplicadorEfetivo,
        },
      });
      setResultado({ ataqueId: item.id, tipo: 'dano', resultado: registro.resultado, detalhes: registro.detalhes });
    } catch (erro: any) {
      alert(erro?.message || 'Falha ao rolar o dano.');
    } finally {
      setRolando(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" data-tour="ataques-resumo">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Ataques</h2>
          <p className="text-gray-400 text-sm">Armas equipadas e manobras de combate.</p>
        </div>
        <div className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-3">
          <span className="text-3xl font-bold text-red-500">{ataques.length}</span>
          <span className="text-sm text-gray-500 uppercase tracking-widest font-bold leading-tight">Ataques<br/>Prontos</span>
        </div>
      </div>

      {/* FERRAMENTAS */}
      <div className="flex flex-col md:flex-row gap-4" data-tour="ataques-ferramentas">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar ataque..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-red-500/50 outline-none text-sm"
          />
        </div>
        <input
          type="number"
          min="1"
          inputMode="numeric"
          aria-label="Defesa do alvo"
          placeholder="Defesa do alvo (opcional)"
          value={defesaAlvo}
          onChange={event => setDefesaAlvo(event.target.value)}
          className="md:w-56 bg-[#0f0e15] border border-white/5 rounded-xl py-3 px-4 text-white focus:border-red-500/50 outline-none text-sm"
        />
        <button
          onClick={abrirNovo}
          className="px-6 py-3 rounded-xl border border-red-500/30 text-red-500 font-bold text-sm hover:bg-red-500/10 transition-colors border-dashed"
        >
          + Novo Ataque
        </button>
      </div>

      {/* LISTA */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-4" data-tour="ataques-lista">
        <Reorder.Group axis="y" values={ataquesVisiveis} onReorder={handleReorder} className="flex flex-col gap-4">
          {ataquesVisiveis.map((a: IAtaque) => {
            const resultadoAtual = resultado?.ataqueId === a.id ? resultado : null;
            const margemEfetiva = Math.max(2, a.margemAmeaca - (resumoEquipamento.bonusCombate.margemAmeaca || 0));
            const criticoAtual = resultadoAtual?.tipo === 'acerto'
              && ameacaCritico(resultadoAtual.detalhes?.natural, margemEfetiva);
            const defesaUsada = Number(resultadoAtual?.detalhes?.dt);
            const temDefesa = resultadoAtual?.tipo === 'acerto' && Number.isFinite(defesaUsada) && defesaUsada >= 1;
            const naturalAtual = Number(resultadoAtual?.detalhes?.natural);
            const acertouAtual = resultadoAtual?.tipo !== 'acerto'
              ? null
              : criticoAtual
                ? true
                : naturalAtual === 1
                  ? false
                  : temDefesa
                    ? Number(resultadoAtual.resultado) >= defesaUsada
                    : null;
            return (
              <Reorder.Item
                value={a}
                key={a.id}
                data-tour="ataque-cartao"
                className={`bg-[#121118] border ${a.favorito ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border-white/5 hover:border-red-500/30'} rounded-xl p-5 transition-colors group relative`}
              >
                <div className="flex gap-4 items-start">
                  <div className="flex flex-col gap-2 items-center flex-shrink-0">
                    <div className="flex gap-1 mb-1">
                      <button onClick={() => toggleFavorito(a.id, a.isInventory)} className={`transition-colors ${a.favorito ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-gray-600 hover:text-gray-400'}`}>
                        <Star size={16} fill={a.favorito ? 'currentColor' : 'none'} />
                      </button>
                      <div className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 p-0.5">
                        <GripVertical size={16} />
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-lg bg-black/50 border flex items-center justify-center ${a.favorito ? 'border-red-500/50 text-red-500' : 'border-white/5 text-red-500'}`}>
                      <Crosshair size={18} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex justify-between items-start gap-3">
                      <h4 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                        {a.nome || 'Ataque Desconhecido'} 
                        {a.isInventory && <span className="px-1.5 py-0.5 rounded bg-[#c7a44c]/20 border border-[#c7a44c]/30 text-[#c7a44c] text-[8px] uppercase tracking-widest">Arma</span>}
                      </h4>
                      <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => abrirEditar(a)}
                          title="Editar"
                          className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => excluir(a)}
                          title="Excluir"
                          className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold tracking-wider uppercase ${TIPO_ATAQUE_COLORS[a.tipo] || TIPO_ATAQUE_COLORS['Corpo a Corpo']}`}>
                        {a.tipo || 'Corpo a Corpo'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded border font-bold tracking-wider uppercase bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
                        Crítico {formatarCritico(a.margemAmeaca, a.multiplicadorCritico)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 mb-4">
                      <div className="bg-black/30 border border-white/5 rounded p-2 text-center">
                        <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Dano</span>
                        <span className="text-lg font-bold text-red-400 font-mono">
                          {a.dano ? `${a.dano}${resumoEquipamento.bonusCombate.dano ? (resumoEquipamento.bonusCombate.dano > 0 ? `+${resumoEquipamento.bonusCombate.dano}` : resumoEquipamento.bonusCombate.dano) : ''}` : 'Não informado'}
                        </span>
                      </div>
                      <div className="bg-black/30 border border-white/5 rounded p-2 text-center">
                        <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Margem</span>
                        <span className="text-lg font-bold text-yellow-400 font-mono">
                          {(() => {
                            const margemEfetiva = Math.max(2, a.margemAmeaca - (resumoEquipamento.bonusCombate.margemAmeaca || 0));
                            return margemEfetiva === 20 ? '20' : `${margemEfetiva}-20`;
                          })()}
                        </span>
                      </div>
                      <div className="bg-black/30 border border-white/5 rounded p-2 text-center">
                        <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Multiplicador</span>
                        <span className="text-lg font-bold text-yellow-400 font-mono">x{a.multiplicadorCritico + (resumoEquipamento.bonusCombate.multiplicadorCritico || 0)}</span>
                      </div>
                    </div>

                    {resultadoAtual && (
                      <div className="bg-black/40 border border-red-500/20 rounded-lg p-3 flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wider font-bold">
                          <Flame size={14} className="text-red-500" />
                          {criticoAtual
                            ? 'Crítico'
                            : resultadoAtual.tipo === 'dano'
                              ? 'Dano'
                              : acertouAtual === true
                                ? 'Acerto'
                                : acertouAtual === false
                                  ? 'Erro'
                                  : 'Rolagem de ataque'}
                          {resultadoAtual.tipo === 'acerto' && resultadoAtual.detalhes?.natural != null && (
                            <span className="text-gray-600 normal-case font-normal">(natural {resultadoAtual.detalhes.natural})</span>
                          )}
                        </div>
                        <span className={`text-2xl font-bold font-mono ${criticoAtual ? 'text-yellow-400' : 'text-white'}`}>
                          {resultadoAtual.resultado}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/5" data-tour="ataque-rolagem">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{a.alcance || '1,5m'}</span>
                      <div className="flex items-center gap-2">
                        {a.dano && (
                          <button
                            onClick={() => rolarDano(a)}
                            disabled={rolando === `${a.id}-dano` || acertouAtual === false}
                            title={acertouAtual === false ? 'O ataque errou a Defesa informada.' : undefined}
                            className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2 text-xs font-bold transition-all disabled:opacity-50"
                          >
                            <Dices size={14} /> {rolando === `${a.id}-dano`
                              ? 'Rolando...'
                              : criticoAtual
                                ? `Dano crítico x${a.multiplicadorCritico}`
                                : 'Rolar Dano'}
                          </button>
                        )}
                        <button
                          onClick={() => rolarAcerto(a)}
                          disabled={rolando === `${a.id}-acerto`}
                          className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 flex items-center gap-2 text-xs font-bold transition-all disabled:opacity-50 hover:scale-105 disabled:hover:scale-100"
                        >
                          <Dices size={14} /> {rolando === `${a.id}-acerto` ? 'Rolando...' : 'Atacar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Reorder.Item>
            );
          })}
          {ataquesVisiveis.length === 0 && (
            <div className="py-12 text-center">
              <Crosshair size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhum Ataque Encontrado</p>
            </div>
          )}
        </Reorder.Group>
      </div>

      <FichaModal isOpen={modalAberto} onClose={fecharModal} title={editandoId ? 'Editar Ataque' : 'Novo Ataque'}>
        <div className="flex flex-col gap-4">
          <LabeledInput
            label="Nome"
            value={form.nome}
            placeholder="Ex: Espada Longa"
            onChange={(v: string) => setForm(f => ({ ...f, nome: v }))}
          />
          <LabeledSelect
            label="Tipo"
            value={form.tipo}
            options={TIPOS_ATAQUE}
            onChange={(v: string) => setForm(f => ({ ...f, tipo: v }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <LabeledInput
              label="Bônus adicional de Acerto"
              value={form.bonusAcerto}
              placeholder="0"
              onChange={(v: string) => setForm(f => ({ ...f, bonusAcerto: v.replace(/[^0-9+-]/g, '') }))}
            />
            <LabeledInput
              label="Dano (fórmula)"
              value={form.dano}
              placeholder="1d6+2"
              onChange={(v: string) => setForm(f => ({ ...f, dano: v }))}
            />
          </div>
          <LabeledInput
            label="Alcance"
            value={form.alcance}
            placeholder="Ex: 1,5m ou 18m"
            onChange={(v: string) => setForm(f => ({ ...f, alcance: v }))}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <LabeledInput
              label="Margem de Ameaça"
              type="number"
              value={form.margemAmeaca}
              placeholder="Ex.: 18"
              onChange={(v: string) => setForm(f => ({ ...f, margemAmeaca: v }))}
            />
            <LabeledInput
              label="Multiplicador Crítico"
              type="number"
              value={form.multiplicadorCritico}
              placeholder="Ex.: 5"
              onChange={(v: string) => setForm(f => ({ ...f, multiplicadorCritico: v }))}
            />
          </div>
          <p className="text-xs text-gray-500">
            Use qualquer margem entre 1 e 20 e o multiplicador definido pelo Mestre.
            No crítico, apenas os dados da arma são multiplicados; bônus fixos entram uma vez.
          </p>

          <div className="flex justify-end gap-3 mt-2">
            <button
              onClick={fecharModal}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white text-sm font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={!form.nome.trim()}
              className="px-6 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 text-sm font-bold transition-colors disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        </div>
      </FichaModal>
    </div>
  );
};
