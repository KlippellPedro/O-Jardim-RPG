export type AcaoVeicular = 'livre' | 'movimento' | 'padrão' | 'reação' | 'resolução da rodada';
export type PericiaConducao = 'Pilotagem' | 'Cavalgar';
export type FaixaPerseguicaoId = 'contato' | 'curta' | 'média' | 'longa' | 'escapou';
export type TamanhoColisao = 'pequeno' | 'médio' | 'grande' | 'enorme' | 'colossal';
export type EstadoVeiculo = 'operacional' | 'danificado' | 'incapacitado';
export type CoberturaOcupantes = 'nenhuma' | 'parcial' | 'total';
export type TierVeiculo = 'T0' | 'T1' | 'T2' | 'T3' | 'T4';

export interface IFichaVeicular {
  nome: string;
  categoria: string;
  tamanho: TamanhoColisao;
  vidaMaxima: number;
  vidaAtual: number;
  defesa: number;
  resistencia: number;
  resistenciasPorTipo: Record<string, number>;
  deslocamentoMetros: number;
  manobrabilidade: number;
  capacidade: number;
  coberturaOcupantes: CoberturaOcupantes;
  tripulacaoMinima: number;
  sistemasAtivosMaximos: number;
  espacosBase: number;
  armas: string[];
  sistemas: string[];
  avarias: AvariaVeiculoId[];
}

export interface IFaixaPerseguicao {
  id: FaixaPerseguicaoId;
  ordem: number;
  descricao: string;
  permiteColisao: boolean;
  permiteAbordagem: boolean;
}

export interface IManobraVeicular {
  id: string;
  titulo: string;
  acao: AcaoVeicular;
  teste: string;
  faixas?: FaixaPerseguicaoId[];
  efeito: string;
  falha: string;
}

export interface IPapelTripulacao {
  id: 'condutor' | 'artilheiro' | 'operador' | 'passageiro';
  funcao: string;
  regra: string;
}

export type AvariaVeiculoId =
  | 'controles'
  | 'propulsao'
  | 'armamento'
  | 'defesas'
  | 'nucleo'
  | 'casco';

export interface IAvariaVeiculo {
  id: AvariaVeiculoId;
  d6: number;
  titulo: string;
  efeito: string;
  repeticao: string;
}

export interface IRegraTierVeiculo {
  tier: TierVeiculo;
  acesso: string;
  uso: string;
}

export interface IResultadoDanoVeiculo {
  danoRecebido: number;
  vidaAtual: number;
  estado: EstadoVeiculo;
  avariasGeradas: number;
}

export interface IRegraVeiculos {
  categoria: 'Combate e Mecânicas';
  status: string;
  resumo: string;
  destaques: string[][];
  corpo: string;
}

export const FAIXAS_PERSEGUICAO: readonly IFaixaPerseguicao[] = [
  {
    id: 'contato', ordem: 0, descricao: 'Até 1,5 m. Permite colisão e abordagem.',
    permiteColisao: true, permiteAbordagem: true,
  },
  {
    id: 'curta', ordem: 1, descricao: 'Até 5 m. Use a faixa Curto das regras de distância.',
    permiteColisao: false, permiteAbordagem: false,
  },
  {
    id: 'média', ordem: 2, descricao: 'Até 15 m. Use a faixa Médio das regras de distância.',
    permiteColisao: false, permiteAbordagem: false,
  },
  {
    id: 'longa', ordem: 3, descricao: 'Até 25 m. Use a faixa Longo das regras de distância.',
    permiteColisao: false, permiteAbordagem: false,
  },
  {
    id: 'escapou', ordem: 4, descricao: 'O alvo saiu da perseguição e não pode ser alcançado nesta cena.',
    permiteColisao: false, permiteAbordagem: false,
  },
] as const;

export const PAPEIS_TRIPULACAO: readonly IPapelTripulacao[] = [
  {
    id: 'condutor',
    funcao: 'Move o veículo e executa manobras com Pilotagem. Em montaria, usa Cavalgar.',
    regra: 'O veículo precisa de um condutor para mudar direção ou velocidade durante combate e perseguição.',
  },
  {
    id: 'artilheiro',
    funcao: 'Opera uma arma instalada e faz os ataques exigidos por ela.',
    regra: 'Cada ataque consome a ação do artilheiro. A arma não concede uma ação adicional ao veículo.',
  },
  {
    id: 'operador',
    funcao: 'Ativa sensores, escudos, comunicações e outros sistemas.',
    regra: 'O sistema informa a ação e o teste necessários. Sistemas ativos respeitam o limite do Núcleo.',
  },
  {
    id: 'passageiro',
    funcao: 'Age normalmente e pode usar equipamentos que não façam parte do veículo.',
    regra: 'Atacar de um veículo em movimento segue as regras de alcance e cobertura.',
  },
] as const;

export const MANOBRAS_VEICULARES: readonly IManobraVeicular[] = [
  {
    id: 'conduzir',
    titulo: 'Conduzir',
    acao: 'movimento',
    teste: 'Sem teste em condições normais; Pilotagem ou Cavalgar DT 15 sob perigo, salvo DT expressa da fonte.',
    efeito: 'Mova até o deslocamento e altere a direção do veículo ou da montaria.',
    falha: 'O veículo mantém o curso anterior e o condutor não executa outra manobra neste turno.',
  },
  {
    id: 'acelerar',
    titulo: 'Acelerar',
    acao: 'padrão',
    teste: 'Pilotagem ou Cavalgar, DT 15.',
    efeito: 'Mova metade do deslocamento adicional ou receba vantagem no próximo teste de perseguição desta rodada.',
    falha: 'Não recebe o benefício e sofre −2 de Defesa até o início do próximo turno do condutor.',
  },
  {
    id: 'evasao',
    titulo: 'Evasão',
    acao: 'padrão',
    teste: 'Pilotagem ou Cavalgar, DT 15.',
    efeito: 'Receba +2 de Defesa até o início do próximo turno do condutor.',
    falha: 'Sofra −2 de Defesa pelo mesmo período.',
  },
  {
    id: 'fechar-passagem',
    titulo: 'Fechar passagem',
    acao: 'padrão',
    teste: 'Teste oposto de Pilotagem ou Cavalgar.',
    faixas: ['contato', 'curta'],
    efeito: 'O alvo não pode aumentar a distância na resolução desta rodada.',
    falha: 'O alvo recebe vantagem no teste de perseguição desta rodada.',
  },
  {
    id: 'abalroar',
    titulo: 'Abalroar',
    acao: 'padrão',
    teste: 'Pilotagem ou Cavalgar contra a Defesa do veículo ou os Reflexos da criatura.',
    faixas: ['contato'],
    efeito: 'Aplique a colisão aos dois envolvidos. O condutor escolhe encerrar ou manter o Contato.',
    falha: 'O alvo não sofre dano. O atacante sofre −2 de Defesa até o início do próximo turno do condutor.',
  },
  {
    id: 'abordar',
    titulo: 'Preparar abordagem',
    acao: 'padrão',
    teste: 'Teste oposto de Pilotagem ou Cavalgar.',
    faixas: ['contato'],
    efeito: 'Mantenha o Contato até o início do próximo turno do condutor. A travessia usa o movimento de cada ocupante.',
    falha: 'A distância muda para Curta.',
  },
  {
    id: 'recuperar-controle',
    titulo: 'Recuperar controle',
    acao: 'movimento',
    teste: 'Pilotagem ou Cavalgar, DT 15.',
    efeito: 'Remova a perda de controle e escolha a direção do movimento restante.',
    falha: 'O veículo mantém direção e velocidade até o próximo turno do condutor.',
  },
] as const;

export const DANO_COLISAO_POR_TAMANHO: Readonly<Record<TamanhoColisao, string>> = {
  pequeno: '1d6',
  médio: '2d6',
  grande: '4d6',
  enorme: '6d6',
  colossal: '8d6',
};

export const AVARIAS_VEICULO: readonly IAvariaVeiculo[] = [
  {
    id: 'controles', d6: 1, titulo: 'Controles',
    efeito: 'Desvantagem em Pilotagem até o reparo.',
    repeticao: 'O veículo perde o controle e precisa da manobra Recuperar controle.',
  },
  {
    id: 'propulsao', d6: 2, titulo: 'Propulsão',
    efeito: 'Reduza o deslocamento à metade até o reparo.',
    repeticao: 'O veículo não pode se mover por propulsão própria.',
  },
  {
    id: 'armamento', d6: 3, titulo: 'Armamento',
    efeito: 'Uma arma instalada, escolhida aleatoriamente, fica inoperante.',
    repeticao: 'Outra arma instalada fica inoperante. Sem outra arma, repita a rolagem de avaria.',
  },
  {
    id: 'defesas', d6: 4, titulo: 'Defesas',
    efeito: 'Sofra −2 de Defesa até o reparo.',
    repeticao: 'Reduza a Resistência em 2, mínimo 0, até o reparo.',
  },
  {
    id: 'nucleo', d6: 5, titulo: 'Núcleo',
    efeito: 'Um sistema ativo, escolhido aleatoriamente, é desligado.',
    repeticao: 'Reduza em 1 o limite de sistemas ativos, mínimo 0, até o reparo.',
  },
  {
    id: 'casco', d6: 6, titulo: 'Casco',
    efeito: 'A cobertura dos ocupantes cai um grau: total para parcial ou parcial para nenhuma.',
    repeticao: 'O próximo dano recebido ignora a Resistência; depois, remova esta repetição.',
  },
] as const;

export const PATAMARES_TIER_VEICULO: readonly IRegraTierVeiculo[] = [
  { tier: 'T0', acesso: 'Base', uso: 'Chassi ou sistema sem melhoria.' },
  { tier: 'T1', acesso: 'Regular', uso: 'Primeiro patamar funcional do componente.' },
  { tier: 'T2', acesso: 'Avançado', uso: 'Componente especializado.' },
  { tier: 'T3', acesso: 'Superior', uso: 'Componente de alto desempenho.' },
  { tier: 'T4', acesso: 'Restrito', uso: 'Exige liberação do Mestre e descrição completa do componente.' },
] as const;

export const MAX_PASSOS_POR_DISPUTA = 2;
export const MAX_AVARIAS_ATIVAS = AVARIAS_VEICULO.length;

export function obterFaixaPerseguicao(id: FaixaPerseguicaoId): IFaixaPerseguicao {
  const faixa = FAIXAS_PERSEGUICAO.find(item => item.id === id);
  if (!faixa) throw new Error(`Faixa de perseguição inválida: ${id}`);
  return faixa;
}

export function deslocarFaixaPerseguicao(
  atual: FaixaPerseguicaoId,
  passos: number,
): FaixaPerseguicaoId {
  if (atual === 'escapou') return atual;
  const ordemAtual = obterFaixaPerseguicao(atual).ordem;
  const limite = FAIXAS_PERSEGUICAO.length - 1;
  const ordemNova = Math.max(0, Math.min(limite, ordemAtual + Math.trunc(passos)));
  return FAIXAS_PERSEGUICAO[ordemNova].id;
}

export function resolverDisputaPerseguicao(
  atual: FaixaPerseguicaoId,
  resultadoFugitivo: number,
  resultadoPerseguidor: number,
): FaixaPerseguicaoId {
  if (atual === 'escapou' || resultadoFugitivo === resultadoPerseguidor) return atual;
  const margem = Math.abs(resultadoFugitivo - resultadoPerseguidor);
  const passos = margem >= 10 ? MAX_PASSOS_POR_DISPUTA : 1;
  return deslocarFaixaPerseguicao(atual, resultadoFugitivo > resultadoPerseguidor ? passos : -passos);
}

export function calcularDanoAposResistencia(dano: number, resistencia: number): number {
  if (!Number.isFinite(dano) || !Number.isFinite(resistencia)) {
    throw new Error('Dano e Resistência devem ser números finitos.');
  }
  return Math.max(0, Math.trunc(dano) - Math.max(0, Math.trunc(resistencia)));
}

export function obterEstadoVeiculo(vidaAtual: number, vidaMaxima: number): EstadoVeiculo {
  if (!Number.isFinite(vidaAtual) || !Number.isFinite(vidaMaxima) || vidaMaxima <= 0) {
    throw new Error('A Vida máxima deve ser positiva e os valores de Vida devem ser finitos.');
  }
  if (vidaAtual <= 0) return 'incapacitado';
  if (vidaAtual <= vidaMaxima / 2) return 'danificado';
  return 'operacional';
}

export function aplicarDanoVeiculo(
  vidaAtual: number,
  vidaMaxima: number,
  dano: number,
  resistencia: number,
): IResultadoDanoVeiculo {
  const estadoAnterior = obterEstadoVeiculo(vidaAtual, vidaMaxima);
  const danoRecebido = calcularDanoAposResistencia(dano, resistencia);
  const novaVida = Math.max(0, Math.min(vidaMaxima, vidaAtual - danoRecebido));
  const estado = obterEstadoVeiculo(novaVida, vidaMaxima);
  const cruzouMetade = estadoAnterior === 'operacional' && estado !== 'operacional';
  const chegouAZero = estadoAnterior !== 'incapacitado' && estado === 'incapacitado';
  return {
    danoRecebido,
    vidaAtual: novaVida,
    estado,
    avariasGeradas: Number(cruzouMetade) + Number(chegouAZero),
  };
}

export function calcularVidaRestauradaPorManutencao(vidaMaxima: number): number {
  if (!Number.isFinite(vidaMaxima) || vidaMaxima <= 0) {
    throw new Error('A Vida máxima deve ser um número positivo.');
  }
  return Math.max(1, Math.floor(vidaMaxima * 0.1));
}

const tabelaFaixas = FAIXAS_PERSEGUICAO.map(faixa => `
  <tr><td><strong>${faixa.id === 'escapou' ? 'Escapou' : faixa.id[0].toUpperCase() + faixa.id.slice(1)}</strong></td><td>${faixa.descricao}</td></tr>
`).join('');

const tabelaManobras = MANOBRAS_VEICULARES.map(manobra => `
  <tr><td><strong>${manobra.titulo}</strong><br><small>Ação ${manobra.acao}</small></td><td>${manobra.teste}</td><td>${manobra.efeito}</td><td>${manobra.falha}</td></tr>
`).join('');

const tabelaAvarias = AVARIAS_VEICULO.map(avaria => `
  <tr><td>${avaria.d6}</td><td><strong>${avaria.titulo}</strong></td><td>${avaria.efeito}</td><td>${avaria.repeticao}</td></tr>
`).join('');

const tabelaTiers = PATAMARES_TIER_VEICULO.map(item => `
  <tr><td><strong>${item.tier}</strong></td><td>${item.acesso}</td><td>${item.uso}</td></tr>
`).join('');

export const REGRA_VEICULOS: IRegraVeiculos = {
  categoria: 'Combate e Mecânicas',
  status: 'Regra oficial',
  resumo: 'Regras de condução, perseguição, combate, colisão, avarias, reparo e montarias.',
  destaques: [
    ['Escala', 'Vida e dano universais'],
    ['Condução', 'Pilotagem ou Cavalgar'],
    ['Perseguição', '5 faixas'],
  ],
  corpo: `
    <h3 class="regras-subtitle">Ficha veicular</h3>
    <p>Registre categoria, tamanho, Vida, Defesa, Resistência geral, resistências por tipo, deslocamento em metros, Manobrabilidade, capacidade, cobertura, tripulação mínima, sistemas, espaços de base, armas e avarias. O chassi genérico começa com Vida 10, Defesa 10, Resistência 0, deslocamento 4,5 m, Manobrabilidade 0, cobertura nenhuma, tripulação mínima 1 e nenhum espaço de base. Valores publicados no veículo prevalecem.</p>

    <h3 class="regras-subtitle">Escala de Vida e dano</h3>
    <ul class="regras-list">
      <li>Veículos, montarias, personagens e criaturas usam a mesma escala de Vida e dano.</li>
      <li>Role o dano indicado pela arma. Subtraia a Resistência geral e a resistência específica ao tipo do dano. O restante reduz a Vida.</li>
      <li>Não multiplique dano por causa do tipo do alvo. Uma arma precisa informar dados, bônus, tipo, alcance e crítico antes de entrar em combate.</li>
      <li>O valor antigo chamado Dano nas peças veiculares indica o patamar da arma. Ele não é dano fixo e não substitui a fórmula de dano da arma.</li>
    </ul>

    <h3 class="regras-subtitle">Condução e tripulação</h3>
    <ul class="regras-list">
      <li>Veículos usam <strong>Pilotagem</strong>. Montarias usam <strong>Cavalgar</strong>. Adestramento pode acalmar ou ensinar uma montaria, mas não substitui Cavalgar durante uma manobra.</li>
      <li>Qualquer personagem treinado na perícia adequada pode conduzir. A classe Piloto concede benefícios próprios, mas não é pré-requisito para comprar ou conduzir um veículo.</li>
      <li>Um personagem sem treinamento pode conduzir em situação rotineira. Sob pressão, faz o teste com desvantagem e não pode Acelerar, usar Evasão, Fechar passagem, Abalroar nem Preparar abordagem.</li>
      <li>Some a Manobrabilidade da ficha aos testes de Pilotagem feitos com o veículo. Uma montaria só altera Cavalgar quando sua ficha declarar um modificador.</li>
      <li>O veículo não recebe ações próprias. Condutor, artilheiros, operadores e passageiros gastam as ações dos próprios turnos.</li>
    </ul>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Papel</th><th>Função</th><th>Regra</th></tr></thead>
      <tbody>${PAPEIS_TRIPULACAO.map(papel => `<tr><td><strong>${papel.id[0].toUpperCase() + papel.id.slice(1)}</strong></td><td>${papel.funcao}</td><td>${papel.regra}</td></tr>`).join('')}</tbody>
    </table></div>

    <h3 class="regras-subtitle">Turno veicular</h3>
    <ul class="regras-list">
      <li>Todos rolam Iniciativa normalmente. O movimento do veículo ocorre no turno do condutor.</li>
      <li>Conduzir custa uma Ação de Movimento. Sem essa ação, o veículo mantém curso e velocidade; parado, permanece parado.</li>
      <li>Cada arma ou sistema é usado por um tripulante. Uma mesma pessoa pode ocupar mais de um papel, mas não recebe ações adicionais.</li>
      <li>A tripulação mínima indica quantas pessoas são necessárias para preencher os postos obrigatórios. Sem condutor, o veículo não manobra; sem operador ou artilheiro, o respectivo sistema não é usado.</li>
      <li>Uma arma instalada só ataca mais de uma vez no turno quando sua descrição permitir.</li>
    </ul>

    <h3 class="regras-subtitle">Perseguições</h3>
    <p>No fim de cada rodada, o fugitivo e o perseguidor fazem um teste oposto de Pilotagem ou Cavalgar. Quem tiver o maior deslocamento recebe +2 nesse teste. O fugitivo aumenta a distância quando vence; o perseguidor reduz quando vence. Empate mantém a faixa. Uma diferença de 10 ou mais altera duas faixas; qualquer outra vitória altera uma. Nenhum resultado altera mais de duas faixas.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Faixa</th><th>Efeito</th></tr></thead><tbody>${tabelaFaixas}</tbody>
    </table></div>
    <p class="regras-note">Terreno, clima, avarias e manobras podem conceder vantagem ou desvantagem. Se mais de um veículo persegue o mesmo alvo, cada perseguidor mantém sua própria faixa.</p>

    <h3 class="regras-subtitle">Manobras</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Manobra</th><th>Teste</th><th>Sucesso</th><th>Falha</th></tr></thead><tbody>${tabelaManobras}</tbody>
    </table></div>

    <h3 class="regras-subtitle">Ataques e ocupantes</h3>
    <ul class="regras-list">
      <li>Armas instaladas usam Pontaria, salvo indicação diferente. O ataque é feito contra a Defesa do alvo e segue alcance, crítico e Resistência normais.</li>
      <li>Um ataque localizado contra um sistema sofre −5. Se for crítico e causar pelo menos 1 de dano depois da Resistência, gera uma avaria escolhida pelo atacante. Se o mesmo ataque cruzar um limite de Vida, escolha essa avaria em vez de rolar outra.</li>
      <li>Ocupante sem cobertura pode ser alvo normalmente. Cobertura parcial concede +2 de Defesa. Cobertura total impede ataque direto enquanto o ocupante permanecer protegido.</li>
      <li>Dano causado ao veículo não atinge os ocupantes, salvo quando o efeito declarar área, invasão da cabine ou dano aos ocupantes.</li>
    </ul>

    <h3 class="regras-subtitle">Colisões</h3>
    <ul class="regras-list">
      <li>Abalroar exige a faixa Contato. Colidir com obstáculo imóvel não exige ataque quando não houver como evitá-lo.</li>
      <li>Cada envolvido sofre o dano correspondente ao tamanho do outro. Role separadamente e aplique Resistência.</li>
      <li>Velocidade não altera os dados da tabela. Uma manobra, queda ou perigo só altera o dano quando sua própria regra informar os novos dados.</li>
      <li>Ocupante sem fixação faz Reflexos DT 15. Em falha, sofre metade do dano causado ao veículo, arredondado para baixo. Cinto, sela ou fixação adequada concede vantagem.</li>
    </ul>
    <dl class="regras-kv regras-kv--boxed">
      ${Object.entries(DANO_COLISAO_POR_TAMANHO).map(([tamanho, dano]) => `<dt>${tamanho[0].toUpperCase() + tamanho.slice(1)}</dt><dd>${dano}</dd>`).join('')}
    </dl>

    <h3 class="regras-subtitle">Dano e avarias</h3>
    <ul class="regras-list">
      <li>Ao passar de mais da metade da Vida para metade ou menos, role uma avaria.</li>
      <li>Ao chegar a 0 de Vida, o veículo fica incapacitado e sofre outra avaria. Ele não usa Morrendo.</li>
      <li>Dano não reduz a Vida abaixo de 0. O veículo permanece Incapacitado até ser reparado. Só um efeito que declare destruição pode torná-lo irrecuperável.</li>
      <li>Uma avaria repetida aplica o efeito indicado na última coluna. Um veículo mantém no máximo seis tipos de avaria ativos.</li>
    </ul>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>d6</th><th>Avaria</th><th>Efeito</th><th>Repetição</th></tr></thead><tbody>${tabelaAvarias}</tbody>
    </table></div>

    <h3 class="regras-subtitle">Reparo</h3>
    <ul class="regras-list">
      <li><strong>Reparo emergencial:</strong> adjacente ao componente, ferramentas adequadas, Ação Padrão e Tecnologia ou Ofício apropriado contra DT 15. Sucesso suspende uma avaria até o fim da cena. Cada avaria aceita uma tentativa por cena.</li>
      <li><strong>Manutenção:</strong> seis horas, ferramentas, local de trabalho e materiais no valor de 10% do preço do veículo. Faça Tecnologia ou Ofício apropriado contra DT 10 + número de avarias ativas. Sucesso remove uma avaria e restaura 10% da Vida máxima, arredondado para baixo, mínimo 1.</li>
      <li>Um veículo incapacitado volta a operar quando fica com pelo menos 1 de Vida e remove ao menos uma avaria adquirida ao chegar a 0.</li>
      <li>Habilidades, oficinas e sistemas de reparo que indiquem outro tempo ou valor substituem esta regra.</li>
    </ul>

    <h3 class="regras-subtitle">Montarias</h3>
    <ul class="regras-list">
      <li>A montaria mantém sua própria Vida, Defesa, Resistências e condições. Ela não recebe avarias veiculares.</li>
      <li>Montaria treinada age na Iniciativa do cavaleiro. O cavaleiro gasta sua Ação de Movimento para conduzi-la. Atacar com a montaria gasta a Ação Padrão do cavaleiro.</li>
      <li>Montaria inteligente que age sem comando mantém sua própria Iniciativa e ações. O cavaleiro não controla as decisões dela com Cavalgar.</li>
      <li>Montaria terrestre respeita terreno e espaço. Montaria voadora precisa manter o deslocamento exigido por sua ficha; se perder o controle, começa a cair até recuperar o controle ou pousar.</li>
      <li>Montaria e cavaleiro são alvos separados. O cavaleiro recebe cobertura apenas quando a anatomia ou o equipamento da montaria declarar isso.</li>
    </ul>

    <h3 class="regras-subtitle">Tiers dos componentes</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Tier</th><th>Acesso</th><th>Uso</th></tr></thead><tbody>${tabelaTiers}</tbody>
    </table></div>
    <ul class="regras-list">
      <li>Núcleo define sistemas ativos; Estrutura ajusta deslocamento e Resistência; Armas precisam de perfil completo; Utilidades aplicam o efeito descrito.</li>
      <li>Os preços existentes permanecem no catálogo. Esta regra não cria preço para T4 nem altera preços publicados.</li>
      <li>Deslocamento escrito em metros no veículo completo prevalece sobre índices antigos de chassi ou componente.</li>
    </ul>
  `,
};
