import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { sfx } from '../../../utils/audioSynth';
import { semMovimento } from '../../../utils/movimento';
import { posicaoDaEstrela } from '../utils/constelacaoClasse';
import { corDoEmblema, EmblemaDoCartao } from './EmblemaDoCartao';
import './nascimentoDoPersonagem.css';

export interface DadosDoNascimento {
  id: string;
  nome: string;
  racaId: string;
  racaTitulo: string;
  classeId: string;
  classeTitulo: string;
  arvoreId: string;
  arvoreNome: string;
}

interface NascimentoDoPersonagemProps {
  dados: DadosDoNascimento;
  onAbrirFicha: () => void;
  onVoltar: () => void;
}

const NIVEIS = Array.from({ length: 20 }, (_, indice) => indice + 1);

/** A cerimônia depois de "Finalizar Criação": os 20 níveis da classe aparecem como um céu apagado e a primeira estrela
 * acende, na cor da classe. Tudo é decoração em cima de uma tela que sempre traz os dois caminhos (abrir a ficha ou
 * voltar à lista); com movimento reduzido ou celebrações desligadas ela aparece pronta, sem animar. */
export function NascimentoDoPersonagem({ dados, onAbrirFicha, onVoltar }: NascimentoDoPersonagemProps) {
  const cor = useMemo(() => corDoEmblema('classe', dados.classeId), [dados.classeId]);
  const estatico = useMemo(() => semMovimento(), []);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const caixaRef = useRef<HTMLDivElement>(null);
  // A tela de baixo pode redesenhar durante a cerimônia (a lista de fichas atualiza): o efeito não pode refazer o foco por isso.
  const voltarRef = useRef(onVoltar);
  voltarRef.current = onVoltar;

  useEffect(() => {
    // O som acompanha a luz: o acorde quando o céu surge e a assinatura da classe quando a primeira estrela acende.
    sfx.play('amanhecer');
    const timer = window.setTimeout(() => sfx.play('estrela'), estatico ? 0 : 900);
    return () => window.clearTimeout(timer);
  }, [estatico]);

  useEffect(() => {
    const atraso = window.setTimeout(() => botaoRef.current?.focus({ preventScroll: true }), estatico ? 0 : 1900);
    // O assistente por baixo não escuta mais teclas: Esc volta à lista e Tab fica só nestes dois botões.
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        evento.stopPropagation();
        voltarRef.current();
        return;
      }
      if (evento.key !== 'Tab') return;
      const botoes = Array.from(caixaRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
      if (!botoes.length) return;
      evento.stopPropagation();
      const primeiro = botoes[0];
      const ultimo = botoes[botoes.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar, true);
    return () => {
      window.clearTimeout(atraso);
      document.removeEventListener('keydown', aoTeclar, true);
    };
  }, [estatico]);

  const estilo = { '--nasc-cor': cor.principal, '--nasc-brilho': cor.brilho } as CSSProperties;

  return (
    <div
      ref={caixaRef}
      className={`nascimento${estatico ? ' nascimento--estatico' : ''}`}
      style={estilo}
      role="dialog"
      aria-modal="true"
      aria-labelledby="nascimento-titulo"
    >
      <div className="nascimento__brilho" aria-hidden="true" />

      <div className="nascimento__ceu" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="nascimento__linhas">
          {NIVEIS.slice(1).map((nivel) => {
            const de = posicaoDaEstrela(nivel - 1);
            const para = posicaoDaEstrela(nivel);
            return (
              <line
                key={nivel}
                x1={de.x}
                y1={de.y}
                x2={para.x}
                y2={para.y}
                vectorEffect="non-scaling-stroke"
                className="nascimento__linha"
                style={{ animationDelay: `${0.25 + nivel * 0.06}s` }}
              />
            );
          })}
        </svg>
        {NIVEIS.map((nivel) => {
          const { x, y } = posicaoDaEstrela(nivel);
          return (
            <span
              key={nivel}
              className={`nascimento__estrela${nivel === 1 ? ' nascimento__estrela--primeira' : ''}`}
              style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${nivel === 1 ? 0.7 : 0.15 + nivel * 0.06}s` }}
            />
          );
        })}
      </div>

      <div className="nascimento__texto">
        <p className="nascimento__selo">Nasce um personagem</p>
        <h2 id="nascimento-titulo" className="nascimento__nome">{dados.nome}</h2>
        <div className="nascimento__emblemas">
          <EmblemaDoCartao tipo="arvore" id={dados.arvoreId} ativo />
          <EmblemaDoCartao tipo="raca" id={dados.racaId} ativo />
          <EmblemaDoCartao tipo="classe" id={dados.classeId} ativo />
        </div>
        <p className="nascimento__origem">{dados.racaTitulo} · {dados.classeTitulo}</p>
        <p className="nascimento__arvore">{dados.arvoreNome}</p>

        <div className="nascimento__acoes">
          <button ref={botaoRef} type="button" className="nascimento__botao nascimento__botao--principal" onClick={onAbrirFicha}>
            Abrir a ficha <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button type="button" className="nascimento__botao" onClick={onVoltar}>Voltar à lista</button>
        </div>
      </div>
    </div>
  );
}
