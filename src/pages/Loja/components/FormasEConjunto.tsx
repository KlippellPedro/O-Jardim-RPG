import { Layers, Scale, Sprout } from 'lucide-react';
import { conjuntoDaPeca } from '../../../../data/regras/conjuntos';
import {
  formaAtualDoItem,
  normalizarFormasItem,
  rotuloEfeitoEquipamento,
  type IEfeitoEquipamento,
} from '../../../services/equipamentoService';

interface FormasEConjuntoProps {
  dados: Record<string, any>;
  /** Id do item no catálogo da Loja. */
  itemId: string;
  /** Nível total do personagem que está comprando, se houver um. */
  nivelDoComprador?: number;
}

const efeitoRuim = (efeito: IEfeitoEquipamento) => efeito.modo === 'desvantagem' || (efeito.modo === 'bonus' && efeito.valor < 0);

function ChipsDeEfeitos({ efeitos }: { efeitos: IEfeitoEquipamento[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {efeitos.map((efeito) => (
        <span
          key={efeito.id}
          className={`rounded-md border px-2 py-1 text-xs font-bold ${efeitoRuim(efeito)
            ? 'border-red-400/25 bg-red-400/10 text-red-200'
            : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'}`}
        >
          {rotuloEfeitoEquipamento(efeito)}
        </span>
      ))}
    </div>
  );
}

/**
 * O que a Loja mostra além da ficha comum quando o item tem formas (desperta
 * com o dono), cobra um preço (dilema) ou faz parte de um conjunto. Tudo vem do
 * catálogo e de data/regras/conjuntos.ts: nada aqui é regra própria.
 */
export function FormasEConjunto({ dados, itemId, nivelDoComprador = 0 }: FormasEConjuntoProps) {
  const formas = normalizarFormasItem(dados.formas);
  const dilema = typeof dados.dilema === 'string' ? dados.dilema.trim() : '';
  const conjunto = conjuntoDaPeca(itemId);
  if (formas.length === 0 && !dilema && !conjunto) return null;

  const formaDoComprador = nivelDoComprador > 0 ? formaAtualDoItem(formas, nivelDoComprador).atual : undefined;
  const despertaComODono = formas.length > 1;

  return (
    <div className="mt-6 flex flex-col gap-5 border-t border-white/10 pt-6">
      {dilema ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300"><Scale size={14} /> Preço do poder</div>
          <p className="mt-2 text-sm leading-6 text-amber-50/90">{dilema.charAt(0).toLocaleUpperCase('pt-BR') + dilema.slice(1)}</p>
        </div>
      ) : null}

      {formas.length > 0 ? (
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-500">
            <Sprout size={16} /> {despertaComODono ? 'Desperta com o dono' : 'Efeito automático na ficha'}
          </h4>
          {despertaComODono ? (
            <p className="mb-3 text-xs leading-5 text-gray-500">Vale a forma mais alta que o nível total do dono já alcançou, e ela substitui a anterior. Só funciona com o item equipado.</p>
          ) : null}
          <ol className="flex flex-col gap-2">
            {formas.map((forma) => {
              const agora = formaDoComprador?.nivel === forma.nivel;
              return (
                <li key={forma.nivel} className={`rounded-xl border p-4 ${agora ? 'border-[#c7a44c]/50 bg-[#c7a44c]/[0.07]' : 'border-white/10 bg-white/[0.03]'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm text-white">{forma.titulo}</strong>
                    <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      {despertaComODono ? `Nível total ${forma.nivel}` : null}
                      {agora ? <span className="rounded-full border border-[#c7a44c]/40 bg-[#c7a44c]/15 px-2 py-0.5 text-[#ead79d]">forma do seu personagem</span> : null}
                    </span>
                  </div>
                  <p className="mt-1 text-xs italic leading-5 text-gray-400">{forma.descricao}</p>
                  <ChipsDeEfeitos efeitos={forma.efeitos} />
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      {conjunto ? (
        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.04] p-5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300"><Layers size={14} /> {conjunto.titulo}</div>
          <p className="mt-2 text-sm leading-6 text-gray-300">{conjunto.resumo}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {conjunto.pecas.map((peca) => (
              <li
                key={peca.id}
                className={`rounded-md border px-2.5 py-1.5 text-xs ${peca.id === itemId ? 'border-sky-300/50 bg-sky-300/15 font-bold text-sky-100' : 'border-white/10 bg-black/20 text-gray-400'}`}
              >
                {peca.titulo}
              </li>
            ))}
          </ul>
          <ul className="mt-4 flex flex-col gap-2">
            {conjunto.bonus.map((bonus) => (
              <li key={bonus.pecas} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-baseline gap-2">
                  <strong className="text-sm text-sky-100">{bonus.pecas} peças</strong>
                  <span className="text-xs leading-5 text-gray-400">{bonus.descricao}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-5 text-gray-500">Vale com as peças equipadas, e os bônus se somam: com 3 peças valem os de 2 e os de 3.</p>
        </div>
      ) : null}
    </div>
  );
}
