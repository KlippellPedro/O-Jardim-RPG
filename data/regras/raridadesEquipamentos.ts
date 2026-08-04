export type RaridadeEquipamentoId =
  | 'comum'
  | 'incomum'
  | 'raro'
  | 'epico'
  | 'lendario'
  | 'reliquia'
  | 'reliquia da criacao';

export type CategoriaEquipamentoId = 'arma' | 'armadura' | 'consumivel' | 'veiculo' | 'geral';

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
    principio: 'Aceita uma melhoria técnica. A raridade em si não dá vantagem nenhuma.',
  },
  {
    id: 'incomum', titulo: 'Incomum', resumo: 'Feito bem demais para ser comum, ou começando a acordar.',
    modificacoesMaximas: 2, efeitosRaridadeMaximos: 1, valorMaximoPorEfeito: 1, requerMestre: false,
    principio: 'Ganha uma esquisitice pequena e até um efeito automático de valor 1.',
  },
  {
    id: 'raro', titulo: 'Raro', resumo: 'Já tem nome, jeito próprio e gente que reconhece de longe.',
    modificacoesMaximas: 3, efeitosRaridadeMaximos: 1, valorMaximoPorEfeito: 2, requerMestre: false,
    principio: 'Ganha um dom desperto e até um efeito automático de valor 2.',
  },
  {
    id: 'epico', titulo: 'Épico', resumo: 'Peça que vira o rumo de uma cena sozinha.',
    modificacoesMaximas: 4, efeitosRaridadeMaximos: 2, valorMaximoPorEfeito: 3, requerMestre: false,
    principio: 'Ganha um dom excepcional e até dois efeitos automáticos de valor 3.',
  },
  {
    id: 'lendario', titulo: 'Lendário', resumo: 'Tem vontade própria, tem passado e tem feitos que as pessoas contam.',
    modificacoesMaximas: 5, efeitosRaridadeMaximos: 2, valorMaximoPorEfeito: 4, requerMestre: true,
    principio: 'Pode ser senciente. Os poderes e os dois efeitos de valor 4 passam pelo Mestre.',
  },
  {
    id: 'reliquia', titulo: 'Relíquia', resumo: 'Existe uma só, e ela está presa a um evento, a uma entidade ou a um povo.',
    modificacoesMaximas: 6, efeitosRaridadeMaximos: 3, valorMaximoPorEfeito: 5, requerMestre: true,
    principio: 'Ninguém reproduz e nada mundano destrói. Todo poder passa pelo Mestre.',
  },
  {
    id: 'reliquia da criacao', titulo: 'Relíquia da Criação', resumo: 'Um pedaço solto das leis que seguram a realidade de pé.',
    modificacoesMaximas: 7, efeitosRaridadeMaximos: 3, valorMaximoPorEfeito: 7, requerMestre: true,
    principio: 'Sempre única. Quebra regra comum só até onde o Mestre deixar.',
  },
];

export const DONS_RARIDADE_POR_CATEGORIA: Record<CategoriaEquipamentoId, Record<RaridadeEquipamentoId, string>> = {
  arma: {
    comum: 'Sem dom: vive de técnica e manutenção, como qualquer ferro.',
    incomum: 'Temperamento: esquenta, zumbe ou brilha de leve quando quem a empunha é o dono.',
    raro: 'Voz desperta: fala ou passa impulsos simples, e com o tempo cria personalidade.',
    epico: 'Instinto de confronto: sente hostilidade por perto e tenta avisar quem a carrega.',
    lendario: 'Vontade de lenda: tem objetivos próprios e um poder único, do jeito que a descrição do item mandar.',
    reliquia: 'Golpe soberano: faz uma coisa impossível, ligada à história dela, com custo e limite que o Mestre aprova.',
    'reliquia da criacao': 'Corte de princípio: mexe com uma lei da realidade, escolhida quando a relíquia foi criada.',
  },
  armadura: {
    comum: 'Sem dom: precisa de limpeza, ajuste e conserto como qualquer peça.',
    incomum: 'Sempre impecável: não segura poeira, lama nem cheiro, e se ajusta sozinha a quem veste.',
    raro: 'Memória de forma: some com arranhão de superfície durante um descanso. Durabilidade perdida não volta.',
    epico: 'Guarda desperta: reage ao perigo antes de você. Se mexe, brilha ou avisa de algum jeito.',
    lendario: 'Bastião consciente: conversa com quem a veste e tem uma defesa única, descrita no item.',
    reliquia: 'Corpo soberano: nada mundano a destrói enquanto a condição da história dela continuar de pé.',
    'reliquia da criacao': 'Lei de proteção: impõe uma condição absoluta de defesa, combinada com o Mestre.',
  },
  consumivel: {
    comum: 'Sem dom: se conserva e funciona como foi fabricado.',
    incomum: 'Conservação perfeita: enquanto estiver lacrado, tempo e clima comum não estragam.',
    raro: 'Dose responsiva: muda de sabor, cor ou temperatura para avisar se é seguro para aquela pessoa.',
    epico: 'Efeito excepcional: carrega uma propriedade a mais, descrita no item, gasta junto com ele.',
    lendario: 'Receita viva: se comunica por sinais e cobra uma condição especial para aceitar ser usada.',
    reliquia: 'Essência soberana: produz um efeito que só ela produz, e ninguém consegue copiar.',
    'reliquia da criacao': 'Semente de princípio: ao ser consumida, muda alguma coisa para sempre. O que muda, o Mestre define.',
  },
  veiculo: {
    comum: 'Sem dom: depende de combustível, de piloto e de manutenção.',
    incomum: 'Partida fiel: reconhece o condutor e avisa das falhas simples antes de sair do lugar.',
    raro: 'Navegador instintivo: guarda as rotas que já percorreu e sabe apontá-las de volta.',
    epico: 'Resposta desperta: ajusta sistemas e postura sozinho quando o perigo aparece, do jeito descrito no veículo.',
    lendario: 'Companheiro de jornada: tem personalidade e um jeito extraordinário de se deslocar.',
    reliquia: 'Travessia soberana: passa por um obstáculo que não deveria dar para passar, sob condição aprovada pelo Mestre.',
    'reliquia da criacao': 'Caminho impossível: chega a um tipo de destino que veículo nenhum alcança.',
  },
  geral: {
    comum: 'Sem dom: funciona como foi fabricado.',
    incomum: 'Marca do dono: esquenta, vibra ou muda de cara quando o dono chega perto.',
    raro: 'Eco de uso: guarda impressões simples de quem já o usou, e revela por sinais.',
    epico: 'Função desperta: faz sozinho uma tarefa simples e bem delimitada.',
    lendario: 'Personalidade própria: fala, e tem um poder único que combina com a função dele.',
    reliquia: 'Autoridade soberana: manda em um assunto estreito, definido na história do objeto.',
    'reliquia da criacao': 'Objeto de princípio: representa um conceito e interfere nele. Qual conceito, você decide com o Mestre.',
  },
};

export const REGRAS_MODIFICACOES_EQUIPAMENTO = [
  'Toda modificação ocupa um espaço da raridade, seja ela técnica, mágica ou especial.',
  'Uma modificação carrega no máximo um efeito automático na ficha. Efeito além disso sai dos espaços próprios da raridade.',
  'Bônus, vantagem e penalidade só entram na conta enquanto o item estiver equipado. Na mochila, não valem nada.',
  'O teto de valor vale por efeito, não no total. Vantagem ou desvantagem sempre conta como 1 efeito.',
  'Efeitos iguais de itens diferentes somam, mas o Mestre pode barrar quando as duas fontes não fizerem sentido juntas.',
  'Consumível aplica o efeito quando é usado. Guardado, ele não dá bônus nenhum.',
  'Lendário, Relíquia e Relíquia da Criação passam pelo Mestre antes de entrar em jogo.',
];

export const EFEITOS_POR_MODIFICACAO_MAXIMOS = 1;

export function obterRegraRaridade(raridade: string): IRegraRaridadeEquipamento {
  return RARIDADES_EQUIPAMENTO.find((item) => item.id === raridade) || RARIDADES_EQUIPAMENTO[0];
}

export type CategoriaModificacaoId = 'arma' | 'armadura' | 'escudo' | 'item';
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
    efeito: 'Amplia a Margem de Ameaça em 2 (uma 20/x2 vira 18-20/x2). Só entra em arma de multiplicador x2, pra não furar a regra de margem larga com multiplicador alto.',
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
    efeito: 'No crítico, o alvo passa a sangrar: sofre 1 dado de dano da arma no início de cada turno até ser tratado. Não acumula com outra Sedenta.',
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
];

export const CATEGORIAS_MODIFICACAO: Array<{ id: CategoriaModificacaoId; titulo: string }> = [
  { id: 'arma', titulo: 'Armas' },
  { id: 'armadura', titulo: 'Armaduras' },
  { id: 'escudo', titulo: 'Escudos' },
  { id: 'item', titulo: 'Itens gerais e mágicos' },
];
