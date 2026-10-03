import { Layers, Sprout } from 'lucide-react';
import {
  rotuloEfeitoEquipamento,
  type IResumoEquipamento,
} from '../../../services/equipamentoService';

interface ResumoFormasEConjuntosProps {
  resumo: Pick<IResumoEquipamento, 'formas' | 'conjuntos'>;
}

/**
 * No Inventário: a forma de agora de cada item que desperta com o dono e o
 * progresso de cada conjunto com peça equipada. Só lê o resumo da ficha.
 */
export function ResumoFormasEConjuntos({ resumo }: ResumoFormasEConjuntosProps) {
  const { formas, conjuntos } = resumo;
  if (formas.length === 0 && conjuntos.length === 0) return null;

  return (
    <div data-testid="resumo-formas-conjuntos" className="mt-3 flex flex-col gap-2">
      {formas.map(({ itemId, itemNome, atual, proxima }) => (
        <div key={itemId} className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300"><Sprout size={16} /></span>
            <div className="min-w-0">
              <strong className="block text-sm text-emerald-100">{itemNome}: {atual.titulo}</strong>
              <p className="mt-0.5 text-xs leading-5 text-gray-400">
                {atual.efeitos.map(rotuloEfeitoEquipamento).join(', ')}
              </p>
              {proxima ? (
                <p className="mt-0.5 text-[11px] leading-5 text-gray-500">Próxima forma no nível total {proxima.nivel}: {proxima.titulo}.</p>
              ) : (
                <p className="mt-0.5 text-[11px] leading-5 text-gray-500">Já está na última forma.</p>
              )}
            </div>
          </div>
        </div>
      ))}
      {conjuntos.map(({ conjunto, equipadas, ativos, proximo }) => (
        <div key={conjunto.id} className="rounded-xl border border-sky-400/15 bg-sky-400/[0.04] p-3">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/[0.08] text-sky-300"><Layers size={16} /></span>
            <div className="min-w-0">
              <strong className="block text-sm text-sky-100">{conjunto.titulo}: {equipadas.length} de {conjunto.pecas.length} peças</strong>
              {ativos.length > 0 ? (
                <ul className="mt-0.5 text-xs leading-5 text-gray-400">
                  {ativos.map((bonus) => <li key={bonus.pecas}>{bonus.pecas} peças: {bonus.efeitos.map(rotuloEfeitoEquipamento).join(', ')}</li>)}
                </ul>
              ) : null}
              {proximo ? (
                <p className="mt-0.5 text-[11px] leading-5 text-gray-500">Com {proximo.pecas} peças: {proximo.efeitos.map(rotuloEfeitoEquipamento).join(', ')}.</p>
              ) : (
                <p className="mt-0.5 text-[11px] leading-5 text-gray-500">Conjunto completo.</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
