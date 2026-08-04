import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Search, Sparkles, Sword, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { IClasse } from '../../../types/catalogo';
import { ARVORES } from '../../../../data/mundo/arvoresCatalog';
import { classeTemProgressaoPublicada, formatarResumoClasse } from '../../../services/classeService';
import { PremiumCard } from '../../../redesign/components/premium/PremiumCard';
import { obterTemaPorId } from '../../../redesign/themeMap';

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

const correspondeABusca = (classe: IClasse, termo: string) => {
  const alvo = [classe.titulo, classe.descricao, nomesArvores(classe)]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pt-BR');
  return alvo.includes(termo);
};

export const GridClasses: React.FC<GridClassesProps> = ({ classes }) => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const termo = busca.trim().toLocaleLowerCase('pt-BR');

  const grupos = useMemo(() => {
    const base = [
      {
        id: 'comuns',
        titulo: 'Classes Comuns',
        descricao: 'Abertas a personagem de qualquer Árvore. É o patamar-base de progressão: tudo o mais no jogo é medido a partir daqui.',
        classes: classes.filter(classe => classe.categoria === 'padrao'),
        especial: false,
      },
      {
        id: 'especiais',
        titulo: 'Classes Especiais',
        descricao: 'Mais fortes que o patamar-base, presas às Árvores indicadas e liberadas pelo Mestre. Exigem nível total 15 e alguma coisa acontecida na história.',
        classes: classes.filter(classe => classe.categoria !== 'padrao'),
        especial: true,
      },
    ];
    if (!termo) return base;
    return base.map(grupo => ({
      ...grupo,
      classes: grupo.classes.filter(classe => correspondeABusca(classe, termo)),
    }));
  }, [classes, termo]);

  const totalEncontrado = grupos.reduce((total, grupo) => total + grupo.classes.length, 0);

  return (
    <div className="mt-10 space-y-14">
      <label className="relative mx-auto block max-w-md">
        <span className="sr-only">Buscar classe</span>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
        <input
          type="search"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar classe por nome, árvore ou descrição..."
          className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-9 pr-9 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-[#c7a44c]/50"
        />
        {busca ? (
          <button
            type="button"
            onClick={() => setBusca('')}
            aria-label="Limpar busca"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-500 hover:text-white"
          >
            <X size={14} />
          </button>
        ) : null}
      </label>

      {termo && totalEncontrado === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">Nenhuma classe encontrada para "{busca.trim()}".</p>
      ) : null}

      {grupos.map((grupo, grupoIdx) => grupo.classes.length ? (
        <section key={grupo.id}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: grupoIdx * 0.08 }}
            className="mb-6 border-l-2 border-yellow-600/60 pl-4"
          >
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              {grupo.especial && <Sparkles size={20} className="text-violet-400" />}
              {grupo.titulo}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-400">{grupo.descricao}</p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {grupo.classes.map((classe, idx) => {
              const arvores = nomesArvores(classe);
              const tema = obterTemaPorId(classe.id);

              return (
                <PremiumCard
                  key={classe.id}
                  glowColor={tema.glow}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: Math.min(idx * 0.03, 0.24) }}
                  onClick={() => navigate(`/regras/classes/${classe.id}`)}
                  className={`cursor-pointer min-h-[180px] p-6 text-left shadow-lg border ${tema.border} ${tema.bg}`}
                >
                  {/* Background glow blob */}
                  <div
                    className="absolute right-0 top-0 -mr-10 -mt-10 h-32 w-32 rounded-full blur-2xl pointer-events-none"
                    style={{ backgroundColor: tema.glow.replace(/,[\d.]+\)/, ',0.2)') }}
                  />

                  <div className="relative flex-1">
                    <h3
                      className={`mb-2 flex items-center gap-2 text-xl font-bold ${tema.text}`}
                      style={{ fontFamily: 'Cinzel, serif' }}
                    >
                      <Sword size={20} className={tema.icon} />
                      {classe.titulo}
                    </h3>
                    <p className="mb-3 text-sm text-gray-400">{formatarResumoClasse(classe)}</p>
                    {grupo.especial && arvores && (
                      <p className={`mb-3 text-xs font-bold uppercase tracking-wider ${tema.tag}`}>
                        Árvores: {arvores}
                      </p>
                    )}
                    {classeTemProgressaoPublicada(classe) && (
                      <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        Progressão completa
                      </span>
                    )}
                  </div>

                  <div className={`mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${tema.icon}`}>
                    Explorar progressão <ArrowRight size={14} />
                  </div>
                </PremiumCard>
              );
            })}
          </div>
        </section>
      ) : null)}
    </div>
  );
};
