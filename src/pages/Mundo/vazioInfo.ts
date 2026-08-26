// Lore-fonte: data/mundo/Abismo/abismo.json (Deidade Erebus, Fluxo do Vazio,
// locais Bordo/A Saída) + "O Vazio entre as Árvores" em data/regras/regras.ts.
// Abismo não é uma Árvore como as outras nove: é o espaço que existe entre
// elas, entre o Banco Lunar e entre tudo o mais no Jardim. Por isso ele não
// tem um corpo orbital em COSMIC_TREES - este painel é a versão curta que
// cabe no card da cena 3D, aberta pelo botão "O Vazio" em vez de um clique
// num nó orbitando.
export const VAZIO_INFO = {
  nome: 'O Vazio',
  cor: '#9b96ad',
  descricao:
    'O espaço que existe entre as Árvores, e entre tudo o mais que tem lugar no Jardim - inclusive o Banco Lunar, que só existe porque fica fora de todas elas ao mesmo tempo. Não é uma décima Árvore: é o que sobra quando se tira todas elas do mapa.',
  deidade: {
    nome: 'Erebus',
    epiteto: 'Aquele que Flui no Vazio',
    descricao:
      'Governa o Vazio, não um pedaço de chão dentro dele. É a deidade silenciosa que guarda a saída definitiva da existência - o mais temido, neutro e enigmático de todos. Está paralisado desde que Keryx foi subjugado por Jota Macedo, mas continua sentado onde sempre esteve: em Bordo, de costas pro Jardim.',
  },
  fluxo: {
    nome: 'Fluxo do Vazio',
    descricao:
      'O Fluxo do que não está. Apaga em vez de destruir: o som some antes de chegar ao ouvido, a dor não é sentida, o nome de alguém deixa de ocorrer a quem o conhecia. Erebus não guarda a morte - isso é do Limiar - e sim a saída definitiva: o que passa pelo Vazio simplesmente deixa de ter existido.',
  },
  locais: [
    {
      nome: 'Bordo',
      resumo: 'A borda do Jardim: a faixa onde a existência ainda alcança, e depois da qual não alcança mais. É onde Erebus está sentado desde sempre.',
    },
    {
      nome: 'A Saída',
      resumo: 'O ponto de Bordo onde a borda se abre - o único lugar do Jardim onde alguém pode deixar de existir por escolha própria, sem registro e sem volta.',
    },
  ],
};
