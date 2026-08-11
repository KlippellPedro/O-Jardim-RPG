import { Apple, Sparkles } from 'lucide-react';

interface IItemInventario {
  item_id: string;
  titulo: string;
  quantidade: number;
  dados?: Record<string, any>;
}

/** Destaque na página principal da ficha para quem consumiu um Fruto do
 * Éden: são raridade "Relíquia da Criação" e ligam um poder permanente ao
 * personagem, então merecem mais visibilidade do que um item comum no
 * inventário. */
export const FrutoEdenSection = ({ character }: { character: any }) => {
  const frutos: IItemInventario[] = (character.inventarioCentral || []).filter(
    (item: IItemInventario) => item.dados?.tipo === 'fruto-eden',
  );

  if (frutos.length === 0) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-950/40 via-[#0f0e15] to-fuchsia-950/20 p-6 shadow-[0_0_35px_rgba(251,191,36,0.12)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-400/50 bg-amber-500/10 text-amber-300">
          <Apple size={20} />
        </div>
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-amber-200" style={{ fontFamily: 'Cinzel, serif' }}>
            Fruto{frutos.length > 1 ? 's' : ''} do Éden <Sparkles size={14} className="text-amber-300" />
          </h2>
          <p className="text-xs text-amber-100/60">Poder místico consumido, ligado permanentemente ao personagem.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {frutos.map((item) => {
          const atributos: string[] = Array.isArray(item.dados?.atributos) ? item.dados.atributos : [];
          return (
            <div key={item.item_id} className="rounded-xl border border-amber-400/20 bg-black/30 p-4">
              <h3 className="mb-1 font-bold text-amber-100">{item.titulo}</h3>
              {item.dados?.descricao && (
                <p className="mb-2 text-xs leading-relaxed text-gray-400">{item.dados.descricao}</p>
              )}
              {atributos.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {atributos.map((atributo) => (
                    <span key={atributo} className="rounded border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                      {atributo}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
