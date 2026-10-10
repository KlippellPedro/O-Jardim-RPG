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
  normalizarCriticoBalanceado,
} from '../../../services/criticalService';
import { carregarCatalogo } from '../../../services/catalogoService';
import { vantagensDoGrau } from '../../../services/progressaoNiveis';
import { aplicarAjustesAtributosRaciais, BONUS_GRAU, modificador, obterAjustesPericiasRaciais } from '../../../services/calculoService';
import { grausComConcedidos, obterAtributoPericia } from '../../../services/periciasFichaService';
import type { ICatalogo } from '../../../types/catalogo';
import { resumirEquipamentos } from '../../../services/equipamentoService';
import {
  desvantagensAutomaticasTeste,
  BONUS_INSPIRADO,
  efeitosCondicoesNoTeste,
  inspiradoAtivo,
  removerCondicao,
  obterStatusFicha,
  penalidadeAtaqueCondicoes,
  penalidadeCansacoTeste,
  penalidadeDanoCorpoACorpoCondicoes,
} from '../../../services/statusService';
import { ajusteOrigem, chaveAjuste, totalAjustesManuais } from '../../../services/ajustesFichaService';
import { avisar, avisarErro } from '../../../components/avisos/avisos';
import { excluirDaFichaComDesfazer } from '../desfazerNaFicha';
import { temProficienciaEquipamento } from '../utils/catalogoResistProf';
import { ATRIBUTOS_DANO, TIPO_CORPO_A_CORPO, montarDano, normalizarConfigDano, resolverAtributoDano, tipoAtaqueDaArma } from '../utils/rolagemAtaque';
import { ConfigDanoAtaque } from '../components/ConfigDanoAtaque';
import {
  ConfirmarAcertoModal,
  ConfirmarDanoModal,
  type IOpcoesAcerto,
  type IOpcoesDano,
  type IParteRolagem,
} from '../components/ConfirmarRolagemAtaque';

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
  /** Ataque manual: soma o modificador de atributo ao dano (o atributo vem da configuração da ficha). Armas do inventário seguem a configuração. */
  somarForca?: boolean;
  /** Arma híbrida: o jogador escolhe corpo a corpo ou à distância na hora de atacar. */
  hibrida?: boolean;
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

const NOMES_ATRIBUTO: Record<string, string> = {
  forca: 'Força',
  destreza: 'Destreza',
  constituicao: 'Constituição',
  inteligencia: 'Inteligência',
  sabedoria: 'Sabedoria',
  carisma: 'Carisma',
  fluxo: 'Fluxo',
};

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
  somarForca: true,
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
  const [confirmacao, setConfirmacao] = useState<{ tipo: 'acerto' | 'dano'; id: string } | null>(null);
  const [tipoUso, setTipoUso] = useState(TIPO_CORPO_A_CORPO);

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
      tipo: tipoAtaqueDaArma(i.dados).tipo,
      hibrida: tipoAtaqueDaArma(i.dados).hibrida,
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

  const penalidadeFaltaProficiencia = (item: IAtaque) => {
    if (!item.isInventory || !item.subtipo || item.subtipo.toLocaleLowerCase('pt-BR') === 'simples') return 0;
    return temProficienciaEquipamento(ficha.proficiencias, 'armas', item.subtipo) ? 0 : -5;
  };

  const periciaDoAtaque = (item: IAtaque) => item.tipo === TIPO_CORPO_A_CORPO ? 'luta' : 'pontaria';
  const tipoDaCondicao = (item: IAtaque) => (item.tipo === TIPO_CORPO_A_CORPO ? 'corpo' : 'distancia') as 'corpo' | 'distancia';
  const grausDaFicha = grausComConcedidos(ficha);
  const atributoDoAtaqueEhFisico = (item: IAtaque) => {
    const periciaId = periciaDoAtaque(item);
    return ['forca', 'destreza', 'constituicao'].includes(obterAtributoPericia(ficha, periciaId, periciaId === 'luta' ? 'forca' : 'destreza'));
  };

  /** A conta do acerto, parcela por parcela. A soma e o bonus que vai para o servidor. */
  const detalharBonusAtaque = (item: IAtaque): IParteRolagem[] => {
    const periciaId = periciaDoAtaque(item);
    // A ficha pode trocar o atributo base de Luta e Pontaria; o ataque segue a troca.
    const atributoId = obterAtributoPericia(ficha, periciaId, periciaId === 'luta' ? 'forca' : 'destreza');
    const grau = grausDaFicha[periciaId] || 'iniciante';
    const partes: IParteRolagem[] = [
      { rotulo: `${NOMES_ATRIBUTO[atributoId] || atributoId} (modificador)`, valor: modificador(atributos[atributoId] ?? 10) },
      { rotulo: 'Metade do nível', valor: metadeNivel },
      { rotulo: `Grau da perícia (${grau})`, valor: BONUS_GRAU[grau] || 0 },
      { rotulo: 'Raça', valor: ajustesRaciaisPericias[periciaId] || 0 },
      { rotulo: 'Origem e ajustes manuais', valor: ajusteOrigem(ficha, 'pericia', periciaId) + totalAjustesManuais(ficha, chaveAjuste('pericia', periciaId)) },
      { rotulo: 'Itens e efeitos (perícia)', valor: resumoEquipamento.bonusPericias[periciaId] || 0 },
      { rotulo: 'Itens e efeitos (ataque)', valor: resumoEquipamento.bonusCombate.ataque || 0 },
      { rotulo: 'Bônus da arma', valor: Number(item.bonusAcerto) || 0 },
      { rotulo: 'Sem proficiência na arma', valor: penalidadeFaltaProficiencia(item) },
      { rotulo: 'Cansaço', valor: penalidadeCansacoTeste(status.cansacoAtual, atributoDoAtaqueEhFisico(item)) },
      { rotulo: 'Condições (Caído)', valor: penalidadeAtaqueCondicoes(ficha.condicoesAtivas) },
    ];
    for (const parte of efeitosCondicoesNoTeste(ficha.condicoesAtivas, { periciaId, atributoId, ataque: true, tipoAtaque: tipoDaCondicao(item) }).partes) {
      partes.push({ rotulo: `Condição: ${parte.nome}`, valor: parte.valor });
    }
    return partes.filter((parte, indice) => indice < 2 || parte.valor !== 0);
  };
  const calcularBonusAtaque = (item: IAtaque) => detalharBonusAtaque(item).reduce((soma, parte) => soma + parte.valor, 0);

  const vantagensAutomaticasAtaque = (item: IAtaque) => {
    const periciaId = periciaDoAtaque(item);
    return vantagensDoGrau(grausDaFicha[periciaId])
      + (resumoEquipamento.vantagens[periciaId] || 0)
      + (resumoEquipamento.vantagens['ataque'] || 0)
      + (resumoEquipamento.vantagens['testes'] || 0);
  };
  const desvantagensAutomaticasDoAtaque = (item: IAtaque) => {
    const periciaId = periciaDoAtaque(item);
    return desvantagensAutomaticasTeste(status.cansacoAtual, atributoDoAtaqueEhFisico(item), resumoEquipamento.sobrecarregado)
      + (resumoEquipamento.desvantagens[periciaId] || 0)
      + (resumoEquipamento.desvantagens['ataque'] || 0)
      + (resumoEquipamento.desvantagens['testes'] || 0)
      + efeitosCondicoesNoTeste(ficha.condicoesAtivas, { periciaId, ataque: true, tipoAtaque: tipoDaCondicao(item) }).desvantagens;
  };

  /** Atributo da perícia de combate de cada tipo: segue a troca de atributo feita na ficha. */
  const atributoPadraoDaPericia = (tipo: string) => {
    const periciaId = tipo === TIPO_CORPO_A_CORPO ? 'luta' : 'pontaria';
    return obterAtributoPericia(ficha, periciaId, periciaId === 'luta' ? 'forca' : 'destreza');
  };
  const configDano = normalizarConfigDano(ficha.danoAtaque);
  const modificadoresDosAtributos: Record<string, number> = Object.fromEntries(
    ATRIBUTOS_DANO.map((atributo) => [atributo.id, modificador(atributos[atributo.id] ?? 10)]),
  );
  /** Corpo a corpo soma o atributo por padrão, a distância não; a ficha muda isso. Ataque manual segue a própria caixa. */
  const regraDoDano = (item: IAtaque) => {
    const regra = resolverAtributoDano(configDano, item.tipo, atributoPadraoDaPericia(item.tipo));
    return item.isInventory ? regra : { ...regra, ativo: Boolean(item.somarForca) };
  };
  const atributoDoDano = (item: IAtaque): IParteRolagem | null => {
    const regra = regraDoDano(item);
    return regra.ativo
      ? { rotulo: `${NOMES_ATRIBUTO[regra.atributoId] || regra.atributoId} (modificador)`, valor: modificadoresDosAtributos[regra.atributoId] ?? 0 }
      : null;
  };
  const bonusDanoEquipamento = resumoEquipamento.bonusCombate.dano || 0;
  const ajusteDanoCondicoes = (item: IAtaque) => item.tipo === TIPO_CORPO_A_CORPO ? penalidadeDanoCorpoACorpoCondicoes(ficha.condicoesAtivas) : 0;
  const formulaDanoDoCartao = (item: IAtaque) => item.dano
    ? montarDano({ dano: item.dano, modificadorAtributo: atributoDoDano(item)?.valor, bonusEquipamento: bonusDanoEquipamento, ajusteCondicoes: ajusteDanoCondicoes(item) }).formula || item.dano
    : '';
  const ataqueComTipo = (item: IAtaque): IAtaque => (item.hibrida ? { ...item, tipo: tipoUso } : item);

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
      somarForca: Boolean(item.somarForca),
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
        somarForca: form.somarForca,
      };

      const novaLista = editandoId
        ? ataquesManuais.map((a: IAtaque) => (a.id === editandoId ? item : a))
        : [...ataquesManuais, item];

      onUpdate(['ficha', 'ataques'], novaLista);
    }
    
    fecharModal();
  };

  const marcarEquipada = (itemId: string, equipado: boolean) => mutateEconomy(character.id, (current) => {
    const inventario = current.inventario.map((itemAtual) => (
      itemAtual.item_id === itemId
        ? { ...itemAtual, dados: { ...itemAtual.dados, equipado } }
        : itemAtual
    ));
    return { carteira: current.carteira, inventario };
  });

  // Sem pergunta: nenhuma das duas saídas é definitiva e o aviso traz o "Desfazer".
  const excluir = (item: IAtaque) => {
    if (item.isInventory) {
      void marcarEquipada(item.id, false);
      if (resultado?.ataqueId === item.id) setResultado(null);
      avisar.info(`"${item.nome}" continua na sua mochila.`, {
        titulo: 'Arma desequipada',
        chave: `desequipar:${item.id}`,
        acao: { rotulo: 'Desfazer', aoClicar: () => { void marcarEquipada(item.id, true); } },
      });
      return;
    }

    excluirDaFichaComDesfazer<IAtaque>({
      personagemId: character.id,
      lista: (personagem) => personagem.ficha?.ataques,
      id: item.id,
      gravar: (lista) => onUpdate(['ficha', 'ataques'], lista),
      texto: `Ataque "${item.nome}" excluído.`,
    });
    if (resultado?.ataqueId === item.id) setResultado(null);
  };

  const podeRolar = (item: IAtaque, paraAcerto: boolean) => {
    if (!campanhaId) {
      avisar.aviso('Nenhuma campanha ativa. Selecione uma campanha para rolar dados.');
      return false;
    }
    if (paraAcerto && item.isInventory && Number(item.municaoMaxima) > 0 && Number(item.municaoAtual) <= 0) {
      avisar.aviso('Esta arma está sem munição. Recarregue no Inventário antes de atacar.');
      return false;
    }
    return true;
  };

  /** Clique normal abre a confirmação; Shift rola direto com o que está na ficha. */
  const pedirRolagem = (item: IAtaque, tipo: 'acerto' | 'dano', evento: { shiftKey: boolean }) => {
    if (!podeRolar(item, tipo === 'acerto')) return;
    if (tipo === 'dano' && !item.dano) return;
    if (evento.shiftKey) {
      void (tipo === 'acerto' ? executarAcerto(item, null) : executarDano(item, null));
      return;
    }
    setTipoUso(item.tipo === 'Distância' ? 'Distância' : TIPO_CORPO_A_CORPO);
    setConfirmacao({ tipo, id: item.id });
  };

  const executarAcerto = async (item: IAtaque, opcoes: IOpcoesAcerto | null) => {
    if (!podeRolar(item, true)) return;
    setRolando(`${item.id}-acerto`);
    try {
      const defesaTexto = opcoes ? opcoes.defesa : defesaAlvo;
      const defesa = Number(defesaTexto);
      const defesaInformada = defesaTexto.trim() !== '' && Number.isFinite(defesa) && defesa >= 1;
      if (opcoes) setDefesaAlvo(opcoes.defesa);
      const { registro } = await registrosApi.rolar({
        campanhaId: campanhaId as string,
        personagemId: character.id,
        titulo: `Ataque: ${item.nome}`,
        bonus: calcularBonusAtaque(item) + (opcoes?.bonusExtra || 0) + (opcoes?.usarInspirado ? BONUS_INSPIRADO : 0),
        vantagens: vantagensAutomaticasAtaque(item) + (opcoes?.vantagensExtras || 0),
        desvantagens: desvantagensAutomaticasDoAtaque(item) + (opcoes?.desvantagensExtras || 0),
        dadosExtras: opcoes?.dadoExtra || null,
        dt: defesaInformada ? defesa : null,
        origem: {
          tipo: 'ataque',
          ataque_id: item.id,
          defesa_alvo: defesaInformada ? defesa : null,
          margem_ameaca: Math.max(2, item.margemAmeaca - (resumoEquipamento.bonusCombate.margemAmeaca || 0)),
          multiplicador_critico: item.multiplicadorCritico + (resumoEquipamento.bonusCombate.multiplicadorCritico || 0),
          ...(opcoes?.bonusExtra ? { bonus_extra: opcoes.bonusExtra } : {}),
          ...(opcoes?.usarInspirado ? { inspirado: BONUS_INSPIRADO } : {}),
          ...(opcoes?.vantagensExtras ? { vantagens_extras: opcoes.vantagensExtras } : {}),
          ...(opcoes?.desvantagensExtras ? { desvantagens_extras: opcoes.desvantagensExtras } : {}),
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
      // Inspirado vale para um teste só: depois de rolar, a condição sai.
      if (opcoes?.usarInspirado) onUpdate(['ficha', 'condicoesAtivas'], removerCondicao(ficha.condicoesAtivas, 'inspirado'));
      setResultado({ ataqueId: item.id, tipo: 'acerto', resultado: registro.resultado, detalhes: registro.detalhes });
    } catch (erro: any) {
      avisarErro(erro, 'Falha ao rolar o ataque.');
    } finally {
      setRolando(null);
    }
  };

  /** O critico padrao vem do d20 natural do ultimo ataque desta arma. */
  const criticoDoUltimoAtaque = (item: IAtaque) => {
    const natural = resultado?.ataqueId === item.id && resultado.tipo === 'acerto'
      ? resultado.detalhes?.natural
      : null;
    return ameacaCritico(natural, Math.max(2, item.margemAmeaca - (resumoEquipamento.bonusCombate.margemAmeaca || 0)));
  };

  const executarDano = async (item: IAtaque, opcoes: IOpcoesDano | null) => {
    if (!podeRolar(item, false) || !item.dano) return;
    const margemEfetiva = Math.max(2, item.margemAmeaca - (resumoEquipamento.bonusCombate.margemAmeaca || 0));
    const multiplicadorEfetivo = item.multiplicadorCritico + (resumoEquipamento.bonusCombate.multiplicadorCritico || 0);
    const critico = opcoes ? opcoes.critico : criticoDoUltimoAtaque(item);
    const montagem = montarDano({
      dano: item.dano,
      modificadorAtributo: opcoes ? (opcoes.atributoId ? modificadoresDosAtributos[opcoes.atributoId] ?? 0 : 0) : atributoDoDano(item)?.valor ?? 0,
      bonusEquipamento: bonusDanoEquipamento,
      ajusteCondicoes: ajusteDanoCondicoes(item),
      bonusExtra: opcoes?.bonusExtra,
      dadoExtra: opcoes?.dadoExtra,
      critico,
      multiplicadorCritico: multiplicadorEfetivo,
    });
    if (montagem.erro) {
      avisar.aviso(montagem.erro);
      return;
    }
    setRolando(`${item.id}-dano`);
    try {
      const { registro } = await registrosApi.rolar({
        campanhaId: campanhaId as string,
        personagemId: character.id,
        titulo: critico ? `Dano crítico x${multiplicadorEfetivo}: ${item.nome}` : `Dano: ${item.nome}`,
        formula: montagem.formula,
        origem: {
          tipo: critico ? 'dano_critico' : 'dano',
          ataque_id: item.id,
          formula_base: montagem.formulaBase,
          margem_ameaca: margemEfetiva,
          multiplicador_critico: multiplicadorEfetivo,
        },
      });
      setResultado({ ataqueId: item.id, tipo: 'dano', resultado: registro.resultado, detalhes: registro.detalhes });
    } catch (erro: any) {
      avisarErro(erro, 'Falha ao rolar o dano.');
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

      <ConfigDanoAtaque
        config={configDano}
        atributoDaPericia={{ corpo: atributoPadraoDaPericia(TIPO_CORPO_A_CORPO), distancia: atributoPadraoDaPericia('Distância') }}
        onChange={(config) => onUpdate(['ficha', 'danoAtaque'], config)}
      />

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
                          {a.dano ? formulaDanoDoCartao(a) : 'Não informado'}
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
                        <div className="text-right">
                          <span className={`text-2xl font-bold font-mono ${criticoAtual ? 'text-yellow-400' : 'text-white'}`}>
                            {resultadoAtual.resultado}
                          </span>
                          {resultadoAtual.tipo === 'dano' && resultadoAtual.detalhes?.formula && (
                            <span className="block font-mono text-[10px] text-gray-600">{resultadoAtual.detalhes.formula}</span>
                          )}
                          {resultadoAtual.tipo === 'acerto' && resultadoAtual.detalhes?.extras && (
                            <span className="block font-mono text-[10px] text-gray-600">
                              extra {resultadoAtual.detalhes.extras.formula} [{(resultadoAtual.detalhes.extras.dados || []).join(', ')}]
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/5" data-tour="ataque-rolagem">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{a.alcance || '1,5m'}</span>
                      <div className="flex items-center gap-2">
                        {a.dano && (
                          <button
                            onClick={(evento) => pedirRolagem(a, 'dano', evento)}
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
                          onClick={(evento) => pedirRolagem(a, 'acerto', evento)}
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
            onChange={(v: string) => setForm(f => ({ ...f, tipo: v, ...(editandoId ? {} : { somarForca: v === TIPO_CORPO_A_CORPO }) }))}
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
          {!editandoInventario && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/5 bg-[#121118] p-3">
              <input
                type="checkbox"
                checked={form.somarForca}
                onChange={(event) => setForm(f => ({ ...f, somarForca: event.target.checked }))}
                className="mt-0.5 accent-red-500"
              />
              <span className="text-xs text-gray-400">
                <strong className="block text-sm text-gray-200">Somar o modificador de atributo ao dano</strong>
                O atributo vem da configuração "Atributo somado ao dano" da aba. Desmarque se a fórmula acima já inclui esse bônus.
              </span>
            </label>
          )}
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

      {(() => {
        const alvo = ataques.find((a) => a.id === confirmacao?.id);
        if (!alvo) return null;
        const efetivo = ataqueComTipo(alvo);
        const aoFechar = () => setConfirmacao(null);
        const multiplicador = efetivo.multiplicadorCritico + (resumoEquipamento.bonusCombate.multiplicadorCritico || 0);
        return (
          <>
            <ConfirmarAcertoModal
              aberto={confirmacao?.tipo === 'acerto'}
              onClose={aoFechar}
              nomeArma={efetivo.nome}
              partesBonus={detalharBonusAtaque(efetivo)}
              vantagensAuto={vantagensAutomaticasAtaque(efetivo)}
              desvantagensAuto={desvantagensAutomaticasDoAtaque(efetivo)}
              defesaInicial={defesaAlvo}
              inspirado={inspiradoAtivo(ficha.condicoesAtivas)}
              hibrida={alvo.hibrida}
              tipoUso={tipoUso}
              onTipoUso={setTipoUso}
              onConfirmar={(opcoes) => { aoFechar(); void executarAcerto(efetivo, opcoes); }}
            />
            <ConfirmarDanoModal
              aberto={confirmacao?.tipo === 'dano'}
              onClose={aoFechar}
              nomeArma={efetivo.nome}
              dano={efetivo.dano}
              modificadores={modificadoresDosAtributos}
              atributoInicial={regraDoDano(efetivo).atributoId}
              somarInicial={regraDoDano(efetivo).ativo}
              bonusEquipamento={bonusDanoEquipamento}
              ajusteCondicoes={ajusteDanoCondicoes(efetivo)}
              multiplicadorCritico={multiplicador}
              criticoInicial={criticoDoUltimoAtaque(efetivo)}
              hibrida={alvo.hibrida}
              tipoUso={tipoUso}
              onTipoUso={setTipoUso}
              onConfirmar={(opcoes) => { aoFechar(); void executarDano(efetivo, opcoes); }}
            />
          </>
        );
      })()}
    </div>
  );
};
