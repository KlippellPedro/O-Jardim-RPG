import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { sfx } from '../../utils/audioSynth';
import { descobertasApi } from '../../services/descobertasApi';
import { useAuthStore } from '../../store/useAuthStore';
import { PALAVRAS_SECRETAS, SEQUENCIA_KONAMI, chaveDaTecla, ehMadrugada, sequenciaCompleta } from './gatilhos';

const JANELA_CLIQUES_MS = 5000;
const OCIOSO_HOME_MS = 90_000;
const DURACAO_AVISO_MS = 4200;

interface IAviso { chave: string; nome: string; raridade: 'comum' | 'rara' }

/**
 * Ouve os gatilhos das coisas escondidas (cliques repetidos em elementos marcados,
 * teclas, hora da madrugada, ficar parado na Home) e avisa o servidor. O servidor só
 * valida a chave; onde cada coisa está nunca aparece na tela.
 */
export const DescobertasHost = memo(function DescobertasHost() {
  const usuarioId = useAuthStore((estado) => (estado.usuario as { id?: string } | null)?.id ?? '');
  const { pathname } = useLocation();
  const conhecidas = useRef<Set<string>>(new Set());
  const enviando = useRef<Set<string>>(new Set());
  const [fila, setFila] = useState<IAviso[]>([]);
  const atual = fila[0] ?? null;

  const registrar = useCallback((chave: string) => {
    if (!usuarioId || conhecidas.current.has(chave) || enviando.current.has(chave)) return;
    enviando.current.add(chave);
    descobertasApi.registrar(chave)
      .then((resposta) => {
        conhecidas.current.add(chave);
        if (resposta.nova) setFila((anterior) => [...anterior, { chave, nome: resposta.nome, raridade: resposta.raridade }]);
      })
      .catch(() => undefined)
      .finally(() => enviando.current.delete(chave));
  }, [usuarioId]);

  // O que eu já achei, para não repetir chamadas.
  useEffect(() => {
    if (!usuarioId) return undefined;
    let ativo = true;
    descobertasApi.minhas()
      .then((resposta) => { if (ativo) resposta.achadas.forEach((chave) => conhecidas.current.add(chave)); })
      .catch(() => undefined);
    return () => { ativo = false; };
  }, [usuarioId]);

  // Coruja da madrugada: uma visita entre 03:00 e 04:59.
  useEffect(() => {
    if (usuarioId && ehMadrugada(new Date())) registrar('coruja');
  }, [usuarioId, pathname, registrar]);

  // Contemplativo: ficar parado na Home.
  useEffect(() => {
    if (!usuarioId || pathname !== '/') return undefined;
    const timer = window.setTimeout(() => registrar('contemplativo'), OCIOSO_HOME_MS);
    const reiniciar = () => window.clearTimeout(timer);
    window.addEventListener('pointerdown', reiniciar, { once: true });
    window.addEventListener('keydown', reiniciar, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', reiniciar);
      window.removeEventListener('keydown', reiniciar);
    };
  }, [usuarioId, pathname, registrar]);

  // Teclas (sequência antiga e palavra) e cliques repetidos em elementos marcados.
  useEffect(() => {
    if (!usuarioId) return undefined;
    let teclas: string[] = [];
    const cliques = new Map<string, { total: number; desde: number }>();

    const aoTeclar = (evento: KeyboardEvent) => {
      const alvo = evento.target as HTMLElement | null;
      if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable)) return;
      teclas = [...teclas, chaveDaTecla(evento.key)].slice(-12);
      if (sequenciaCompleta(teclas, SEQUENCIA_KONAMI)) registrar('velho_truque');
      PALAVRAS_SECRETAS.forEach(({ palavra, chave }) => {
        if (sequenciaCompleta(teclas, Array.from(palavra))) registrar(chave);
      });
    };

    const aoClicar = (evento: MouseEvent) => {
      const marcado = (evento.target as HTMLElement | null)?.closest<HTMLElement>('[data-descoberta]');
      const chave = marcado?.dataset.descoberta;
      if (!marcado || !chave) return;
      const alvo = Number(marcado.dataset.cliques) || 5;
      const agora = Date.now();
      const anterior = cliques.get(chave);
      const registro = anterior && agora - anterior.desde <= JANELA_CLIQUES_MS ? anterior : { total: 0, desde: agora };
      registro.total += 1;
      cliques.set(chave, registro);
      if (registro.total >= alvo) {
        cliques.delete(chave);
        registrar(chave);
      }
    };

    window.addEventListener('keydown', aoTeclar);
    window.addEventListener('click', aoClicar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      window.removeEventListener('click', aoClicar);
    };
  }, [usuarioId, registrar]);

  useEffect(() => {
    if (!atual) return undefined;
    sfx.play('estrela');
    const timer = window.setTimeout(() => setFila((anterior) => anterior.slice(1)), DURACAO_AVISO_MS);
    return () => window.clearTimeout(timer);
  }, [atual]);

  if (!atual) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex justify-center px-4" aria-live="polite">
      <button
        type="button"
        onClick={() => setFila((anterior) => anterior.slice(1))}
        className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-violet-300/40 bg-[#14101f]/95 px-4 py-3 text-left shadow-[0_0_30px_rgba(167,139,250,0.35)]"
      >
        <Sparkles size={22} className="shrink-0 text-violet-300" aria-hidden="true" />
        <span>
          <small className="block text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">Você descobriu algo escondido{atual.raridade === 'rara' ? ' (raro)' : ''}</small>
          <strong className="text-sm text-white">{atual.nome}</strong>
        </span>
      </button>
    </div>,
    document.body,
  );
});

export default DescobertasHost;
