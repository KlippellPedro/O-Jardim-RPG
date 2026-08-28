import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Banknote,
  CircleDot,
  CircleOff,
  Coins,
  Crown,
  Dices,
  DoorOpen,
  Flame,
  Hourglass,
  LoaderCircle,
  Lock,
  Play,
  ScrollText,
  Spade,
  Swords,
  Trophy,
  Triangle,
  UserRound,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { encontrarEntidade } from '../../../data/mundo/entidades';
import {
  casinoApi,
  type ConquistaCassinoGambler,
  type EstadoCassinoGambler,
  type JogoCassinoGambler,
  type MoedaCassinoGambler,
  type PersonagemCassinoGambler,
  type RodadaCassinoGambler,
} from '../../services/casinoApi';
import { useAuthStore } from '../../store/useAuthStore';
import { sfx } from '../../utils/audioSynth';
import './entidades.css';
import { EntityThemeMusic } from './EntityThemeMusic';
import { possuiEntradaGambler } from './gamblerAccess';
import './gamblerCasino.css';

type EntityThemeStyle = CSSProperties & Record<`--entity-${string}`, string>;

const GAMBLER = encontrarEntidade('gambler');
const MUSICA_GAMBLER = GAMBLER?.musicaTema;
// EntityThemeMusic lê cores de custom properties --entity-* que normalmente
// vêm da página do conto (EntidadeContoPage). Aqui, fora daquele contexto,
// precisamos repassar as mesmas cores do tema do Gambler à mão.
const ESTILO_MUSICA_GAMBLER = GAMBLER
  ? ({
      '--entity-accent': GAMBLER.tema.destaque,
      '--entity-accent-soft': GAMBLER.tema.destaqueSuave,
      '--entity-accent-2': GAMBLER.tema.destaqueSecundario ?? GAMBLER.tema.destaque,
      '--entity-background': GAMBLER.tema.fundo,
      '--entity-surface': GAMBLER.tema.superficie,
      '--entity-text': GAMBLER.tema.texto,
      '--entity-muted': GAMBLER.tema.textoSuave,
    } as EntityThemeStyle)
  : undefined;

const JOGOS: Array<{
  id: JogoCassinoGambler;
  nome: string;
  resumo: string;
  explicacao: string;
  pagamento: string;
  Icone: typeof Dices;
}> = [
  {
    id: 'dados',
    nome: 'Dados da Inconstância',
    resumo: 'Baixo, alto ou o número certo.',
    explicacao: 'Um dado de seis lados decide tudo. Baixo cobre de um a três, alto cobre de quatro a seis, e os dois pagam o dobro da aposta. Cravar o número exato é mais difícil, mas paga seis vezes mais.',
    pagamento: '2× ou 6×',
    Icone: Dices,
  },
  {
    id: 'vinte_um',
    nome: 'Vinte-e-Um de Amadheus',
    resumo: 'Compre, pare ou dobre contra a casa.',
    explicacao: 'A casa compra carta até chegar a dezessete e para por ali. Vencer paga o dobro, empatar devolve a aposta, e abrir a mesa com vinte e um de cara, sem comprar nada, paga duas vezes e meia.',
    pagamento: 'até 2,5×',
    Icone: Spade,
  },
  {
    id: 'roda_fluxos',
    nome: 'Roda das Dez Forças',
    resumo: 'Escolha uma força entre dez.',
    explicacao: 'Dez símbolos na roda e você escolhe um só, antes dela girar. Acertar paga dez vezes o valor apostado. Qualquer outro resultado fica com a casa.',
    pagamento: '10×',
    Icone: CircleDot,
  },
  {
    id: 'sucessao',
    nome: 'Sucessão de Chronus',
    resumo: 'Aposte antes ou depois do Passo.',
    explicacao: 'Um marco entre um e treze decide a rodada. De um a seis conta como antes do Passo, de oito a treze como depois, e os dois lados pagam o dobro. Se o marco cair bem no sete, a aposta simplesmente volta pro bolso.',
    pagamento: '2×',
    Icone: Hourglass,
  },
  {
    id: 'vaos',
    nome: 'Queda pelo Interstício',
    resumo: 'Quatro desvios decidem o destino da ficha.',
    explicacao: 'A ficha desce por quatro desvios, um atrás do outro. Terminar numa borda paga quatro vezes o valor, cair num dos Vãos devolve exatamente o que foi apostado, e parar bem no meio, no Interstício, a casa fica com tudo.',
    pagamento: 'até 4×',
    Icone: Triangle,
  },
  {
    id: 'rolos',
    nome: 'Pergaminhos do Acaso',
    resumo: 'Três pergaminhos, cinco símbolos, só trinca paga.',
    explicacao: 'Três pergaminhos se abrem ao mesmo tempo, cada um revelando um entre cinco símbolos. Só trinca paga: três iguais rendem vinte vezes a aposta, mas se os três forem o Vazio, o prêmio salta pra quarenta e cinco vezes.',
    pagamento: '20× ou 45×',
    Icone: ScrollText,
  },
  {
    id: 'duelo',
    nome: 'Duelo do Vazio',
    resumo: 'Uma carta cada. A mais alta vence.',
    explicacao: 'Você puxa uma carta, o Gambler puxa outra. Quem tirar a mais alta leva o dobro da aposta; num empate, a ficha volta sem lucro nem prejuízo.',
    pagamento: '2×',
    Icone: Swords,
  },
];

const SONS_JOGO: Partial<Record<JogoCassinoGambler, () => void>> = {
  dados: () => sfx.playDiceRollSound(),
  roda_fluxos: () => sfx.playWheelSpinSound(),
  sucessao: () => sfx.playClockTickSound(),
  vaos: () => sfx.playPlinkoSound(),
  rolos: () => sfx.playScrollRevealSound(),
  duelo: () => sfx.playCardDuelSound(),
};

const ICONES_SIMBOLOS: Record<string, typeof Coins> = {
  moeda: Coins,
  ficha: CircleDot,
  coroa: Crown,
  chama: Flame,
  vazio: CircleOff,
};

const NOMES_RESULTADO_21: Record<string, string> = {
  vitoria: 'Vitória',
  vinte_um_natural: 'Vinte-e-Um natural',
  empate: 'Empate',
  derrota: 'Derrota',
  desistencia: 'Você deixou a mesa e perdeu a aposta',
};

const MOEDAS: MoedaCassinoGambler[] = ['Lunaris', 'Solares', 'Fragmentos de Estrela', 'Créditos Sombrios'];

type ToastCassino =
  | { id: number; tipo: 'conquista'; itens: ConquistaCassinoGambler[] }
  | { id: number; tipo: 'aviso'; texto: string };

function clampBet(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

const NOMES_CARTA: Record<number, string> = { 11: 'Valete', 12: 'Dama', 13: 'Rei', 14: 'Ás' };

function nomeCarta(valor: number): string {
  return NOMES_CARTA[valor] || String(valor);
}

function textoResultado(rodada: RodadaCassinoGambler, simbolosRolos?: Record<string, { nome: string }>): string {
  const resultado = rodada.resultado || {};
  if (rodada.status === 'reembolsada') return 'A rodada foi cancelada. A aposta voltou para a carteira.';
  if (rodada.jogo === 'dados') return `O dado mostrou ${resultado.dado}.`;
  if (rodada.jogo === 'roda_fluxos') return `A roda parou em ${resultado.sorteada}.`;
  if (rodada.jogo === 'sucessao') return resultado.marco === 7 ? 'A ficha parou bem no Passo. A aposta voltou sem lucro nem perda.' : `A ficha parou no marco ${resultado.marco}.`;
  if (rodada.jogo === 'vaos') return `Destino: ${resultado.destino}.`;
  if (rodada.jogo === 'rolos') {
    const rolos: string[] = resultado.rolos || [];
    const nomes = rolos.map(id => simbolosRolos?.[id]?.nome || id).join(' · ');
    return resultado.trinca ? `Trinca! ${nomes}.` : `Os pergaminhos revelaram ${nomes}.`;
  }
  if (rodada.jogo === 'duelo') {
    return `Você tirou ${nomeCarta(resultado.carta_jogador)}, o Gambler tirou ${nomeCarta(resultado.carta_gambler)}.`;
  }
  return NOMES_RESULTADO_21[String(resultado.resultado || rodada.estado?.resultado)] || 'A rodada terminou.';
}

function ganhou(rodada: RodadaCassinoGambler): boolean {
  if (rodada.status === 'reembolsada') return false;
  return rodada.pagamento > rodada.aposta;
}

export function GamblerCasinoPage() {
  const navigate = useNavigate();
  const campanhaId = useAuthStore(state => state.campanhaAtiva?.id ?? null);
  const [personagens, setPersonagens] = useState<PersonagemCassinoGambler[]>([]);
  const [personagemId, setPersonagemId] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoCassinoGambler | null>(null);
  const [rodada, setRodada] = useState<RodadaCassinoGambler | null>(null);
  const [jogo, setJogo] = useState<JogoCassinoGambler>('dados');
  const [aposta, setAposta] = useState(5);
  const [escolhaDados, setEscolhaDados] = useState<'baixo' | 'alto' | 'exato'>('baixo');
  const [numeroExato, setNumeroExato] = useState(1);
  const [forca, setForca] = useState('genese');
  const [lado, setLado] = useState<'antes' | 'depois'>('antes');
  const [carregando, setCarregando] = useState(true);
  const [jogando, setJogando] = useState(false);
  const [confirmandoDesistencia, setConfirmandoDesistencia] = useState(false);
  const [moedaCambio, setMoedaCambio] = useState<MoedaCassinoGambler>('Lunaris');
  const [quantidadeCambio, setQuantidadeCambio] = useState(1);
  const [cambiando, setCambiando] = useState(false);
  const [quantidadeResgate, setQuantidadeResgate] = useState(1);
  const [resgatando, setResgatando] = useState(false);
  const [revelando, setRevelando] = useState(false);
  const [mostrarConquistas, setMostrarConquistas] = useState(false);
  const [toasts, setToasts] = useState<ToastCassino[]>([]);
  const toastIdRef = useRef(0);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (!possuiEntradaGambler()) {
      navigate('/entidades/gambler', { replace: true });
      return;
    }
    if (!campanhaId) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setCarregando(true);
    casinoApi.personagens(campanhaId)
      .then(resposta => {
        if (!ativo) return;
        setPersonagens(resposta.personagens);
        setErro(null);
      })
      .catch((error: unknown) => {
        if (ativo) setErro(error instanceof Error ? error.message : 'O salão não pôde abrir.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, [campanhaId, navigate]);

  const selecionarPersonagem = async (id: string) => {
    if (!campanhaId || carregando) return;
    setCarregando(true);
    setErro(null);
    sfx.play('select');
    try {
      const resposta = await casinoApi.estado(campanhaId, id);
      setPersonagemId(id);
      setEstado(resposta);
      setRodada(resposta.vinte_um_ativo || null);
      setJogo(resposta.vinte_um_ativo ? 'vinte_um' : 'dados');
      setAposta(resposta.limites.aposta_minima);
    } catch (error: unknown) {
      mostrarErro(error instanceof Error ? error.message : 'O personagem não pôde entrar no salão.');
    } finally {
      setCarregando(false);
    }
  };

  const limites = estado?.limites;
  const valorAposta = clampBet(aposta, limites?.aposta_minima ?? 5, limites?.aposta_maxima ?? 200);
  const vinteUmAtivo = rodada?.jogo === 'vinte_um' && rodada.status === 'ativa';
  const forcas = useMemo(() => Object.entries(estado?.forcas || {}), [estado?.forcas]);
  const saldoMoedaCambio = estado?.carteira.find(
    item => item.moeda.localeCompare(moedaCambio, 'pt-BR', { sensitivity: 'base' }) === 0,
  )?.saldo ?? 0;
  const quantidadeCambioInteira = Math.max(1, Math.trunc(Number(quantidadeCambio) || 0));
  const fichasCotadas = quantidadeCambioInteira * (estado?.cambio?.[moedaCambio] ?? 0);
  const quantidadeResgateInteira = Math.max(1, Math.trunc(Number(quantidadeResgate) || 0));
  const saldoResgatavel = estado?.saldo_fichas ?? 0;

  const DURACAO_SUSPENSE_MS = 650;

  const removerToast = (id: number) => {
    setToasts(atual => atual.filter(item => item.id !== id));
  };

  const dispararAviso = (texto: string) => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts(atual => [...atual, { id, tipo: 'aviso', texto }]);
    window.setTimeout(() => removerToast(id), 3800);
  };

  const dispararConquistas = (novas: ConquistaCassinoGambler[] | undefined) => {
    if (!novas || !novas.length) return;
    sfx.play('notification');
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts(atual => [...atual, { id, tipo: 'conquista', itens: novas }]);
    window.setTimeout(() => removerToast(id), 4600);
  };

  const mostrarErro = (mensagem: string) => {
    setErro(mensagem);
    sfx.play('error');
  };

  const aplicarResposta = (resposta: EstadoCassinoGambler) => {
    setConfirmandoDesistencia(false);
    setEstado(anterior => ({
      ...(anterior || resposta),
      ...resposta,
      forcas: resposta.forcas || anterior?.forcas,
      simbolos_rolos: resposta.simbolos_rolos || anterior?.simbolos_rolos,
      catalogo_conquistas: resposta.catalogo_conquistas || anterior?.catalogo_conquistas,
      vinte_um_ativo: resposta.rodada?.jogo === 'vinte_um' && resposta.rodada.status === 'ativa'
        ? resposta.rodada
        : null,
    }));
    if (resposta.rodada) setRodada(resposta.rodada);
    if (resposta.rodada && resposta.rodada.status !== 'ativa') {
      const lucro = resposta.rodada.pagamento - resposta.rodada.aposta;
      if (lucro >= 50) sfx.playBigWinSound();
      else if (lucro > 0) sfx.playWinSound();
      else if (lucro < 0) sfx.playLoseSound();
    }
    dispararConquistas(resposta.conquistas_novas);
  };

  const executar = async () => {
    if (!campanhaId || !personagemId || !estado || jogando) return;
    setAposta(valorAposta);
    setJogando(true);
    setErro(null);
    sfx.playChipSound();
    const suspense = jogo !== 'vinte_um';
    if (suspense) {
      setRevelando(true);
      SONS_JOGO[jogo]?.();
    } else {
      sfx.playCardFlipSound();
      window.setTimeout(() => sfx.playCardFlipSound(), 90);
    }
    try {
      let resposta: EstadoCassinoGambler;
      if (jogo === 'vinte_um') {
        resposta = await casinoApi.iniciarVinteUm(campanhaId, personagemId, valorAposta);
      } else {
        resposta = await casinoApi.jogar(campanhaId, personagemId, {
          jogo,
          aposta: valorAposta,
          escolha: jogo === 'dados' ? escolhaDados : jogo === 'roda_fluxos' ? forca : jogo === 'sucessao' ? lado : undefined,
          numero: jogo === 'dados' && escolhaDados === 'exato' ? numeroExato : undefined,
        });
      }
      if (suspense) await new Promise(resolve => window.setTimeout(resolve, DURACAO_SUSPENSE_MS));
      aplicarResposta(resposta);
    } catch (error: unknown) {
      mostrarErro(error instanceof Error ? error.message : 'A aposta não pôde ser concluída.');
    } finally {
      setJogando(false);
      setRevelando(false);
    }
  };

  const agirVinteUm = async (acao: 'comprar' | 'parar' | 'dobrar') => {
    if (!campanhaId || !personagemId || !rodada || jogando) return;
    setConfirmandoDesistencia(false);
    setJogando(true);
    setErro(null);
    if (acao === 'dobrar') {
      sfx.playChipSound();
      window.setTimeout(() => sfx.playCardFlipSound(), 80);
    } else if (acao === 'comprar') {
      sfx.playCardFlipSound();
    } else {
      sfx.play('select');
    }
    try {
      aplicarResposta(await casinoApi.agirVinteUm(campanhaId, personagemId, rodada.id, rodada.versao, acao));
    } catch (error: unknown) {
      mostrarErro(error instanceof Error ? error.message : 'A mesa não aceitou a ação.');
    } finally {
      setJogando(false);
    }
  };

  const abandonarVinteUm = async () => {
    if (!campanhaId || !personagemId || !rodada || jogando) return;
    if (!confirmandoDesistencia) {
      setConfirmandoDesistencia(true);
      sfx.play('cancel');
      return;
    }
    setJogando(true);
    setErro(null);
    try {
      aplicarResposta(await casinoApi.abandonarVinteUm(campanhaId, personagemId, rodada.id, rodada.versao));
    } catch (error: unknown) {
      mostrarErro(error instanceof Error ? error.message : 'A rodada não pôde ser encerrada.');
    } finally {
      setJogando(false);
    }
  };

  const realizarCambio = async () => {
    if (!campanhaId || !personagemId || !estado || cambiando) return;
    const quantidade = quantidadeCambioInteira;
    setQuantidadeCambio(quantidade);
    setCambiando(true);
    setErro(null);
    try {
      const resposta = await casinoApi.cambiar(campanhaId, personagemId, moedaCambio, quantidade);
      aplicarResposta(resposta);
      sfx.playCoinsSound();
      dispararAviso(`${quantidade} ${moedaCambio} viraram ${resposta.fichas_recebidas} fichas.`);
    } catch (error: unknown) {
      mostrarErro(error instanceof Error ? error.message : 'O caixa recusou a conversão.');
    } finally {
      setCambiando(false);
    }
  };

  const realizarResgate = async () => {
    if (!campanhaId || !personagemId || !estado || resgatando) return;
    const quantidade = Math.min(quantidadeResgateInteira, saldoResgatavel);
    if (quantidade <= 0) return;
    setQuantidadeResgate(quantidade);
    setResgatando(true);
    setErro(null);
    try {
      const resposta = await casinoApi.resgatar(campanhaId, personagemId, quantidade);
      aplicarResposta(resposta);
      sfx.playCoinsSound();
      dispararAviso(`${quantidade} fichas viraram ${resposta.lunaris_recebidos} Lunaris.`);
    } catch (error: unknown) {
      mostrarErro(error instanceof Error ? error.message : 'O caixa recusou o resgate.');
    } finally {
      setResgatando(false);
    }
  };

  if (carregando) {
    return (
      <main className="gambler-casino gambler-casino--loading">
        <LoaderCircle className="gambler-casino__spinner" size={38} />
        <p>O Gambler está preparando a mesa…</p>
      </main>
    );
  }

  if (!personagemId) {
    return (
      <main className="gambler-casino gambler-casino--selecting">
        <div className="gambler-casino__backdrop" aria-hidden="true" />
        <div className="gambler-casino__veil" aria-hidden="true" />
        <section className="gambler-character-modal" role="dialog" aria-modal="true" aria-labelledby="gambler-character-title">
          <span>Antes de receber as fichas</span>
          <UserRound size={34} />
          <h1 id="gambler-character-title">Quem vai se sentar à mesa?</h1>
          <p>O dinheiro convertido, as fichas e todas as apostas ficam ligados ao personagem escolhido.</p>
          {erro ? <p className="gambler-table__error" role="alert">{erro}</p> : null}
          {personagens.length ? (
            <div className="gambler-character-modal__list">
              {personagens.map(personagem => (
                <button type="button" key={personagem.id} onClick={() => selecionarPersonagem(personagem.id)}>
                  {personagem.foto ? <img src={personagem.foto} alt="" /> : <UserRound size={22} />}
                  <span><strong>{personagem.nome}</strong><small>Nível {personagem.nivel}</small></span>
                  <em>{personagem.saldo_fichas} fichas</em>
                </button>
              ))}
            </div>
          ) : (
            <p className="gambler-character-modal__empty">Você não possui um personagem ativo nesta campanha.</p>
          )}
          <Link to="/entidades/gambler"><ArrowLeft size={16} /> Voltar ao conto</Link>
        </section>
      </main>
    );
  }

  if (!estado) {
    return (
      <main className="gambler-casino gambler-casino--loading">
        <DoorOpen size={42} />
        <h1>A porta não abriu.</h1>
        <p>{erro || 'Escolha um personagem ativo para carregar os Lunaris da aposta.'}</p>
        <Link to="/entidades/gambler"><ArrowLeft size={16} /> Voltar ao conto</Link>
      </main>
    );
  }

  const conquistasDesbloqueadas = estado.conquistas ?? [];
  const chavesDesbloqueadas = new Set(conquistasDesbloqueadas.map(item => item.chave));
  const conquistasBloqueadas = (estado.catalogo_conquistas ?? []).filter(item => !chavesDesbloqueadas.has(item.chave));
  const sequenciaAtual = estado.sequencia_atual ?? 0;

  return (
    <main className="gambler-casino">
      <div className="gambler-casino__backdrop" aria-hidden="true" />
      <div className="gambler-casino__veil" aria-hidden="true" />

      <div className="gambler-casino__toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map(item => (
            <motion.div
              key={item.id}
              className={`gambler-toast${item.tipo === 'aviso' ? ' gambler-toast--aviso' : ''}`}
              initial={{ opacity: 0, y: -18, scale: .95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: .96 }}
              transition={{ duration: .35, ease: [0.2, 0.7, 0.2, 1] }}
            >
              {item.tipo === 'conquista' ? (
                <>
                  <Trophy size={20} />
                  <div>
                    <small>{item.itens.length > 1 ? `${item.itens.length} conquistas desbloqueadas` : 'Conquista desbloqueada'}</small>
                    {item.itens.map(conquista => (
                      <strong key={conquista.chave}>{conquista.nome}</strong>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <Coins size={18} />
                  <div><strong>{item.texto}</strong></div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="gambler-casino__shell">
        <nav className="gambler-casino__nav">
          <Link to="/entidades/gambler"><ArrowLeft size={16} /> Voltar ao conto</Link>
          <Link to="/entidades"><DoorOpen size={16} /> Deixar o salão</Link>
        </nav>

        <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <span>O salão atrás da porta</span>
          <h1>Cassino do Gambler</h1>
          <p>Moedas entram pelo caixa. Na mesa, só as fichas falam. O resultado é decidido quando a aposta chega ao servidor.</p>
          {MUSICA_GAMBLER ? (
            <div style={ESTILO_MUSICA_GAMBLER}>
              <EntityThemeMusic musica={MUSICA_GAMBLER} />
            </div>
          ) : null}
        </motion.header>

        <section className="gambler-casino__account" aria-label="Carteira e limites">
          <div><small>Jogador</small><strong>{estado.personagem.nome}</strong></div>
          <div>
            <small>Fichas</small>
            <strong>
              <CircleDot size={17} /> {estado.saldo_fichas}
              {sequenciaAtual >= 2 ? (
                <span className="gambler-streak"><Flame size={14} /> {sequenciaAtual}</span>
              ) : null}
            </strong>
          </div>
          <div><small>Apostado hoje</small><strong>{estado.limites.apostado} / {estado.limites.limite_apostado_dia}</strong></div>
          <div><small>Perda diária</small><strong>{estado.limites.perda_liquida} / {estado.limites.limite_perda_dia}</strong></div>
          <div><small>Aposta máxima</small><strong>{estado.limites.aposta_maxima} fichas</strong></div>
        </section>

        <div className="gambler-achievements__bar">
          <button
            type="button"
            className="gambler-achievements__toggle"
            onClick={() => setMostrarConquistas(atual => !atual)}
            aria-expanded={mostrarConquistas}
          >
            <Trophy size={15} /> Conquistas · {conquistasDesbloqueadas.length}
            {estado.catalogo_conquistas ? ` / ${estado.catalogo_conquistas.length}` : ''}
          </button>
          <span className="gambler-achievements__hint">Cada conquista nova dá um respiro a mais na mesa: sobe dez na aposta máxima, vinte e cinco no limite do dia e dez na perda que a casa tolera.</span>
        </div>
        <AnimatePresence>
          {mostrarConquistas ? (
            <motion.section
              className="gambler-achievements"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              aria-label="Conquistas do salão"
            >
              {conquistasDesbloqueadas.length || conquistasBloqueadas.length ? (
                <ul>
                  {conquistasDesbloqueadas.map(item => (
                    <li key={item.chave}>
                      <Trophy size={14} />
                      <span><strong>{item.nome}</strong><small>{item.descricao}</small></span>
                    </li>
                  ))}
                  {conquistasBloqueadas.map(item => (
                    <li key={item.chave} className="is-bloqueada">
                      <Lock size={14} />
                      <span><strong>{item.nome}</strong><small>{item.descricao}</small></span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhuma conquista ainda. A mesa está esperando a primeira aposta.</p>
              )}
            </motion.section>
          ) : null}
        </AnimatePresence>

        <section className="gambler-cashier" aria-labelledby="gambler-cashier-title">
          <div className="gambler-cashier__row">
            <div>
              <span>Comprar fichas</span>
              <h2 id="gambler-cashier-title">Transformar dinheiro em fichas</h2>
              <p>Escolha uma moeda da carteira de {estado.personagem.nome}.</p>
            </div>
            <div className="gambler-cashier__form">
              <label>Moeda
                <select value={moedaCambio} onChange={event => setMoedaCambio(event.target.value as MoedaCassinoGambler)}>
                  {MOEDAS.map(moeda => {
                    const saldo = estado.carteira.find(item => item.moeda.localeCompare(moeda, 'pt-BR', { sensitivity: 'base' }) === 0)?.saldo ?? 0;
                    return <option key={moeda} value={moeda}>{moeda} · {saldo}</option>;
                  })}
                </select>
              </label>
              <label>Quantidade
                <input type="number" min="1" max={saldoMoedaCambio} step="1" value={quantidadeCambio} onChange={event => setQuantidadeCambio(Number(event.target.value))} onBlur={() => setQuantidadeCambio(quantidadeCambioInteira)} />
              </label>
              <div className="gambler-cashier__quote">
                <small>Você recebe</small>
                <strong>{fichasCotadas} fichas</strong>
              </div>
              <button type="button" onClick={realizarCambio} disabled={cambiando || quantidadeCambioInteira > saldoMoedaCambio || fichasCotadas <= 0}>
                {cambiando ? <LoaderCircle className="gambler-casino__spinner" size={17} /> : <Coins size={17} />}
                Fazer o câmbio
              </button>
            </div>
          </div>

          <div className="gambler-cashier__divider" aria-hidden="true" />

          <div className="gambler-cashier__row">
            <div>
              <span>Sair da mesa</span>
              <h2>Resgatar fichas em Lunaris</h2>
              <p>Fichas voltam a ser Lunaris, uma para uma. A moeda original é que não volta: quem trocou Solares recebe Lunaris de volta, não Solares.</p>
            </div>
            <div className="gambler-cashier__form gambler-cashier__form--resgate">
              <label>Quantidade
                <input type="number" min="1" max={saldoResgatavel} step="1" value={quantidadeResgate} onChange={event => setQuantidadeResgate(Number(event.target.value))} onBlur={() => setQuantidadeResgate(quantidadeResgateInteira)} />
              </label>
              <div className="gambler-cashier__quote">
                <small>Você recebe</small>
                <strong>{Math.min(quantidadeResgateInteira, saldoResgatavel)} Lunaris</strong>
              </div>
              <button type="button" onClick={realizarResgate} disabled={resgatando || saldoResgatavel <= 0 || quantidadeResgateInteira <= 0}>
                {resgatando ? <LoaderCircle className="gambler-casino__spinner" size={17} /> : <Banknote size={17} />}
                Resgatar
              </button>
            </div>
          </div>
        </section>

        <button
          type="button"
          className="gambler-casino__switch"
          onClick={() => { setPersonagemId(null); setEstado(null); setRodada(null); setErro(null); }}
          disabled={jogando || cambiando || resgatando}
        >
          <UserRound size={16} /> Trocar personagem
        </button>

        <section className="gambler-casino__layout">
          <div className="gambler-casino__games" aria-label="Jogos disponíveis">
            {JOGOS.map(({ id, nome, resumo, pagamento, Icone }) => (
              <button
                type="button"
                key={id}
                className={jogo === id ? 'is-active' : ''}
                onClick={() => { if (!vinteUmAtivo) { setJogo(id); setRodada(null); setErro(null); setConfirmandoDesistencia(false); } }}
                disabled={Boolean(vinteUmAtivo && jogo !== id)}
              >
                <Icone size={21} />
                <span><strong>{nome}</strong><small>{resumo}</small></span>
                <em>{pagamento}</em>
              </button>
            ))}
          </div>

          <div className="gambler-table">
            <div className="gambler-table__felt" aria-hidden="true" />
            <div className="gambler-table__content">
              <span className="gambler-table__label">{JOGOS.find(item => item.id === jogo)?.nome}</span>
              <p className="gambler-table__rule">{JOGOS.find(item => item.id === jogo)?.explicacao}</p>

              {jogo === 'dados' ? (
                <div className="gambler-table__choices">
                  {(['baixo', 'alto', 'exato'] as const).map(valor => (
                    <button type="button" key={valor} className={escolhaDados === valor ? 'is-selected' : ''} onClick={() => setEscolhaDados(valor)}>
                      {valor === 'baixo' ? 'Baixo · 1–3' : valor === 'alto' ? 'Alto · 4–6' : 'Número exato'}
                    </button>
                  ))}
                  {escolhaDados === 'exato' ? (
                    <label>Número
                      <select value={numeroExato} onChange={event => setNumeroExato(Number(event.target.value))}>
                        {[1, 2, 3, 4, 5, 6].map(numero => <option key={numero} value={numero}>{numero}</option>)}
                      </select>
                    </label>
                  ) : null}
                </div>
              ) : null}

              {jogo === 'roda_fluxos' ? (
                <label className="gambler-table__select">Força escolhida
                  <select value={forca} onChange={event => setForca(event.target.value)}>
                    {forcas.map(([id, item]) => <option key={id} value={id}>{item.nome}</option>)}
                  </select>
                </label>
              ) : null}

              {jogo === 'sucessao' ? (
                <div className="gambler-table__choices">
                  <button type="button" className={lado === 'antes' ? 'is-selected' : ''} onClick={() => setLado('antes')}>Antes · 1–6</button>
                  <button type="button" className={lado === 'depois' ? 'is-selected' : ''} onClick={() => setLado('depois')}>Depois · 8–13</button>
                </div>
              ) : null}

              {jogo === 'rolos' && rodada && rodada.jogo === 'rolos' && rodada.status !== 'ativa' ? (
                <div className="gambler-scrolls">
                  {(rodada.resultado?.rolos || []).map((id: string, index: number) => {
                    const IconeSimbolo = ICONES_SIMBOLOS[id] || ScrollText;
                    return (
                      <span key={`${id}-${index}`} className={id === 'vazio' ? 'is-vazio' : ''}>
                        <IconeSimbolo size={26} />
                      </span>
                    );
                  })}
                </div>
              ) : null}

              {jogo === 'duelo' && rodada && rodada.jogo === 'duelo' && rodada.status !== 'ativa' ? (
                <div className="gambler-duelo">
                  <div><small>Sua carta</small><span>{nomeCarta(rodada.resultado?.carta_jogador)}</span></div>
                  <Swords size={20} aria-hidden="true" />
                  <div><small>Gambler</small><span>{nomeCarta(rodada.resultado?.carta_gambler)}</span></div>
                </div>
              ) : null}

              {jogo === 'vinte_um' && rodada ? (
                <div className="gambler-blackjack">
                  <div><small>Gambler · {rodada.estado.valor_banqueiro}</small><div>{(rodada.estado.banqueiro || []).map((carta: string, index: number) => <span key={`${carta}-${index}`}>{carta}</span>)}</div></div>
                  <div><small>Sua mão · {rodada.estado.valor_jogador}</small><div>{(rodada.estado.jogador || []).map((carta: string, index: number) => <span key={`${carta}-${index}`}>{carta}</span>)}</div></div>
                </div>
              ) : null}

              {revelando && jogo !== 'vinte_um' ? (
                <motion.div
                  className="gambler-result gambler-result--suspense"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <LoaderCircle className="gambler-casino__spinner" size={20} />
                  <strong>A mesa decide…</strong>
                </motion.div>
              ) : rodada && rodada.jogo === jogo && rodada.status !== 'ativa' ? (
                <motion.div
                  initial={{ opacity: 0, scale: .9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 20 }}
                  className={`gambler-result${ganhou(rodada) ? ' gambler-result--win' : ''}${rodada.pagamento - rodada.aposta >= 50 ? ' gambler-result--grande' : ''}`}
                >
                  <strong>{textoResultado(rodada, estado.simbolos_rolos)}</strong>
                  <span>Aposta: {rodada.aposta} · Pagamento: {rodada.pagamento} fichas</span>
                </motion.div>
              ) : null}

              {erro ? <p className="gambler-table__error" role="alert">{erro}</p> : null}

              {vinteUmAtivo ? (
                <div className="gambler-table__actions">
                  <button type="button" onClick={() => agirVinteUm('comprar')} disabled={jogando}>Comprar</button>
                  <button type="button" onClick={() => agirVinteUm('parar')} disabled={jogando}>Parar</button>
                  <button type="button" onClick={() => agirVinteUm('dobrar')} disabled={jogando || !rodada?.estado?.pode_dobrar}>Dobrar</button>
                  <button type="button" className="is-quiet" onClick={abandonarVinteUm} disabled={jogando}>
                    {confirmandoDesistencia ? `Confirmar perda de ${rodada.aposta}` : 'Desistir da rodada'}
                  </button>
                </div>
              ) : (
                <div className="gambler-table__bet">
                  <label>Aposta
                    <span><CircleDot size={15} /><input type="number" min={estado.limites.aposta_minima} max={estado.limites.aposta_maxima} step="1" value={aposta} onChange={event => setAposta(Number(event.target.value))} onBlur={() => setAposta(valorAposta)} /> fichas</span>
                  </label>
                  <button type="button" className="gambler-table__play" onClick={executar} disabled={jogando || estado.saldo_fichas < valorAposta}>
                    {jogando ? <LoaderCircle className="gambler-casino__spinner" size={18} /> : <Play size={17} />}
                    {rodada && rodada.jogo === jogo ? 'Jogar novamente' : 'Confirmar aposta'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default GamblerCasinoPage;
