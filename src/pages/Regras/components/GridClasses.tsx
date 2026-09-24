import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, Sword, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { IClasse } from '../../../types/catalogo';
import { ARVORES } from '../../../../data/mundo/arvoresCatalog';
import { classeTemProgressaoPublicada } from '../../../services/classeService';
import { AuraEspecial } from '../../../redesign/components/premium/AuraEspecial';
import { obterTemaPorId } from '../../../redesign/themeMap';
import { salvarPosicaoRetornoRegras } from '../regrasScrollRestoration';
import { CartaoCatalogo, LinhaRecurso } from './CartaoCatalogo';
import { obterIconeCatalogo } from './iconesCatalogo';

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

  const abrirClasse = (classeId: string) => {
    const scrollTop = document.getElementById('regra-leitor')?.scrollTop ?? 0;
    const retornoRegras = salvarPosicaoRetornoRegras('classes', scrollTop);
    navigate(`/regras/classes/${classeId}`, { state: { retornoRegras } });
  };

  const grupos = useMemo(() => {
    const base = [
      {
        id: 'comuns',
        titulo: 'Classes Comuns',
        descricao: 'Qualquer personagem, de qualquer Árvore, pode pegar uma delas. São a base do jogo, e todo o resto é medido a partir delas.',
        classes: classes.filter(classe => classe.categoria === 'padrao'),
        especial: false,
      },
      {
        id: 'especiais',
        titulo: 'Classes Especiais',
        descricao: 'São tão fortes quanto as comuns, só que cada uma pertence a certas Árvores e precisa ser liberada pelo Mestre. Em geral pedem nível total 20 e algum acontecimento na história, a menos que a classe diga o contrário.',
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
            className={`relative mb-6 overflow-hidden border-l-2 pl-4 ${grupo.especial ? 'border-violet-500/60 py-3' : 'border-yellow-600/60'}`}
          >
            {grupo.especial && <AuraEspecial cor="rgba(139,92,246,0.5)" variante="faixa" />}
            <h2 className="relative flex items-center gap-2 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              {grupo.especial && <Sparkles size={20} className="aura-selo__icone text-violet-400" />}
              {grupo.titulo}
            </h2>
            <p className="relative mt-1 max-w-3xl text-sm leading-relaxed text-gray-400">{grupo.descricao}</p>
          </motion.div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(max(15rem,calc((100%_-_3rem)/3)),1fr))] gap-6">
            {grupo.classes.map((classe, idx) => {
              const arvores = nomesArvores(classe);
              const tema = obterTemaPorId(classe.id);

              return (
                <CartaoCatalogo
                  key={classe.id}
                  titulo={classe.titulo}
                  descricao={classe.descricao}
                  icone={obterIconeCatalogo(classe.id, Sword)}
                  tema={tema}
                  etiqueta={grupo.especial && arvores ? arvores : undefined}
                  rotuloAcao="Explorar progressão"
                  concluido={classeTemProgressaoPublicada(classe)}
                  indice={idx}
                  onAbrir={() => abrirClasse(classe.id)}
                >
                  <LinhaRecurso recurso="vida" rotulo="Vida" valor={classe.vida} />
                  <LinhaRecurso recurso="mana" rotulo="Mana" valor={classe.mana} />
                  {classe.estamina !== undefined ? (
                    <LinhaRecurso recurso="estamina" rotulo="Estamina" valor={classe.estamina} />
                  ) : null}
                </CartaoCatalogo>
              );
            })}
          </div>
        </section>
      ) : null)}
    </div>
  );
};
