export type RaridadeEquipamentoId =
  | 'comum'
  | 'incomum'
  | 'raro'
  | 'epico'
  | 'lendario'
  | 'reliquia'
  | 'reliquia da criacao';

export interface IRegraRaridadeEquipamento {
  id: RaridadeEquipamentoId;
  titulo: string;
  resumo: string;
  modificacoesMaximas: number;
  efeitosRaridadeMaximos: number;
  valorMaximoPorEfeito: number;
  requerMestre: boolean;
  principio: string;
}

export const RARIDADES_EQUIPAMENTO: IRegraRaridadeEquipamento[] = [
  {
    id: 'comum', titulo: 'Comum', resumo: 'Equipamento que funciona, e só. Nada de sobrenatural nele.',
    modificacoesMaximas: 1, efeitosRaridadeMaximos: 0, valorMaximoPorEfeito: 1, requerMestre: false,
    principio: 'Mantém a ficha básica do modelo e aceita uma melhoria técnica.',
  },
  {
    id: 'incomum', titulo: 'Incomum', resumo: 'Feito bem demais para ser comum, ou começando a acordar.',
    modificacoesMaximas: 2, efeitosRaridadeMaximos: 1, valorMaximoPorEfeito: 1, requerMestre: false,
    principio: 'Melhora a ficha de armas e proteções, além de aceitar até um efeito automático de valor 1.',
  },
  {
    id: 'raro', titulo: 'Raro', resumo: 'Já tem nome, jeito próprio e gente que reconhece de longe.',
    modificacoesMaximas: 3, efeitosRaridadeMaximos: 1, valorMaximoPorEfeito: 2, requerMestre: false,
    principio: 'Amplia dano, crítico, Defesa e Resistências conforme a categoria, além de aceitar um efeito de valor 2.',
  },
  {
    id: 'epico', titulo: 'Épico', resumo: 'Peça que vira o rumo de uma cena sozinha.',
    modificacoesMaximas: 4, efeitosRaridadeMaximos: 2, valorMaximoPorEfeito: 3, requerMestre: false,
    principio: 'Recebe a terceira melhoria mecânica da categoria e até dois efeitos automáticos de valor 3.',
  },
  {
    id: 'lendario', titulo: 'Lendário', resumo: 'Tem vontade própria, tem passado e tem feitos que as pessoas contam.',
    modificacoesMaximas: 5, efeitosRaridadeMaximos: 2, valorMaximoPorEfeito: 4, requerMestre: true,
    principio: 'Recebe a melhoria mecânica máxima de encomenda. Os poderes e os dois efeitos de valor 4 passam pelo Mestre.',
  },
  {
    id: 'reliquia', titulo: 'Mítico', resumo: 'Existe uma só, e ela está presa a um evento, a uma entidade ou a um povo.',
    modificacoesMaximas: 6, efeitosRaridadeMaximos: 3, valorMaximoPorEfeito: 5, requerMestre: true,
    principio: 'Ninguém reproduz e nada mundano destrói. Todo poder passa pelo Mestre.',
  },
  {
    id: 'reliquia da criacao', titulo: 'Relíquia da Criação', resumo: 'Um pedaço solto das leis que seguram a realidade de pé.',
    modificacoesMaximas: 7, efeitosRaridadeMaximos: 3, valorMaximoPorEfeito: 7, requerMestre: true,
    principio: 'Sempre única. Quebra regra comum só até onde o Mestre deixar.',
  },
];

export const REGRAS_MODIFICACOES_EQUIPAMENTO = [
  'Toda modificação ocupa um espaço da raridade, seja ela técnica, mágica ou especial.',
  'Uma modificação carrega no máximo um efeito automático na ficha. Efeito além disso sai dos espaços próprios da raridade.',
  'Bônus, vantagem e penalidade só entram na conta enquanto o item estiver equipado. Na mochila, não valem nada.',
  'O teto de valor vale por efeito, não no total. Vantagem ou desvantagem sempre conta como 1 efeito.',
  'Efeitos iguais de itens diferentes somam, mas o Mestre pode barrar quando as duas fontes não fizerem sentido juntas.',
  'Consumível aplica o efeito quando é usado. Guardado, ele não dá bônus nenhum.',
  'Lendário, Mítico e Relíquia da Criação passam pelo Mestre antes de entrar em jogo.',
];

export const EFEITOS_POR_MODIFICACAO_MAXIMOS = 1;

export function obterRegraRaridade(raridade: string): IRegraRaridadeEquipamento {
  const valorNormalizado = String(raridade ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
  const idNormalizado = valorNormalizado === 'mitico' || valorNormalizado === 'mitica'
    ? 'reliquia'
    : valorNormalizado;
  return RARIDADES_EQUIPAMENTO.find((item) => item.id === idNormalizado) || RARIDADES_EQUIPAMENTO[0];
}

export type CategoriaModificacaoId = 'arma' | 'armadura' | 'escudo' | 'item' | 'implante';
export type NivelModificacaoId = 'comum' | 'marcial';

export interface IModificacaoEquipamento {
  id: string;
  titulo: string;
  categoria: CategoriaModificacaoId;
  /** Comum: qualquer item já aguenta. Marcial: mais forte, exige raridade raro ou melhor. */
  nivel: NivelModificacaoId;
  /** 0 = modificação técnica, sem efeito automático na ficha. */
  valor: number;
  efeito: string;
  /** Trava extra além do orçamento de raridade. Ausente = qualquer um instala. */
  preRequisito?: string;
  /** Efeito automático na ficha, quando a modificação é um número simples. Vai para o catálogo da Loja. */
  efeitos?: Array<{ categoria: 'atributo' | 'recurso' | 'combate' | 'pericia'; alvo: string; valor: number }>;
}

export const MODIFICACOES_EQUIPAMENTO: IModificacaoEquipamento[] = [
  // Armas, modificações comuns
  {
    id: 'afiada', titulo: 'Afiada', categoria: 'arma', nivel: 'comum', valor: 1,
    efeito: '+1 dado de dano da arma (mesmo tipo do dado base).',
  },
  {
    id: 'perfurante', titulo: 'Perfurante', categoria: 'arma', nivel: 'comum', valor: 1,
    efeito: 'O dano da arma ignora metade da Resistência do tipo correspondente do alvo.',
  },
  {
    id: 'margem-ampla', titulo: 'Margem Ampla', categoria: 'arma', nivel: 'comum', valor: 1,
    efeito: 'Amplia a Margem de Ameaça em 2 (uma 20/x2 vira 18-20/x2). Só entra em arma de multiplicador x2, para não furar a regra de margem larga com multiplicador alto.',
  },
  {
    id: 'coreografada', titulo: 'Coreografada', categoria: 'arma', nivel: 'comum', valor: 1,
    efeito: 'Ao falhar numa Coreografia de risco Ousado ou maior com esta arma, sofra a consequência do risco imediatamente abaixo. Não vale para Tudo ou Nada.',
  },
  {
    id: 'drenante', titulo: 'Drenante', categoria: 'arma', nivel: 'comum', valor: 1,
    efeito: 'Uma vez por turno, ao acertar, o alvo perde 1d4 de Mana.',
  },
  {
    id: 'assombrada', titulo: 'Assombrada', categoria: 'arma', nivel: 'comum', valor: 1,
    efeito: 'Uma vez por cena, force o alvo a repetir um teste de resistência que já tenha passado contra um efeito de medo seu.',
  },
  {
    id: 'balanceada', titulo: 'Balanceada', categoria: 'arma', nivel: 'comum', valor: 0,
    efeito: 'Ignora a penalidade de peso pesado ao empunhar com uma mão só.',
  },
  {
    id: 'leve-arma', titulo: 'Leve', categoria: 'arma', nivel: 'comum', valor: 0,
    efeito: 'Reduz em 1 os espaços de carga que a arma ocupa, mínimo 1.',
  },
  {
    id: 'silenciosa-arma', titulo: 'Silenciosa', categoria: 'arma', nivel: 'comum', valor: 0,
    efeito: 'Não produz som perceptível ao ser usada em um ataque.',
  },
  // Armas, modificações marciais (só em arma marcial ou exótica)
  {
    id: 'devastadora', titulo: 'Devastadora', categoria: 'arma', nivel: 'marcial', valor: 2,
    efeito: '+2 dados de dano da arma.',
    preRequisito: 'Força 14, ou Destreza 14 em arma de disparo',
  },
  {
    id: 'elemental', titulo: 'Elemental', categoria: 'arma', nivel: 'marcial', valor: 2,
    efeito: '+1d6 de dano de um tipo elemental escolhido na criação do item. Esse dado extra também multiplica no crítico.',
  },
  {
    id: 'sedenta', titulo: 'Sedenta', categoria: 'arma', nivel: 'marcial', valor: 2,
    efeito: 'No crítico, o alvo recebe a condição Sangramento (usa o dado de dano da arma no lugar do 1d6 padrão, no fim de cada turno). Reaplicar segue a regra normal de Sangramento: +1 de dano por aplicação, até +5, sem novos dados. Remove-se como qualquer Sangramento: Cura DT 15 ou qualquer cura de pelo menos 1 PV.',
  },
  {
    id: 'vampirica', titulo: 'Vampírica', categoria: 'arma', nivel: 'marcial', valor: 2,
    efeito: 'Uma vez por turno, ao causar dano, role um dado do tipo da arma e recupere esse tanto de PV.',
    preRequisito: 'Nível total 7',
  },
  {
    id: 'sintonizada', titulo: 'Sintonizada', categoria: 'arma', nivel: 'marcial', valor: 2,
    efeito: 'O dano da arma passa a usar o Mod. Fluxo no lugar de Força ou Destreza.',
    preRequisito: 'Fluxo 14',
  },
  {
    id: 'exaustiva', titulo: 'Exaustiva', categoria: 'arma', nivel: 'marcial', valor: 2,
    efeito: 'No crítico, o alvo ganha 1 ponto de Cansaço. Uma vez por cena por alvo.',
    preRequisito: 'Nível total 7',
  },
  {
    id: 'assinatura-de-arvore', titulo: 'Assinatura de Árvore', categoria: 'arma', nivel: 'marcial', valor: 2,
    efeito: 'A arma se liga a uma Árvore na criação. Contra criaturas de qualquer outra Árvore, +1 dado de dano.',
  },
  {
    id: 'misericordia', titulo: 'Golpe de Misericórdia', categoria: 'arma', nivel: 'marcial', valor: 3,
    efeito: 'Contra alvo que já esteja em Morrendo, seus ataques com esta arma acertam como crítico automático.',
    preRequisito: 'Nível total 10',
  },
  {
    id: 'implacavel', titulo: 'Implacável', categoria: 'arma', nivel: 'marcial', valor: 3,
    efeito: 'Uma vez por cena, transforme um acerto em crítico, sem precisar cair na Margem de Ameaça. Não combina com a Coreografia Tudo ou Nada no mesmo ataque.',
    preRequisito: 'Nível total 10',
  },
  // Armaduras, modificações comuns
  {
    id: 'reforcada', titulo: 'Reforçada', categoria: 'armadura', nivel: 'comum', valor: 1,
    efeito: '+1 de Defesa.',
  },
  {
    id: 'isolante', titulo: 'Isolante', categoria: 'armadura', nivel: 'comum', valor: 1,
    efeito: 'Resistência 2 contra um tipo de dano elemental escolhido na criação do item.',
  },
  {
    id: 'camuflada', titulo: 'Camuflada', categoria: 'armadura', nivel: 'comum', valor: 1,
    efeito: 'Vantagem em Furtividade em terreno compatível com o padrão da armadura.',
  },
  {
    id: 'trilha-serena', titulo: 'Trilha Serena', categoria: 'armadura', nivel: 'comum', valor: 1,
    efeito: 'Ao terminar um descanso completo vestindo a armadura, reduza 1 ponto de Cansaço além do que a qualidade do descanso já tira.',
  },
  {
    id: 'flexivel', titulo: 'Flexível', categoria: 'armadura', nivel: 'comum', valor: 0,
    efeito: 'Reduz em 1 a penalidade de armadura sobre Acrobacia, Atletismo e Furtividade.',
  },
  {
    id: 'ajustavel', titulo: 'Ajustável', categoria: 'armadura', nivel: 'comum', valor: 0,
    efeito: 'Se adapta automaticamente ao corpo de quem veste, sem custo de reforma.',
  },
  // Armaduras, modificações marciais
  {
    id: 'bastiao', titulo: 'Bastião', categoria: 'armadura', nivel: 'marcial', valor: 2,
    efeito: 'Reduza 1d4 do dano físico recebido a cada ataque, aplicado depois da Resistência.',
    preRequisito: 'Constituição 14',
  },
  {
    id: 'regenerativa', titulo: 'Regenerativa', categoria: 'armadura', nivel: 'marcial', valor: 2,
    efeito: 'Quem veste recupera 1d4 PV no início do próprio turno, uma vez por rodada.',
    preRequisito: 'Nível total 7',
  },
  {
    id: 'estabilizadora', titulo: 'Estabilizadora', categoria: 'armadura', nivel: 'marcial', valor: 2,
    efeito: 'Vantagem em testes para resistir a ser derrubado, empurrado ou agarrado.',
  },
  {
    id: 'ancora-de-sanidade', titulo: 'Âncora de Sanidade', categoria: 'armadura', nivel: 'marcial', valor: 2,
    efeito: 'Resistência 3 contra dano Mental e vantagem nos testes para não perder Sanidade.',
    preRequisito: 'Sabedoria 14',
  },
  {
    id: 'retaliadora', titulo: 'Retaliadora', categoria: 'armadura', nivel: 'marcial', valor: 3,
    efeito: 'Ao sofrer um crítico, quem veste devolve 1 dado de dano de impacto no atacante, sem gastar reação.',
    preRequisito: 'Constituição 14',
  },
  {
    id: 'casca-do-fim', titulo: 'Casca do Fim', categoria: 'armadura', nivel: 'marcial', valor: 3,
    efeito: 'Enquanto estiver em Morrendo, a DT dos seus testes de Morrendo cai 3.',
    preRequisito: 'Nível total 10',
  },
  // Escudos, modificações comuns
  {
    id: 'reforcado-escudo', titulo: 'Reforçado', categoria: 'escudo', nivel: 'comum', valor: 1,
    efeito: '+1d4 na redução de dano da reação Bloqueio.',
  },
  {
    id: 'espinhado', titulo: 'Espinhado', categoria: 'escudo', nivel: 'comum', valor: 1,
    efeito: 'Quem te acerta em combate corpo a corpo sofre 1d4 de dano perfurante.',
  },
  {
    id: 'leve-escudo', titulo: 'Leve', categoria: 'escudo', nivel: 'comum', valor: 0,
    efeito: 'Não soma penalidade de armadura sobre Acrobacia.',
  },
  {
    id: 'retratil', titulo: 'Retrátil', categoria: 'escudo', nivel: 'comum', valor: 0,
    efeito: 'Pode ser guardado ou sacado como uma ação livre.',
  },
  // Escudos, modificações marciais
  {
    id: 'amplo', titulo: 'Amplo', categoria: 'escudo', nivel: 'marcial', valor: 2,
    efeito: 'A reação Proteger passa a cobrir dois aliados adjacentes em vez de um.',
  },
  {
    id: 'repulsor', titulo: 'Repulsor', categoria: 'escudo', nivel: 'marcial', valor: 2,
    efeito: 'Ao usar Bloqueio com sucesso, empurre o atacante 1,5 m para longe de você.',
  },
  {
    id: 'vingativo', titulo: 'Vingativo', categoria: 'escudo', nivel: 'marcial', valor: 2,
    efeito: 'Ao usar Bloqueio, cause 1d6 de dano de impacto no atacante, sem gastar ação extra.',
  },
  {
    id: 'guarda-de-fluxo', titulo: 'Guarda de Fluxo', categoria: 'escudo', nivel: 'marcial', valor: 2,
    efeito: 'Bloqueio passa a funcionar também contra dano de Energia, incluindo o que vem de Fluxos.',
    preRequisito: 'Fluxo 12',
  },
  {
    id: 'contratempo', titulo: 'Contratempo', categoria: 'escudo', nivel: 'marcial', valor: 3,
    efeito: 'Depois de um Contra-Ataque bem-sucedido, recupere sua reação. Uma vez por rodada.',
    preRequisito: 'Nível total 10',
  },
  // Itens gerais e mágicos, modificações comuns
  {
    id: 'vinculado', titulo: 'Vinculado', categoria: 'item', nivel: 'comum', valor: 1,
    efeito: 'Só funciona plenamente nas mãos de quem o item reconhece como dono. Qualquer outro sofre −2 ao usá-lo.',
  },
  {
    id: 'ressonante', titulo: 'Ressonante', categoria: 'item', nivel: 'comum', valor: 1,
    efeito: '+1 numa perícia específica, ligada à função do item.',
  },
  {
    id: 'portatil', titulo: 'Portátil', categoria: 'item', nivel: 'comum', valor: 0,
    efeito: 'Reduz em 1 os espaços de carga que o item ocupa, mínimo 1.',
  },
  {
    id: 'autoidentificavel', titulo: 'Autoidentificável', categoria: 'item', nivel: 'comum', valor: 0,
    efeito: 'Revela sozinho suas propriedades na primeira vez que é empunhado ou vestido.',
  },
  {
    id: 'recarregavel', titulo: 'Recarregável', categoria: 'item', nivel: 'comum', valor: 0,
    efeito: 'Se tiver cargas, recupera todas elas após um descanso completo.',
  },
  {
    id: 'sensivel-a-fluxo', titulo: 'Sensível a Fluxo', categoria: 'item', nivel: 'comum', valor: 0,
    efeito: 'Brilha, vibra ou esquenta perto de magia ou de um Fluxo específico escolhido na criação.',
  },
  {
    id: 'instavel', titulo: 'Instável', categoria: 'item', nivel: 'comum', valor: 0,
    efeito: '5% de chance de gerar um efeito colateral menor a cada uso. O Mestre define qual.',
  },
  // Itens gerais e mágicos, modificações marciais
  {
    id: 'protetor', titulo: 'Protetor', categoria: 'item', nivel: 'marcial', valor: 2,
    efeito: 'Resistência 4 contra um tipo de dano escolhido na criação do item, enquanto estiver equipado.',
  },
  {
    id: 'vitalicio', titulo: 'Vitalício', categoria: 'item', nivel: 'marcial', valor: 2,
    efeito: 'Uma vez por dia, ao chegar a 0 PV, recupere 1d6 PV automaticamente antes de cair inconsciente.',
  },
  {
    id: 'amplificador', titulo: 'Amplificador', categoria: 'item', nivel: 'marcial', valor: 2,
    efeito: 'Uma vez por cena, role com vantagem um teste de perícia específico ligado à função do item.',
  },
  {
    id: 'reserva-de-fluxo', titulo: 'Reserva de Fluxo', categoria: 'item', nivel: 'marcial', valor: 2,
    efeito: 'Guarda até 5 de Mana. Você pode gastar dessa reserva no lugar da sua, e ela enche de novo a cada descanso completo.',
    preRequisito: 'Fluxo 12',
  },
  {
    id: 'selado', titulo: 'Selado', categoria: 'item', nivel: 'marcial', valor: 3,
    efeito: 'O item carrega um Selo inscrito, escolhido na criação. Uma vez por dia ele dispara sem gastar Mana nem exigir teste de inscrição.',
    preRequisito: 'Nível total 10 e Misticismo treinado',
  },
  // Expansão 2026-09: 12 modificações novas
  {
    id: 'serrilhada', titulo: 'Serrilhada', categoria: 'arma', nivel: 'comum', valor: 1,
    efeito: 'Ao causar dano de Corte, o alvo sangra e sofre 1d4 de dano no início de cada turno seu por 2 rodadas. Uma vez por alvo por cena.',
  },
  {
    id: 'de-arremesso', titulo: 'De Arremesso', categoria: 'arma', nivel: 'comum', valor: 0,
    efeito: 'A arma ganha a propriedade Arremesso com alcance Curto. Voltar à mão exige buscá-la normalmente.',
  },
  {
    id: 'atordoante', titulo: 'Atordoante', categoria: 'arma', nivel: 'marcial', valor: 2,
    efeito: 'No crítico, o alvo faz um teste de Constituição ou perde a reação até o fim do próximo turno dele. Uma vez por cena por alvo.',
    preRequisito: 'Força 14',
  },
  {
    id: 'termica', titulo: 'Térmica', categoria: 'armadura', nivel: 'comum', valor: 1,
    efeito: 'Você tem Resistência 2 contra Fogo e Gelo enquanto a vestir.',
  },
  {
    id: 'dissipadora', titulo: 'Dissipadora', categoria: 'armadura', nivel: 'marcial', valor: 3,
    efeito: 'Uma vez por cena, ao sofrer dano de Impacto, reduza-o pela metade.',
    preRequisito: 'Nível total 10',
  },
  {
    id: 'reativa', titulo: 'Reativa', categoria: 'armadura', nivel: 'marcial', valor: 2,
    efeito: 'Uma vez por rodada, quando um ataque corpo a corpo acertar você, o atacante sofre 1d6 de dano de Impacto.',
    preRequisito: 'Constituição 14',
  },
  {
    id: 'ancorado', titulo: 'Ancorado', categoria: 'escudo', nivel: 'comum', valor: 0,
    efeito: 'A alça de ombro impede que o escudo caia por Desarmar, e você pode soltá-lo e recolocá-lo como parte de uma ação de movimento.',
  },
  {
    id: 'refletor', titulo: 'Refletor', categoria: 'escudo', nivel: 'marcial', valor: 2,
    efeito: 'Uma vez por cena, ao bloquear um ataque de Raio ou de Luz, redirecione o efeito para uma criatura a até 6 m.',
    preRequisito: 'Fluxo 12',
  },
  {
    id: 'lacrado', titulo: 'Lacrado', categoria: 'item', nivel: 'comum', valor: 0,
    efeito: 'O item é à prova d\'água e de poeira, e não sofre corrosão nem ferrugem.',
  },
  {
    id: 'chamado', titulo: 'Chamado', categoria: 'item', nivel: 'comum', valor: 1,
    efeito: 'Uma vez por dia, gaste uma Ação de Movimento para trazer o item à sua mão, se ele estiver a até 30 m e em linha de visão.',
  },
  {
    id: 'furtivo', titulo: 'Furtivo', categoria: 'item', nivel: 'marcial', valor: 2,
    efeito: 'O item passa despercebido em revistas comuns e detectores básicos. Achá-lo exige Investigação contra DT 20.',
  },
  {
    id: 'catalisador', titulo: 'Condensador de Mana', categoria: 'item', nivel: 'marcial', valor: 3,
    efeito: 'Uma vez por cena, ao conjurar uma magia de 3º círculo ou maior com este item, recupere 1d6 de Mana.',
    preRequisito: 'Fluxo 14 e nível total 10',
  },
  // Leva de 2026-11-12: mais modificações por tipo de item, e o grupo novo de Implantes.
  // Armas
  {
    id: 'bainha-rapida', titulo: 'Bainha Rápida', categoria: 'arma', nivel: 'comum', valor: 0,
    efeito: 'Sacar ou guardar esta arma vira Ação Livre, uma vez por turno.',
  },
  {
    id: 'desmontavel', titulo: 'Desmontável', categoria: 'arma', nivel: 'comum', valor: 0,
    efeito: 'A arma se separa em peças que parecem ferramentas comuns, e uma revista comum não a reconhece. Montar ou desmontar leva um minuto.',
  },
  {
    id: 'carregador-estendido', titulo: 'Carregador Estendido', categoria: 'arma', nivel: 'comum', valor: 0,
    efeito: 'Só em arma de disparo com recarga. A munição entre uma recarga e outra dobra.',
  },
  {
    id: 'luminosa', titulo: 'Luminosa', categoria: 'arma', nivel: 'comum', valor: 0,
    efeito: 'Sob comando, a lâmina ou o cano brilha como uma tocha, num raio de 9 m. Acender e apagar é Ação Livre.',
  },
  {
    id: 'contrapeso', titulo: 'Contrapeso', categoria: 'arma', nivel: 'comum', valor: 1,
    efeito: '+1 nas manobras feitas com esta arma: agarrar, derrubar, empurrar, desarmar e imobilizar.',
  },
  {
    id: 'cano-estriado', titulo: 'Cano Estriado', categoria: 'arma', nivel: 'comum', valor: 1,
    efeito: 'Só em arma de disparo. O alcance da arma sobe uma faixa de distância.',
  },
  {
    id: 'ricochete', titulo: 'Ricochete', categoria: 'arma', nivel: 'comum', valor: 1,
    efeito: 'Só em arma de arremesso. Acertando ou errando, a arma volta à sua mão no fim do seu turno.',
  },
  {
    id: 'gancho', titulo: 'Gancho', categoria: 'arma', nivel: 'comum', valor: 1,
    efeito: 'Uma vez por turno, ao acertar com esta arma, puxe o alvo 1,5 m na sua direção. Criatura duas categorias de tamanho maior que você fica onde está.',
  },
  {
    id: 'trespassante', titulo: 'Trespassante', categoria: 'arma', nivel: 'marcial', valor: 2,
    efeito: 'Só em arma corpo a corpo. Quando um ataque com ela leva uma criatura a 0 PV, o dano que sobrou atinge outra criatura adjacente a você, à sua escolha.',
    preRequisito: 'Força 14',
  },
  {
    id: 'calibrada', titulo: 'Calibrada', categoria: 'arma', nivel: 'marcial', valor: 2,
    efeito: 'Só em arma de disparo. +2 nos ataques feitos com esta arma.',
    preRequisito: 'Destreza 14',
  },
  {
    id: 'quebra-guarda', titulo: 'Quebra-Guarda', categoria: 'arma', nivel: 'marcial', valor: 2,
    efeito: 'Quando o alvo usa Bloqueio contra esta arma, a redução do Bloqueio cai pela metade.',
    preRequisito: 'Força 14',
  },
  {
    id: 'marcadora', titulo: 'Marcadora', categoria: 'arma', nivel: 'marcial', valor: 2,
    efeito: 'Ao acertar, a criatura fica Revelada até o fim da cena.',
    preRequisito: 'Nível total 7',
  },
  {
    id: 'rajada', titulo: 'Rajada', categoria: 'arma', nivel: 'marcial', valor: 2,
    efeito: 'Só em arma de disparo. Uma vez por cena, faça dois ataques com a mesma Ação Padrão, os dois com −2.',
    preRequisito: 'Destreza 14',
  },
  {
    id: 'fantasma', titulo: 'Fantasma', categoria: 'arma', nivel: 'marcial', valor: 3,
    efeito: 'Uma vez por cena, declare antes de rolar: o ataque atravessa armadura e escudo e é comparado só com a Defesa Natural do alvo.',
    preRequisito: 'Nível total 10',
  },
  {
    id: 'ceifadora', titulo: 'Ceifadora', categoria: 'arma', nivel: 'marcial', valor: 3,
    efeito: 'Uma vez por turno, quando um ataque com esta arma leva uma criatura a 0 PV, faça um ataque extra contra outra criatura ao seu alcance.',
    preRequisito: 'Nível total 10',
  },
  // Armaduras
  {
    id: 'engates-rapidos', titulo: 'Engates Rápidos', categoria: 'armadura', nivel: 'comum', valor: 0,
    efeito: 'Vestir ou tirar a armadura leva uma rodada, em vez de minutos.',
  },
  {
    id: 'bolsos-ocultos', titulo: 'Bolsos Ocultos', categoria: 'armadura', nivel: 'comum', valor: 0,
    efeito: 'Costuras escondem até dois itens pequenos que uma revista comum não encontra.',
  },
  {
    id: 'acolchoada', titulo: 'Acolchoada', categoria: 'armadura', nivel: 'comum', valor: 0,
    efeito: 'A armadura se move sem barulho de metal ou couro. A penalidade de armadura em Furtividade continua valendo.',
  },
  {
    id: 'insignia-imponente', titulo: 'Insígnia Imponente', categoria: 'armadura', nivel: 'comum', valor: 1,
    efeito: '+1 em Intimidação enquanto estiver vestida.',
    efeitos: [{ categoria: 'pericia', alvo: 'intimidacao', valor: 1 }],
  },
  {
    id: 'botas-ancoradas', titulo: 'Botas Ancoradas', categoria: 'armadura', nivel: 'comum', valor: 1,
    efeito: 'Terreno difícil não reduz o seu Movimento.',
  },
  {
    id: 'mascara-filtrante', titulo: 'Máscara Filtrante', categoria: 'armadura', nivel: 'comum', valor: 1,
    efeito: 'Vantagem em Fortitude contra gases, fumaça e venenos inalados.',
  },
  {
    id: 'blindagem-balistica', titulo: 'Blindagem Balística', categoria: 'armadura', nivel: 'marcial', valor: 2,
    efeito: 'Resistência 3 contra dano balístico.',
    preRequisito: 'Constituição 14',
  },
  {
    id: 'sentinela', titulo: 'Sentinela', categoria: 'armadura', nivel: 'marcial', valor: 2,
    efeito: 'Você não fica Surpreendido.',
    preRequisito: 'Nível total 7',
  },
  {
    id: 'pluma', titulo: 'Pluma', categoria: 'armadura', nivel: 'marcial', valor: 2,
    efeito: '+1,5 m de Movimento, e a armadura não conta como pesada para escalar e nadar.',
    preRequisito: 'Destreza 14',
    efeitos: [{ categoria: 'combate', alvo: 'movimento', valor: 1.5 }],
  },
  {
    id: 'adaptativa', titulo: 'Adaptativa', categoria: 'armadura', nivel: 'marcial', valor: 3,
    efeito: 'Depois de sofrer dano de um tipo, a armadura ganha Resistência 5 contra esse tipo até o fim da cena. Ela guarda um tipo por vez, e o próximo toma o lugar do anterior.',
    preRequisito: 'Nível total 10',
  },
  {
    id: 'fortaleza-viva', titulo: 'Fortaleza Viva', categoria: 'armadura', nivel: 'marcial', valor: 3,
    efeito: 'Uma vez por cena, como Reação, reduza a 0 o dano de um ataque que não seja crítico.',
    preRequisito: 'Constituição 14 e nível total 10',
  },
  // Escudos
  {
    id: 'arremessavel', titulo: 'Arremessável', categoria: 'escudo', nivel: 'comum', valor: 0,
    efeito: 'O escudo pode ser arremessado com alcance Curto, causando 1d6 de dano de impacto. Buscá-lo de volta segue a regra normal.',
  },
  {
    id: 'brasao', titulo: 'Brasão', categoria: 'escudo', nivel: 'comum', valor: 0,
    efeito: 'O escudo carrega o brasão de uma casa ou facção. Quem conhece a facção reconhece de longe, para o bem e para o mal.',
  },
  {
    id: 'escudo-de-parede', titulo: 'Escudo de Parede', categoria: 'escudo', nivel: 'comum', valor: 1,
    efeito: 'Como Ação de Movimento, crave o escudo no chão: ele dá cobertura parcial a você até você se mover.',
  },
  {
    id: 'bossa-de-impacto', titulo: 'Bossa de Impacto', categoria: 'escudo', nivel: 'comum', valor: 1,
    efeito: 'Um golpe com o escudo causa 1d6 de dano de impacto e conta como arma corpo a corpo leve.',
  },
  {
    id: 'espelhado', titulo: 'Espelhado', categoria: 'escudo', nivel: 'comum', valor: 1,
    efeito: 'Uma vez por cena, como Ação Livre, ofusque um inimigo adjacente: o próximo ataque dele tem desvantagem.',
  },
  {
    id: 'muralha', titulo: 'Muralha', categoria: 'escudo', nivel: 'marcial', valor: 2,
    efeito: 'Aliados adjacentes a você ganham +1 de Defesa.',
    preRequisito: 'Constituição 14',
  },
  {
    id: 'interceptor', titulo: 'Interceptor', categoria: 'escudo', nivel: 'marcial', valor: 2,
    efeito: 'O Bloqueio passa a valer contra ataques à distância de projétil e balísticos, e reduz 1d6 a mais contra eles.',
    preRequisito: 'Força 14',
  },
  {
    id: 'egide', titulo: 'Égide', categoria: 'escudo', nivel: 'marcial', valor: 3,
    efeito: 'Uma vez por cena, quando um aliado a até 9 m for atacado, use Proteger mesmo longe dele: você se move até ele sem provocar reação e vira o alvo.',
    preRequisito: 'Nível total 10',
  },
  // Itens gerais e mágicos
  {
    id: 'fundo-falso', titulo: 'Fundo Falso', categoria: 'item', nivel: 'comum', valor: 0,
    efeito: 'Um compartimento escondido guarda um objeto pequeno. Achá-lo exige Investigação DT 15.',
  },
  {
    id: 'recado-gravado', titulo: 'Recado Gravado', categoria: 'item', nivel: 'comum', valor: 0,
    efeito: 'O item guarda uma mensagem falada de até um minuto, que toca quando a pessoa que você escolheu o tocar.',
  },
  {
    id: 'localizavel', titulo: 'Localizável', categoria: 'item', nivel: 'comum', valor: 0,
    efeito: 'Você sempre sabe a direção do item enquanto ele estiver a até 1 km.',
  },
  {
    id: 'amuleto-da-sorte', titulo: 'Amuleto da Sorte', categoria: 'item', nivel: 'comum', valor: 1,
    efeito: 'Uma vez por sessão, role de novo um 1 natural seu e fique com o novo resultado.',
  },
  {
    id: 'foco-afinado', titulo: 'Foco Afinado', categoria: 'item', nivel: 'comum', valor: 1,
    efeito: '+1 nos testes de Vontade para manter Concentração.',
  },
  {
    id: 'ferramental-fino', titulo: 'Ferramental Fino', categoria: 'item', nivel: 'comum', valor: 1,
    efeito: 'Usado como ferramenta, o item faz o trabalho na metade do tempo.',
  },
  {
    id: 'canalizador', titulo: 'Canalizador', categoria: 'item', nivel: 'marcial', valor: 2,
    efeito: '+1 nos testes de magia feitos com este item em mãos.',
    preRequisito: 'Fluxo 14',
  },
  {
    id: 'reserva-de-folego', titulo: 'Reserva de Fôlego', categoria: 'item', nivel: 'marcial', valor: 2,
    efeito: 'Guarda até 5 de Estamina. Você pode gastar dessa reserva no lugar da sua, e ela enche de novo no descanso completo.',
    preRequisito: 'Constituição 12',
  },
  {
    id: 'guardiao', titulo: 'Guardião', categoria: 'item', nivel: 'marcial', valor: 2,
    efeito: 'Quem carrega o item tem vantagem nos testes contra ficar Amedrontado.',
    preRequisito: 'Sabedoria 12',
  },
  {
    id: 'ampulheta', titulo: 'Ampulheta', categoria: 'item', nivel: 'marcial', valor: 3,
    efeito: 'Uma vez por descanso, logo depois de rolar, desfaça a rolagem e role de novo, ficando com o novo resultado.',
    preRequisito: 'Nível total 10',
  },
  // Implantes
  {
    id: 'pele-sintetica', titulo: 'Pele Sintética', categoria: 'implante', nivel: 'comum', valor: 0,
    efeito: 'Uma camada de pele cultivada cobre a peça. Quem olha não vê o metal, e notar o implante exige Investigação DT 15.',
  },
  {
    id: 'blindagem-de-interferencia', titulo: 'Blindagem de Interferência', categoria: 'implante', nivel: 'comum', valor: 0,
    efeito: 'Um campo de interferência comum não desliga o implante. Interferência feita por magia ou por um Fluxo ainda desliga.',
  },
  {
    id: 'refrigeracao-liquida', titulo: 'Refrigeração Líquida', categoria: 'implante', nivel: 'comum', valor: 1,
    efeito: 'Quando usar o implante cobrar dano interno, ele cobra um dado a menos, no mínimo um.',
  },
  {
    id: 'sintonia-fina', titulo: 'Sintonia Fina', categoria: 'implante', nivel: 'comum', valor: 1,
    efeito: '+1 nos testes de perícia em que o implante já dá bônus.',
  },
  {
    id: 'amortecedor-neural', titulo: 'Amortecedor Neural', categoria: 'implante', nivel: 'marcial', valor: 2,
    efeito: 'O implante custa 3 a menos de Sanidade máxima, no mínimo 1. A ficha faz a conta sozinha.',
    preRequisito: 'Sabedoria 12',
  },
  {
    id: 'redundancia', titulo: 'Redundância', categoria: 'implante', nivel: 'marcial', valor: 2,
    efeito: 'Uma vez por cena, quando o implante seria desligado por dano, sobrecarga ou interferência, ele continua funcionando.',
    preRequisito: 'Nível total 7',
  },
  {
    id: 'pre-aquecimento', titulo: 'Pré-Aquecimento', categoria: 'implante', nivel: 'marcial', valor: 2,
    efeito: '+2 de Iniciativa enquanto o implante estiver instalado.',
    preRequisito: 'Destreza 12',
    efeitos: [{ categoria: 'combate', alvo: 'iniciativa', valor: 2 }],
  },
  {
    id: 'sobrecarga', titulo: 'Sobrecarga', categoria: 'implante', nivel: 'marcial', valor: 3,
    efeito: 'Uma vez por cena, use de novo um efeito de uma vez por cena deste implante. Logo depois, você sofre 2d6 de dano interno, que ignora Resistência.',
    preRequisito: 'Nível total 10',
  },
];

export const CATEGORIAS_MODIFICACAO: Array<{ id: CategoriaModificacaoId; titulo: string }> = [
  { id: 'arma', titulo: 'Armas' },
  { id: 'armadura', titulo: 'Armaduras' },
  { id: 'escudo', titulo: 'Escudos' },
  { id: 'item', titulo: 'Itens gerais e mágicos' },
  { id: 'implante', titulo: 'Implantes' },
];

/** Preço de encomenda de uma modificação, em Lunaris, pelo peso do efeito.
 * É a mesma faixa que a Loja cobra na categoria Modificações. */
export const PRECO_MODIFICACAO_POR_VALOR: Record<0 | 1 | 2 | 3, number> = {
  0: 18,
  1: 70,
  2: 290,
  3: 1200,
};

/** Raridade mínima que o item precisa ter para bancar aquele valor de efeito. */
export const ROTULO_RARIDADE_MINIMA_MODIFICACAO: Record<0 | 1 | 2 | 3, string> = {
  0: 'Qualquer item',
  1: 'Comum',
  2: 'Raro',
  3: 'Épico',
};
