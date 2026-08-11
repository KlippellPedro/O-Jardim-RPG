import { useState, useEffect, useRef } from 'react';
import { HelpCircle, X, Pencil } from 'lucide-react';
import { SectionTitle, LabeledInput, LabeledModalSelect } from '../components/SharedFichaComponents';
import { ModalInfoFicha } from '../components/ModalInfoFicha';
import { carregarCatalogo } from '../../../services/catalogoService';
import { ICatalogo } from '../../../types/catalogo';
import { aplicarAjustesAtributosRaciais, ATRIBUTOS, ATRIBUTO_VALOR_MINIMO, bonusTesteAtributo, calcularDerivadosComClasses, TABELA_XP, nivelPorXp, TAtributo } from '../../../services/calculoService';
import { limparEscolhasPrincipaisRaciais, obterGruposEscolhaRacial, nomeExibicaoRaca, RACA_PERSONALIZADA_ID } from '../../../services/racaService';
import { registrosApi } from '../../../services/registrosApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { ARVORES, SEM_ARVORE_ID, arvoreVisivel, filtrarPorArvore, filtrarPorLiberacao } from '../../../../data/mundo/arvoresCatalog';
import { AVISO_FLUXO_FIM } from '../../../services/magiaService';
import {
  atualizarStatusVital,
  bonusIniciativaFicha,
  desvantagensAutomaticasTeste,
  movimentoBloqueadoPorCondicao,
  multiplicadorMovimentoCansaco,
  obterStatusFicha,
  penalidadeCansacoIniciativa,
  penalidadeCansacoTeste,
  penalidadeDefesaCondicoes,
  penalidadeIniciativaCondicoes,
} from '../../../services/statusService';
import { resumirEquipamentos } from '../../../services/equipamentoService';
import { CONDICOES_OFICIAIS, CRISES_SANIDADE } from '../../../../data/regras/condicoes';
import { ORIGENS_EXEMPLO, obterOrigemExemplo } from '../../../../data/ficha/origensData';
import { AjusteButton, AjustesFichaModal } from '../components/AjustesFichaModal';
import { ModalPortal } from '../components/ModalPortal';
import {
  ajusteOrigem,
  chaveAjuste,
  nomeAjusteOrigem,
  obterAjustesManuais,
  totalAjustesManuais,
  type IAjusteFicha,
} from '../../../services/ajustesFichaService';
import { AtributosSection, NOMES_ATRIBUTOS } from '../components/AtributosSection';
import { StatusVitaisSection } from '../components/StatusVitaisSection';
import { FamaPrestigioSection } from '../components/FamaPrestigioSection';
import { FrutoEdenSection } from '../components/FrutoEdenSection';

interface IClasseSlot {
  classeId: string;
  nivel: number;
}

export const AbaFicha = ({ character, onUpdate }: { character: any, onUpdate: any }) => {
  const f = character.ficha || {};
  const [activeModal, setActiveModal] = useState<any>(null);
  const [ajusteModal, setAjusteModal] = useState<{
    chave: string;
    titulo: string;
    automaticos: Array<{ nome: string; valor: number }>;
  } | null>(null);
  const [catalogo, setCatalogo] = useState<ICatalogo | null>(null);

  useEffect(() => {
    carregarCatalogo().then(setCatalogo);
  }, []);

  const [proficienciasTexto, setProficienciasTexto] = useState(() => (f.proficiencias || []).join(', '));
  const proficienciasEmFocoRef = useRef(false);
  useEffect(() => {
    if (!proficienciasEmFocoRef.current) setProficienciasTexto((f.proficiencias || []).join(', '));
  }, [f.proficiencias]);

  const status = obterStatusFicha(f);
  const racaAtual = catalogo?.racas.find(raca => raca.id === f.racaId) || null;
  const origemAtual = obterOrigemExemplo(f.origemId);
  const classes: IClasseSlot[] = f.classes?.length
    ? f.classes
    : (f.classeId ? [{ classeId: f.classeId, nivel: character.nivel || 1 }] : []);
  const nivelTotalClasses = classes.reduce((sum, classe) => sum + (Number(classe.nivel) || 1), 0) || 1;
  const resumoEquipamento = resumirEquipamentos(character.inventarioCentral || [], f);
  const attrsNaturais = (f.atributosFinais || character.atributosFinais || { forca:10, destreza:10, constituicao:10, inteligencia:10, sabedoria:10, carisma:10, fluxo:10 }) as Record<TAtributo, number>;
  const attrsAntesRacaSemEquipamento = Object.fromEntries(ATRIBUTOS.map((attr) => [
    attr,
    Number(attrsNaturais[attr] ?? 10)
      + ajusteOrigem(f, 'atributo', attr)
      + totalAjustesManuais(f, chaveAjuste('atributo', attr)),
  ])) as Record<TAtributo, number>;
  const attrsAntesRaca = Object.fromEntries(ATRIBUTOS.map((attr) => [
    attr,
    attrsAntesRacaSemEquipamento[attr] + (resumoEquipamento.bonusAtributos[attr] || 0),
  ])) as Record<TAtributo, number>;
  const attrs = (racaAtual
    ? aplicarAjustesAtributosRaciais(attrsAntesRaca, racaAtual, f.escolhaRacial)
    : attrsAntesRaca) as Record<TAtributo, number>;
  const derivadosSemEquipamento = catalogo
    ? calcularDerivadosComClasses(attrsAntesRacaSemEquipamento, racaAtual, classes, catalogo.classes, nivelTotalClasses, f.escolhaRacial)
    : null;
  const derivadosComEquipamento = catalogo
    ? calcularDerivadosComClasses(attrsAntesRaca, racaAtual, classes, catalogo.classes, nivelTotalClasses, f.escolhaRacial)
    : null;
  const deltaDerivado = (campo: 'vida' | 'mana' | 'defesaNatural' | 'iniciativa' | 'movimento') => (
    Number(derivadosComEquipamento?.[campo] || 0) - Number(derivadosSemEquipamento?.[campo] || 0)
  );
  const maxVidaBase = Number(f.derivados?.vida ?? character.derivados?.vida) || 10;
  const maxManaBase = Number(f.derivados?.mana ?? character.derivados?.mana) || 10;
  const maxVida = Math.max(1, maxVidaBase + deltaDerivado('vida') + ajusteOrigem(f, 'vidaMaxima') + totalAjustesManuais(f, chaveAjuste('recurso', 'vidaMaxima')) + (resumoEquipamento.bonusRecursos.vidaMaxima || 0));
  const maxMana = Math.max(1, maxManaBase + deltaDerivado('mana') + ajusteOrigem(f, 'manaMaxima') + totalAjustesManuais(f, chaveAjuste('recurso', 'manaMaxima')) + (resumoEquipamento.bonusRecursos.manaMaxima || 0));
  const maxSanidadeBase = Math.max(1, Number(status.sanidadeMaxima) || 100);
  const maxSanidade = Math.max(1, maxSanidadeBase + ajusteOrigem(f, 'sanidadeMaxima') + totalAjustesManuais(f, chaveAjuste('recurso', 'sanidadeMaxima')) + (resumoEquipamento.bonusRecursos.sanidadeMaxima || 0));
  const maxCansacoBase = Math.max(1, Number(status.cansacoMaximo) || 6);
  const maxCansaco = Math.max(1, maxCansacoBase + totalAjustesManuais(f, chaveAjuste('recurso', 'cansacoMaximo')) + (resumoEquipamento.bonusRecursos.cansacoMaximo || 0));
  const defesaNatural = (Number(f.derivados?.defesaNatural ?? character.derivados?.defesaNatural) || 10) + deltaDerivado('defesaNatural');
  const penalidadeDefesa = penalidadeDefesaCondicoes(f.condicoesAtivas);
  const ajusteDefesa = totalAjustesManuais(f, chaveAjuste('combate', 'defesa'));
  const defesaTotal = defesaNatural + resumoEquipamento.defesaEquipamento + (resumoEquipamento.bonusCombate.defesa || 0) - penalidadeDefesa + ajusteDefesa;
  const iniciativaBase = (Number(f.derivados?.iniciativa ?? character.derivados?.iniciativa) || 10) + deltaDerivado('iniciativa');
  const penalidadeIniciativa = penalidadeCansacoIniciativa(status.cansacoAtual)
    + penalidadeIniciativaCondicoes(f.condicoesAtivas);
  const bonusIniciativa = bonusIniciativaFicha(f);
  const ajusteIniciativa = totalAjustesManuais(f, chaveAjuste('combate', 'iniciativa'));
  const iniciativaFinal = iniciativaBase + bonusIniciativa + penalidadeIniciativa + ajusteIniciativa + (resumoEquipamento.bonusCombate.iniciativa || 0);
  const movimentoBase = (Number(f.derivados?.movimento ?? character.derivados?.movimento) || 9) + deltaDerivado('movimento');
  const penalidadeSobrecarga = resumoEquipamento.sobrecarregado ? 3 : 0;
  const ajusteMovimento = ajusteOrigem(f, 'movimento') + totalAjustesManuais(f, chaveAjuste('combate', 'movimento'));
  const movimentoFinal = movimentoBloqueadoPorCondicao(f.condicoesAtivas)
    ? 0
    : Math.max(0, (movimentoBase + ajusteMovimento + (resumoEquipamento.bonusCombate.movimento || 0) - penalidadeSobrecarga) * multiplicadorMovimentoCansaco(status.cansacoAtual));

  const vAtual = Number(status.vidaAtual ?? maxVida);
  const mAtual = Number(status.manaAtual ?? maxMana);
  const sAtual = Number(status.sanidadeAtual ?? maxSanidade);
  const cAtual = Number(status.cansacoAtual ?? 0);
  const efeitosCansaco = [
    cAtual >= 1 ? 'Testes físicos: penalidade ativa' : null,
    cAtual >= 2 ? 'Iniciativa: −1' : null,
    cAtual >= 3 ? 'Todos os testes: −2' : null,
    cAtual >= 4 ? 'Testes físicos: 1 desvantagem' : null,
    cAtual >= 5 ? 'Movimento: metade' : null,
    cAtual >= 6 ? 'Colapso' : null,
  ].filter(Boolean) as string[];

  const handleStatus = (field: string, change: number, max: number) => {
    const proximoStatus = atualizarStatusVital(status, field, change, max, attrs.constituicao);
    onUpdate(['ficha', 'status'], proximoStatus);
  };

  const handleSanidadeMaxima = (novoMaximoTotal: number) => {
    const ajustesExternos = ajusteOrigem(f, 'sanidadeMaxima')
      + totalAjustesManuais(f, chaveAjuste('recurso', 'sanidadeMaxima'))
      + (resumoEquipamento.bonusRecursos.sanidadeMaxima || 0);
    const novaBase = Math.max(1, Math.trunc(novoMaximoTotal - ajustesExternos));
    const novoTotal = Math.max(1, novaBase + ajustesExternos);
    onUpdate(['ficha', 'status'], {
      ...status,
      sanidadeMaxima: novaBase,
      sanidadeAtual: Math.min(Number(status.sanidadeAtual ?? novoTotal), novoTotal),
    });
  };

  const abrirAjustes = (
    chave: string,
    titulo: string,
    automaticos: Array<{ nome: string; valor: number }> = [],
  ) => setAjusteModal({ chave, titulo, automaticos: automaticos.filter((item) => item.valor !== 0) });

  const atributosParaDerivados = (base: Record<string, number>, ficha: any) => Object.fromEntries(
    ATRIBUTOS.map((attr) => [
      attr,
      Number(base[attr] ?? 10)
        + ajusteOrigem(ficha, 'atributo', attr)
        + totalAjustesManuais(ficha, chaveAjuste('atributo', attr)),
    ]),
  );

  const salvarAjustes = (chave: string, ajustes: IAjusteFicha[]) => {
    const novosAjustes = { ...(f.ajustesFicha || {}), [chave]: ajustes };
    const novaFicha = { ...f, ajustesFicha: novosAjustes };
    if (chave.startsWith('atributo.') && catalogo) {
      novaFicha.derivados = calcularDerivadosComClasses(
        atributosParaDerivados(attrsNaturais, novaFicha),
        racaAtual,
        classes,
        catalogo.classes,
        nivelTotalClasses,
        f.escolhaRacial,
      );
    }
    onUpdate(['ficha'], novaFicha);
  };

  // BUG-FIX: valores dos atributos eram só leitura; agora dá pra ajustar
  // direto na ficha digitando o número.
  // O teto de 20 (ATRIBUTO_VALOR_MAXIMO) só vale pra criação (Wizard,
  // regras oficiais): a ficha de um personagem já em jogo pode passar disso
  // por bênção, mutação ou qualquer coisa negociada com o mestre - só o piso
  // de 1 continua valendo aqui, pra não deixar salvar atributo negativo.
  const handleAttrChange = (attr: TAtributo, novoValorEfetivo: number) => {
    const ajustesExternos = Number(attrs[attr] ?? 10) - Number(attrsNaturais[attr] ?? 10);
    const novo = Math.max(ATRIBUTO_VALOR_MINIMO, novoValorEfetivo - ajustesExternos);
    const novosAtributos = { ...attrsNaturais, [attr]: novo };
    const derivados = catalogo
      ? calcularDerivadosComClasses(
          atributosParaDerivados(novosAtributos, f),
          racaAtual,
          classes,
          catalogo.classes,
          nivelTotalClasses,
          f.escolhaRacial,
        )
      : f.derivados;
    onUpdate(['ficha'], { ...f, atributosFinais: novosAtributos, derivados });
  };

  // BUG-FIX: "Rolar Teste" mostrava só Força/Destreza com bônus fixo (+2/+0)
  // que não refletia os atributos reais. Lista os 7 atributos com o
  // modificador calculado ao vivo e rola de verdade no servidor.
  //
  // Vive dentro do modal "?" de cada atributo (não um card fixo na tela):
  // um resultado só faz sentido pro atributo cujo modal está aberto, daí
  // `resultadoTeste` guardar o atributo junto.
  const campanhaAtiva = useAuthStore((s) => s.campanhaAtiva);
  const usuario = useAuthStore((s) => s.usuario);
  const isMestre = usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador'
    || campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente';
  const configCampanha = campanhaAtiva?.configuracoes || {};
  const arvoresDisponiveis = ARVORES.filter(a => arvoreVisivel(a.id, configCampanha, isMestre));
  const [rolandoTeste, setRolandoTeste] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<{ atributo: TAtributo; resultado: number | null } | null>(null);

  const modificadorTeste = (attr: TAtributo) => {
    const fisico = ['forca', 'destreza', 'constituicao'].includes(attr);
    return bonusTesteAtributo(attrs[attr], penalidadeCansacoTeste(status.cansacoAtual, fisico));
  };

  const handleRolarTeste = async (attr: TAtributo) => {
    if (!campanhaAtiva?.id) {
      alert('Nenhuma campanha ativa. Selecione uma campanha para rolar dados.');
      return;
    }
    const fisico = ['forca', 'destreza', 'constituicao'].includes(attr);
    const desvantagens = desvantagensAutomaticasTeste(status.cansacoAtual, fisico, resumoEquipamento.sobrecarregado);
    setRolandoTeste(true);
    setResultadoTeste(null);
    try {
      const { registro } = await registrosApi.rolar({
        campanhaId: campanhaAtiva.id,
        personagemId: character.id,
        titulo: `Teste de ${NOMES_ATRIBUTOS[attr]}`,
        bonus: modificadorTeste(attr),
        desvantagens,
      });
      setResultadoTeste({ atributo: attr, resultado: registro.resultado });
    } catch (e: any) {
      alert(e?.message || 'Falha ao rolar o teste.');
    } finally {
      setRolandoTeste(false);
    }
  };

  // BUG-FIX: barra de XP era decorativa (0/1000 fixo, botões sem ação).
  // Usa a mesma tabela de XP do Wizard (TABELA_XP/nivelPorXp).
  const xpAtual = Number(f.xp) || 0;
  const nivelAtual = character.nivel || 1;
  const xpNivelAtual = TABELA_XP[nivelAtual - 1] ?? 0;
  const xpProximoNivel = TABELA_XP[nivelAtual] ?? null;
  const percentXp = xpProximoNivel
    ? Math.min(100, Math.max(0, ((xpAtual - xpNivelAtual) / (xpProximoNivel - xpNivelAtual)) * 100))
    : 100;
  const podeSubirNivel = xpProximoNivel !== null && xpAtual >= xpProximoNivel;

  const handleXp = (delta: number) => {
    const novo = Math.max(0, xpAtual + delta);
    onUpdate(['ficha', 'xp'], novo);
  };

  const handleSubirNivel = (escolha: { tipo: 'existente' | 'nova', index?: number, novaClasseId?: string }) => {
    const novoNivelXp = nivelPorXp(xpAtual);
    const nivelTotalAtual = classes.reduce((sum, c) => sum + (Number(c.nivel) || 1), 0);
    const niveisParaSubir = novoNivelXp - nivelTotalAtual;

    if (niveisParaSubir <= 0) {
      setActiveModal(null);
      return;
    }

    let next = [...classes];
    
    if (escolha.tipo === 'existente' && escolha.index !== undefined) {
      next[escolha.index] = { ...next[escolha.index], nivel: next[escolha.index].nivel + 1 };
    } else if (escolha.tipo === 'nova' && escolha.novaClasseId) {
      next.push({ classeId: escolha.novaClasseId, nivel: 1 });
    }

    salvarClasses(next);
    setActiveModal(null);
  };
  
  const [xpInput, setXpInput] = useState<string | undefined>();

  const handleXpBlur = (val: string) => {
    if (!val.trim()) {
      setXpInput(undefined);
      return;
    }
    
    let change = 0;
    if (val.startsWith('+')) {
      change = parseInt(val.substring(1)) || 0;
      handleXp(change);
    } else if (val.startsWith('-')) {
      change = parseInt(val.substring(1)) || 0;
      handleXp(-change);
    } else {
      const absVal = parseInt(val);
      if (!isNaN(absVal)) {
        if (absVal > xpAtual) handleXp(absVal - xpAtual);
        else if (absVal < xpAtual) handleXp(-(xpAtual - absVal));
      }
    }
    setXpInput(undefined);
  };



  // BUG-FIX: só existia 1 "classe" fixa e nem o nível nem o "+ Adicionar
  // Classe" funcionavam. Agora é uma lista de verdade (ficha.classes),
  // mantendo ficha.classeId em dia com a primeira classe (compatibilidade
  // com FichaList.tsx, que ainda lê esse campo pro card do personagem).
  // Raça/classe exclusivas de outra Árvore, ou especiais não liberadas pelo
  // mestre, não aparecem como opção: mestre/assistente vê tudo, e a opção
  // já escolhida antes sempre continua na lista (senão o campo fica com um
  // id sem rótulo visível se o mestre revogar a liberação depois).
  const manterEscolhaAtual = <T extends { id: string }>(lista: T[], todas: T[], idAtual: string | undefined): T[] => {
    if (!idAtual || lista.some(item => item.id === idAtual)) return lista;
    const atual = todas.find(item => item.id === idAtual);
    return atual ? [...lista, atual] : lista;
  };

  const liberadosRacaJogador = (usuario?.id && configCampanha.racas_liberadas_membros?.[usuario.id]) || [];
  const liberadosClasseJogador = (usuario?.id && configCampanha.classes_liberadas_membros?.[usuario.id]) || [];

  const racasFiltradas = isMestre
    ? (catalogo?.racas || [])
    : manterEscolhaAtual(
        filtrarPorLiberacao(
          filtrarPorArvore(catalogo?.racas || [], f.arvoreId),
          configCampanha.racas_liberadas || [],
          liberadosRacaJogador,
        ),
        catalogo?.racas || [],
        f.racaId,
      );
  const classesFiltradas = isMestre
    ? (catalogo?.classes || [])
    : filtrarPorLiberacao(
        filtrarPorArvore(catalogo?.classes || [], f.arvoreId),
        configCampanha.classes_liberadas || [],
        liberadosClasseJogador,
      );

  // Jogador comum pode TROCAR a própria raça/classe pra uma opção que o
  // mestre liberou (pra ele ou pra campanha inteira) - uma "transformação"
  // sob controle do mestre, nunca respec livre entre duas raças/classes
  // comuns (o backend também recusa isso: ver
  // plataforma/core/character_summary.py::validar_regras_ficha). A opção
  // atual, seja qual for, sempre continua selecionável (senão o campo
  // trava sem conseguir salvar mais nada).
  const racasEditaveisPeloJogador = racasFiltradas.filter(
    raca => raca.categoria !== 'padrao' || raca.id === f.racaId,
  );
  const classesEditaveisPeloJogador = (classeIdAtual: string) => (
    classeIdAtual
      ? classesFiltradas.filter(classe => classe.categoria !== 'padrao' || classe.id === classeIdAtual)
      : classesFiltradas // slot vazio (classe nova): adicionar não é trocar, sem essa restrição
  );

  const gruposEscolhaRacial = obterGruposEscolhaRacial(racaAtual);

  const salvarIdentidadeRacial = (novaRacaId: string, novaEscolhaRacial: Record<string, any>) => {
    const novaRaca = catalogo?.racas.find(raca => raca.id === novaRacaId) || null;
    const derivados = novaRaca && catalogo
      ? calcularDerivadosComClasses(atributosParaDerivados(attrsNaturais, f), novaRaca, classes, catalogo.classes, nivelTotalClasses, novaEscolhaRacial)
      : f.derivados;
    onUpdate(['ficha'], {
      ...f,
      racaId: novaRacaId,
      escolhaRacial: novaEscolhaRacial,
      derivados,
    });
  };

  const handleRacaChange = (novaRacaId: string) => {
    const escolhaLimpa = limparEscolhasPrincipaisRaciais(f.escolhaRacial);
    salvarIdentidadeRacial(novaRacaId, escolhaLimpa);
  };

  const handleEscolhaRacialChange = (campo: string, valor: string) => {
    salvarIdentidadeRacial(f.racaId, {
      ...(f.escolhaRacial || {}),
      [campo]: valor,
    });
  };

  const handleOrigemChange = (origemId: string) => {
    const origem = obterOrigemExemplo(origemId);
    const novaFicha = {
      ...f,
      origemId,
      origem: origem?.titulo || (origemId === 'personalizada' ? '' : f.origem || ''),
    };
    if (catalogo) {
      novaFicha.derivados = calcularDerivadosComClasses(
        atributosParaDerivados(attrsNaturais, novaFicha),
        racaAtual,
        classes,
        catalogo.classes,
        nivelTotalClasses,
        f.escolhaRacial,
      );
    }
    onUpdate(['ficha'], novaFicha);
  };

  // BUG-FIX: chamar onUpdate duas vezes seguidas aqui causava uma corrida:
  // a segunda chamada usava um "character" desatualizado (fechamento antigo
  // de handleUpdate em PersonagemSheet, que só se renova depois que a
  // primeira chamada resolve), e acabava sobrescrevendo ficha.classes com o
  // valor antigo. Uma única chamada elimina a corrida; classeId (usado só
  // como legenda no card da lista) é derivado de ficha.classes na leitura.
  const salvarClasses = (novaLista: IClasseSlot[]) => {
    const nivelTotal = novaLista.reduce((sum, c) => sum + (Number(c.nivel) || 1), 0) || 1;
    const derivados = catalogo
      ? calcularDerivadosComClasses(atributosParaDerivados(attrsNaturais, f), racaAtual, novaLista, catalogo.classes, nivelTotal, f.escolhaRacial)
      : f.derivados;
    onUpdate(['ficha'], {
      ...f,
      classeId: novaLista[0]?.classeId || f.classeId,
      classes: novaLista,
      nivel: nivelTotal,
      derivados,
    });
  };

  const classesAtuaisCatalogo = classes
    .map(slot => ({ slot, classe: catalogo?.classes.find(item => item.id === slot.classeId) }))
    .filter(item => item.classe);
  const comunsAtuais = classesAtuaisCatalogo.filter(item => item.classe?.categoria === 'padrao');
  const possuiEspecial = classesAtuaisCatalogo.some(item => item.classe?.categoria !== 'padrao');
  const classesDisponiveisMulticlasse = classesFiltradas.filter(classe => {
    if (classes.some(slot => slot.classeId === classe.id)) return false;
    if (!isMestre) {
      if (nivelTotalClasses >= 60) return false;
      if (classe.categoria !== 'padrao') return !possuiEspecial && nivelTotalClasses >= 20;
      return comunsAtuais.length < 2;
    }
    return true;
  });

  const handleAdicionarClasse = () => {
    salvarClasses([...classes, { classeId: '', nivel: 1 }]);
  };

  const handleRemoverClasse = (index: number) => {
    salvarClasses(classes.filter((_, i) => i !== index));
  };

  const handleClasseChange = (index: number, classeId: string) => {
    salvarClasses(classes.map((c, i) => (i === index ? { ...c, classeId } : c)));
  };

  const handleClasseNivelChange = (index: number, nivel: number) => {
    const nivelLimpo = Math.min(20, Math.max(1, Math.trunc(nivel) || 1));
    salvarClasses(classes.map((c, i) => (i === index ? { ...c, nivel: nivelLimpo } : c)));
  };

  return (
    <div className="space-y-6">
      
      {/* LINHA 1: IDENTIDADE E CLASSE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* IDENTIDADE */}
        <div className="lg:col-span-2 bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
          <SectionTitle title="Identidade do Personagem" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LabeledInput label="Nome do Personagem" value={character.nome} onChange={(v:any) => onUpdate(['nome'], v)} />
            <LabeledModalSelect
              label="Árvore"
              value={f.arvoreId}
              options={[
                { value: SEM_ARVORE_ID, label: 'Sem Árvore' },
                ...(isMestre ? ARVORES : arvoresDisponiveis).map(arvore => ({ value: arvore.id, label: arvore.nome })),
              ]}
              onChange={(v:any) => onUpdate(['ficha', 'arvoreId'], v)}
              disabled={!isMestre}
            />
            <LabeledModalSelect
              label="Raça"
              value={f.racaId}
              options={catalogo
                ? (isMestre ? racasFiltradas : racasEditaveisPeloJogador).map(raca => ({
                    value: raca.id,
                    // A raça personalizada mostra o nome que o jogador escreveu,
                    // não o rótulo genérico do catálogo.
                    label: raca.id === RACA_PERSONALIZADA_ID
                      ? nomeExibicaoRaca(raca.id, f.racaNomePersonalizado, raca.titulo)
                      : raca.titulo,
                  }))
                : [{ value: '', label: 'Carregando...' }]}
              onChange={handleRacaChange}
              disabled={!catalogo}
            />

            {f.racaId === RACA_PERSONALIZADA_ID && (
              <LabeledInput
                label="Nome da raça personalizada"
                value={f.racaNomePersonalizado || ''}
                placeholder="Escreva o nome da raça/origem do personagem"
                onChange={(v: any) => onUpdate(['ficha', 'racaNomePersonalizado'], v)}
              />
            )}

            {gruposEscolhaRacial.map(grupo => (
              <LabeledModalSelect
                key={grupo.campo}
                label={grupo.rotulo}
                value={f.escolhaRacial?.[grupo.campo]}
                options={grupo.opcoes.map(opcao => ({ value: opcao.id, label: opcao.titulo }))}
                onChange={(valor: string) => handleEscolhaRacialChange(grupo.campo, valor)}
                disabled={!isMestre}
              />
            ))}
            
            <LabeledModalSelect
              label="Origem"
              value={f.origemId || (f.origem ? 'personalizada' : '')}
              options={[
                { value: '', label: 'Sem origem' },
                ...ORIGENS_EXEMPLO.map((origem) => ({ value: origem.id, label: `${origem.titulo}: ${origem.ajuste.rotulo}` })),
                { value: 'personalizada', label: 'Outra / personalizada' },
              ]}
              onChange={handleOrigemChange}
            />
            {origemAtual ? (
              <p className="self-end rounded-md border border-[#c7a44c]/10 bg-[#c7a44c]/5 px-3 py-2 text-xs leading-relaxed text-gray-400" title={origemAtual.ajuste.rotulo}>
                {origemAtual.descricao}
              </p>
            ) : null}
            {(f.origemId === 'personalizada' || (!f.origemId && f.origem)) && (
              <LabeledInput label="Nome da origem" value={f.origem || ''} placeholder="Ex.: Jornalista" onChange={(v:any) => onUpdate(['ficha', 'origem'], v)} />
            )}
            <LabeledInput label="Título" value={f.titulo} placeholder="Ex: O Assassino" onChange={(v:any) => onUpdate(['ficha', 'titulo'], v)} />
            <LabeledInput label="Nível Total" value={nivelTotalClasses} readOnly={true} type="number" />
            <LabeledInput label="Tamanho" value={f.tamanho} placeholder="Ex: Normal" onChange={(v:any) => onUpdate(['ficha', 'tamanho'], v)} />
          </div>
          {f.arvoreId === 'mulher-carmesim' && (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-200">
              {AVISO_FLUXO_FIM}
            </p>
          )}
        </div>

        {/* CLASSE */}
        <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
          <SectionTitle title="Classe" />
          <p className="text-xs text-gray-500 mb-4">{classes.length || 0} classe(s) · nível total {character.nivel}</p>
          <div className="flex flex-col gap-2 mb-4">
            {classes.map((classeSlot, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <LabeledModalSelect
                    label=""
                    value={classeSlot.classeId}
                    options={catalogo
                      ? (isMestre ? classesFiltradas : classesEditaveisPeloJogador(classeSlot.classeId)).map(classe => ({ value: classe.id, label: classe.titulo }))
                      : [{ value: '', label: 'Carregando...' }]}
                    onChange={(v: any) => handleClasseChange(index, v)}
                    disabled={!catalogo}
                  />
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    readOnly={!isMestre}
                    value={classeSlot.nivel}
                    onChange={(e) => handleClasseNivelChange(index, parseInt(e.target.value) || 1)}
                    className="w-full bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors text-center"
                  />
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => handleRemoverClasse(index)}
                    disabled={!isMestre}
                    className="text-gray-600 hover:text-red-500 transition-colors disabled:hidden"
                    title="Remover classe"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
            {classes.length === 0 && (
              <p className="text-xs text-gray-600 italic">Nenhuma classe ainda.</p>
            )}
          </div>
          <button
            onClick={handleAdicionarClasse}
            disabled={!isMestre || classes.length >= 3}
            className="w-full py-3 rounded-lg border border-yellow-600/30 text-yellow-600 text-xs font-bold uppercase tracking-widest hover:bg-yellow-600/10 transition-colors border-dashed disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Adicionar Classe
          </button>
        </div>

      </div>

      <FrutoEdenSection character={character} />

      <AtributosSection
        ficha={f}
        racaTitulo={racaAtual?.titulo}
        naturais={attrsNaturais}
        antesDaRaca={attrsAntesRaca}
        efetivos={attrs}
        bonusEquipamento={resumoEquipamento.bonusAtributos as Record<TAtributo, number>}
        onChange={handleAttrChange}
        onRoll={handleRolarTeste}
        onOpenInfo={setActiveModal}
        onOpenAdjust={abrirAjustes}
      />

      <StatusVitaisSection
        atual={{ vida: vAtual, mana: mAtual, sanidade: sAtual, cansaco: cAtual }}
        maximo={{ vida: maxVida, mana: maxMana, sanidade: maxSanidade, cansaco: maxCansaco }}
        efeitosCansaco={efeitosCansaco}
        ajusteOrigem={{
          vida: { nome: nomeAjusteOrigem(f, 'vidaMaxima') || 'Origem', valor: ajusteOrigem(f, 'vidaMaxima') },
          mana: { nome: nomeAjusteOrigem(f, 'manaMaxima') || 'Origem', valor: ajusteOrigem(f, 'manaMaxima') },
          sanidade: { nome: nomeAjusteOrigem(f, 'sanidadeMaxima') || 'Origem', valor: ajusteOrigem(f, 'sanidadeMaxima') },
        }}
        ajusteEquipamento={{
          vida: deltaDerivado('vida') + (resumoEquipamento.bonusRecursos.vidaMaxima || 0),
          mana: deltaDerivado('mana') + (resumoEquipamento.bonusRecursos.manaMaxima || 0),
          sanidade: resumoEquipamento.bonusRecursos.sanidadeMaxima || 0,
          cansaco: resumoEquipamento.bonusRecursos.cansacoMaximo || 0,
        }}
        onStatusChange={handleStatus}
        onSanidadeMaximaChange={handleSanidadeMaxima}
        onOpenInfo={setActiveModal}
        onOpenAdjust={abrirAjustes}
      />

      {/* LINHA 5: COMBATE */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
        <SectionTitle title="Combate" />
        
        {/* Status Derivados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#121118] border border-white/5 rounded-xl p-4">
            <div className="flex justify-between mb-4">
              <span className="text-xs font-bold uppercase text-gray-500">Defesa</span>
              <div className="flex items-center gap-1">
                <HelpCircle size={14} className="text-[#c7a44c] cursor-pointer hover:opacity-100 opacity-50 transition-opacity" onClick={() => setActiveModal({
                  title: 'DEFESA',
                  description: 'A dificuldade para acertar ataques contra você. Baseia-se na agilidade e equipamentos.',
                  items: [
                    { label: 'Defesa Natural', value: defesaNatural },
                    { label: 'Armadura e escudo', value: resumoEquipamento.defesaEquipamento },
                    { label: 'Modificações e raridade', value: resumoEquipamento.bonusCombate.defesa || 0 },
                    { label: 'Condições', value: -penalidadeDefesa },
                    { label: 'Outros ajustes', value: ajusteDefesa },
                  ],
                  total: { label: 'Defesa Total', value: defesaTotal },
                })} />
                <AjusteButton label="Defesa" onClick={() => abrirAjustes(chaveAjuste('combate', 'defesa'), 'Defesa')} />
              </div>
            </div>
            <input type="text" value={defesaTotal} className="w-full bg-black/50 border border-[#c7a44c]/30 rounded px-4 py-3 text-white font-bold mb-4" readOnly />
            <LabeledInput label="Armadura e Escudo" value={String(resumoEquipamento.defesaEquipamento)} onChange={()=>{}} />
            <div className="mt-2"><LabeledInput label="Penalidade da Defesa" value={String(penalidadeDefesa)} onChange={()=>{}} /></div>
          </div>
          
          <div className="bg-[#121118] border border-white/5 rounded-xl p-4">
            <div className="flex justify-between mb-4">
              <span className="text-xs font-bold uppercase text-gray-500">Iniciativa</span>
              <div className="flex items-center gap-1">
                <HelpCircle size={14} className="text-[#c7a44c] cursor-pointer hover:opacity-100 opacity-50 transition-opacity" onClick={() => setActiveModal({
                  title: 'INICIATIVA',
                  description: 'Sua velocidade de reação. Determina quem age primeiro em combate.',
                  items: [
                    { label: 'Iniciativa Base', value: iniciativaBase },
                    { label: 'Efeitos ativos', value: bonusIniciativa },
                    { label: 'Cansaço e condições', value: penalidadeIniciativa },
                    { label: 'Outros ajustes', value: ajusteIniciativa },
                    { label: 'Itens equipados', value: resumoEquipamento.bonusCombate.iniciativa || 0 },
                  ],
                  total: { label: 'Iniciativa Final', value: iniciativaFinal },
                })} />
                <AjusteButton label="Iniciativa" onClick={() => abrirAjustes(chaveAjuste('combate', 'iniciativa'), 'Iniciativa')} />
              </div>
            </div>
            <input type="text" value={iniciativaFinal} className="w-full bg-black/50 border border-[#c7a44c]/30 rounded px-4 py-3 text-white font-bold mb-4" readOnly />
            <LabeledInput label="Bônus / Penalidade" value={String(bonusIniciativa + penalidadeIniciativa)} onChange={()=>{}} />
          </div>

          <div className="bg-[#121118] border border-white/5 rounded-xl p-4">
            <div className="flex justify-between mb-4">
              <span className="text-xs font-bold uppercase text-gray-500">Movimento</span>
              <div className="flex items-center gap-1">
                <HelpCircle size={14} className="text-[#c7a44c] cursor-pointer hover:opacity-100 opacity-50 transition-opacity" onClick={() => setActiveModal({
                  title: 'MOVIMENTO',
                  description: 'Distância (em metros) que você pode se deslocar durante o combate.',
                  items: [
                    { label: 'Deslocamento Base', value: movimentoBase },
                    { label: 'Ajustes', value: ajusteMovimento },
                    { label: 'Sobrecarga', value: -penalidadeSobrecarga },
                    { label: 'Cansaço 5+', value: multiplicadorMovimentoCansaco(status.cansacoAtual) === 0.5 ? 'metade' : '' },
                    { label: 'Condições', value: movimentoBloqueadoPorCondicao(f.condicoesAtivas) ? 'movimento 0' : '' },
                  ],
                  total: { label: 'Movimento Final', value: `${movimentoFinal}m` },
                })} />
                <AjusteButton label="Movimento" onClick={() => abrirAjustes(chaveAjuste('combate', 'movimento'), 'Movimento', [{ nome: nomeAjusteOrigem(f, 'movimento') || 'Origem', valor: ajusteOrigem(f, 'movimento') }])} />
              </div>
            </div>
            <input type="text" value={`${movimentoFinal} m`} className="w-full bg-black/50 border border-[#c7a44c]/30 rounded px-4 py-3 text-white font-bold mb-4" readOnly />
            <LabeledInput label="Penalidade de Movimento" value={String(penalidadeSobrecarga)} onChange={()=>{}} />
          </div>
        </div>

        <div className="w-full h-[1px] bg-white/5 mb-8 border-dashed"></div>

        {/* Textareas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Resistências</label>
            <textarea readOnly={!isMestre} value={f.resistenciasTexto || ''} onChange={(event) => onUpdate(['ficha', 'resistenciasTexto'], event.target.value)} placeholder="Ex.: Fogo 5, Corte 3..." className="bg-[#121118] border border-white/5 rounded-md p-3 text-sm text-gray-300 min-h-[100px] resize-none focus:border-[#c7a44c]/50 read-only:cursor-not-allowed read-only:opacity-70"></textarea>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Proficiências</label>
            <textarea
              readOnly={!isMestre}
              value={proficienciasTexto}
              onFocus={() => { proficienciasEmFocoRef.current = true; }}
              onChange={(event) => setProficienciasTexto(event.target.value)}
              onBlur={(event) => {
                proficienciasEmFocoRef.current = false;
                const lista = event.target.value.split(/[,\n]/).map((item) => item.trim().toLocaleLowerCase('pt-BR')).filter(Boolean);
                setProficienciasTexto(lista.join(', '));
                onUpdate(['ficha', 'proficiencias'], lista);
              }}
              placeholder="Ex.: armas marciais, armaduras leves..."
              className="bg-[#121118] border border-white/5 rounded-md p-3 text-sm text-gray-300 min-h-[100px] resize-none focus:border-[#c7a44c]/50 read-only:cursor-not-allowed read-only:opacity-70"
            ></textarea>
          </div>
          <div className="flex flex-col gap-2 relative">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Condições Ativas</label>
            <div className="bg-[#121118] border border-white/5 rounded-md p-3 min-h-[100px] flex flex-col gap-2">
              {(f.condicoesAtivas || []).map((c: any, i: number) => (
                <div key={i} className="bg-black/50 border border-red-500/20 p-2 rounded flex justify-between items-start group">
                  <div>
                    <div className="text-red-400 font-bold text-xs uppercase">{c.nome}</div>
                    <div className="text-gray-400 text-xs mt-1">{c.descricao}</div>
                    <div className="text-gray-500 text-[10px] mt-1 italic">Afeta: {c.afeta}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setActiveModal({ isCondicaoModal: true, condicao: c, editIndex: i })} className="text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => {
                      const next = [...(f.condicoesAtivas || [])];
                      next.splice(i, 1);
                      onUpdate(['ficha', 'condicoesAtivas'], next);
                    }} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setActiveModal({ isCondicaoModal: true })}
                className="w-full py-2 border border-dashed border-red-500/30 text-red-500/70 hover:bg-red-500/10 hover:text-red-400 rounded-md text-xs uppercase font-bold transition-colors mt-auto"
              >
                + Adicionar Condição
              </button>
            </div>
          </div>
        </div>
      </div>

      <FamaPrestigioSection ficha={f} onUpdate={onUpdate} />

      {/* LINHA 6: EXPERIÊNCIA */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 mb-20">
        <SectionTitle title="Experiência" />
        <div className="flex items-center gap-4">
           <div className="flex gap-2">
              <button onClick={() => handleXp(-100)} disabled={!isMestre || xpAtual <= 0} className="px-3 py-1.5 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white disabled:opacity-30">-100</button>
              <button onClick={() => handleXp(-10)} disabled={!isMestre || xpAtual <= 0} className="px-3 py-1.5 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white disabled:opacity-30">-10</button>
           </div>
           <div className="flex-1 h-6 bg-[#050508] border border-white/10 rounded-lg relative overflow-hidden flex items-center justify-center group shadow-inner ring-1 ring-inset ring-white/5">
              {/* Verde estilo Minecraft com Gradiente e Glow */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#059669] to-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-500 ease-out" 
                style={{ width: `${percentXp}%` }} 
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
              </div>
              <div className="relative z-10 flex items-center text-white font-bold text-xs font-mono drop-shadow-md">
                <input 
                  type="text"
                  readOnly={!isMestre}
                  className="bg-transparent border-none outline-none text-right w-16 text-white font-bold placeholder-white/70 group-hover:bg-white/10 rounded transition-colors"
                  value={xpInput !== undefined ? xpInput : xpAtual}
                  onChange={(e) => setXpInput(e.target.value)}
                  onBlur={(e) => handleXpBlur(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
                />
                <span className="mx-1">/</span>
                <span>{xpProximoNivel ?? xpAtual}</span>
              </div>
           </div>
           <div className="flex gap-2">
              <button onClick={() => handleXp(10)} disabled={!isMestre} className="px-3 py-1.5 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white disabled:opacity-30">+10</button>
              <button onClick={() => handleXp(100)} disabled={!isMestre} className="px-3 py-1.5 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white disabled:opacity-30">+100</button>
           </div>
        </div>
        {!isMestre && <p className="text-xs text-gray-500">O Mestre registra a experiência. Quando houver XP suficiente, você escolhe em qual classe aplicar o novo nível.</p>}
        {podeSubirNivel && (
          <button
            onClick={() => setActiveModal({ isLevelUpModal: true })}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-[#c7a44c] to-yellow-600 text-black text-sm font-bold uppercase tracking-widest hover:scale-[1.01] transition-transform shadow-[0_0_20px_rgba(199,164,76,0.4)]"
          >
            ✧ Subir para o Nível {nivelPorXp(xpAtual)}
          </button>
        )}
      </div>

      {activeModal && !activeModal.isCondicaoModal && !activeModal.isLevelUpModal && (
        <ModalInfoFicha
          isOpen={true}
          onClose={() => { setActiveModal(null); setResultadoTeste(null); }}
          title={activeModal.title}
          description={activeModal.description}
          items={activeModal.items}
          total={activeModal.total}
          onRolar={activeModal.onRolar}
          rolando={rolandoTeste}
          resultado={resultadoTeste && activeModal.atributo === resultadoTeste.atributo ? resultadoTeste.resultado : null}
        />
      )}

      {activeModal && activeModal.isCondicaoModal && (
        <ModalPortal>
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="bg-[#0f0e15] border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_50px_rgba(239,68,68,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-red-500 font-bold tracking-widest uppercase">
                {activeModal.editIndex !== undefined ? 'Editar Condição' : 'Nova Condição'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            {activeModal.editIndex === undefined && (
              <div className="mb-5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Aplicar condição oficial</p>
                <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto pr-1">
                  {[...CONDICOES_OFICIAIS, ...CRISES_SANIDADE].map((regra) => (
                    <button key={regra.id} type="button" onClick={() => {
                      const next = [...(f.condicoesAtivas || []), {
                        id: regra.id,
                        nome: regra.titulo,
                        descricao: regra.efeitos.join(' '),
                        afeta: regra.categoria,
                        duracao: regra.duracao,
                      }];
                      onUpdate(['ficha', 'condicoesAtivas'], next);
                      setActiveModal(null);
                    }} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-xs font-bold text-gray-300 hover:border-red-500/30 hover:text-red-300">
                      {regra.titulo}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const nome = (form.elements.namedItem('nome') as HTMLInputElement).value;
              const descricao = (form.elements.namedItem('descricao') as HTMLTextAreaElement).value;
              const afeta = (form.elements.namedItem('afeta') as HTMLInputElement).value;
              
              if (nome) {
                const next = [...(f.condicoesAtivas || [])];
                if (activeModal.editIndex !== undefined) {
                  next[activeModal.editIndex] = { ...next[activeModal.editIndex], nome, descricao, afeta };
                } else {
                  next.push({ nome, descricao, afeta });
                }
                onUpdate(['ficha', 'condicoesAtivas'], next);
                setActiveModal(null);
              }
            }} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Nome da Condição</label>
                <input name="nome" type="text" defaultValue={activeModal.condicao?.nome || ''} required placeholder="Ex: Perna Ferida" className="bg-[#121118] border border-white/5 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Descrição</label>
                <textarea name="descricao" rows={3} defaultValue={activeModal.condicao?.descricao || ''} placeholder="Ex: O personagem perdeu muito sangue e não consegue correr..." className="bg-[#121118] border border-white/5 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 resize-none"></textarea>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Penalidade / Afeta o quê?</label>
                <input name="afeta" type="text" defaultValue={activeModal.condicao?.afeta || ''} placeholder="Ex: Destreza -2, Movimento reduzido pela metade" className="bg-[#121118] border border-white/5 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50" />
              </div>

              <button type="submit" className="mt-4 w-full py-3 bg-red-500/20 text-red-400 border border-red-500/50 font-bold uppercase tracking-widest rounded-lg hover:bg-red-500/30 transition-colors">
                {activeModal.editIndex !== undefined ? 'Salvar Condição' : 'Adicionar Condição'}
              </button>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {activeModal && activeModal.isLevelUpModal && (
        <ModalPortal>
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="bg-[#0f0e15] border border-[#c7a44c]/50 rounded-2xl p-6 w-full max-w-md shadow-[0_0_50px_rgba(199,164,76,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[#c7a44c] font-bold tracking-widest uppercase">Evolução de Nível</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-300 text-sm mb-6">
              Você atingiu experiência suficiente para o nível {nivelPorXp(xpAtual)}! Como deseja aplicar este novo nível?
            </p>

            <div className="flex flex-col gap-6">
              {classes.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">Aprimorar Classe Existente</h4>
                  <div className="flex flex-col gap-2">
                    {classes.map((c, i) => {
                      const classeObj = catalogo?.classes.find(cl => cl.id === c.classeId);
                      return (
                        <button
                          key={i}
                          onClick={() => handleSubirNivel({ tipo: 'existente', index: i })}
                          disabled={
                            c.nivel >= 20
                            || (!isMestre && nivelTotalClasses >= 60)
                            || (!isMestre && c.nivel === 19 && !classes.some((outra, j) => j !== i && Number(outra.nivel) >= 10))
                          }
                          className="flex justify-between items-center w-full p-3 rounded-lg border border-white/10 hover:border-[#c7a44c]/50 hover:bg-[#c7a44c]/10 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <span className="text-white font-bold">{classeObj?.titulo || 'Classe'}</span>
                          <span className="text-xs text-gray-400">Nível {c.nivel} ➔ <span className="text-[#c7a44c] font-bold">{c.nivel + 1}</span></span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">Multiclasse (Adquirir Nova Classe)</h4>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const novaClasseId = (form.elements.namedItem('novaClasseId') as HTMLSelectElement).value;
                  if (novaClasseId) {
                    handleSubirNivel({ tipo: 'nova', novaClasseId });
                  }
                }} className="flex gap-2">
                  <select
                    name="novaClasseId"
                    required
                    className="flex-1 bg-[#121118] border border-white/10 rounded-lg px-3 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 appearance-none"
                  >
                    <option value="">Selecione uma classe...</option>
                    {classesDisponiveisMulticlasse.map(cl => (
                        <option key={cl.id} value={cl.id}>{cl.titulo}</option>
                      ))}
                  </select>
                  <button type="submit" className="px-4 py-3 bg-[#15141b] text-[#c7a44c] border border-[#c7a44c]/30 font-bold uppercase tracking-widest rounded-lg hover:bg-[#c7a44c]/20 transition-colors">
                    Adicionar
                  </button>
                </form>
                {classesDisponiveisMulticlasse.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">Uma classe só chega ao nível 20 se outra já tiver nível 10. Classe especial exige nível total 20 e liberação do Mestre.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {ajusteModal ? (
        <AjustesFichaModal
          isOpen={true}
          onClose={() => setAjusteModal(null)}
          titulo={ajusteModal.titulo}
          automaticos={ajusteModal.automaticos}
          ajustes={obterAjustesManuais(f, ajusteModal.chave)}
          onChange={(ajustes) => salvarAjustes(ajusteModal.chave, ajustes)}
        />
      ) : null}

    </div>
  );
};
