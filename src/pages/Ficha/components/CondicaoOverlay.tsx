import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CONDICOES_OFICIAIS } from '../../../../data/regras/condicoes';
import './condicaoOverlay.css';

type Efeito = 'pulso' | 'lento' | 'tremor' | 'escuro' | 'estatica';

interface Estilo {
  cor: string;
  efeito: Efeito;
  /** Quanto menor, mais importante: as duas primeiras condições ativas mandam. */
  prioridade: number;
}

// Cada condição oficial ganha uma cor e um jeito de "respirar" na borda da ficha.
const ESTILOS: Record<string, Estilo> = {
  inconsciente: { cor: '#1e3a8a', efeito: 'escuro', prioridade: 0 },
  cego: { cor: '#000000', efeito: 'escuro', prioridade: 1 },
  atordoado: { cor: '#facc15', efeito: 'estatica', prioridade: 2 },
  'crise-furia': { cor: '#f97316', efeito: 'pulso', prioridade: 3 },
  'crise-panico': { cor: '#c4b5fd', efeito: 'tremor', prioridade: 3 },
  'crise-paranoia': { cor: '#4ade80', efeito: 'tremor', prioridade: 3 },
  'crise-dissociacao': { cor: '#5eead4', efeito: 'lento', prioridade: 3 },
  'crise-catatonia': { cor: '#94a3b8', efeito: 'lento', prioridade: 3 },
  'crise-compulsao': { cor: '#e879f9', efeito: 'pulso', prioridade: 3 },
  sangramento: { cor: '#dc2626', efeito: 'pulso', prioridade: 4 },
  amedrontado: { cor: '#a78bfa', efeito: 'tremor', prioridade: 5 },
  agarrado: { cor: '#7c8ca3', efeito: 'lento', prioridade: 6 },
  imobilizado: { cor: '#7c8ca3', efeito: 'lento', prioridade: 6 },
  caido: { cor: '#a16207', efeito: 'lento', prioridade: 7 },
  exposto: { cor: '#fb923c', efeito: 'pulso', prioridade: 8 },
  surpreendido: { cor: '#fbbf24', efeito: 'pulso', prioridade: 8 },
  concentrando: { cor: '#22d3ee', efeito: 'lento', prioridade: 9 },
};

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// "Pânico" ou "panico" também chegam sem o prefixo "crise-".
const ALIAS = new Map<string, string>(
  CONDICOES_OFICIAIS.flatMap((condicao) => [
    [condicao.id, condicao.id] as [string, string],
    [semAcento(condicao.titulo), condicao.id] as [string, string],
  ]),
);

const idsAtivos = (condicoes: unknown): string[] => {
  if (!Array.isArray(condicoes)) return [];
  const ids = condicoes.flatMap((item) => {
    const crus = typeof item === 'string' ? [item] : [item?.id, item?.nome, item?.titulo];
    return crus
      .filter((valor): valor is string => typeof valor === 'string')
      .map((valor) => ALIAS.get(semAcento(valor)) ?? semAcento(valor));
  });
  return [...new Set(ids)].filter((id) => ESTILOS[id]);
};

const tituloDe = (id: string) => CONDICOES_OFICIAIS.find((condicao) => condicao.id === id)?.titulo ?? id;

/** Borda da ficha na cor das condições ativas (as duas mais importantes) e um
 * aviso rápido quando uma condição nova entra. Só apresentação. */
export const CondicaoOverlay = memo(function CondicaoOverlay({ condicoes }: { condicoes: unknown }) {
  const ids = useMemo(() => idsAtivos(condicoes).sort((a, b) => ESTILOS[a].prioridade - ESTILOS[b].prioridade), [condicoes]);
  const anteriores = useRef<Set<string> | null>(null);
  const [nova, setNova] = useState<{ chave: number; id: string } | null>(null);

  useEffect(() => {
    const atual = new Set(ids);
    const antes = anteriores.current;
    anteriores.current = atual;
    if (!antes) return undefined; // primeira leitura: não comemora o que já estava
    const entrou = ids.find((id) => !antes.has(id));
    if (!entrou) return undefined;
    setNova({ chave: Date.now(), id: entrou });
    const timer = window.setTimeout(() => setNova(null), 2200);
    return () => window.clearTimeout(timer);
  }, [ids]);

  const principais = ids.slice(0, 2);
  if (!principais.length && !nova) return null;

  return (
    <div className="condicao-overlay performance-decorative" aria-hidden="true">
      {principais.map((id, indice) => (
        <div
          key={id}
          className={`condicao-overlay__borda condicao-overlay__borda--${ESTILOS[id].efeito}`}
          style={{ '--cond-cor': ESTILOS[id].cor, '--cond-nivel': indice === 0 ? 1 : 0.55 } as CSSProperties}
        />
      ))}
      {nova ? (
        <div key={nova.chave} className="condicao-overlay__aviso" style={{ '--cond-cor': ESTILOS[nova.id].cor } as CSSProperties}>
          <span>{tituloDe(nova.id)}</span>
        </div>
      ) : null}
    </div>
  );
});
