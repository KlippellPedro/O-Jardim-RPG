import { api } from './apiClient';
import type { TabelaDeLoot } from './sessaoApi';
import type { IGrade } from '../pages/Mapa/motor/geometria';

export type LadoToken = 'jogador' | 'aliado' | 'inimigo' | 'neutro';
export type TipoBarra = 'vida' | 'mana' | 'estamina' | 'sanidade';
export type ParaQuem = 'todos' | 'dono' | 'ninguem';
export type CamadaMapaId = 'mapa' | 'props' | 'montarias' | 'personagens' | 'anotacoes';
export type CamadaTokenId = Exclude<CamadaMapaId, 'mapa' | 'anotacoes'>;
export type FonteAnotacao = 'sans' | 'serif' | 'fantasia' | 'mono';

export interface IAnotacaoMapa {
  id: string;
  texto: string;
  x: number;
  y: number;
  fonte: FonteAnotacao;
  tamanho: number;
  cor: string;
  fundo: string;
  placa: boolean;
  /** Nota secreta: só o Mestre recebe. */
  secreta?: boolean;
}

export interface IPermissoesMesa {
  mover_tokens: boolean;
  usar_ping: boolean;
  usar_regua: boolean;
  usar_magia: boolean;
  camadas: Record<CamadaMapaId, boolean>;
}

/** Barra com número (degrau total) ou só o estado da Vida (degrau parcial da Sessão). */
export interface IBarraToken {
  tipo: TipoBarra;
  atual?: number;
  maximo?: number;
  rotulo?: string;
  fracao?: number;
}

/** Luz que o token carrega: raio em casas, cor e se tremula como chama. */
/** Aura presa ao token, em casas. A escondida (`visivel: false`) só chega a quem comanda e ao dono. */
export interface IAuraToken {
  raio: number;
  cor: string;
  visivel: boolean;
}

export interface IRelogioMesa {
  id: string;
  nome: string;
  partes: number;
  cheias: number;
  visivel: boolean;
}

export interface ICronometroMesa {
  nome: string;
  /** Hora do fim (ms, relógio do servidor) quando está correndo. */
  fim: number | null;
  /** Tempo que falta (ms) quando está parado. */
  restante: number | null;
  visivel: boolean;
}

/** Pausa, relógios e cronômetro da campanha (plataforma/core/mesa_extras.py). */
export interface IMesaExtras {
  pausa: { ligada: boolean; texto: string };
  relogios: IRelogioMesa[];
  cronometro: ICronometroMesa | null;
}

/** Onde a tela abre a cena: centro e zoom. */
export interface IVistaCena {
  x: number;
  y: number;
  zoom: number;
}

export interface ILuzToken {
  raio: number;
  cor: string;
  tremula: boolean;
}

export type FormaMagia = 'circulo' | 'cone' | 'linha' | 'impacto';

/** Efeito de magia jogado no mapa: passa pelo tempo real e some sozinho. */
export interface IMagiaMapa {
  forma: FormaMagia;
  fluxo: string;
  /** Origem (de onde sai, ou o centro do círculo). */
  x: number;
  y: number;
  /** Alvo (até onde vai, ou a borda do círculo). */
  ax: number;
  ay: number;
}

export interface IConfigBarras {
  mostrar: TipoBarra[];
  para: ParaQuem;
}

/** Uma linha do que saiu de um baú (ou caixote, bolsa). `chance` e `rolagem` só chegam ao Mestre. */
export interface ILinhaRecipiente {
  linha: string;
  tipo: 'item' | 'moedas';
  titulo: string;
  raridade?: string | null;
  quantidade: number;
  /** Nome de quem já pegou; nulo enquanto está lá. */
  entregue_para: string | null;
  chance?: number;
  rolagem?: number;
}

/** Token que guarda itens. Antes de aberto, a mesa só sabe o rótulo; a tabela e as chances são do Mestre. */
export interface IRecipienteToken {
  rotulo: string;
  trancado: boolean;
  aberto: boolean;
  linhas: ILinhaRecipiente[];
  esvaziado: boolean;
  aberto_por: string | null;
  /** Só o Mestre. */
  predefinicao?: string | null;
  itens_na_tabela?: number;
}

export interface IPredefinicaoRecipiente {
  id: string;
  rotulo: string;
  descricao: string;
}

export interface IEdicaoRecipiente {
  rotulo?: string;
  predefinicao?: string;
  tabela?: { itens: Array<{ item_id: string; chance: number; quantidade: string }>; moedas: { moeda: 'Lunaris' | 'Solares'; dados: string; chance: number } | null };
  trancado?: boolean;
  reiniciar?: boolean;
  remover?: boolean;
}

export interface ITokenMapa {
  id: string;
  x: number;
  y: number;
  porte: number;
  lado: LadoToken;
  camada?: CamadaTokenId;
  flip_x?: boolean;
  flip_y?: boolean;
  nome: string;
  /** Versão do retrato (entra no endereço da imagem) ou null quando não há retrato para quem olha. */
  imagem: string | null;
  /** Nível do personagem: escolhe a moldura. */
  nivel: number | null;
  barras: IBarraToken[];
  condicoes: string[];
  /** Moldura já resolvida (mesa, token, personagem ou padrão); ver motor/molduras.ts. */
  moldura: string;
  /** Zoom e deslocamento da foto da ficha dentro do círculo. */
  enquadramento: { zoom: number; x: number; y: number };
  /** Tocha, lanterna ou luz mágica; null sem luz própria. */
  luz: ILuzToken | null;
  aura?: IAuraToken | null;
  e_meu: boolean;
  pode_mover: boolean;
  desconhecido: boolean;
  /** Baú, caixote ou bolsa: o token guarda itens que os jogadores podem abrir. */
  recipiente?: IRecipienteToken;
  /** Só para o dono e o Mestre. */
  config_barras?: IConfigBarras;
  /** Só para o Mestre. */
  oculto?: boolean;
  participante_id?: string | null;
  personagem_id?: string | null;
  imagem_id?: string | null;
  visibilidade?: string | null;
  /** Só o Mestre recebe: descrição e lembretes que os jogadores nunca veem. */
  nota_mestre?: string;
}

export interface IMapaDaCena {
  id: string;
  nome: string;
  largura: number;
  altura: number;
  ladrilho: number;
  chaves: string[];
}

export interface IResumoCena {
  id: string;
  nome: string;
  ativa: boolean;
  versao: number;
}

export type OperacaoNevoa = 'revelar' | 'esconder';

/** Uma forma da névoa, como o servidor guarda (plataforma/core/nevoa.py). */
export type IFormaNevoa =
  | { op: OperacaoNevoa; tipo: 'retangulo'; x: number; y: number; w: number; h: number }
  | { op: OperacaoNevoa; tipo: 'poligono'; pontos: number[][] }
  | { op: OperacaoNevoa; tipo: 'pincel'; raio: number; pontos: number[][] };

export interface INevoa {
  ligada: boolean;
  /** O servidor calcula linha de visão e memória por jogador. */
  visao_pelas_paredes?: boolean;
  /** As células exploradas permanecem escuras enquanto não estão à vista agora. */
  personalizada?: boolean;
  /** Em ordem: a última forma que contém um ponto decide se ele está à vista. */
  formas: IFormaNevoa[];
  /** Máscara de memória individual; ausente no modo normal de névoa. */
  exploradas?: IFormaNevoa[];
  /** Só para o jogador com a névoa ligada: os pedaços do mapa que ele pode baixar. */
  ladrilhos: string[] | null;
}

export type TipoEfeitoClima = 'chuva' | 'tempestade' | 'nuvens' | 'neve' | 'neblina' | 'areia' | 'cinzas' | 'calor' | 'folhas' | 'escuridao' | 'vazio' | 'fluxo';

export interface IAreaClima {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface IEfeitoClima {
  tipo: TipoEfeitoClima;
  /** De 0,05 a 1. */
  intensidade: number;
  /** null: o mapa inteiro. */
  area: IAreaClima | null;
  /** Só no efeito "fluxo": a cor das partículas. */
  fluxo?: string;
  /** Só na escuridão: raio da luz em volta dos personagens, em casas. */
  luz?: number;
}

/** Como a luz da cena acompanha a hora: não muda (padrão), segue o calendário do mundo ou fica numa hora fixa. */
export type ModoCeu = 'nenhum' | 'mundo' | 'fixo';

export interface ICeu {
  modo: ModoCeu;
  /** Só no modo fixo: minutos desde a meia-noite. */
  minuto: number;
}

export interface IClima {
  efeitos: IEfeitoClima[];
  /** direcao em graus na tela (0 para a direita, 90 para baixo); forca de 0 a 1. */
  vento: { direcao: number; forca: number };
  ceu: ICeu;
}

export interface IPontoMapa {
  x: number;
  y: number;
}

/** Portal da cena: soltar um token numa boca leva à outra. O jogador recebe só os visíveis, e a boca na névoa vem null. */
export interface IPortal {
  id: string;
  nome: string;
  a: IPontoMapa | null;
  b: IPontoMapa | null;
  /** Raio da boca, em casas. */
  raio: number;
  mao: 'dupla' | 'unica';
  usa: 'todos' | 'jogadores' | 'mestre';
  fluxo: string;
  visivel: boolean;
  confirmar: boolean;
  ligado: boolean;
  /** Portal entre cenas (só o Mestre recebe): a saída `b` fica nesta outra cena, e ele é só de ida. */
  cena?: string | null;
  cena_nome?: string | null;
}

/** Porta, janela ou porta secreta do mapa montado no construtor, em px do mapa. O jogador não recebe a secreta. */
export interface IAberturaCena {
  id: string;
  tipo: 'porta' | 'janela' | 'secreta';
  estado: 'fechada' | 'aberta' | 'trancada';
  material?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Só o Mestre: a porta era secreta e foi revelada (pode voltar a ser secreta). */
  era_secreta?: boolean;
}

/** A hora do mundo para a luz do dia e o topo do mapa. `data` vem null quando o calendário está escondido do jogador. */
export interface ITempoMapa {
  minuto: number;
  hora_extenso: string;
  estacao: string;
  /** Posição na lunação: 0 é Lua Nova, 0,5 é Cheia. */
  lua: number;
  lua_carmesim: boolean;
  /** O Mestre já mexeu no calendário desta campanha. */
  em_uso: boolean;
  data: { ano: number; mes: number; dia: number; mes_nome: string; extenso: string } | null;
}

/** Um mapa do Acervo posto na cena (Owlbear: cada mapa é um objeto com lugar, tamanho, trava e visibilidade). */
export interface IMapaColocado {
  id: string;
  /** O item do Acervo (os pedaços saem de `urlPedaco(imagem_id, chave)`). */
  imagem_id: string;
  /** Canto de cima à esquerda do desenho sem girar, em px da cena (girado, pode ficar atrás da borda). */
  x: number;
  y: number;
  /** 1 é o tamanho da imagem; 0,5 é metade. */
  escala: number;
  /** Giro em graus (0 a 360, sentido horário) em torno do centro do mapa. Mapa antigo não traz. */
  rotacao?: number;
  /** Tamanho da imagem original, em px. */
  largura: number;
  altura: number;
  ladrilho: number;
  chaves: string[];
  /** Só o Mestre recebe estes: nome, escondido dos jogadores, trancado e a nota. */
  nome?: string;
  visivel?: boolean;
  trancado?: boolean;
  nota?: string;
}

/** O que o Mestre pode mudar num mapa colocado. */
export interface IMapaColocadoEdicao {
  x?: number;
  y?: number;
  escala?: number;
  rotacao?: number;
  nome?: string;
  visivel?: boolean;
  trancado?: boolean;
  /** Vazio apaga a nota. */
  nota?: string;
}

export type AcaoOrdemMapa = 'frente' | 'tras' | 'acima' | 'abaixo';

export interface ICena extends IResumoCena {
  largura: number;
  altura: number;
  vista?: IVistaCena | null;
  grade: IGrade;
  livre: boolean;
  /** Só o Mestre recebe: descrição e lembretes sobre este mapa. */
  nota_mestre?: string;
  mapa: IMapaDaCena | null;
  nevoa: INevoa;
  clima: IClima;
  portais: IPortal[];
  /** Só nas cenas publicadas pelo construtor de mapas. */
  aberturas?: IAberturaCena[];
  /** Luzes fixas do mapa montado (px; raio em casas). O jogador recebe só as que a névoa mostra. */
  luzes?: Array<{ id: string; x: number; y: number; raio: number; cor: string; tremula: boolean }>;
  /** Casas de água e lava do mapa montado, em retângulos [x, y, w, h] (px), que ganham movimento. */
  liquidos?: { agua: number[][]; lava: number[][] };
  /** Visibilidade para jogadores, só retornada ao Mestre. */
  camadas_jogadores?: Partial<Record<CamadaMapaId, boolean>> | null;
  /** Camadas que este espectador pode receber do servidor. */
  camadas_visiveis?: CamadaMapaId[];
  anotacoes?: IAnotacaoMapa[];
  /** Mapas colocados na cena, de baixo para cima. O jogador só recebe os visíveis. */
  mapas_colocados?: IMapaColocado[];
}

export interface INevoaPayload {
  ligada?: boolean;
  visao_pelas_paredes?: boolean;
  forma?: IFormaNevoa;
  desfazer?: boolean;
  cobrir_tudo?: boolean;
  revelar_tudo?: boolean;
}

export interface IEstadoMapa {
  gestor: boolean;
  usuario_id: string;
  permissoes_mesa?: IPermissoesMesa;
  ao_vivo: boolean;
  /** Jogador antes da sessão ficar ao vivo. */
  bloqueado: boolean;
  /** Só para o Mestre. */
  cenas: IResumoCena[];
  cena: ICena | null;
  tokens: ITokenMapa[];
  /** Quando o Mestre trava uma moldura, todos os tokens usam ela. */
  moldura_mesa: string | null;
  /** null antes da sessão abrir para o jogador. */
  tempo: ITempoMapa | null;
  /** Pausa, relógios e cronômetro; null antes da sessão abrir para o jogador. */
  mesa?: IMesaExtras | null;
  trazidos?: number;
}

/** Travessia de um portal: de onde o token saiu (null se estava na névoa para quem vê) e a cor. */
export interface ITravessia {
  portal: string;
  fluxo: string;
  de: [number, number] | null;
  /** Portal entre cenas: o token foi para esta cena (o nome só chega ao Mestre). */
  cena?: string;
  cena_nome?: string;
}

export interface ICenaPayload {
  nome?: string;
  mapa_id?: string | null;
  sem_mapa?: boolean;
  largura?: number;
  altura?: number;
  grade?: Partial<IGrade>;
  livre?: boolean;
  ordem?: number;
  /** Vazio apaga a nota da cena. */
  nota_mestre?: string;
}

export interface ITokenPayload {
  personagem_id?: string;
  participante_id?: string;
  imagem_id?: string;
  nome?: string;
  x: number;
  y: number;
  porte?: number;
  lado?: LadoToken;
  camada?: CamadaTokenId;
  oculto?: boolean;
  moldura?: string;
}

export interface ITokenEdicao {
  nome?: string;
  porte?: number;
  lado?: LadoToken;
  oculto?: boolean;
  camada?: CamadaTokenId;
  flip_x?: boolean;
  flip_y?: boolean;
  imagem_id?: string;
  sem_imagem?: boolean;
  barras?: Partial<IConfigBarras>;
  moldura?: string;
  sem_moldura?: boolean;
  luz?: ILuzToken;
  sem_luz?: boolean;
  aura?: Partial<IAuraToken>;
  sem_aura?: boolean;
  /** Só o Mestre muda; vazio apaga a nota. */
  nota_mestre?: string;
}

const base =(campanhaId: string) => `/mapa/${campanhaId}`;

/** O estado do mapa sempre vem em JSON. Enquanto a Discloud troca de versão, o proxy responde
 * com uma página HTML e status 200: sem esta exigência ela viraria `null` e a página travaria em
 * "Abrindo o mapa...". Com ela, vira erro e a página tenta de novo. */
const ESTADO = { exigirCorpo: true, cache: 'no-store' } as const;

export const mapaApi = {
  obter: (campanhaId: string, cenaId?: string | null) =>
    api<IEstadoMapa>(`${base(campanhaId)}${cenaId ? `?cena_id=${encodeURIComponent(cenaId)}` : ''}`, ESTADO),
  criarCena: (campanhaId: string, dados: ICenaPayload & { nome: string }) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas`, { method: 'POST', body: dados, ...ESTADO }),
  editarCena: (campanhaId: string, cenaId: string, dados: ICenaPayload) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}`, { method: 'PUT', body: dados, ...ESTADO }),
  ativarCena: (campanhaId: string, cenaId: string) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/ativar`, { method: 'POST', ...ESTADO }),
  apagarCena: (campanhaId: string, cenaId: string) =>
    api<null>(`${base(campanhaId)}/cenas/${cenaId}`, { method: 'DELETE' }),
  criarToken: (campanhaId: string, cenaId: string, dados: ITokenPayload) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/tokens`, { method: 'POST', body: dados, ...ESTADO }),
  trazerParticipantes: (campanhaId: string, cenaId: string, ponto: { x: number; y: number }) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/trazer`, { method: 'POST', body: ponto, ...ESTADO }),
  editarToken: (campanhaId: string, tokenId: string, dados: ITokenEdicao) =>
    api<IEstadoMapa>(`${base(campanhaId)}/tokens/${tokenId}`, { method: 'PUT', body: dados, ...ESTADO }),
  /** Vida, Mana, Estamina ou Sanidade pela barra do token: `delta` soma (dano é negativo), `atual` define. O servidor grava na Sessão e na ficha. */
  mexerNoRecurso: (campanhaId: string, tokenId: string, dados: { tipo: TipoBarra; delta?: number; atual?: number }) =>
    api<IEstadoMapa>(`${base(campanhaId)}/tokens/${tokenId}/recurso`, { method: 'POST', body: dados, ...ESTADO }),
  predefinicoesDeRecipiente: (campanhaId: string) =>
    api<{ predefinicoes: IPredefinicaoRecipiente[] }>(`${base(campanhaId)}/recipientes/predefinicoes`),
  /** A tabela do recipiente com as chances. Só o Mestre. */
  lerRecipiente: (campanhaId: string, tokenId: string) =>
    api<{ recipiente: IRecipienteToken | null; tabela: TabelaDeLoot | null }>(`${base(campanhaId)}/tokens/${tokenId}/recipiente`, { cache: 'no-store' }),
  configurarRecipiente: (campanhaId: string, tokenId: string, dados: IEdicaoRecipiente) =>
    api<IEstadoMapa & { recipiente_tabela: TabelaDeLoot | null }>(`${base(campanhaId)}/tokens/${tokenId}/recipiente`, { method: 'PUT', body: dados, ...ESTADO }),
  abrirRecipiente: (campanhaId: string, tokenId: string) =>
    api<IEstadoMapa>(`${base(campanhaId)}/tokens/${tokenId}/recipiente/abrir`, { method: 'POST', ...ESTADO }),
  pegarDoRecipiente: (campanhaId: string, tokenId: string, dados: { linhas: string[]; personagem_id?: string }) =>
    api<IEstadoMapa>(`${base(campanhaId)}/tokens/${tokenId}/recipiente/pegar`, { method: 'POST', body: dados, ...ESTADO }),
  moverToken: (campanhaId: string, tokenId: string, ponto: { x: number; y: number; atravessar?: string }) =>
    api<{ x: number; y: number; versao: number; travessia: ITravessia | null; barrado?: boolean }>(`${base(campanhaId)}/tokens/${tokenId}/mover`, { method: 'POST', body: ponto }),
  /** Abrir, fechar, trancar ou revelar uma porta do mapa montado (o jogador só abre e fecha a que está ao lado). */
  mudarPorta: (campanhaId: string, cenaId: string, dados: { id: string; estado?: IAberturaCena['estado']; revelar?: boolean }) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/portas`, { method: 'PUT', body: dados, ...ESTADO }),
  apagarToken: (campanhaId: string, tokenId: string) =>
    api<null>(`${base(campanhaId)}/tokens/${tokenId}`, { method: 'DELETE' }),
  /** Moldura e enquadramento do personagem: valem em todas as cenas. */
  editarTokenDoPersonagem: (campanhaId: string, personagemId: string, dados: { moldura?: string; sem_moldura?: boolean; enquadramento?: Partial<{ zoom: number; x: number; y: number }>; arte_id?: string; sem_arte?: boolean }) =>
    api<{ moldura: string | null; enquadramento: { zoom: number; x: number; y: number }; arte_id: string | null }>(`${base(campanhaId)}/personagens/${personagemId}/token`, { method: 'PUT', body: dados }),
  /** As artes extras do token do personagem (a foto da ficha é a padrão). Só o dono e o Mestre. */
  listarArtes: (campanhaId: string, personagemId: string) =>
    api<IArtesDoPersonagem>(`${base(campanhaId)}/personagens/${personagemId}/artes`, { cache: 'no-store' }),
  criarArte: (campanhaId: string, personagemId: string, dados: { nome?: string; imagem: string }) =>
    api<IArtesDoPersonagem>(`${base(campanhaId)}/personagens/${personagemId}/artes`, { method: 'POST', body: dados }),
  apagarArte: (campanhaId: string, personagemId: string, arteId: string) =>
    api<IArtesDoPersonagem>(`${base(campanhaId)}/personagens/${personagemId}/artes/${arteId}`, { method: 'DELETE' }),
  mudarNevoa: (campanhaId: string, cenaId: string, dados: INevoaPayload) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/nevoa`, { method: 'POST', body: dados, ...ESTADO }),
  mudarClima: (campanhaId: string, cenaId: string, clima: IClima) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/clima`, { method: 'PUT', body: clima, ...ESTADO }),
  mudarPortais: (campanhaId: string, cenaId: string, portais: IPortal[]) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/portais`, { method: 'PUT', body: { portais }, ...ESTADO }),
  mudarCamadas: (campanhaId: string, cenaId: string, jogadores: Partial<Record<CamadaMapaId, boolean>>) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/camadas`, { method: 'PUT', body: { jogadores }, ...ESTADO }),
  mudarAnotacoes: (campanhaId: string, cenaId: string, anotacoes: IAnotacaoMapa[]) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/anotacoes`, { method: 'PUT', body: { anotacoes }, ...ESTADO }),
  /** Só o que vier no pedido muda (pausa, relógios, cronômetro). */
  mudarMesa: (campanhaId: string, dados: Partial<IMesaExtras>) =>
    api<IMesaExtras>(`${base(campanhaId)}/mesa`, { method: 'PUT', body: dados }),
  /** O Mestre fala por um NPC: a mesa conectada vê a fala. */
  falar: (campanhaId: string, fala: { nome: string; texto: string; token?: string | null }) =>
    api<{ ok: boolean; conectados: number }>(`${base(campanhaId)}/fala`, { method: 'POST', body: fala }),
  colocarMapa: (campanhaId: string, cenaId: string, dados: { imagem_id: string; nome?: string; x?: number; y?: number; escala?: number }) =>
    api<IEstadoMapa & { mapa_colocado_id: string }>(`${base(campanhaId)}/cenas/${cenaId}/mapas`, { method: 'POST', body: dados, ...ESTADO }),
  editarMapaColocado: (campanhaId: string, cenaId: string, mapaId: string, dados: IMapaColocadoEdicao) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/mapas/${mapaId}`, { method: 'PUT', body: dados, ...ESTADO }),
  duplicarMapaColocado: (campanhaId: string, cenaId: string, mapaId: string) =>
    api<IEstadoMapa & { mapa_colocado_id: string }>(`${base(campanhaId)}/cenas/${cenaId}/mapas/${mapaId}/duplicar`, { method: 'POST', ...ESTADO }),
  ordenarMapaColocado: (campanhaId: string, cenaId: string, mapaId: string, acao: AcaoOrdemMapa) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/mapas/${mapaId}/ordem`, { method: 'PUT', body: { acao }, ...ESTADO }),
  tirarMapaColocado: (campanhaId: string, cenaId: string, mapaId: string) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/mapas/${mapaId}`, { method: 'DELETE', ...ESTADO }),
  guardarVista: (campanhaId: string, cenaId: string, vista: IVistaCena | null) =>
    api<IEstadoMapa>(`${base(campanhaId)}/cenas/${cenaId}/vista`, { method: 'PUT', body: { vista }, ...ESTADO }),
  configurar: (campanhaId: string, dados: { moldura_mesa: string | null }) =>
    api<{ moldura_mesa: string | null }>(`${base(campanhaId)}/config`, { method: 'PUT', body: dados }),
};

export interface IArtesDoPersonagem {
  artes: Array<{ id: string; nome: string }>;
  /** A arte que o token mostra; nula quando vale a foto da ficha. */
  ativa: string | null;
  tem_foto_ficha: boolean;
  versao_foto_ficha: string;
  maximo: number;
}

/** A imagem de uma arte (`ficha` é a foto da ficha). Cada arte nunca muda, então o endereço leva só uma versão para a da ficha. */
export function urlImagemDaArte(campanhaId: string, personagemId: string, arteId: string, versao = ''): string {
  return `/api/v1/mapa/${campanhaId}/personagens/${personagemId}/artes/${arteId}/imagem${versao ? `?v=${encodeURIComponent(versao)}` : ''}`;
}

export function urlImagemDoToken(campanhaId: string, tokenId: string, versao: string): string {
  return `/api/v1/mapa/${campanhaId}/tokens/${tokenId}/imagem?v=${encodeURIComponent(versao)}`;
}

export function urlPedaco(itemId: string, chave: string): string {
  return `/api/v1/acervo/itens/${itemId}/arquivos/${chave}`;
}
