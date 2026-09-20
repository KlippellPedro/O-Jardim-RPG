import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { obterTemaPorId } from '../../../redesign/themeMap';
import { inscreverSubidaNivel, type SubidaNivel } from './subidaNivel';
import {
  definirVozGrandeSabioLigada,
  falarSequencia,
  vozGrandeSabioDisponivel,
  vozGrandeSabioLigada,
  type PassoFala,
} from './vozGrandeSabio';
import './subidaNivel.css';

const HEXAGONO = '50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5';
const INTERVALO_SEM_VOZ_MS = 900;
const DURACAO_SEM_VOZ_MS = 650;
const PAUSA_FINAL_MS = 2800;
const LIMITE_COM_VOZ_MS = 45000;
const MS_POR_LETRA = 32;
const ROTULOS = ['Poder', 'Habilidade final', 'Habilidade', 'Grau de perícia', 'Evento', 'Recompensa'];

const semMovimento = () => (
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  || document.documentElement.dataset.performanceMode === 'reduced'
);

const sinal = (valor: number) => (valor > 0 ? `+${valor}` : String(valor));

interface LinhaPainel {
  rotulo: string;
  texto: string;
  passo: PassoFala;
}

/** Monta as linhas mostradas. O texto de cada passo é também a chave da frase
 * gravada (ver tools/gerar-voz-sabio.py), então precisa sair idêntico. */
const montarPainel = (subida: SubidaNivel): { titulo: PassoFala; linhas: LinhaPainel[] } => {
  const titulo: PassoFala = { texto: `Nível ${subida.nivelTotal} alcançado` };
  const linhas: LinhaPainel[] = [];

  linhas.push(subida.classeNova
    ? {
      rotulo: 'Classe',
      texto: subida.nomeClasse,
      passo: { texto: `Nova classe: ${subida.nomeClasse}` },
    }
    : {
      rotulo: 'Classe',
      texto: `${subida.nomeClasse} chegou ao nível ${subida.nivelClasse}`,
      passo: { texto: `${subida.nomeClasse} chegou ao nível ${subida.nivelClasse}` },
    });

  const recurso = (rotulo: string, ganho: number) => {
    if (!ganho) return;
    linhas.push({
      rotulo,
      texto: sinal(ganho),
      passo: { texto: `${rotulo} ${sinal(ganho)}` },
    });
  };
  recurso('Vida', subida.ganhoVida);
  recurso('Mana', subida.ganhoMana);

  subida.recompensas.forEach((recompensa) => {
    const rotulo = ROTULOS.find((item) => recompensa.startsWith(`${item}: `));
    const nome = rotulo ? recompensa.slice(rotulo.length + 2) : recompensa;
    linhas.push({
      rotulo: rotulo || 'Recompensa',
      texto: nome,
      passo: { texto: recompensa },
    });
  });

  return { titulo, linhas };
};

/** Escreve o texto letra a letra, no tempo da fala. */
const Digitado = ({ texto, duracaoMs, parado }: { texto: string; duracaoMs: number; parado: boolean }) => {
  const [letras, setLetras] = useState(parado ? texto.length : 0);

  useEffect(() => {
    if (parado) { setLetras(texto.length); return undefined; }
    setLetras(0);
    const total = Math.max(texto.length, 1);
    const passo = Math.min(MS_POR_LETRA, Math.max(14, (duracaoMs * 0.85) / total));
    const intervalo = window.setInterval(() => {
      setLetras((atual) => {
        if (atual >= total) { window.clearInterval(intervalo); return atual; }
        return atual + 1;
      });
    }, passo);
    return () => window.clearInterval(intervalo);
  }, [texto, duracaoMs, parado]);

  return (
    <>
      {texto.slice(0, letras)}
      {letras < texto.length && <span className="sabio__cursor" aria-hidden="true" />}
    </>
  );
};

/** Painel de subida de nível no estilo "Grande Sábio": janela holográfica,
 * hexágonos girando e o texto sendo digitado enquanto a voz lê cada linha.
 * Mostra só o que a ficha realmente concedeu. Clique, Esc ou Enter fecham. */
export const SubidaNivelHost = memo(function SubidaNivelHost() {
  const [subida, setSubida] = useState<SubidaNivel | null>(null);
  const [vozLigada, setVozLigada] = useState(vozGrandeSabioLigada);
  const vozDisponivel = vozGrandeSabioDisponivel();
  // Passo já iniciado e duração de cada um (0 = título, 1.. = linhas)
  const [passoAtual, setPassoAtual] = useState(-1);
  const [duracoes, setDuracoes] = useState<number[]>([]);

  const painel = useMemo(() => (subida ? montarPainel(subida) : null), [subida]);

  useEffect(() => inscreverSubidaNivel(setSubida), []);

  useEffect(() => {
    if (!subida || !painel) return undefined;
    const fechar = () => setSubida(null);
    const passos = [painel.titulo, ...painel.linhas.map((linha) => linha.passo)];
    const timers: number[] = [];
    let pararVoz: () => void = () => undefined;
    setPassoAtual(-1);
    setDuracoes([]);

    const iniciar = (indice: number, duracaoMs: number) => {
      setDuracoes((atual) => { const proximo = [...atual]; proximo[indice] = duracaoMs; return proximo; });
      setPassoAtual((atual) => Math.max(atual, indice));
    };

    if (vozDisponivel && vozLigada) {
      let terminou = false;
      // Se a voz não avisar o primeiro passo, mostra tudo em vez de deixar a tela vazia.
      timers.push(window.setTimeout(() => {
        if (!terminou) setPassoAtual((atual) => (atual < 0 ? passos.length : atual));
      }, 4000));
      timers.push(window.setTimeout(fechar, LIMITE_COM_VOZ_MS));
      pararVoz = falarSequencia(passos, {
        aoIniciarPasso: iniciar,
        aoTerminar: () => { terminou = true; timers.push(window.setTimeout(fechar, PAUSA_FINAL_MS)); },
      });
    } else {
      passos.forEach((_, indice) => {
        timers.push(window.setTimeout(() => iniciar(indice, DURACAO_SEM_VOZ_MS), 500 + indice * INTERVALO_SEM_VOZ_MS));
      });
      timers.push(window.setTimeout(fechar, 500 + passos.length * INTERVALO_SEM_VOZ_MS + PAUSA_FINAL_MS));
    }

    const aoTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' || evento.key === 'Enter' || evento.key === ' ') fechar();
    };
    document.addEventListener('keydown', aoTecla, true);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      pararVoz();
      document.removeEventListener('keydown', aoTecla, true);
    };
  }, [subida, painel, vozLigada, vozDisponivel]);

  const alternarVoz = () => {
    const nova = !vozLigada;
    definirVozGrandeSabioLigada(nova);
    setVozLigada(nova);
  };

  if (!subida || !painel) return null;

  const tema = obterTemaPorId(subida.classeId);
  const parado = semMovimento();

  return createPortal(
    <div
      role="dialog"
      aria-label={`Nível ${subida.nivelTotal} alcançado`}
      className={`sabio${parado ? ' sabio--parado' : ''}${subida.especial ? ' sabio--especial' : ''}`}
      style={{ '--sub-cor': tema.primary, '--sub-cor2': tema.secondary } as CSSProperties}
      onClick={() => setSubida(null)}
    >
      <div className="sabio__grade" aria-hidden="true" />
      <div className="sabio__varredura" aria-hidden="true" />

      <div className="sabio__janela">
        <span className="sabio__canto sabio__canto--se" aria-hidden="true" />
        <span className="sabio__canto sabio__canto--sd" aria-hidden="true" />
        <span className="sabio__canto sabio__canto--ie" aria-hidden="true" />
        <span className="sabio__canto sabio__canto--id" aria-hidden="true" />

        <div className="sabio__topo">
          <span className="sabio__ponto" aria-hidden="true" />
          <span>Grande Sábio</span>
          <span className="sabio__topo-direita">Análise concluída</span>
        </div>

        <div className="sabio__heroi" aria-hidden="true">
          <span className="sabio__pulso" />
          <span className="sabio__pulso sabio__pulso--2" />
          <svg viewBox="0 0 100 100">
            <polygon className="sabio__hex sabio__hex--1" points={HEXAGONO} />
            <polygon className="sabio__hex sabio__hex--2" points={HEXAGONO} />
            <polygon className="sabio__hex sabio__hex--3" points={HEXAGONO} />
          </svg>
          <span className="sabio__numero">{subida.nivelTotal}</span>
        </div>

        <div className="sabio__titulo">
          {passoAtual >= 0 && (
            <Digitado texto={painel.titulo.texto} duracaoMs={duracoes[0] ?? 800} parado={parado} />
          )}
        </div>

        <ul className="sabio__lista">
          {painel.linhas.map((linha, indice) => {
            const visivel = passoAtual >= indice + 1;
            return (
              <li key={`${indice}-${linha.texto}`} className={`sabio__linha${visivel ? ' sabio__linha--visivel' : ''}`}>
                <span className="sabio__rotulo">{linha.rotulo}</span>
                <span className="sabio__texto">
                  {visivel && <Digitado texto={linha.texto} duracaoMs={duracoes[indice + 1] ?? 600} parado={parado} />}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="sabio__rodape">
          {vozDisponivel && (
            <button
              type="button"
              className="sabio__voz"
              aria-pressed={vozLigada}
              onClick={(evento) => { evento.stopPropagation(); alternarVoz(); }}
            >
              {vozLigada ? 'Voz ligada' : 'Voz desligada'}
            </button>
          )}
          <span className="sabio__dica">Clique para fechar</span>
        </div>
      </div>
    </div>,
    document.body,
  );
});
