/**
 * Catálogo de condições de longo prazo para a ficha: lesões que pedem tempo e
 * tratamento, perdas e sequelas permanentes e condições de saúde mental.
 *
 * Existe para a mesa não precisar inventar na hora uma condição que já se sabe
 * que vai aparecer (um braço quebrado, uma Quebra de Sanidade que pede uma
 * condição permanente definida com o jogador). Tudo aqui é consulta e aplicação
 * manual: nenhum item entra em cálculo automático, e por isso o livro público,
 * a sessão ao vivo e o export editorial seguem lendo só `condicoes.ts`.
 *
 * Os efeitos das perdas de membro espelham a tabela de Mutilação do livro
 * (data/regras/regras.ts, tópico Ferimentos). Se uma mudar, a outra acompanha.
 */
import type { GrupoLongoPrazo, ICondicaoRegra } from './condicoes';

export type FiltroCondicao = 'cena' | 'lesoes' | 'sequelas' | 'mente';

/** Cada grupo pertence a um filtro do catálogo da aba Descanso. */
export const FILTRO_DO_GRUPO: Record<GrupoLongoPrazo, Exclude<FiltroCondicao, 'cena'>> = {
  'Ossos e articulações': 'lesoes',
  'Ferimentos graves': 'lesoes',
  'Membros e sentidos perdidos': 'sequelas',
  'Sequelas do corpo': 'sequelas',
  'Transtornos e traumas': 'mente',
  'Humor e comportamento': 'mente',
  'Medos e fobias': 'mente',
};

export const GRUPOS_LONGO_PRAZO = Object.keys(FILTRO_DO_GRUPO) as GrupoLongoPrazo[];

const duracaoDeLesao = (descansos: number) => (
  `${descansos} descanso${descansos > 1 ? 's' : ''} completo${descansos > 1 ? 's' : ''} de qualidade Boa ou melhor, com tratamento.`
);

const recuperacaoDeLesao = (descansos: number, dt: number, extra = '') => (
  `Cura DT ${dt} para tratar e iniciar a recuperação. Cada descanso completo de qualidade Boa ou melhor, com tratamento, conta 1; com ${descansos} contados a lesão termina.${extra ? ` ${extra}` : ''}`
);

const SAIDA_DE_MEMBRO = 'Só volta com Regeneração de um Fluxo que cite membro perdido ou com um implante que cubra o que sumiu, e o implante anula a penalidade enquanto funcionar.';

const SAIDA_MENTAL_PERMANENTE = 'Descanso comum não apaga. Acompanhamento profissional reduz a DT desta condição em 2, e só uma resolução na história ou tratamento longo a encerra.';

/** Para as condições mentais que não têm teste de Vontade, onde "reduzir a DT" não tem o que reduzir. */
const saidaMentalSemTeste = (abrandamento: string) => (
  `Descanso comum não apaga. Acompanhamento profissional ${abrandamento}, e só uma resolução na história ou tratamento longo a encerra.`
);

const saidaDeFobia = (fonte: string) => (
  `A cada três cenas em que o personagem encara ${fonte} de propósito, com apoio, e passa em Vontade DT 15, a DT baixa em 2. São seis cenas para ir de 12 a 8, e com DT 8 sobra só desconforto. Resolução na história encerra.`
);

export const CONDICOES_LONGO_PRAZO: ICondicaoRegra[] = [
  // Ossos e articulações: lesões que saram com tempo e tratamento.
  { id: 'braco-dominante-quebrado', titulo: 'Braço Dominante Quebrado', categoria: 'física', grupo: 'Ossos e articulações', duracao: duracaoDeLesao(3), efeitos: ['A mão desse braço não segura nada: sem armas de duas mãos, sem escudo e sem gestos de conjuração com ela.', 'Ataques com a outra mão sofrem -2.', 'Desvantagem em Atletismo para escalar e nadar.'], remocao: recuperacaoDeLesao(3, 15, 'Cura que cite ossos encerra na hora.') },
  { id: 'braco-apoio-quebrado', titulo: 'Braço de Apoio Quebrado', categoria: 'física', grupo: 'Ossos e articulações', duracao: duracaoDeLesao(3), efeitos: ['Sem escudo e sem armas de duas mãos.', 'Desvantagem em Atletismo para escalar.'], remocao: recuperacaoDeLesao(3, 15, 'Cura que cite ossos encerra na hora.') },
  { id: 'perna-quebrada', titulo: 'Perna Quebrada', categoria: 'física', grupo: 'Ossos e articulações', duracao: duracaoDeLesao(4), efeitos: ['Deslocamento pela metade e sem correr.', 'Desvantagem em Acrobacia e Furtividade.', 'Em terreno difícil ou ao ser empurrado, Acrobacia DT 12 ou fique Caído.'], remocao: recuperacaoDeLesao(4, 15, 'Cura que cite ossos encerra na hora.') },
  { id: 'tornozelo-torcido', titulo: 'Tornozelo Torcido', categoria: 'física', grupo: 'Ossos e articulações', duracao: duracaoDeLesao(1), efeitos: ['Sem correr.', 'Desvantagem em Acrobacia e em Atletismo para saltar.'], remocao: recuperacaoDeLesao(1, 12) },
  { id: 'ombro-deslocado', titulo: 'Ombro Deslocado', categoria: 'física', grupo: 'Ossos e articulações', duracao: duracaoDeLesao(2), efeitos: ['Desvantagem em ataques corpo a corpo e em Atletismo que exijam esse braço.', 'Enquanto o ombro não for recolocado, a condição não melhora.'], remocao: 'Cura DT 15 recoloca o ombro. Depois disso, 2 descansos completos de qualidade Boa ou melhor, com tratamento, encerram a lesão.' },
  { id: 'mao-fraturada', titulo: 'Mão Fraturada', categoria: 'física', grupo: 'Ossos e articulações', duracao: duracaoDeLesao(2), efeitos: ['Ataques com essa mão sofrem -2.', 'Desvantagem em Ladinagem, Pontaria e testes de precisão manual.'], remocao: recuperacaoDeLesao(2, 12) },
  { id: 'costelas-fraturadas', titulo: 'Costelas Fraturadas', categoria: 'física', grupo: 'Ossos e articulações', duracao: duracaoDeLesao(3), efeitos: ['Respirar fundo dói: -2 em Atletismo.', 'Desvantagem em Fortitude contra falta de ar, fumaça e esforço prolongado.'], remocao: recuperacaoDeLesao(3, 12) },
  { id: 'mandibula-quebrada', titulo: 'Mandíbula Quebrada', categoria: 'física', grupo: 'Ossos e articulações', duracao: duracaoDeLesao(3), efeitos: ['Só fala frases curtas e arrastadas: desvantagem em Diplomacia, Atuação e Intimidação faladas.', 'Componente verbal de magia só sai claro com Vontade DT 12.'], remocao: recuperacaoDeLesao(3, 15) },

  // Ferimentos graves: danos que pedem tratamento além do descanso.
  { id: 'concussao', titulo: 'Concussão', categoria: 'física', grupo: 'Ferimentos graves', duracao: duracaoDeLesao(2), efeitos: ['A cabeça lateja: desvantagem em Percepção, Investigação e Conhecimento.', 'Ao sofrer dano de impacto, Fortitude DT 12 ou fique Atordoado até o fim do próximo turno.'], remocao: recuperacaoDeLesao(2, 15, 'Nova pancada forte na cabeça antes do fim zera a contagem.') },
  { id: 'queimadura-grave', titulo: 'Queimadura Grave', categoria: 'física', grupo: 'Ferimentos graves', duracao: duracaoDeLesao(3), efeitos: ['A pele repuxa sob peso e atrito: com armadura pesada, -2 em testes físicos.', 'Desvantagem em Fortitude contra fogo e calor. Um Caldo de Osso Quente dá vantagem em Fortitude contra calor e cancela essa desvantagem por 4 horas.'], remocao: recuperacaoDeLesao(3, 15) },
  { id: 'congelamento', titulo: 'Congelamento', categoria: 'física', grupo: 'Ferimentos graves', duracao: duracaoDeLesao(2), efeitos: ['Dedos dormentes: desvantagem em Ladinagem e Pontaria.', 'Desvantagem em Fortitude contra frio. Um Caldo de Osso Quente dá vantagem em Fortitude contra frio e cancela essa desvantagem por 4 horas.'], remocao: recuperacaoDeLesao(2, 12, 'Passar uma cena inteira em local aquecido dá vantagem no teste de Cura.') },
  { id: 'lesao-interna', titulo: 'Lesão Interna', categoria: 'física', grupo: 'Ferimentos graves', duracao: 'Até ser operada.', efeitos: ['No fim de cada cena de esforço intenso, sofre 1d4 de dano que nada evita.', 'Descanso Excelente não recupera nada enquanto a lesão durar.'], remocao: 'Cura DT 18, com ferramentas e uma hora de calma, para operar. Cura mágica de pelo menos 1 PV também encerra.' },
  { id: 'surdo', titulo: 'Surdo', categoria: 'física', grupo: 'Ferimentos graves', duracao: 'Conforme a fonte.', efeitos: ['Não ouve: falha automaticamente em Percepção que dependa de som.', 'Não recebe ordens faladas nem ouve ataques vindos de fora do campo de visão.'], remocao: 'Remova ou supere a fonte. Cura DT 15 trata a causa quando ela for física.' },

  // Membros e sentidos perdidos: espelham a tabela de Mutilação do livro.
  { id: 'perda-mao-dominante', titulo: 'Perda da Mão Dominante', categoria: 'física', grupo: 'Membros e sentidos perdidos', permanente: true, duracao: 'Permanente.', efeitos: ['Não segura nada com ela: sem armas de duas mãos e sem gestos de conjuração com ela.', 'Ataques com a outra mão sofrem -2.', 'Vale também para quem perdeu o braço inteiro.'], remocao: SAIDA_DE_MEMBRO },
  { id: 'perda-mao-apoio', titulo: 'Perda da Mão de Apoio', categoria: 'física', grupo: 'Membros e sentidos perdidos', permanente: true, duracao: 'Permanente.', efeitos: ['Sem escudo e sem armas de duas mãos.', 'Desvantagem em Atletismo para escalar.', 'Vale também para quem perdeu o braço inteiro.'], remocao: SAIDA_DE_MEMBRO },
  { id: 'perda-perna', titulo: 'Perda de uma Perna', categoria: 'física', grupo: 'Membros e sentidos perdidos', permanente: true, duracao: 'Permanente.', efeitos: ['Deslocamento pela metade e sem correr.', 'Desvantagem em Acrobacia e Furtividade.', 'Perder as duas pernas deixa o personagem sem andar, só com apoio ou implante.'], remocao: SAIDA_DE_MEMBRO },
  { id: 'perda-olho', titulo: 'Perda de um Olho', categoria: 'física', grupo: 'Membros e sentidos perdidos', permanente: true, duracao: 'Permanente.', efeitos: ['-2 em ataques à distância e em Percepção que dependa de visão.', 'Perder o segundo olho vira Cegueira Permanente.'], remocao: SAIDA_DE_MEMBRO },
  { id: 'cegueira-permanente', titulo: 'Cegueira Permanente', categoria: 'física', grupo: 'Membros e sentidos perdidos', permanente: true, duracao: 'Permanente.', efeitos: ['Vale tudo que a condição Cego já faz: desvantagem em testes que dependam de visão, e ataques contra você recebem +2 se o atacante puder vê-lo.', 'Audição, tato e memória do lugar passam a guiar o personagem. Combinem com o Mestre o que ele consegue fazer sem ver.'], remocao: SAIDA_DE_MEMBRO },
  { id: 'perda-ouvido', titulo: 'Perda de um Ouvido', categoria: 'física', grupo: 'Membros e sentidos perdidos', permanente: true, duracao: 'Permanente.', efeitos: ['Desvantagem em Percepção que dependa de som.', 'Perder o segundo ouvido vira Surdez Permanente.'], remocao: SAIDA_DE_MEMBRO },
  { id: 'surdez-permanente', titulo: 'Surdez Permanente', categoria: 'física', grupo: 'Membros e sentidos perdidos', permanente: true, duracao: 'Permanente.', efeitos: ['Vale tudo que a condição Surdo já faz: falha automaticamente em Percepção que dependa de som, não recebe ordens faladas e não ouve ataques vindos de fora do campo de visão.', 'Leitura labial, escrita e sinais continuam funcionando. Combinem com a mesa como o personagem se comunica.'], remocao: SAIDA_DE_MEMBRO },
  { id: 'mudez', titulo: 'Perda da Voz', categoria: 'física', grupo: 'Membros e sentidos perdidos', permanente: true, duracao: 'Permanente.', efeitos: ['Não fala: sem componente verbal em magia e sem persuasão falada.', 'Escrita e gestos continuam funcionando.'], remocao: 'Regeneração de um Fluxo que cite a voz. O Mestre decide se a Laringe Sintética Camaleão devolve a fala.' },

  // Sequelas do corpo: o que fica depois que a lesão passou.
  { id: 'dor-cronica', titulo: 'Dor Crônica', categoria: 'física', grupo: 'Sequelas do corpo', permanente: true, duracao: 'Permanente.', efeitos: ['No começo de cada cena de esforço, Fortitude DT 12 ou o primeiro teste físico da cena sofre desvantagem.', 'Existem dias melhores: o Mestre pode dispensar o teste numa cena tranquila.'], remocao: 'Cura DT 18 ao longo de um arco baixa a DT para 10. Só cura de Fluxo explícita ou resolução na história encerra.' },
  { id: 'tremor-nas-maos', titulo: 'Tremor nas Mãos', categoria: 'física', grupo: 'Sequelas do corpo', permanente: true, duracao: 'Permanente.', efeitos: ['Desvantagem em Ladinagem, Pontaria e ofícios de precisão.', 'Respirar fundo e apoiar o braço permite repetir um teste de precisão por cena.'], remocao: 'Tratamento com Cura DT 18 ao longo de um arco reduz o efeito a -2. Só cura de Fluxo explícita ou implante encerra.' },
  { id: 'manqueira', titulo: 'Manqueira', categoria: 'física', grupo: 'Sequelas do corpo', permanente: true, duracao: 'Permanente.', efeitos: ['Desvantagem em Acrobacia e em Atletismo para saltar.', 'Em perseguição a pé, o teste oposto sofre -2.'], remocao: 'Cirurgia de Cura DT 20 pode corrigir a perna, ao custo de 3 descansos de recuperação. Implante ou Regeneração também encerram.' },
  { id: 'pulmoes-danificados', titulo: 'Pulmões Danificados', categoria: 'física', grupo: 'Sequelas do corpo', permanente: true, duracao: 'Permanente.', efeitos: ['Desvantagem em Fortitude contra fumaça, gases e afogamento.', 'Esforço longo, como correr ou nadar por uma cena, exige Fortitude DT 12 ou +1 Cansaço.'], remocao: 'Só cura de Fluxo explícita, implante respiratório ou resolução na história encerra.' },
  { id: 'sensibilidade-luz', titulo: 'Sensibilidade à Luz', categoria: 'física', grupo: 'Sequelas do corpo', permanente: true, duracao: 'Permanente.', efeitos: ['Desvantagem em Percepção sob luz forte.', 'Lentes escuras ou capuz removem a desvantagem, mas o personagem ouve melhor do que vê nesses lugares.'], remocao: 'Tratamento com Cura DT 18 ao longo de um arco reduz a sensibilidade a uma incomodação sem efeito mecânico.' },
  { id: 'cicatriz-marcante', titulo: 'Cicatriz Marcante', categoria: 'física', grupo: 'Sequelas do corpo', permanente: true, duracao: 'Permanente.', efeitos: ['+2 em Intimidação diante de quem a vê e entende o que ela custou.', '-2 em Diplomacia com quem se assusta ou a julga antes de ouvir.', 'O Mestre decide quais cenas contam. A história da marca pertence a quem joga.'], remocao: 'Cirurgia ou magia pode escondê-la. A marca em si fica como parte do personagem.' },

  // Transtornos e traumas: condições mentais de longa duração.
  { id: 'ansiedade', titulo: 'Ansiedade', categoria: 'mental', grupo: 'Transtornos e traumas', permanente: true, duracao: 'Permanente, com altos e baixos.', efeitos: ['No começo de uma cena de tensão (combate, prazo, multidão), Vontade DT 12 ou o primeiro teste da cena sofre desvantagem.', 'Quem já está Abalado perde +1 de Sanidade em cada perda.', 'Quem joga decide como o personagem esconde ou mostra isso.'], remocao: SAIDA_MENTAL_PERMANENTE },
  { id: 'depressao', titulo: 'Depressão', categoria: 'mental', grupo: 'Transtornos e traumas', permanente: true, duracao: 'Permanente, com altos e baixos.', efeitos: ['Descanso completo recupera Sanidade como se a qualidade fosse um degrau abaixo.', 'Desvantagem em Vontade contra desânimo, medo e provocação.', 'Dias melhores existem: uma cena com alguém querido pode dispensar a desvantagem.'], remocao: saidaMentalSemTeste('tira a perda no descanso e deixa só a desvantagem em Vontade') },
  { id: 'estresse-pos-traumatico', titulo: 'Estresse Pós-Traumático', categoria: 'mental', grupo: 'Transtornos e traumas', permanente: true, duracao: 'Permanente.', efeitos: ['Defina com o Mestre um gatilho: um som, um cheiro, uma criatura ou um lugar.', 'Diante do gatilho, Vontade DT 15 ou entre em Pânico ou Dissociação, à escolha de quem joga.', 'Fora do gatilho, o personagem funciona normalmente.'], remocao: SAIDA_MENTAL_PERMANENTE },
  { id: 'ataques-de-panico', titulo: 'Ataques de Pânico', categoria: 'mental', grupo: 'Transtornos e traumas', permanente: true, duracao: 'Permanente.', efeitos: ['Ao perder Sanidade, Vontade DT 12 ou o personagem sofre a crise Pânico por 1d4 rodadas.', 'Respirar com ajuda de um aliado (ação padrão) dá vantagem no teste.'], remocao: SAIDA_MENTAL_PERMANENTE },
  { id: 'insonia', titulo: 'Insônia', categoria: 'mental', grupo: 'Transtornos e traumas', permanente: true, duracao: 'Permanente.', efeitos: ['Descanso completo reduz Cansaço como se a qualidade fosse um degrau abaixo.', 'Desvantagem em Percepção na primeira cena depois de um descanso.'], remocao: saidaMentalSemTeste('tira a desvantagem em Percepção e deixa só o descanso um degrau abaixo') },
  { id: 'pesadelos-recorrentes', titulo: 'Pesadelos Recorrentes', categoria: 'mental', grupo: 'Transtornos e traumas', permanente: true, duracao: 'Permanente.', efeitos: ['Ao fim de cada descanso completo, Vontade DT 12 ou a Sanidade recuperada naquele descanso cai pela metade.', 'Dormir ao lado de alguém de confiança dá vantagem no teste.'], remocao: SAIDA_MENTAL_PERMANENTE },
  { id: 'dissociacao-recorrente', titulo: 'Dissociação Recorrente', categoria: 'mental', grupo: 'Transtornos e traumas', permanente: true, duracao: 'Permanente.', efeitos: ['Em cena de grande tensão, Vontade DT 12 ou o personagem sofre a crise Dissociação por 1d4 rodadas.', 'Um toque firme de um aliado (ação de movimento) encerra a crise sem teste.'], remocao: SAIDA_MENTAL_PERMANENTE },

  // Humor e comportamento: marcas que moldam como o personagem vive.
  { id: 'luto-profundo', titulo: 'Luto Profundo', categoria: 'mental', grupo: 'Humor e comportamento', duracao: 'Até o fim do arco ou até a despedida.', efeitos: ['Desvantagem em Diplomacia e Atuação para animar ou liderar.', 'Ao ouvir o nome de quem se perdeu, Vontade DT 12 ou fique sem reações até o fim do próximo turno.'], remocao: 'Uma cena de despedida na história, ou o apoio de duas cenas de descanso em grupo, encerra a condição.' },
  { id: 'culpa-do-sobrevivente', titulo: 'Culpa do Sobrevivente', categoria: 'mental', grupo: 'Humor e comportamento', permanente: true, duracao: 'Permanente, até uma resolução na história.', efeitos: ['Ao deixar um aliado para trás ou ver alguém cair, Vontade DT 12 ou perca 1d4 de Sanidade.', 'Em troca, o personagem tem +2 em Vontade para salvar alguém que corre risco de verdade.'], remocao: SAIDA_MENTAL_PERMANENTE },
  { id: 'paranoia-persistente', titulo: 'Paranoia Persistente', categoria: 'mental', grupo: 'Humor e comportamento', permanente: true, duracao: 'Permanente.', efeitos: ['Não recebe bônus de ajuda de quem acabou de conhecer.', 'Vontade DT 12 para aceitar cura ou comida de alguém fora do grupo.', 'Vantagem em Intuição contra quem tenta enganá-lo, e desvantagem contra quem diz a verdade.'], remocao: SAIDA_MENTAL_PERMANENTE },
  { id: 'rituais-obsessivos', titulo: 'Rituais Obsessivos', categoria: 'mental', grupo: 'Humor e comportamento', permanente: true, duracao: 'Permanente.', efeitos: ['Antes de uma ação importante, o personagem cumpre um ritual curto que quem joga define, como contar passos ou checar a arma.', 'Sem tempo para o ritual, o primeiro teste da cena sofre -2.'], remocao: saidaMentalSemTeste('reduz o -2 para -1 quando falta tempo para o ritual') },
  { id: 'temperamento-explosivo', titulo: 'Temperamento Explosivo', categoria: 'mental', grupo: 'Humor e comportamento', permanente: true, duracao: 'Permanente.', efeitos: ['Ao sofrer dano ou ouvir provocação grave, Vontade DT 12 ou entre na crise Fúria por 1d4 rodadas.', 'Um aliado que acalma o personagem (ação padrão, Diplomacia DT 12) encerra a crise.'], remocao: SAIDA_MENTAL_PERMANENTE },
  { id: 'dificuldade-de-confiar', titulo: 'Dificuldade de Confiar', categoria: 'mental', grupo: 'Humor e comportamento', permanente: true, duracao: 'Permanente.', efeitos: ['Desvantagem em Diplomacia para pedir ajuda.', 'Quem já provou lealdade ao personagem deixa de contar como estranho, e a desvantagem some com essa pessoa.'], remocao: saidaMentalSemTeste('limita a desvantagem a um pedido de ajuda por cena') },

  // Medos e fobias: cada gatilho pesa de um jeito.
  { id: 'fobia-escuridao', titulo: 'Medo de Escuridão', categoria: 'mental', grupo: 'Medos e fobias', permanente: true, duracao: 'Permanente.', efeitos: ['Em escuridão total ou penumbra pesada, Vontade DT 12 ou fique Amedrontado até haver luz.', 'Dorme mal sem uma luz acesa por perto.'], remocao: saidaDeFobia('o escuro') },
  { id: 'fobia-altura', titulo: 'Medo de Altura', categoria: 'mental', grupo: 'Medos e fobias', permanente: true, duracao: 'Permanente.', efeitos: ['Ao olhar para baixo de um lugar alto, Vontade DT 12 ou fique Amedrontado até descer ou desviar o olhar.', 'Desvantagem em Atletismo para escalar.'], remocao: saidaDeFobia('um lugar alto') },
  { id: 'fobia-fogo', titulo: 'Medo de Fogo', categoria: 'mental', grupo: 'Medos e fobias', permanente: true, duracao: 'Permanente.', efeitos: ['Diante de chamas grandes, Vontade DT 12 ou o personagem se afasta pelo caminho mais curto.', 'Desvantagem em Fortitude contra fogo, porque o medo atrapalha a reação.'], remocao: saidaDeFobia('o fogo') },
  { id: 'fobia-agua-funda', titulo: 'Medo de Água Funda', categoria: 'mental', grupo: 'Medos e fobias', permanente: true, duracao: 'Permanente.', efeitos: ['Em água onde não alcança o fundo, Vontade DT 12 ou fique Amedrontado até sair.', 'Desvantagem em Atletismo para nadar.'], remocao: saidaDeFobia('a água funda') },
  { id: 'fobia-espacos-fechados', titulo: 'Claustrofobia', categoria: 'mental', grupo: 'Medos e fobias', permanente: true, duracao: 'Permanente.', efeitos: ['Em lugar apertado ou sem saída à vista, Vontade DT 12 ou o personagem sofre -2 em tudo até ver uma saída.', 'Portas trancadas pesam mais: a DT sobe 2.'], remocao: saidaDeFobia('um espaço fechado') },
  { id: 'fobia-sangue', titulo: 'Medo de Sangue', categoria: 'mental', grupo: 'Medos e fobias', permanente: true, duracao: 'Permanente.', efeitos: ['Ao ver sangue em quantidade, Vontade DT 12 ou fique Atordoado até o fim do próximo turno.', 'Desvantagem em Cura em quem sangra.'], remocao: saidaDeFobia('o sangue') },
  { id: 'fobia-multidoes', titulo: 'Medo de Multidões', categoria: 'mental', grupo: 'Medos e fobias', permanente: true, duracao: 'Permanente.', efeitos: ['No meio de muita gente, Vontade DT 12 ou o primeiro teste da cena sofre desvantagem.', 'Desvantagem em Furtividade para se misturar à multidão.'], remocao: saidaDeFobia('uma multidão') },
];
