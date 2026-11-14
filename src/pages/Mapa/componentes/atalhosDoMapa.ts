// Os atalhos do mapa, numa lista só: a folha de atalhos (tecla ?) lê daqui. Um teste confere que as teclas de
// ferramenta desta lista existem no tratador de teclado da página, para a folha não mentir.

export interface AtalhoDoMapa {
  /** As teclas, na ordem em que se apertam ou se usam ("clique" e "arrastar" entram como texto). */
  teclas: string[];
  descricao: string;
  /** Só o Mestre vê e usa. */
  soMestre?: boolean;
}

export interface GrupoDeAtalhos {
  titulo: string;
  itens: AtalhoDoMapa[];
}

export const ATALHOS_DO_MAPA: GrupoDeAtalhos[] = [
  {
    titulo: 'Ferramentas',
    itens: [
      { teclas: ['V'], descricao: 'Mover tokens e o mapa' },
      { teclas: ['R'], descricao: 'Régua' },
      { teclas: ['P'], descricao: 'Ping' },
      { teclas: ['Alt', 'clique'], descricao: 'Ping rápido, com qualquer ferramenta' },
      { teclas: ['Alt', 'Shift', 'clique'], descricao: 'Ping de perigo, vermelho, para o grupo se afastar ou olhar' },
      { teclas: ['Alt', 'Ctrl', 'clique'], descricao: 'Olhem aqui: ping dourado e a tela de todos vai para o ponto', soMestre: true },
      { teclas: ['Shift', 'clique'], descricao: 'Com a régua: pontos de passagem. Cada clique fixa um ponto; o mesmo ponto de novo ou Esc termina' },
      { teclas: ['M'], descricao: 'Efeito de magia' },
      { teclas: ['L'], descricao: 'Desenhar no mapa: lápis, linha, seta, círculo e retângulo (some sozinho)' },
      { teclas: ['D'], descricao: 'Rolar dados' },
      { teclas: ['T'], descricao: 'Escrever no mapa', soMestre: true },
      { teclas: ['N'], descricao: 'Névoa de guerra', soMestre: true },
      { teclas: ['O'], descricao: 'Portais', soMestre: true },
      { teclas: ['Z'], descricao: 'Zonas de terreno: cobertura, gatilho escondido e terreno (arraste um retângulo)', soMestre: true },
    ],
  },
  {
    titulo: 'Tela',
    itens: [
      { teclas: ['Ctrl', 'K'], descricao: 'Central de comandos: buscar um token, um painel, uma cena ou uma ação' },
      { teclas: ['/'], descricao: 'Central de comandos, com uma tecla só' },
      { teclas: ['H'], descricao: 'Só o mapa (esconde e mostra a interface)' },
      { teclas: ['Roda do mouse'], descricao: 'Zoom' },
      { teclas: ['Botão do meio'], descricao: 'Arrastar a tela (com qualquer ferramenta)' },
      { teclas: ['Botão direito'], descricao: 'Arrastado leva a tela; um clique parado abre o menu do token ou do ponto' },
      { teclas: ['Ctrl', 'Shift', 'D'], descricao: 'Medidor do tempo real' },
      { teclas: ['?'], descricao: 'Mostrar e esconder esta folha' },
    ],
  },
  {
    titulo: 'Mapa escolhido',
    itens: [
      { teclas: ['Shift', 'arrastar'], descricao: 'Mover encaixando o canto na grade', soMestre: true },
      { teclas: ['Shift', 'girar'], descricao: 'Girar de 15 em 15 graus', soMestre: true },
      { teclas: ['Delete'], descricao: 'Tirar da cena', soMestre: true },
      { teclas: ['Ctrl', 'D'], descricao: 'Duplicar o token escolhido (cópia numerada ao lado; o menu do botão direito faz vários)', soMestre: true },
      { teclas: ['Esc'], descricao: 'Tirar a seleção' },
      { teclas: ['1', '9'], descricao: 'Com o token do seu personagem escolhido: troca a arte (1 é a foto da ficha, 2 em diante são as extras)' },
    ],
  },
  {
    titulo: 'Desenho',
    itens: [
      { teclas: ['Ctrl', 'Z'], descricao: 'Desfazer a última forma da névoa', soMestre: true },
      { teclas: ['Ctrl', 'Z'], descricao: 'Com o lápis: desfazer o seu último traço' },
      { teclas: ['Enter'], descricao: 'Fechar o polígono da névoa', soMestre: true },
      { teclas: ['Esc'], descricao: 'Cancelar o que está sendo desenhado ou sair da ferramenta' },
    ],
  },
];

/** A lista que a pessoa pode usar: o jogador não vê o que é só do Mestre, e grupo que ficou vazio some. */
export function atalhosVisiveis(gestor: boolean, grupos: readonly GrupoDeAtalhos[] = ATALHOS_DO_MAPA): GrupoDeAtalhos[] {
  return grupos
    .map((grupo) => ({ ...grupo, itens: grupo.itens.filter((item) => gestor || !item.soMestre) }))
    .filter((grupo) => grupo.itens.length > 0);
}

/** As teclas de uma letra só (V, R, P...) que a lista promete: são as que o tratador de teclado precisa ter. */
export function letrasDeFerramenta(grupos: readonly GrupoDeAtalhos[] = ATALHOS_DO_MAPA): string[] {
  return grupos.flatMap((grupo) => grupo.itens)
    .filter((item) => item.teclas.length === 1 && /^[A-Z]$/.test(item.teclas[0]))
    .map((item) => item.teclas[0]);
}
