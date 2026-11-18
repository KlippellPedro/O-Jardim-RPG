import { Plus, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';

interface CartazEmBrancoProps {
  nomeCampanha?: string;
  onCriar: () => void;
}

/**
 * A lista de personagens é um mural de cartazes de procurado. Sem nenhum
 * personagem, o mural mostra um cartaz ainda em branco esperando um nome,
 * no mesmo papel dos cartazes de verdade.
 */
export const CartazEmBranco: React.FC<CartazEmBrancoProps> = ({ nomeCampanha, onCriar }) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45 }}
    aria-labelledby="cartaz-em-branco-titulo"
    className="flex flex-1 flex-col items-center justify-center gap-10 py-10 md:flex-row md:gap-16 md:py-16"
  >
    {/* O cartaz em si é enfeite clicável; quem usa teclado tem o botão ao lado. */}
    <div
      aria-hidden="true"
      onClick={onCriar}
      className="group relative w-[15.5rem] shrink-0 -rotate-2 cursor-pointer transition-transform duration-300 [filter:drop-shadow(0_18px_22px_rgba(0,0,0,0.55))] hover:-translate-y-1.5 hover:rotate-0 motion-reduce:transition-none"
    >
      <span className="absolute -top-1 left-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#d36a5a,#7a1f1f_60%,#3f0d0d)] shadow-[0_2px_3px_rgba(0,0,0,0.5)]" />
      <div className="wanted-poster relative flex flex-col items-center px-5 pb-6 pt-7 text-center">
        <div className="wanted-poster-scratches pointer-events-none absolute inset-0" />

        <div className="relative w-full border-y-[3px] border-double border-[#5c1a1a]/60 py-1.5">
          <span className="text-[1.45rem] font-black uppercase tracking-[0.14em] text-[#4a1414]" style={{ fontFamily: 'Cinzel, serif' }}>
            Procura-se
          </span>
          <p className="mt-0.5 text-[0.55rem] font-bold uppercase tracking-[0.36em] text-[#5c1a1a]/70">Vaga no mural</p>
        </div>

        <div className="relative mt-5 flex h-24 w-24 rotate-1 items-center justify-center border-[3px] border-dashed border-[#2a2118]/45 bg-[#efe3bd]/50">
          <UserRound size={46} strokeWidth={1.4} className="text-[#5a4a2f]/45" />
          <span className="absolute -bottom-2.5 -right-3 rotate-[-8deg] rounded-sm border-2 border-[#7a1f1f]/55 px-1.5 text-lg font-black text-[#7a1f1f]/65" style={{ fontFamily: 'Cinzel, serif' }}>
            ?
          </span>
        </div>

        <div className="relative mt-5 w-full space-y-2.5 text-left text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#5a4a2f]">
          <p className="flex items-end gap-2">Nome <span className="mb-[3px] flex-1 border-b border-dashed border-[#5a4a2f]/50" /></p>
          <p className="flex items-end gap-2">Raça <span className="mb-[3px] flex-1 border-b border-dashed border-[#5a4a2f]/50" /></p>
          <p className="flex items-end gap-2">Classe <span className="mb-[3px] flex-1 border-b border-dashed border-[#5a4a2f]/50" /></p>
        </div>

        <div className="relative mt-5">
          <span className="block text-[0.55rem] font-bold uppercase tracking-[0.3em] text-[#5c1a1a]/70">Recompensa</span>
          <span className="text-lg font-black text-[#5c1a1a]/80" style={{ fontFamily: 'Cinzel, serif' }}>A combinar</span>
        </div>

        <span className="relative mt-5 inline-flex rotate-[-4deg] items-center gap-1.5 rounded-sm border-2 border-[#7a1f1f]/70 px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.2em] text-[#7a1f1f] transition-colors group-hover:bg-[#7a1f1f] group-hover:text-[#f3e6c4]">
          <Plus size={13} strokeWidth={3} /> Preencher
        </span>
      </div>
    </div>

    <div className="flex max-w-md flex-col items-center text-center md:items-start md:text-left">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary/80">Mural de procurados</p>
      <h2 id="cartaz-em-branco-titulo" className="mt-2 text-[clamp(1.6rem,4vw,2.2rem)] font-bold leading-tight text-[#f1e8d4]" style={{ fontFamily: 'Cinzel, serif' }}>
        Nenhum cartaz pregado ainda
      </h2>
      <p className="mt-4 text-base leading-7 text-gray-400">
        {nomeCampanha
          ? <>Você ainda não tem personagem em <strong className="font-semibold text-gray-200">{nomeCampanha}</strong>.</>
          : 'Você ainda não tem personagem nesta campanha.'}{' '}
        Crie o seu e o cartaz dele aparece aqui, com retrato, nível e recompensa pela cabeça.
      </p>
      <button
        type="button"
        onClick={onCriar}
        className="group relative mt-8 flex items-center gap-2 overflow-hidden rounded-full border border-primary/40 bg-primary/15 px-7 py-3.5 font-semibold tracking-wide text-primary shadow-[0_0_24px_-6px_rgba(var(--color-primary),0.5)] transition-all hover:bg-primary/25 hover:shadow-[0_0_34px_-4px_rgba(var(--color-primary),0.6)]"
      >
        <span aria-hidden="true" className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-primary/0 via-primary/15 to-primary/0 transition-transform duration-1000 group-hover:translate-x-[100%]" />
        <Plus size={20} />
        Criar personagem
      </button>
    </div>
  </motion.section>
);
