export type FichaTourTabId =
  | 'Ficha'
  | 'Perícias'
  | 'Inventário'
  | 'Bens'
  | 'Habilidades'
  | 'Poderes'
  | 'Magias'
  | 'Ataques'
  | 'Aliados'
  | 'Progressão'
  | 'Descanso'
  | 'Notas';

export interface FichaTourStep {
  id: string;
  titulo: string;
  descricao: string;
  alvos: string[];
  /** Etapas opcionais só aparecem quando ao menos um alvo existe na ficha atual. */
  opcional?: boolean;
}

export const FICHA_TOUR_TABS: FichaTourTabId[] = [
  'Ficha', 'Perícias', 'Inventário', 'Bens', 'Habilidades', 'Poderes',
  'Magias', 'Ataques', 'Aliados', 'Progressão', 'Descanso', 'Notas',
];

const FICHA_TOUR_VERSAO = 3;

const alvoAba = (aba: FichaTourTabId) => `[data-tour-tab="${aba}"]`;

const PASSOS_POR_ABA: Record<FichaTourTabId, FichaTourStep[]> = {
  Ficha: [
    {
      id: 'resumo-personagem', titulo: 'Seu personagem em um olhar',
      descricao: 'O cabeçalho reúne retrato, nome, raça, classes e nível. O indicador “Ao vivo” confirma a conexão: alterações salvas pelo jogador, mestre ou assistente aparecem nas outras telas. Se existir um rascunho local, a atualização espera ou abre um conflito em vez de apagá-lo.',
      alvos: ['[data-tour="character-header"]'],
    },
    {
      id: 'navegacao-ficha', titulo: 'Cada parte tem seu lugar',
      descricao: 'Estas abas separam os sistemas da ficha. Você pode trocar de seção sem perder alterações; o botão “Guia da aba” reinicia a explicação da página atual.',
      alvos: ['[data-tour="sheet-tabs"]'],
    },
    {
      id: 'ficha-identidade', titulo: 'Identidade e origem',
      descricao: 'Aqui ficam Árvore, raça, origem, título, nível, tamanho e divindade. Raça e Árvore alimentam vários cálculos automáticos; campos bloqueados dependem do Mestre ou das escolhas de criação.',
      alvos: ['[data-tour="ficha-identidade"]'],
    },
    {
      id: 'ficha-classes', titulo: 'Classes e níveis',
      descricao: 'A ficha aceita até três classes. O nível de cada uma libera habilidades, poderes e eventos próprios, e a soma desses níveis forma o nível total do personagem.',
      alvos: ['[data-tour="ficha-classes"]'],
    },
    {
      id: 'ficha-atributos', titulo: 'Atributos',
      descricao: 'Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma e Fluxo sustentam perícias e valores derivados. Cada cartão mostra o valor efetivo e o modificador; a ajuda abre a memória do cálculo e a rolagem, enquanto o ajuste registra bônus ou penalidades com uma fonte.',
      alvos: ['[data-tour="ficha-atributos"]'],
    },
    {
      id: 'ficha-recursos', titulo: 'Barras de recursos',
      descricao: 'Vida, Mana, Sanidade e Cansaço mostram atual e máximo. Use os botões ou digite o valor atual conforme sofre dano ou gasta recursos; os máximos combinam base, efeitos e ajustes identificados. Cansaço funciona ao contrário: cresce a partir de zero e aplica penalidades nos patamares indicados.',
      alvos: ['[data-tour="ficha-recursos"]'],
    },
    {
      id: 'ficha-combate', titulo: 'Valores de combate',
      descricao: 'Defesa, Iniciativa e Movimento combinam atributos, raça, equipamentos, aliados, condições e ajustes. O ícone de informação abre a memória do cálculo; o controle de ajuste registra uma fonte sem apagar o valor automático.',
      alvos: ['[data-tour="ficha-combate-derivados"]', '[data-tour="ficha-combate"]'],
    },
    {
      id: 'ficha-condicoes', titulo: 'Resistências, proficiências e condições',
      descricao: 'Resistências e proficiências resumem proteções e treinamentos do personagem. Condições ativas registram efeitos em cena e podem alterar cálculos oficiais; quando o campo estiver bloqueado, a mudança depende do Mestre.',
      alvos: ['[data-tour="ficha-condicoes"]'],
    },
    {
      id: 'ficha-reputacao', titulo: 'Fama e Prestígio',
      descricao: 'Fama vai de 0 a 5 e mede o quanto o personagem é reconhecido. Prestígio vai de −3 a +3 separadamente para cada grupo ou facção; use o botão de adicionar para registrar a relação e suas notas.',
      alvos: ['[data-tour="ficha-reputacao"]'],
    },
    {
      id: 'ficha-fruto', titulo: 'Fruto do Éden',
      descricao: 'Quando um Fruto foi consumido, este bloco mostra sua história, a passiva atual e os bônus que já entraram no cálculo. Ao despertar, a versão aprimorada substitui a anterior sem acumular o mesmo bônus duas vezes.',
      alvos: ['[data-tour="ficha-fruto"]'], opcional: true,
    },
    {
      id: 'ficha-experiencia', titulo: 'Experiência e próximo nível',
      descricao: 'A barra compara a experiência atual com a necessária para subir de nível. Use os botões de ±10 e ±100 ou digite o total exato; quando o limite for alcançado, a ficha oferece a subida de nível e avisa o Mestre sobre a mudança do jogador.',
      alvos: ['[data-tour="ficha-experiencia"]'],
    },
  ],
  Perícias: [
    {
      id: 'pericias-resumo', titulo: 'Testes e treinamento',
      descricao: 'Perícias representam ações específicas. O contador resume quantas existem e quantas estão treinadas; bônus de raça, classe, origem, itens, aliados, condições e Cansaço entram nos resultados quando aplicáveis.',
      alvos: ['[data-tour="pericias-resumo"]', '[data-tour="section-overview"]'],
    },
    {
      id: 'pericias-filtros', titulo: 'Busca e filtros',
      descricao: 'Busque pelo nome e combine os filtros de atributo-base, grau de treinamento e favoritas. Se nenhum resultado aparecer, use “Limpar filtros”. O cartão “Nova perícia” cria um registro personalizado sem alterar o catálogo oficial.',
      alvos: ['[data-tour="pericias-filtros"]'],
    },
    {
      id: 'pericias-cartao', titulo: 'Como ler uma perícia',
      descricao: 'O cartão mostra nome, atributo usado, grau, bônus extras e marcadores automáticos. A estrela fixa favoritas; o ícone de informação detalha a regra; o controle de ajustes registra fontes adicionais.',
      alvos: ['[data-tour="pericia-cartao"]', '[data-tour="pericias-lista"]'],
    },
    {
      id: 'pericias-grau', titulo: 'Grau de treinamento',
      descricao: 'O grau vai de Iniciante a Renomado e define o bônus de treinamento. Clique no grau para ver todos os patamares e escolher o treinamento atual da perícia.',
      alvos: ['[data-tour="pericia-grau"]'], opcional: true,
    },
    {
      id: 'pericias-vantagens', titulo: 'Vantagem, desvantagem e rolagem',
      descricao: 'Vantagens e desvantagens se anulam; o saldo muda quantos dados são rolados e qual resultado vale. O botão de dado executa o teste já com atributo, treinamento e modificadores atuais.',
      alvos: ['[data-tour="pericia-rolagem"]'], opcional: true,
    },
  ],
  Inventário: [
    {
      id: 'inventario-resumo', titulo: 'Carga e capacidade',
      descricao: 'O peso carregado soma os itens e quantidades relevantes. A capacidade vem da ficha; ultrapassá-la pode gerar penalidades. Itens guardados fora do corpo continuam registrados, mas podem deixar de contar como equipados.',
      alvos: ['[data-tour="inventario-resumo"]', '[data-tour="section-overview"]'],
    },
    {
      id: 'inventario-itens-especiais', titulo: 'Itens de perícia e artefatos',
      descricao: 'Esses dois grupos dividem o mesmo limite de uso: nível total dividido por 4, arredondado para baixo, com o mínimo de 1. Comprar ou guardar não ocupa vaga; equipar ativa o item e ocupa uma. O contador impede novas ativações acima do limite e o link abre a regra completa.',
      alvos: ['[data-tour="inventario-itens-especiais"]'],
    },
    {
      id: 'inventario-carteira', titulo: 'Carteira',
      descricao: 'As moedas ficam separadas por tipo. Use −, + ou digite o saldo de cada uma; o seletor revela tipos de moeda que ainda não aparecem na carteira.',
      alvos: ['[data-tour="inventario-carteira"]'], opcional: true,
    },
    {
      id: 'inventario-materiais', titulo: 'Estoques de materiais',
      descricao: 'Este resumo acompanha os lotes padronizados usados em criação e manutenção. Ele não substitui a descrição narrativa do material; o botão de olho recolhe ou revela o bloco.',
      alvos: ['[data-tour="inventario-materiais"]', '[data-tour="inventario-materiais-toggle"]'], opcional: true,
    },
    {
      id: 'inventario-filtros', titulo: 'Encontrar e cadastrar itens',
      descricao: 'A busca procura nos itens e os filtros reduzem a lista por categoria, condição, raridade ou local. “Novo item” abre o formulário com quantidade, peso, estado, efeitos e demais detalhes.',
      alvos: ['[data-tour="inventario-filtros"]'],
    },
    {
      id: 'inventario-implantes', titulo: 'Implantes e limite corporal',
      descricao: 'Implantes ocupam capacidade própria e podem conceder efeitos estruturados. Use “Recolher” para manter apenas o resumo de instalados visível; a preferência fica salva neste navegador.',
      alvos: ['[data-tour="inventario-implantes"]'], opcional: true,
    },
    {
      id: 'inventario-locais', titulo: 'Itens separados por local',
      descricao: 'Os objetos são agrupados por onde estão: corpo, mochila, depósito e outros locais. Arraste para ordenar; mover o local ajuda a distinguir o que está disponível em cena do que ficou guardado.',
      alvos: ['[data-tour="inventario-local"]', '[data-tour="inventario-lista"]'],
    },
    {
      id: 'inventario-item', titulo: 'Como ler e usar um item',
      descricao: 'Cada cartão informa quantidade, peso, raridade, estado, munição ou durabilidade quando existirem. Equipar ativa efeitos válidos; itens de perícia e artefatos mostram quando consomem uma vaga especial. Os controles permitem ajustar quantidade e estado, editar o local e os detalhes ou remover o item. Frutos do Éden têm uma ação própria de consumo.',
      alvos: ['[data-tour="inventario-item"]'], opcional: true,
    },
  ],
  Bens: [
    {
      id: 'bens-propriedades', titulo: 'Propriedades pessoais',
      descricao: 'Casas, terrenos, comércios e bases do personagem ficam aqui. Cada registro pode guardar localização, aquisição, manutenção mensal, qualidade dos alojamentos e instalações com seus espaços; “Adicionar Propriedade” abre o cadastro completo.',
      alvos: ['[data-tour="bens-propriedades"]', '[data-tour="section-overview"]'],
    },
    {
      id: 'bens-veiculos', titulo: 'Veículos e peças pessoais',
      descricao: 'Esta área usa a mesma organização do inventário, mas separa veículos, módulos e peças da mochila. Peso, condição, local e efeitos continuam sendo acompanhados nos cartões.',
      alvos: ['[data-tour="bens-veiculos"]'],
    },
    {
      id: 'bens-frota', titulo: 'Frota da campanha',
      descricao: 'Veículos compartilhados pertencem à campanha, não a uma única ficha. Permissões definem quem pode alterar tripulação, carga, condição e demais dados da frota.',
      alvos: ['[data-tour="bens-frota"]'], opcional: true,
    },
    {
      id: 'bens-bases', titulo: 'Bases da campanha',
      descricao: 'Bases compartilhadas reúnem propriedades usadas pelo grupo. Registros pessoais antigos podem ser migrados quando a opção estiver disponível, preservando a separação entre patrimônio individual e coletivo.',
      alvos: ['[data-tour="bens-bases"]'], opcional: true,
    },
  ],
  Habilidades: [
    {
      id: 'habilidades-resumo', titulo: 'Recursos da trajetória',
      descricao: 'Habilidades vêm de raça, classes, Fruto do Éden ou criação manual. O resumo separa quantas são automáticas e quantas foram adicionadas à ficha.',
      alvos: ['[data-tour="habilidades-resumo"]', '[data-tour="section-overview"]'],
    },
    {
      id: 'habilidades-automaticas', titulo: 'Habilidades automáticas',
      descricao: 'Estes grupos são sincronizados com a origem e o nível do personagem. Cada cartão mostra descrição, custo, ação, alcance, duração e usos quando existirem; é possível personalizar o texto ou ocultar o cartão sem perder a concessão.',
      alvos: ['[data-tour="habilidades-automaticas"]'], opcional: true,
    },
    {
      id: 'habilidades-ocultas', titulo: 'Habilidades ocultas',
      descricao: 'Itens automáticos ocultos saem da lista principal, mas não são apagados da progressão. Abra este bloco compacto para restaurar qualquer habilidade à ficha.',
      alvos: ['[data-tour="habilidades-ocultas"]'], opcional: true,
    },
    {
      id: 'habilidades-ferramentas', titulo: 'Busca e habilidade personalizada',
      descricao: 'A busca filtra pelo texto. “Nova Habilidade” abre um formulário para registrar nome, tipo, ação, custo, alcance, duração, usos, descrição e efeitos estruturados.',
      alvos: ['[data-tour="habilidades-ferramentas"]'],
    },
    {
      id: 'habilidades-personalizadas', titulo: 'Habilidades personalizadas',
      descricao: 'Os cartões manuais podem ser favoritos, reordenados, usados, editados ou removidos. Quando houver custo ou limite de usos, a própria ação do cartão registra o consumo.',
      alvos: ['[data-tour="habilidade-cartao"]', '[data-tour="habilidades-personalizadas"]'],
    },
  ],
  Poderes: [
    {
      id: 'poderes-resumo', titulo: 'Poderes e fontes',
      descricao: 'Poderes podem vir de classe, Legado, Fruto do Éden ou cadastro manual. O resumo mostra o total atualmente disponível na ficha.',
      alvos: ['[data-tour="poderes-resumo"]', '[data-tour="section-overview"]'],
    },
    {
      id: 'poderes-ferramentas', titulo: 'Busca e novo poder',
      descricao: 'Use a busca para filtrar. “Novo Poder” abre o formulário de um poder personalizado, incluindo ação, custo, alcance, duração, usos, descrição e efeitos estruturados.',
      alvos: ['[data-tour="poderes-ferramentas"]'],
    },
    {
      id: 'poderes-oficiais', titulo: 'Poderes oficiais',
      descricao: 'Poderes concedidos por classe ou Legado ficam agrupados pela origem. Eles acompanham a progressão automaticamente; você pode personalizar o texto visível ou ocultá-los sem apagar a escolha oficial.',
      alvos: ['[data-tour="poderes-oficiais"]'], opcional: true,
    },
    {
      id: 'poderes-fruto', titulo: 'Poderes do Fruto do Éden',
      descricao: 'Aqui ficam as técnicas do Fruto. O despertar aprimora todas elas e a passiva, além de liberar a manifestação final; os custos continuam conectados aos recursos da ficha.',
      alvos: ['[data-tour="poderes-fruto"]'], opcional: true,
    },
    {
      id: 'poderes-ocultos', titulo: 'Poderes ocultos',
      descricao: 'Poderes automáticos ocultos ficam fora da lista principal, mas continuam pertencendo ao personagem. Abra este bloco para restaurá-los quando quiser.',
      alvos: ['[data-tour="poderes-ocultos"]'], opcional: true,
    },
    {
      id: 'poderes-personalizados', titulo: 'Poderes personalizados',
      descricao: 'Nos cartões manuais você pode favoritar, ordenar, usar, editar e excluir. Usar um poder aplica o custo e o limite de usos configurados; efeitos permanentes válidos entram nos cálculos da ficha.',
      alvos: ['[data-tour="poder-cartao"]', '[data-tour="poderes-personalizados"]'],
    },
  ],
  Magias: [
    {
      id: 'magias-resumo', titulo: 'Fonte, Fluxo e manifestações',
      descricao: 'Escolha entre Magias, Rituais, Selos e Encantamentos. O painel resume fonte, Fluxo nativo, Mana, círculo máximo, dificuldade e vagas; o menor limite entre fonte e Fluxo determina o que pode ser conjurado.',
      alvos: ['[data-tour="magias-resumo"]', '[data-tour="section-overview"]'],
    },
    {
      id: 'magias-tipos', titulo: 'Tipos de manifestação',
      descricao: 'As quatro categorias têm catálogos e limites próprios. Trocar o tipo atualiza o resumo, a lista conhecida e o botão de aprender ou consultar sem apagar o que já foi escolhido.',
      alvos: ['[data-tour="magias-tipos"]'],
    },
    {
      id: 'magias-limites', titulo: 'Limites mágicos',
      descricao: 'Fonte concede acesso e vagas; Fluxo sustenta o círculo; Misticismo participa dos testes; Mana paga custos. Avisos neste painel explicam quando uma dessas regras impede aprender ou conjurar.',
      alvos: ['[data-tour="magias-limites"]'],
    },
    {
      id: 'magias-catalisadores', titulo: 'Catalisadores de Fluxo',
      descricao: 'Catalisadores preparados permitem canalizar outros Fluxos dentro do limite indicado. O catalisador ativo muda a afinidade usada na manifestação; preparação e ativação obedecem às concessões da ficha.',
      alvos: ['[data-tour="magias-catalisadores"]'], opcional: true,
    },
    {
      id: 'magias-simbolo', titulo: 'Símbolo mágico',
      descricao: 'Virtudes e Pecados podem alterar a relação do personagem com a magia. Este cartão mostra a regra especial, o benefício e a cobrança vinculados ao símbolo atual.',
      alvos: ['[data-tour="magias-simbolo"]'], opcional: true,
    },
    {
      id: 'magias-cobrancas', titulo: 'Marcas e cicatrizes',
      descricao: 'Falhas e custos narrativos podem deixar marcas ou cicatrizes mágicas. Este histórico mostra o que foi adquirido, o que ainda está pendente e quais efeitos permanecem ativos.',
      alvos: ['[data-tour="magias-cobrancas"]'], opcional: true,
    },
    {
      id: 'magias-concentracao', titulo: 'Concentração ativa',
      descricao: 'Uma manifestação sustentada fica destacada aqui. Ao sofrer dano, siga a DT informada para manter a concentração; “Encerrar” remove o estado quando o efeito termina.',
      alvos: ['[data-tour="magias-concentracao"]'], opcional: true,
    },
    {
      id: 'magias-lista', titulo: 'Conhecidas e catálogo',
      descricao: 'A lista conhecida reúne suas manifestações e seus botões de conjuração, concentração e personalização. Ao abrir o catálogo, a busca e os filtros mostram o que pode ser aprendido ou concedido e explicam requisitos bloqueados.',
      alvos: ['[data-tour="magias-lista"]'],
    },
  ],
  Ataques: [
    {
      id: 'ataques-resumo', titulo: 'Ataques prontos',
      descricao: 'Esta página reúne armas equipadas e manobras cadastradas. O contador mostra quantos ataques estão prontos para uso.',
      alvos: ['[data-tour="ataques-resumo"]', '[data-tour="section-overview"]'],
    },
    {
      id: 'ataques-ferramentas', titulo: 'Busca, Defesa e novo ataque',
      descricao: 'Busque pelo nome, informe opcionalmente a Defesa do alvo para a ficha indicar acerto ou erro e use “Novo Ataque” para cadastrar bônus, dano, alcance, margem e multiplicador crítico.',
      alvos: ['[data-tour="ataques-ferramentas"]'],
    },
    {
      id: 'ataques-cartao', titulo: 'Como ler um ataque',
      descricao: 'O cartão mostra tipo, alcance, fórmula de dano, margem de ameaça e multiplicador. Armas do inventário são identificadas; bônus atuais de equipamentos e personagem entram nos valores exibidos.',
      alvos: ['[data-tour="ataque-cartao"]', '[data-tour="ataques-lista"]'],
    },
    {
      id: 'ataques-rolagem', titulo: 'Acerto, dano e crítico',
      descricao: '“Atacar” rola o acerto e compara com a Defesa informada. Depois, “Rolar Dano” aplica a fórmula; numa ameaça crítica, a ficha usa a margem e o multiplicador configurados e destaca o resultado.',
      alvos: ['[data-tour="ataque-rolagem"]'], opcional: true,
    },
  ],
  Aliados: [
    {
      id: 'aliados-resumo', titulo: 'Aliados registrados e em cena',
      descricao: 'O resumo separa todos os companheiros daqueles presentes na cena. Somente aliados em cena fornecem benefícios estruturados à ficha.',
      alvos: ['[data-tour="aliados-resumo"]', '[data-tour="section-overview"]'],
    },
    {
      id: 'aliados-ferramentas', titulo: 'Buscar ou criar aliado',
      descricao: 'A busca filtra a lista. “Novo Aliado” cria um companheiro simples; o Mestre também pode vincular uma ficha completa e compartilhar o aliado com outros personagens.',
      alvos: ['[data-tour="aliados-ferramentas"]'],
    },
    {
      id: 'aliados-cartao', titulo: 'Identidade e controle',
      descricao: 'O cartão identifica tipo, papel, vínculo, compartilhamento e responsável. Use a estrela e a alça para organizar; editar e excluir podem ficar bloqueados quando o aliado é compartilhado ou controlado pelo Mestre.',
      alvos: ['[data-tour="aliado-cartao"]', '[data-tour="aliados-lista"]'],
    },
    {
      id: 'aliados-recursos', titulo: 'Recursos e combate do aliado',
      descricao: 'Aliados simples guardam Vida, Defesa, Movimento, Iniciativa, ataques e carteira próprios. Aliados complexos sincronizam esses valores diretamente da ficha-base vinculada.',
      alvos: ['[data-tour="aliado-recursos"]'], opcional: true,
    },
    {
      id: 'aliados-beneficios', titulo: 'Benefícios e presença em cena',
      descricao: 'Efeitos estruturados só ficam ativos quando o aliado está “Em Cena”. Condições e observações permanecem visíveis no cartão; o botão inferior alterna presença quando você tem permissão.',
      alvos: ['[data-tour="aliado-beneficios"]', '[data-tour="aliado-cena"]'], opcional: true,
    },
  ],
  Progressão: [
    {
      id: 'progressao-resumo', titulo: 'O que é automático e o que é escolha',
      descricao: 'O resumo separa conquistas de escolhas abertas. A busca encontra habilidades, poderes, eventos, escolhas e Legados por nome, descrição ou requisito; os atalhos levam direto a cada seção.',
      alvos: ['[data-tour="progressao-resumo"]', '[data-tour="section-overview"]'],
    },
    {
      id: 'progressao-classes', titulo: 'Tabela das classes',
      descricao: 'Cada classe mostra a recompensa do nível atual, a próxima recompensa e os totais já conquistados. “Ver todos os níveis” abre a trilha completa; o link de regras leva à descrição oficial da classe.',
      alvos: ['[data-tour="progressao-classes"]'], opcional: true,
    },
    {
      id: 'progressao-raca', titulo: 'Características e escolhas raciais',
      descricao: 'As seções podem ser abertas ou recolhidas para reduzir a quantidade de texto na tela. Traços fixos vêm da raça; seletores de atributos, modificações ou mutações mostram o limite e impedem escolhas excedentes.',
      alvos: ['[data-tour="progressao-raca"]'],
    },
    {
      id: 'progressao-habilidades', titulo: 'Habilidades e opções internas',
      descricao: 'Habilidades de classe são liberadas pelo nível e seus cartões começam compactos: abra apenas a descrição que quiser ler. Catálogos próprios mostram vagas, pré-requisitos e opções já selecionadas.',
      alvos: ['[data-tour="progressao-habilidades"]', '[data-tour="progressao-escolhas"]'],
    },
    {
      id: 'progressao-poderes', titulo: 'Vagas de poderes',
      descricao: 'Cada classe concede vagas conforme sua progressão. Filtre por todos, disponíveis ou escolhidos; a busca geral também reduz o catálogo. Descrições ficam recolhidas e motivos de bloqueio continuam visíveis.',
      alvos: ['[data-tour="progressao-poderes"]'],
    },
    {
      id: 'progressao-eventos', titulo: 'Eventos de classe',
      descricao: 'Eventos são marcos liberados automaticamente em níveis específicos. Eles ficam aqui como referência da trajetória e de efeitos narrativos ou mecânicos conquistados.',
      alvos: ['[data-tour="progressao-eventos"]'],
    },
    {
      id: 'progressao-legados', titulo: 'Legados de Ascensão',
      descricao: 'Legados usam vagas próprias e exigem pré-requisitos. Pesquise por nome, efeito ou requisito e filtre opções disponíveis ou já escolhidas. A descrição completa fica recolhida para o catálogo continuar navegável.',
      alvos: ['[data-tour="progressao-legados"]'],
    },
  ],
  Descanso: [
    {
      id: 'descanso-resumo', titulo: 'Recuperação e consequências',
      descricao: 'Esta aba aplica as regras oficiais de descanso e mantém condições e crises ao lado da recuperação, para que nenhum efeito seja esquecido.',
      alvos: ['[data-tour="descanso-resumo"]', '[data-tour="section-overview"]'],
    },
    {
      id: 'descanso-completo', titulo: 'Qualidade do descanso',
      descricao: 'Escolha a condição em que o personagem descansou para pré-visualizar Vida, Mana, Sanidade e Cansaço recuperados. Algumas qualidades exigem autorização; confirme apenas depois de conferir o resultado. Combate intenso registra Cansaço uma vez por cena.',
      alvos: ['[data-tour="descanso-completo"]'],
    },
    {
      id: 'descanso-condicoes', titulo: 'Condições oficiais',
      descricao: 'Cada cartão informa duração, efeitos mecânicos e forma de remoção. “Aplicar e abrir na Ficha” registra a condição sem duplicar e leva direto ao painel de Condições Ativas; se ela já estiver ativa, o mesmo botão apenas abre o painel.',
      alvos: ['[data-tour="descanso-condicoes"]'],
    },
    {
      id: 'descanso-sanidade', titulo: 'Crises de Sanidade',
      descricao: 'Ruptura e Quebra podem disparar crises. Os cartões descrevem duração, efeitos e recuperação; perdas continuam acumulando até o mínimo de Sanidade indicado pelas regras.',
      alvos: ['[data-tour="descanso-sanidade"]'],
    },
  ],
  Notas: [
    {
      id: 'notas-resumo', titulo: 'Diário da campanha',
      descricao: 'Aqui ficam pistas, pessoas, lugares, objetivos e acontecimentos. O contador mostra o total salvo e “Nova Nota” abre o editor com etiquetas, conteúdo principal, favorito e tópicos ordenáveis.',
      alvos: ['[data-tour="notas-resumo"]', '[data-tour="section-overview"]'],
    },
    {
      id: 'notas-filtros', titulo: 'Encontrar uma anotação',
      descricao: 'A busca procura em título, etiquetas, texto e tópicos. Você pode filtrar por qualquer etiqueta, ordenar por data ou título e mostrar somente as notas favoritas.',
      alvos: ['[data-tour="notas-filtros"]'],
    },
    {
      id: 'notas-cartao', titulo: 'Ler e organizar notas',
      descricao: 'O cartão mostra até três etiquetas, data, resumo e primeiros tópicos. A estrela mantém a nota no topo; “Ler nota” abre o conteúdo completo para copiar, favoritar, duplicar ou editar. As ações do cartão permanecem visíveis.',
      alvos: ['[data-tour="nota-cartao"]', '[data-tour="notas-lista"]'],
    },
  ],
};

export const obterPassosTourFicha = (aba: FichaTourTabId): FichaTourStep[] => {
  if (aba === 'Ficha') return PASSOS_POR_ABA.Ficha;
  return [
    {
      id: `aba-${aba}`, titulo: `Aba ${aba}`,
      descricao: 'A seção ativa fica marcada com as cores do personagem. Você pode visitar outra aba sem perder as alterações que já foram salvas.',
      alvos: [alvoAba(aba), '[data-tour="sheet-tabs"]'],
    },
    ...PASSOS_POR_ABA[aba],
  ];
};

export const lerAbasVistasTourFicha = (valor: string | null): Set<FichaTourTabId> => {
  if (!valor) return new Set();
  try {
    const dados = JSON.parse(valor) as { versao?: number; abas?: unknown };
    if (dados.versao !== FICHA_TOUR_VERSAO || !Array.isArray(dados.abas)) return new Set();
    return new Set(dados.abas.filter((aba): aba is FichaTourTabId => (
      typeof aba === 'string' && FICHA_TOUR_TABS.includes(aba as FichaTourTabId)
    )));
  } catch {
    return new Set();
  }
};

export const serializarAbasVistasTourFicha = (abas: Iterable<FichaTourTabId>) => JSON.stringify({
  versao: FICHA_TOUR_VERSAO,
  abas: [...new Set(abas)].filter((aba) => FICHA_TOUR_TABS.includes(aba)),
});
