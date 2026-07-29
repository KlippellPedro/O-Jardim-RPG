import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Sword } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { IClasse } from '../../../types/catalogo';
import { ARVORES } from '../../../data/arvoresCatalog';
import { classeTemProgressaoPublicada, formatarResumoClasse } from '../../../services/classeService';

interface GridClassesProps {
  classes: IClasse[];
}

const nomesArvores = (classe: IClasse) => {
  const ids = classe.arvores?.length ? classe.arvores : (classe.arvore ? [classe.arvore] : []);
  return ids
    .map(id => ARVORES.find(arvore => arvore.id === id)?.nome)
    .filter(Boolean)
    .join(' · ');
};

export const GridClasses: React.FC<GridClassesProps> = ({ classes }) => {
  const navigate = useNavigate();
  const grupos = [
    {
      id: 'comuns',
      titulo: 'Classes Comuns',
      descricao: 'Disponíveis para personagens de qualquer Árvore. Seguem o patamar-base de progressão.',
      classes: classes.filter(classe => classe.categoria === 'padrao'),
      especial: false,
    },
    {
      id: 'especiais',
      titulo: 'Classes Especiais',
      descricao: 'Mais fortes por natureza, restritas às Árvores indicadas e liberadas pelo Mestre como conteúdo de conquista.',
      classes: classes.filter(classe => classe.categoria !== 'padrao'),
      especial: true,
    },
  ];

  return (
    <div className="mt-10 space-y-14">
      {grupos.map(grupo => (
        <section key={grupo.id}>
          <div className="mb-6 border-l-2 border-yellow-600/60 pl-4">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              {grupo.especial && <Sparkles size={20} className="text-violet-400" />}
              {grupo.titulo}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-400">{grupo.descricao}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {grupo.classes.map(classe => {
              const arvores = nomesArvores(classe);
              return (
                <motion.button
                  type="button"
                  whileHover={{ y: -5 }}
                  key={classe.id}
                  onClick={() => navigate(`/regras/classes/${classe.id}`)}
                  className={`relative flex min-h-[180px] h-full flex-col justify-between overflow-hidden rounded-2xl border p-6 text-left shadow-lg backdrop-blur-sm transition-all ${grupo.especial ? 'border-violet-500/20 bg-violet-950/20 hover:border-violet-400/50' : 'border-white/10 bg-black/60 hover:border-yellow-600/50'}`}
                >
                  <div className="absolute right-0 top-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-blue-600/10 blur-2xl" />
                  <div className="relative">
                    <h3 className="mb-2 flex items-center gap-2 text-xl font-bold text-yellow-500" style={{ fontFamily: 'Cinzel, serif' }}>
                      <Sword size={20} className="text-yellow-600/60" />
                      {classe.titulo}
                    </h3>
                    <p className="mb-3 text-sm text-gray-400">{formatarResumoClasse(classe)}</p>
                    {grupo.especial && arvores && (
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-violet-300">Árvores: {arvores}</p>
                    )}
                    {classeTemProgressaoPublicada(classe) && (
                      <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        Progressão publicada
                      </span>
                    )}
                  </div>
                  <div className="relative mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-yellow-600/80">
                    Explorar progressão <ArrowRight size={14} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
