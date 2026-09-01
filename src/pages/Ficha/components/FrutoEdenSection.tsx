import { Apple, Sparkles } from 'lucide-react';
import { efeitosFichaDoFruto, obterFrutoEdenConsumido } from '../../../services/frutoEdenService';

/** Exibe somente o Fruto do Éden efetivamente consumido e vinculado à ficha. */
export const FrutoEdenSection = ({ character }: { character: any }) => {
  const fruto = obterFrutoEdenConsumido(character.ficha);
  if (!fruto) return null;

  const atributos: string[] = Array.isArray(fruto.conteudo.atributos) ? fruto.conteudo.atributos : [];
  const efeitos = efeitosFichaDoFruto(character.ficha);
  const passivo = fruto.despertado
    ? fruto.conteudo.passivoDespertado || fruto.conteudo.passivo
    : fruto.conteudo.passivo;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-950/40 via-[#0f0e15] to-fuchsia-950/20 p-6 shadow-[0_0_35px_rgba(251,191,36,0.12)]" data-tour="ficha-fruto">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-400/50 bg-amber-500/10 text-amber-300">
          <Apple size={20} />
        </div>
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-amber-200" style={{ fontFamily: 'Cinzel, serif' }}>
            Fruto do Éden <Sparkles size={14} className="text-amber-300" />
          </h2>
          <p className="text-xs text-amber-100/60">Poder místico consumido, ligado permanentemente ao personagem.</p>
        </div>
      </div>
      <div className="rounded-xl border border-amber-400/20 bg-black/30 p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-amber-100">{fruto.titulo}</h3>
          {fruto.despertado && (
            <span className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-fuchsia-200">Despertado</span>
          )}
        </div>
        {fruto.conteudo.lore && (
          <p className="mb-3 border-l border-amber-300/30 pl-3 text-xs italic leading-relaxed text-amber-50/60">{fruto.conteudo.lore}</p>
        )}
        {passivo && (
          <div className={`mb-3 rounded-lg border px-3 py-2 ${fruto.despertado ? 'border-fuchsia-400/25 bg-fuchsia-500/[0.06]' : 'border-white/[0.07] bg-white/[0.03]'}`}>
            <span className={`text-[9px] font-black uppercase tracking-widest ${fruto.despertado ? 'text-fuchsia-300' : 'text-amber-300/70'}`}>
              {fruto.despertado ? 'Passiva aprimorada' : 'Passiva do vínculo'}
            </span>
            <p className="mt-1 text-xs leading-relaxed text-gray-300">{passivo}</p>
          </div>
        )}
        {(atributos.length > 0 || efeitos.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {atributos.map((atributo) => (
              <span key={atributo} className="rounded border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                {atributo}
              </span>
            ))}
            {efeitos.map((efeito) => (
              <span key={efeito.id} className="rounded border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-200">
                {efeito.alvo}: {efeito.valor > 0 ? '+' : ''}{efeito.valor}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
