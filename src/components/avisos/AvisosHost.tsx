import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from 'lucide-react';
import { sfx } from '../../utils/audioSynth';
import { useDialogAccessibility } from '../../hooks/useDialogAccessibility';
import { dispensarAviso, inscreverAvisos, lerAvisos, type Aviso, type TipoDeAviso } from './avisos';
import {
  cancelarConfirmacoes,
  inscreverConfirmacoes,
  pedidoAtual,
  responderConfirmacao,
  type PedidoDeConfirmacao,
  type RespostaDeConfirmacao,
} from './confirmacao';
import './avisos.css';

const ICONE_DO_TIPO: Record<TipoDeAviso, typeof Info> = {
  sucesso: CheckCircle2,
  info: Info,
  aviso: AlertTriangle,
  erro: OctagonAlert,
};

const TITULO_PADRAO: Record<TipoDeAviso, string> = {
  sucesso: 'Pronto',
  info: 'Aviso',
  aviso: 'Atenção',
  erro: 'Algo deu errado',
};

/** Um aviso na pilha: fecha sozinho, pausa o relógio com o mouse ou o foco em cima, e roda o botão (ex.: Desfazer). */
const ItemDeAviso = ({ aviso }: { aviso: Aviso }) => {
  const reduzir = useReducedMotion();
  const [ocupado, setOcupado] = useState(false);
  const Icone = ICONE_DO_TIPO[aviso.tipo];
  const fechar = useCallback(() => dispensarAviso(aviso.id), [aviso.id]);

  const restante = useRef(aviso.duracaoMs);
  const inicio = useRef(0);
  const timer = useRef(0);
  const armar = useCallback((ms: number) => {
    window.clearTimeout(timer.current);
    if (!aviso.duracaoMs) return;
    inicio.current = Date.now();
    restante.current = ms;
    timer.current = window.setTimeout(fechar, ms);
  }, [aviso.duracaoMs, fechar]);
  const pausar = useCallback(() => {
    if (!aviso.duracaoMs) return;
    window.clearTimeout(timer.current);
    restante.current = Math.max(0, restante.current - (Date.now() - inicio.current));
  }, [aviso.duracaoMs]);
  const retomar = useCallback(() => {
    // Quem voltou a ler ganha pelo menos um respiro, mesmo que o relógio estivesse no fim.
    armar(Math.max(1500, restante.current));
  }, [armar]);

  // Chegou de novo (mesmo aviso repetido): o relógio recomeça do zero.
  useEffect(() => {
    armar(aviso.duracaoMs);
    return () => window.clearTimeout(timer.current);
  }, [armar, aviso.duracaoMs, aviso.versao]);

  // Erro chama atenção com o som de erro; os outros avisos chegam em silêncio.
  useEffect(() => {
    if (aviso.tipo === 'erro') sfx.play('error');
  }, [aviso.tipo, aviso.versao]);

  const acionar = async () => {
    if (!aviso.acao || ocupado) return;
    setOcupado(true);
    try {
      await aviso.acao.aoClicar();
    } finally {
      fechar();
    }
  };

  return (
    <motion.div
      layout={!reduzir}
      initial={reduzir ? false : { opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduzir ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      role={aviso.tipo === 'erro' ? 'alert' : 'status'}
      className={`aviso aviso--${aviso.tipo} performance-expensive-effects`}
      style={{ ['--aviso-duracao' as string]: `${aviso.duracaoMs}ms` }}
      onMouseEnter={pausar}
      onMouseLeave={retomar}
      onFocus={pausar}
      onBlur={retomar}
    >
      <span className="aviso__icone" aria-hidden="true"><Icone size={17} /></span>
      <div className="aviso__corpo">
        <p className="aviso__titulo">{aviso.titulo ?? TITULO_PADRAO[aviso.tipo]}</p>
        <p className="aviso__texto">{aviso.texto}</p>
        {aviso.repeticoes > 0 ? <span className="aviso__repeticoes">repetiu {aviso.repeticoes + 1} vezes</span> : null}
        {aviso.acao ? (
          <button type="button" className="aviso__acao" disabled={ocupado} data-sfx="select" onClick={() => void acionar()}>
            {aviso.acao.rotulo}
          </button>
        ) : null}
      </div>
      <button type="button" className="aviso__fechar" onClick={fechar} data-sfx="close" aria-label="Fechar aviso">
        <X size={15} />
      </button>
      {aviso.duracaoMs ? <span key={aviso.versao} className="aviso__tempo" aria-hidden="true" /> : null}
    </motion.div>
  );
};

const PilhaDeAvisos = ({ avisos }: { avisos: readonly Aviso[] }) => (
  <div className="avisos-pilha" role="region" aria-label="Avisos">
    <AnimatePresence initial={false}>
      {avisos.map((aviso) => <ItemDeAviso key={aviso.id} aviso={aviso} />)}
    </AnimatePresence>
  </div>
);

/** O diálogo que substitui o `window.confirm`: foco preso, Esc cancela, clique fora cancela. */
const DialogoDeConfirmacao = ({ pedido }: { pedido: PedidoDeConfirmacao }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const confirmarRef = useRef<HTMLButtonElement>(null);
  const tituloId = useId();
  const textoId = useId();
  const perigo = pedido.tom === 'perigo';
  const responder = useCallback((resposta: RespostaDeConfirmacao) => responderConfirmacao(pedido.id, resposta), [pedido.id]);

  // O Esc é tratado na fase de captura: outros diálogos por baixo (a ficha, um painel) também
  // escutam o Esc no documento, e sem isto fechariam junto com a pergunta.
  useDialogAccessibility({
    open: true,
    dialogRef,
    closeOnEscape: false,
    initialFocusRef: perigo ? cancelarRef : confirmarRef,
  });
  useEffect(() => {
    sfx.play('open');
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      evento.preventDefault();
      evento.stopImmediatePropagation();
      responder('cancelar');
    };
    window.addEventListener('keydown', aoTeclar, true);
    return () => window.removeEventListener('keydown', aoTeclar, true);
  }, [responder]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="confirmacao-fundo modal-viewport performance-expensive-effects"
      role="presentation"
      onMouseDown={(evento) => { if (evento.target === evento.currentTarget) responder('cancelar'); }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={textoId}
        className={`confirmacao${perigo ? ' confirmacao--perigo' : ''}`}
      >
        <div className="confirmacao__cabeca">
          <span className="confirmacao__icone" aria-hidden="true"><AlertTriangle size={18} /></span>
          <h2 id={tituloId} className="confirmacao__titulo">{pedido.titulo}</h2>
        </div>
        <p id={textoId} className="confirmacao__texto">{pedido.mensagem}</p>
        <div className="confirmacao__botoes">
          <button ref={cancelarRef} type="button" className="confirmacao__botao" data-sfx="cancel" onClick={() => responder('cancelar')}>
            {pedido.rotuloCancelar}
          </button>
          {pedido.alternativa ? (
            <button type="button" className="confirmacao__botao confirmacao__botao--alternativa" data-sfx="select" onClick={() => responder('alternativa')}>
              {pedido.alternativa.rotulo}
            </button>
          ) : null}
          <button ref={confirmarRef} type="button" className="confirmacao__botao confirmacao__botao--principal" data-sfx="confirm" onClick={() => responder('confirmar')}>
            {pedido.rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** Desenha os avisos e a confirmação do site. Fica uma vez só, dentro do roteador (precisa saber quando a tela troca). */
export function AvisosHost() {
  const avisos = useSyncExternalStore(inscreverAvisos, lerAvisos, lerAvisos);
  const pedido = useSyncExternalStore(inscreverConfirmacoes, pedidoAtual, pedidoAtual);
  const { pathname } = useLocation();

  useEffect(() => {
    cancelarConfirmacoes();
  }, [pathname]);

  return (
    <>
      <PilhaDeAvisos avisos={avisos} />
      {pedido ? <DialogoDeConfirmacao key={pedido.id} pedido={pedido} /> : null}
    </>
  );
}
