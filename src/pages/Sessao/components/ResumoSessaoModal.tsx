import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Clover, Crown, Flame, Skull, Sparkles, Swords, Wand2, X, Zap, type LucideIcon } from 'lucide-react';
import { sessaoApi, type ResumoSessaoResposta } from '../../../services/sessaoApi';
import { useNumeroAnimado } from '../../Ficha/components/numeroAnimado';
import { sfx } from '../../../utils/audioSynth';
import './resumoSessao.css';

const DURACAO_SLIDE_MS = 7000;

const ICONES: Record<string, LucideIcon> = {
  criticos: Crown,
  falhas: Skull,
  maior_dano: Swords,
  dano_total: Flame,
  sorte: Clover,
  azar: Skull,
  ativo: Zap,
  poder: Wand2,
};

// Um tom por slide, girando: cada cartão ganha sua cor, como num "Wrapped".
const TONS = ['#c7a44c', '#38bdf8', '#f472b6', '#a78bfa', '#34d399', '#fb923c', '#f87171', '#facc15'];

type Slide =
  | { tipo: 'intro' }
  | { tipo: 'mesa' }
  | { tipo: 'vazio' }
  | { tipo: 'destaque'; indice: number }
  | { tipo: 'ranking' };

const duracaoTexto = (minutos: number) => {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
};

const NumeroGrande = ({ valor, sufixo = '' }: { valor: number; sufixo?: string }) => {
  const exibido = useNumeroAnimado(valor, 1500);
  return <>{exibido}{sufixo}</>;
};

const NumeroDecimal = ({ valor }: { valor: number }) => {
  const exibido = useNumeroAnimado(Math.round(valor * 10), 1500);
  return <>{(exibido / 10).toFixed(1).replace('.', ',')}</>;
};

interface ResumoSessaoModalProps {
  sessaoId: string;
  onClose: () => void;
}

/** Resumo da noite, em cartões que avançam sozinhos (ou no toque): abertura,
 * os números da mesa, um destaque por cartão e o ranking. Só mostra números
 * e o que a sessão realmente registrou. Esc fecha; setas e toque navegam. */
export const ResumoSessaoModal = ({ sessaoId, onClose }: ResumoSessaoModalProps) => {
  const [resumo, setResumo] = useState<ResumoSessaoResposta | null>(null);
  const [erro, setErro] = useState('');
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    let ativo = true;
    sessaoApi.resumoDaSessao(sessaoId)
      .then((dados) => { if (ativo) setResumo(dados); })
      .catch(() => { if (ativo) setErro('Não foi possível montar o resumo desta sessão.'); });
    return () => { ativo = false; };
  }, [sessaoId]);

  const slides = useMemo<Slide[]>(() => {
    if (!resumo) return [];
    const lista: Slide[] = [{ tipo: 'intro' }];
    if (resumo.mesa.rolagens === 0 && resumo.destaques.length === 0) {
      lista.push({ tipo: 'vazio' });
      return lista;
    }
    lista.push({ tipo: 'mesa' });
    resumo.destaques.forEach((_, i) => lista.push({ tipo: 'destaque', indice: i }));
    if (resumo.jogadores.length > 1) lista.push({ tipo: 'ranking' });
    return lista;
  }, [resumo]);

  const avancar = useCallback(() => {
    setIndice((atual) => {
      if (atual >= slides.length - 1) return atual;
      sfx.play('navigate');
      return atual + 1;
    });
  }, [slides.length]);
  const voltar = useCallback(() => setIndice((atual) => Math.max(0, atual - 1)), []);

  useEffect(() => {
    const aoTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onClose();
      else if (evento.key === 'ArrowRight' || evento.key === ' ' || evento.key === 'Enter') { evento.preventDefault(); avancar(); }
      else if (evento.key === 'ArrowLeft') voltar();
    };
    document.addEventListener('keydown', aoTecla, true);
    return () => document.removeEventListener('keydown', aoTecla, true);
  }, [avancar, voltar, onClose]);

  useEffect(() => {
    if (!slides.length || pausado || indice >= slides.length - 1) return undefined;
    const timer = window.setTimeout(avancar, DURACAO_SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [indice, slides.length, pausado, avancar]);

  const slide = slides[indice];
  const tom = TONS[indice % TONS.length];

  return createPortal(
    <div
      className="resumo-sessao"
      role="dialog"
      aria-modal="true"
      aria-label="Resumo da sessão"
      style={{ '--resumo-tom': tom } as CSSProperties}
      onPointerDown={() => setPausado(true)}
      onPointerUp={() => setPausado(false)}
      onPointerLeave={() => setPausado(false)}
    >
      <div className="resumo-sessao__fundo" aria-hidden="true">
        <span /><span /><span />
      </div>

      {slides.length > 0 ? (
        <div className="resumo-sessao__progresso" aria-hidden="true">
          {slides.map((_, i) => (
            <span key={i} className={i < indice ? 'resumo-sessao__seg resumo-sessao__seg--feito' : i === indice ? 'resumo-sessao__seg resumo-sessao__seg--atual' : 'resumo-sessao__seg'}>
              <i key={`${i}-${pausado}`} style={i === indice && !pausado && i < slides.length - 1 ? { animationDuration: `${DURACAO_SLIDE_MS}ms` } : undefined} />
            </span>
          ))}
        </div>
      ) : null}

      <button type="button" className="resumo-sessao__fechar" onClick={onClose} aria-label="Fechar resumo">
        <X size={18} />
      </button>

      {/* Toque nas bordas navega: esquerda volta, direita avança */}
      <button type="button" className="resumo-sessao__zona resumo-sessao__zona--esq" onClick={voltar} aria-label="Cartão anterior" tabIndex={-1} />
      <button type="button" className="resumo-sessao__zona resumo-sessao__zona--dir" onClick={avancar} aria-label="Próximo cartão" tabIndex={-1} />

      <div className="resumo-sessao__palco">
        {erro ? <p className="resumo-sessao__mensagem">{erro}</p> : null}
        {!resumo && !erro ? <p className="resumo-sessao__mensagem">Montando o resumo...</p> : null}

        <AnimatePresence mode="wait">
          {resumo && slide ? (
            <motion.div
              key={`${slide.tipo}-${indice}`}
              className="resumo-sessao__cartao"
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {slide.tipo === 'intro' ? (
                <>
                  <small>Resumo da sessão</small>
                  <h2>{resumo.sessao.titulo || 'Sessão ao vivo'}</h2>
                  <p>
                    {duracaoTexto(resumo.sessao.duracao_min)}
                    {resumo.sessao.rodadas > 1 ? ` · ${resumo.sessao.rodadas} rodadas` : ''}
                    {resumo.mesa.jogadores > 0 ? ` · ${resumo.mesa.jogadores} ${resumo.mesa.jogadores === 1 ? 'jogador' : 'jogadores'}` : ''}
                  </p>
                  <span className="resumo-sessao__dica">Toque para avançar</span>
                </>
              ) : null}

              {slide.tipo === 'vazio' ? (
                <>
                  <Sparkles size={38} className="resumo-sessao__icone" />
                  <h2>Uma noite silenciosa</h2>
                  <p>Nenhuma rolagem foi registrada nesta sessão.</p>
                </>
              ) : null}

              {slide.tipo === 'mesa' ? (
                <>
                  <small>A mesa em números</small>
                  <div className="resumo-sessao__numeros">
                    <div><strong><NumeroGrande valor={resumo.mesa.rolagens} /></strong><span>rolagens</span></div>
                    <div><strong><NumeroGrande valor={resumo.mesa.criticos} /></strong><span>20 naturais</span></div>
                    <div><strong><NumeroGrande valor={resumo.mesa.falhas} /></strong><span>1 naturais</span></div>
                    {resumo.mesa.dano_total > 0 ? <div><strong><NumeroGrande valor={resumo.mesa.dano_total} /></strong><span>de dano</span></div> : null}
                    {resumo.mesa.usos > 0 ? <div><strong><NumeroGrande valor={resumo.mesa.usos} /></strong><span>poderes usados</span></div> : null}
                  </div>
                </>
              ) : null}

              {slide.tipo === 'destaque' ? (() => {
                const destaque = resumo.destaques[slide.indice];
                const Icone = ICONES[destaque.id] ?? Sparkles;
                const decimal = destaque.unidade.includes('média');
                return (
                  <>
                    <Icone size={40} className="resumo-sessao__icone" />
                    <small>{destaque.rotulo}</small>
                    <h2>{destaque.personagem}</h2>
                    <div className="resumo-sessao__valor">
                      {decimal ? <NumeroDecimal valor={destaque.valor} /> : <NumeroGrande valor={destaque.valor} />}
                      <span>{destaque.unidade}</span>
                    </div>
                    <p>{destaque.detalhe}</p>
                  </>
                );
              })() : null}

              {slide.tipo === 'ranking' ? (
                <>
                  <small>Quem mais agiu</small>
                  <div className="resumo-sessao__legenda" aria-hidden="true">
                    <span>Rolagens</span><span>20 nat.</span><span>Dano</span>
                  </div>
                  <ol className="resumo-sessao__ranking">
                    {resumo.jogadores.slice(0, 8).map((jogador, posicao) => (
                      <li key={jogador.nome} style={{ animationDelay: `${posicao * 0.09}s` }}>
                        <b>{posicao + 1}</b>
                        <span className="resumo-sessao__nome">{jogador.nome}</span>
                        <span title="Rolagens">{jogador.rolagens}</span>
                        <span title="20 naturais">{jogador.criticos}</span>
                        <span title="Dano total">{jogador.dano_total}</span>
                      </li>
                    ))}
                  </ol>
                </>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {slide && indice === slides.length - 1 ? (
        <button type="button" className="resumo-sessao__concluir" onClick={onClose}>Fechar resumo</button>
      ) : null}
    </div>,
    document.body,
  );
};
