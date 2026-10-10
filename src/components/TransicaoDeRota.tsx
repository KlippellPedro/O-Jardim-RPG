import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { chaveDeTransicao } from '../utils/transicaoDeRota';
import './transicaoDeRota.css';

/** Envolve as rotas: cada tela nova entra com um fade curto, em vez do corte seco. */
export function TransicaoDeRota({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <div key={chaveDeTransicao(pathname)} className="rota-transicao">{children}</div>;
}
