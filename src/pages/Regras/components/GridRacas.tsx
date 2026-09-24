import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search, Sparkles, UserCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { IRaca } from '../../../types/catalogo';
import { ARVORES } from '../../../../data/mundo/arvoresCatalog';
import { obterEstagiosRaciais } from '../../../services/racaService';
import { AuraEspecial } from '../../../redesign/components/premium/AuraEspecial';
import { obterTemaPorId } from '../../../redesign/themeMap';
import { salvarPosicaoRetornoRegras } from '../regrasScrollRestoration';
import { CartaoCatalogo, ChipCatalogo } from './CartaoCatalogo';
import { obterIconeCatalogo } from './iconesCatalogo';

interface GridRacasProps {
  racas: IRaca[];
}

const nomesArvores = (raca: IRaca) => {
  const ids = raca.arvores?.length ? raca.arvores : (raca.arvore ? [raca.arvore] : []);
  return ids
    .map((id: string) => ARVORES.find(arvore => arvore.id === id)?.nome)
    .filter(Boolean)
    .join(' · ');
};

const ROTULOS_ATRIBUTO: Record<string, string> = {
  forca: 'FOR', destreza: 'DES', constituicao: 'CON', inteligencia: 'INT',
  sabedoria: 'SAB', carisma: 'CAR', fluxo: 'FLX',
};

const sinal = (valor: number) => `${valor > 0 ? '+' : valor < 0 ? '−' : ''}${Math.abs(valor)}`;
const tomDoValor = (valor: number) => (valor > 0 ? 'positivo' : valor < 0 ? 'negativo' : 'neutro');

const correspondeABusca = (raca: IRaca, termo: string) => {
  const alvo = [raca.titulo, raca.descricao, nomesArvores(raca)]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pt-BR');
  return alvo.includes(termo);
};

export const GridRacas: React.FC<GridRacasProps> = ({ racas }) => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const termo = busca.trim().toLocaleLowerCase('pt-BR');

  const abrirRaca = (racaId: string) => {
    if (racaId === 'entidade') {
      navigate('/entidades');
      return;
    }
    const scrollTop = document.getElementById('regra-leitor')?.scrollTop ?? 0;
    const retornoRegras = salvarPosicaoRetornoRegras('racas', scrollTop);
    navigate(`/regras/racas/${racaId}`, { state: { retornoRegras } });
  };

  const grupos = useMemo(() => {
    const base = [
      {
        id: 'comuns',
        titulo: 'Raças Comuns',
        descricao: 'Podem nascer em qualquer Árvore e ficam liberadas desde o começo, sem precisar pedir pro Mestre.',
        racas: racas.filter(raca => raca.categoria === 'padrao'),
        especial: false,
        entidade: false,
      },
      {
        id: 'especiais',
        titulo: 'Raças Especiais',
        descricao: 'Cada uma tem regras e origem próprias e só existe em certas Árvores. Pra jogar com elas, o Mestre precisa liberar, seja já na criação da ficha ou como conquista durante a história.',
        racas: racas.filter(raca => raca.categoria !== 'padrao' && raca.id !== 'entidade'),
        especial: true,
        entidade: false,
      },
      {
        id: 'entidades',
        titulo: 'Entidades',
        descricao: 'Entidade não dá atributo nem poder nenhum pra ficha. O cartão abre o Livro das Entidades, onde cada uma aparece contada pelo próprio conto.',
        racas: racas.filter(raca => raca.id === 'entidade'),
        especial: false,
        entidade: true,
      },
    ];
    if (!termo) return base;
    return base.map(grupo => ({
      ...grupo,
      racas: grupo.racas.filter(raca => correspondeABusca(raca, termo)),
    }));
  }, [racas, termo]);

  const totalEncontrado = grupos.reduce((total, grupo) => total + grupo.racas.length, 0);

  return (
    <div className="mt-10 space-y-14">
      <label className="relative mx-auto block max-w-md">
        <span className="sr-only">Buscar raça</span>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
        <input
          type="search"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar raça por nome, árvore ou descrição..."
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
        <p className="py-10 text-center text-sm text-gray-500">Nenhuma raça encontrada para "{busca.trim()}".</p>
      ) : null}

      {grupos.map((grupo, grupoIdx) => grupo.racas.length ? (
        <section key={grupo.id}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: grupoIdx * 0.08 }}
            className={`relative mb-6 overflow-hidden border-l-2 pl-4 ${grupo.especial ? 'border-violet-500/60 py-3' : 'border-yellow-600/60'}`}
          >
            {grupo.especial && <AuraEspecial cor="rgba(168,85,247,0.5)" variante="faixa" />}
            <h2 className="relative flex items-center gap-2 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              {grupo.entidade ? <BookOpen size={20} className="text-cyan-300" /> : null}
              {grupo.especial ? <Sparkles size={20} className="aura-selo__icone text-violet-400" /> : null}
              {grupo.titulo}
            </h2>
            <p className="relative mt-1 max-w-3xl text-sm leading-relaxed text-gray-400">{grupo.descricao}</p>
          </motion.div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(max(15rem,calc((100%_-_3rem)/3)),1fr))] gap-6">
            {grupo.racas.map((raca, idx) => {
              const arvores = nomesArvores(raca);
              const tema = obterTemaPorId(raca.id);
              const abreLivroEntidades = raca.id === 'entidade';

              const estagios = obterEstagiosRaciais(raca);
              const ajustes = Object.entries(raca.ajustes_atributos || {}).filter(([, valor]) => Number(valor) !== 0);

              return (
                <CartaoCatalogo
                  key={raca.id}
                  titulo={raca.titulo}
                  descricao={raca.descricao}
                  icone={obterIconeCatalogo(raca.id, abreLivroEntidades ? BookOpen : UserCircle)}
                  tema={tema}
                  etiqueta={grupo.especial && !abreLivroEntidades ? (arvores || 'Árvore definida pelo Mestre') : undefined}
                  rotuloAcao={abreLivroEntidades ? 'Abrir o Livro das Entidades' : 'Ver ficha fisiológica'}
                  indice={idx}
                  onAbrir={() => abrirRaca(raca.id)}
                >
                  {abreLivroEntidades ? (
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Sem atributos ou poderes</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        <ChipCatalogo tom={tomDoValor(Number(raca.vida) || 0)} titulo="Vida">Vida {sinal(Number(raca.vida) || 0)}</ChipCatalogo>
                        <ChipCatalogo tom={tomDoValor(Number(raca.mana) || 0)} titulo="Mana">Mana {sinal(Number(raca.mana) || 0)}</ChipCatalogo>
                        {Number(raca.estamina) ? (
                          <ChipCatalogo tom={tomDoValor(Number(raca.estamina))} titulo="Estamina">Estamina {sinal(Number(raca.estamina))}</ChipCatalogo>
                        ) : null}
                        <ChipCatalogo tom={tomDoValor(Number(raca.movimento) || 0)} titulo="Movimento">Mov. {sinal(Number(raca.movimento) || 0)} m</ChipCatalogo>
                        {ajustes.map(([campo, valor]) => (
                          <ChipCatalogo key={campo} tom={tomDoValor(Number(valor))} titulo={campo}>
                            {ROTULOS_ATRIBUTO[campo] ?? campo} {sinal(Number(valor))}
                          </ChipCatalogo>
                        ))}
                      </div>
                      {estagios.length > 0 ? (
                        <p
                          className={`flex items-center gap-1.5 text-[11px] font-semibold ${tema.tag}`}
                          title={estagios.map(estagio => estagio.titulo).join(' · ')}
                        >
                          <span className="flex gap-1" aria-hidden="true">
                            {estagios.map(estagio => (
                              <span key={estagio.id} className="h-1.5 w-1.5 rounded-full bg-current" />
                            ))}
                          </span>
                          Evolui em {estagios.length} estágios
                        </p>
                      ) : null}
                    </>
                  )}
                </CartaoCatalogo>
              );
            })}
          </div>
        </section>
      ) : null)}
    </div>
  );
};
