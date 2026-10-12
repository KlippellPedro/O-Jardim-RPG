import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, X } from 'lucide-react';
import type { ICaracteristicaRacial, IOpcaoRacial, IRaca } from '../../../types/catalogo';
import { nivelMinimoTraco } from '../../../services/racaService';
import {
  animaisDaMorfologia,
  bonusDaOpcao,
  contagemPorMorfologia,
  danoDaArmaNatural,
  filtrarAnimais,
  morfologiaSelecionada,
  somaDaCombinacao,
  TAMANHOS,
  type FormaDaAnimalia,
} from './dados';
import { iconeDaMorfologia, visualDaForma } from './visual';

interface AnimaliaFormaProps {
  raca: IRaca;
  formas: FormaDaAnimalia[];
  atual: FormaDaAnimalia;
  morfologiaPedida: string | null;
  animalPedido: string | null;
  voltar: () => void;
  abrirForma: (formaId: string) => void;
  escolherMorfologia: (morfologiaId: string) => void;
  escolherAnimal: (animalId: string | null) => void;
}

const Etiquetas = ({ traco }: { traco: ICaracteristicaRacial }) => {
  const itens: string[] = [];
  const mana = Number(traco.custo_mana);
  if (mana > 0) itens.push(`${mana} Mana`);
  const usos = Number(traco.usos);
  if (usos > 0) itens.push(usos === 1 ? `1 vez por ${traco.recuperacao === 'sessao' ? 'sessão' : 'cena'}` : `${usos} vezes por ${traco.recuperacao === 'sessao' ? 'sessão' : 'cena'}`);
  if (Number(traco.defesa)) itens.push(`Defesa +${traco.defesa}`);
  if (Number(traco.movimento)) itens.push(`Movimento ${Number(traco.movimento) > 0 ? '+' : '−'}${Math.abs(Number(traco.movimento)).toString().replace('.', ',')} m`);
  if (itens.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {itens.map(item => (
        <li key={item} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
          {item}
        </li>
      ))}
    </ul>
  );
};

const CORES_TAMANHO: Record<string, string> = {
  Pequeno: 'text-sky-300 border-sky-400/30',
  Normal: 'text-green-300 border-green-400/30',
  Grande: 'text-amber-300 border-amber-400/30',
  Enorme: 'text-rose-300 border-rose-400/30',
};

/** Página de uma Forma: o corpo que ela dá e, logo abaixo, o montador de Morfologia e animal. A Morfologia
 * e o animal valem para as três Formas, mas o resumo muda: a arma natural da Fera bate mais forte que a do Híbrido. */
export const AnimaliaForma = ({
  raca,
  formas,
  atual,
  morfologiaPedida,
  animalPedido,
  voltar,
  abrirForma,
  escolherMorfologia,
  escolherAnimal,
}: AnimaliaFormaProps) => {
  const { forma, tracos, fisiologia } = atual;
  const visual = visualDaForma(forma.id);
  const morfologias = raca.variantes || [];
  const morfologia = morfologiaSelecionada(raca, morfologiaPedida);
  const contagem = useMemo(() => contagemPorMorfologia(raca), [raca]);
  const [tamanho, setTamanho] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const daMorfologia = useMemo(
    () => (morfologia ? animaisDaMorfologia(raca, morfologia.id) : []),
    [raca, morfologia],
  );
  const visiveis = useMemo(() => filtrarAnimais(daMorfologia, tamanho, busca), [daMorfologia, tamanho, busca]);
  const animal = (raca.animais || []).find(item => item.id === animalPedido && daMorfologia.some(candidato => candidato.id === item.id));
  const soma = somaDaCombinacao(forma, morfologia);
  const dano = danoDaArmaNatural(forma);
  const IconeMorfologia = morfologia ? iconeDaMorfologia(morfologia.id) : null;
  // Forma que fixa o tamanho (Traços) vale mais que o animal: o cartão mostra o tamanho que a ficha terá.
  const tamanhoDoAnimal = (item: IOpcaoRacial) => String(forma.tamanho || item.tamanho);

  const trocarMorfologia = (id: string) => {
    setTamanho(null);
    setBusca('');
    escolherMorfologia(id);
  };

  return (
    <motion.div key={forma.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <button
        type="button"
        onClick={voltar}
        className="mb-8 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-gray-400 transition-colors hover:text-white"
      >
        <ArrowLeft size={16} />
        Animália
      </button>

      <header className="mb-10">
        <div className="mb-5 flex items-center gap-4">
          <visual.Icone size={40} strokeWidth={1.5} className={visual.tema.icon} />
          <h1 className={`text-4xl sm:text-6xl font-bold tracking-tight ${visual.tema.text} uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>
            {forma.titulo}
          </h1>
        </div>
        <p className="max-w-3xl text-lg leading-relaxed text-green-100/70">{forma.descricao}</p>

        <nav aria-label="Formas da Animália" className="mt-8 flex flex-wrap gap-2">
          {formas.map(item => {
            const tema = visualDaForma(item.forma.id).tema;
            const ativa = item.forma.id === forma.id;
            return (
              <button
                key={item.forma.id}
                type="button"
                aria-current={ativa ? 'page' : undefined}
                onClick={() => !ativa && abrirForma(item.forma.id)}
                className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
                  ativa ? `${tema.text} ${tema.bg} border-white/30` : 'border-white/10 text-gray-500 hover:text-gray-200'
                }`}
              >
                {item.forma.titulo}
              </button>
            );
          })}
        </nav>
      </header>

      <section className={`mb-14 rounded-lg border-t ${visual.tema.border.split(' ')[0]} ${visual.tema.bg} p-6 sm:p-8 backdrop-blur-md`}>
        <h2 className={`mb-4 text-xl font-bold ${visual.tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
          Corpo
        </h2>
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-gray-400">
          {bonusDaOpcao(forma) || 'Sem ajuste de Vida, Mana ou Estamina'}
        </p>
        {fisiologia.length > 0 && (
          <ul className="mb-6 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-300/80">
            {fisiologia.map(linha => <li key={linha}>{linha}</li>)}
          </ul>
        )}
        {tracos.map(traco => (
          <div key={traco.id} className="border-t border-white/10 pt-5 pb-1">
            <h3 className="text-base font-bold text-gray-100">
              {traco.titulo}
              <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">nível {nivelMinimoTraco(traco)}</span>
            </h3>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-gray-300/80">{traco.descricao}</p>
            <Etiquetas traco={traco} />
          </div>
        ))}
      </section>

      {morfologia && IconeMorfologia && (
        <section className="mb-14">
          <h2 className={`mb-3 text-3xl font-bold ${visual.tema.text} uppercase tracking-wider`} style={{ fontFamily: 'Cinzel, serif' }}>
            Monte o seu
          </h2>
          <p className="mb-6 max-w-3xl text-gray-400">
            Escolha a Morfologia e depois o animal. A lista já traz os bichos certos para cada Morfologia, e quem tem um
            animal em mente fora dela pode escrevê-lo na ficha.
          </p>

          <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Escolha uma Morfologia">
            {morfologias.map(item => {
              const Icone = iconeDaMorfologia(item.id);
              const ativa = item.id === morfologia.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => trocarMorfologia(item.id)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    ativa ? `border-white/30 bg-white/10 ${visual.tema.text} font-bold` : 'border-white/10 text-gray-400 hover:text-gray-100'
                  }`}
                >
                  <Icone size={14} strokeWidth={1.75} />
                  {item.titulo.replace(/^Morfologia\s+/, '')}
                  <span className="text-[10px] text-gray-500">{contagem.get(item.id) ?? 0}</span>
                </button>
              );
            })}
          </div>

          <motion.article
            key={morfologia.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8 rounded-xl border border-white/10 bg-black/45 p-6 sm:p-8 backdrop-blur-md"
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <IconeMorfologia size={26} strokeWidth={1.5} className={visual.tema.icon} />
              <h3 className={`text-2xl font-bold ${visual.tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>{morfologia.titulo}</h3>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{bonusDaOpcao(morfologia) || 'Sem ajuste'}</span>
            </div>
            <p className="mb-5 max-w-3xl text-base leading-relaxed text-gray-300/80">{morfologia.descricao}</p>
            <ul className="space-y-4 border-t border-white/10 pt-5">
              {(morfologia.caracteristicas || []).map(traco => (
                <li key={traco.id}>
                  <h4 className="text-base font-bold text-gray-100">{traco.titulo}</h4>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-300/80">{traco.descricao}</p>
                  <Etiquetas traco={traco} />
                </li>
              ))}
            </ul>
          </motion.article>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="relative block min-w-[12rem] flex-1 sm:max-w-xs">
              <span className="sr-only">Buscar animal</span>
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="search"
                value={busca}
                onChange={evento => setBusca(evento.target.value)}
                placeholder="Buscar animal"
                className="w-full rounded-full border border-white/10 bg-black/40 py-1.5 pl-9 pr-3 text-sm text-gray-100 placeholder:text-gray-500 focus:border-white/40 focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tamanho">
              {TAMANHOS.map(item => {
                const ativo = tamanho === item;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => setTamanho(ativo ? null : item)}
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                      ativo ? `bg-white/10 ${CORES_TAMANHO[item]}` : 'border-white/10 text-gray-500 hover:text-gray-200'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <p className="ml-auto text-xs text-gray-500" aria-live="polite">
              {visiveis.length} de {daMorfologia.length} animais
            </p>
          </div>

          {visiveis.length === 0 ? (
            <p className="rounded-lg border border-white/10 bg-black/35 p-5 text-sm text-gray-400">
              Nenhum animal combina com esse filtro. Se o seu não está na lista, escreva-o na ficha em “Outro”.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visiveis.map(item => {
                const ativo = animal?.id === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => escolherAnimal(ativo ? null : item.id)}
                      className={`flex h-full w-full flex-col gap-1.5 rounded-lg border bg-black/35 p-4 text-left backdrop-blur-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
                        ativo ? 'border-white/50 bg-white/10' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-base font-bold text-gray-100">{item.titulo}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${CORES_TAMANHO[String(item.tamanho)] ?? 'border-white/10 text-gray-400'}`}>
                          {tamanhoDoAnimal(item)}
                        </span>
                      </span>
                      <span className="text-xs leading-relaxed text-gray-400">{item.descricao}</span>
                      {dano && (
                        <span className="mt-auto pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                          {`${item.arma_natural} · ${dano}`}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <aside
            aria-label="Resumo da combinação"
            className={`sticky bottom-4 z-20 mt-8 rounded-xl border ${visual.tema.border.split(' ')[0]} bg-[#0d120a]/90 p-5 shadow-2xl backdrop-blur-md`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Sua combinação</p>
                <p className={`mt-1 text-xl font-bold ${visual.tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
                  {forma.titulo} · {morfologia.titulo.replace(/^Morfologia\s+/, '')}
                  {animal ? ` · ${animal.titulo}` : ''}
                </p>
              </div>
              {animal && (
                <button
                  type="button"
                  onClick={() => escolherAnimal(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-gray-400 hover:text-white"
                >
                  <X size={14} />
                  Limpar animal
                </button>
              )}
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Soma da Forma e da Morfologia</dt>
                <dd className="mt-0.5 text-gray-200">{bonusDaOpcao(soma) || 'Sem ajuste'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Tamanho</dt>
                <dd className="mt-0.5 text-gray-200">
                  {forma.tamanho ? `${String(forma.tamanho)}, corpo de pessoa` : animal ? String(animal.tamanho) : 'Vem do animal escolhido'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Arma natural</dt>
                <dd className="mt-0.5 text-gray-200">
                  {dano
                    ? `${animal ? String(animal.arma_natural) : 'Do animal'}, dano base ${dano}`
                    : 'Esta Forma não tem arma natural'}
                </dd>
              </div>
            </dl>
          </aside>
        </section>
      )}
    </motion.div>
  );
};

export default AnimaliaForma;
