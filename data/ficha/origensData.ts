export type AlvoOrigem =
  | 'atributo'
  | 'pericia'
  | 'vidaMaxima'
  | 'manaMaxima'
  | 'sanidadeMaxima'
  | 'movimento';

export interface IAjusteOrigem {
  alvo: AlvoOrigem;
  chave?: string;
  valor: number;
  rotulo: string;
}

export interface IOrigem {
  id: string;
  titulo: string;
  categoria: string;
  descricao: string;
  ajustes: IAjusteOrigem[];
}

const pericia = (chave: string, titulo: string): IAjusteOrigem => ({
  alvo: 'pericia',
  chave,
  valor: 2,
  rotulo: `${titulo} +2`,
});

const atributo = (chave: string, titulo: string): IAjusteOrigem => ({
  alvo: 'atributo',
  chave,
  valor: 2,
  rotulo: `${titulo} +2 (+1 no modificador)`,
});

// Cada origem concede apenas um benefício. Os ids anteriores foram mantidos
// para que personagens que já escolheram uma origem continuem válidos.
export const ORIGENS: IOrigem[] = [
  {
    id: 'academico',
    titulo: 'Acadêmico',
    categoria: 'Estudo',
    descricao: 'Você passou parte da vida estudando em escolas, bibliotecas ou com um professor.',
    ajustes: [atributo('inteligencia', 'Inteligência')],
  },
  {
    id: 'artesao',
    titulo: 'Artesão',
    categoria: 'Trabalho',
    descricao: 'Você aprendeu um ofício e trabalhou produzindo ou consertando objetos.',
    ajustes: [pericia('oficio', 'Ofício')],
  },
  {
    id: 'batedor',
    titulo: 'Batedor',
    categoria: 'Exploração',
    descricao: 'Você fazia o reconhecimento de caminhos e avisava o grupo sobre perigos.',
    ajustes: [pericia('percepcao', 'Percepção')],
  },
  {
    id: 'devoto',
    titulo: 'Devoto',
    categoria: 'Religião',
    descricao: 'Você cresceu seguindo uma religião e participando de seus costumes.',
    ajustes: [pericia('religiao', 'Religião')],
  },
  {
    id: 'guarda',
    titulo: 'Guarda',
    categoria: 'Proteção',
    descricao: 'Você trabalhou protegendo um lugar, uma pessoa ou uma comunidade.',
    ajustes: [atributo('constituicao', 'Constituição')],
  },
  {
    id: 'herborista',
    titulo: 'Herborista',
    categoria: 'Saúde',
    descricao: 'Você aprendeu a preparar remédios simples e a cuidar de ferimentos.',
    ajustes: [pericia('cura', 'Cura')],
  },
  {
    id: 'mensageiro',
    titulo: 'Mensageiro',
    categoria: 'Serviço',
    descricao: 'Você entregava cartas e encomendas, muitas vezes com pouco tempo.',
    ajustes: [atributo('destreza', 'Destreza')],
  },
  {
    id: 'negociador',
    titulo: 'Negociador',
    categoria: 'Comércio',
    descricao: 'Você trabalhava fazendo acordos, vendas ou resolvendo discussões.',
    ajustes: [pericia('diplomacia', 'Diplomacia')],
  },
  {
    id: 'sobrevivente',
    titulo: 'Sobrevivente',
    categoria: 'Resistência',
    descricao: 'Você passou por uma situação difícil e aprendeu a aguentar mais.',
    ajustes: [{ alvo: 'vidaMaxima', valor: 2, rotulo: 'Vida máxima +2' }],
  },
  {
    id: 'viajante',
    titulo: 'Viajante',
    categoria: 'Viagem',
    descricao: 'Você passou muito tempo na estrada e se acostumou a longas viagens.',
    ajustes: [{ alvo: 'movimento', valor: 1.5, rotulo: 'Movimento +1,5 m' }],
  },
  {
    id: 'investigador-do-veu',
    titulo: 'Investigador',
    categoria: 'Investigação',
    descricao: 'Você trabalhava reunindo pistas e tentando entender o que aconteceu.',
    ajustes: [pericia('investigacao', 'Investigação')],
  },
  {
    id: 'contrabandista-dimensional',
    titulo: 'Criminoso',
    categoria: 'Crime',
    descricao: 'Você viveu de atividades ilegais e aprendeu a evitar atenção.',
    ajustes: [pericia('furtividade', 'Furtividade')],
  },
  {
    id: 'veterano-de-companhia',
    titulo: 'Soldado',
    categoria: 'Militar',
    descricao: 'Você recebeu treinamento militar e serviu em uma tropa ou companhia.',
    ajustes: [atributo('forca', 'Força')],
  },
  {
    id: 'operador-da-axis',
    titulo: 'Técnico',
    categoria: 'Tecnologia',
    descricao: 'Você aprendeu a usar, manter e consertar máquinas e equipamentos.',
    ajustes: [pericia('tecnologia', 'Tecnologia')],
  },
  {
    id: 'piloto-de-passagens',
    titulo: 'Piloto',
    categoria: 'Transporte',
    descricao: 'Você trabalhou conduzindo veículos em viagens ou serviços.',
    ajustes: [pericia('pilotagem', 'Pilotagem')],
  },
  {
    id: 'artista-itinerante',
    titulo: 'Artista',
    categoria: 'Arte',
    descricao: 'Você viveu de música, teatro, dança ou outra forma de apresentação.',
    ajustes: [pericia('atuacao', 'Atuação')],
  },
  {
    id: 'herdeiro-de-juramento',
    titulo: 'Nobre',
    categoria: 'Sociedade',
    descricao: 'Você nasceu em uma família importante e aprendeu a lidar com política e etiqueta.',
    ajustes: [atributo('carisma', 'Carisma')],
  },
  {
    id: 'canalizador-instintivo',
    titulo: 'Canalizador',
    categoria: 'Fluxo',
    descricao: 'Você sempre teve facilidade para sentir e controlar o próprio Fluxo.',
    ajustes: [atributo('fluxo', 'Fluxo')],
  },
  {
    id: 'testemunha-do-impossivel',
    titulo: 'Jornalista',
    categoria: 'Informação',
    descricao: 'Você procurava informações, entrevistava pessoas e contava histórias reais.',
    ajustes: [pericia('intuicao', 'Intuição')],
  },
  {
    id: 'cuidador-de-criaturas',
    titulo: 'Cuidador',
    categoria: 'Cuidado',
    descricao: 'Você passou parte da vida cuidando de pessoas, animais ou de uma comunidade.',
    ajustes: [atributo('sabedoria', 'Sabedoria')],
  },
];

export function obterOrigem(id: unknown): IOrigem | null {
  return ORIGENS.find((origem) => origem.id === id) || null;
}

export function resumoAjustesOrigem(origem: IOrigem): string {
  return origem.ajustes.map((ajuste) => ajuste.rotulo).join(' · ');
}
