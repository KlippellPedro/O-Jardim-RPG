import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import type { ICaracteristicaRacial, IOpcaoRacial } from '../../../types/catalogo';
import { FLUXO_TEMAS, TEMA_UNIVERSAL, type FluxoMagicoId } from '../../../services/magiaService';
import { nivelMinimoTraco } from '../../../services/racaService';
import {
  bonusDoEstagio,
  condicaoExigida,
  etiquetasDoTraco,
  marcaOposta,
  marcaSelecionada,
  nomeCurtoDoEstagio,
  type NaturezaDoEspirito,
} from './dados';
import { estiloDaMarca } from './estilos';
import { visualDaNatureza } from './visual';

interface EspiritoNaturezaProps {
  naturezas: NaturezaDoEspirito[];
  condicoes: IOpcaoRacial[];
  atual: NaturezaDoEspirito;
  marcaPedida: string | null;
  voltar: () => void;
  abrirNatureza: (naturezaId: string, marcaId?: string) => void;
  escolherMarca: (marcaId: string) => void;
}

const Etiquetas = ({ traco }: { traco: ICaracteristicaRacial }) => {
  const etiquetas = etiquetasDoTraco(traco);
  if (etiquetas.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {etiquetas.map(etiqueta => (
        <li key={etiqueta} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
          {etiqueta}
        </li>
      ))}
    </ul>
  );
};

/** Regra longa vira parágrafos curtos, de até umas duas frases cada, para não ficar um paredão. */
function quebrarEmParagrafos(texto: string): string[] {
  if (texto.length < 320) return [texto];
  const frases = texto.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/);
  const paragrafos: string[] = [];
  for (const frase of frases) {
    const ultimo = paragrafos[paragrafos.length - 1];
    if (ultimo !== undefined && ultimo.length + frase.length < 230) paragrafos[paragrafos.length - 1] = `${ultimo} ${frase}`;
    else paragrafos.push(frase);
  }
  return paragrafos;
}

/** Selo ao lado do nome da marca: a Árvore do Fluxo, ou o aviso do Universal. */
function seloDaMarca(marca: IOpcaoRacial): string | null {
  if (marca.fluxo === 'universal') return TEMA_UNIVERSAL.arvore;
  const tema = FLUXO_TEMAS[marca.fluxo as FluxoMagicoId];
  return tema ? `Árvore ${tema.arvore}` : null;
}

/** Página de uma Natureza: o que ela dá, a escada de estágios e as marcas para escolher. */
export const EspiritoNatureza = ({
  naturezas,
  condicoes,
  atual,
  marcaPedida,
  voltar,
  abrirNatureza,
  escolherMarca,
}: EspiritoNaturezaProps) => {
  const { natureza, marcas, estagios, tracos, rotuloMarca } = atual;
  const visual = visualDaNatureza(natureza.id);
  const marca = marcaSelecionada(atual, marcaPedida);
  const estiloMarca = marca ? estiloDaMarca(marca.id) : null;
  const oposta = marca ? marcaOposta(marca, naturezas) : null;
  const nomeDoDegrau = new Map(estagios.map(estagio => [nivelMinimoTraco(estagio), estagio.titulo]));
  const fisiologia = Array.isArray(natureza.fisiologia) ? (natureza.fisiologia as string[]) : [];
  const temaOposto = oposta ? visualDaNatureza(oposta.natureza.natureza.id).tema : null;

  return (
    <motion.div key={natureza.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <button
        type="button"
        onClick={voltar}
        className="mb-8 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-gray-400 transition-colors hover:text-white"
      >
        <ArrowLeft size={16} />
        Espírito
      </button>

      <header className="mb-10">
        <div className="mb-5 flex items-center gap-4">
          <visual.Icone size={40} strokeWidth={1} className={visual.tema.icon} />
          <h1
            className={`text-4xl sm:text-6xl font-light tracking-widest ${visual.tema.text} uppercase`}
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {natureza.titulo}
          </h1>
        </div>
        <p className="max-w-3xl text-lg font-light leading-relaxed text-cyan-100/70">{natureza.descricao}</p>

        <nav aria-label="Naturezas do Espírito" className="mt-8 flex flex-wrap gap-2">
          {naturezas.map(item => {
            const tema = visualDaNatureza(item.natureza.id).tema;
            const ativa = item.natureza.id === natureza.id;
            return (
              <button
                key={item.natureza.id}
                type="button"
                aria-current={ativa ? 'page' : undefined}
                onClick={() => !ativa && abrirNatureza(item.natureza.id)}
                className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
                  ativa ? `${tema.text} ${tema.bg} border-white/30` : 'border-white/10 text-gray-500 hover:text-gray-200'
                }`}
              >
                {item.natureza.titulo}
              </button>
            );
          })}
        </nav>
      </header>

      {(fisiologia.length > 0 || tracos.length > 0) && (
        <section className={`mb-14 rounded-lg border-t ${visual.tema.border} ${visual.tema.bg} p-6 sm:p-8 backdrop-blur-md`}>
          <h2 className={`mb-4 text-xl font-light ${visual.tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
            Corpo
          </h2>
          {fisiologia.length > 0 && (
            <ul className="mb-6 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-300/80">
              {fisiologia.map(linha => <li key={linha}>{linha}</li>)}
            </ul>
          )}
          {tracos.map(traco => (
            <div key={traco.id} className="border-t border-white/10 pt-5">
              <h3 className="text-base font-bold text-gray-100">
                {traco.titulo}
                <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">nível {nivelMinimoTraco(traco)}</span>
              </h3>
              <div className="mt-2 max-w-4xl space-y-2 text-sm leading-relaxed text-gray-300/80">
                {quebrarEmParagrafos(String(traco.descricao || '')).map(paragrafo => <p key={paragrafo}>{paragrafo}</p>)}
              </div>
              <Etiquetas traco={traco} />
            </div>
          ))}
        </section>
      )}

      <section className="mb-14">
        <h2 className={`mb-3 text-3xl font-bold ${visual.tema.text} uppercase tracking-wider`} style={{ fontFamily: 'Cinzel, serif' }}>
          Estágios
        </h2>
        <p className="mb-6 max-w-3xl text-gray-400">
          Cada degrau abre por nível total, soma Mana e Vida e traz o que está abaixo, além do poder do degrau da sua marca.
        </p>
        <ol className="space-y-4">
          {estagios.map(estagio => {
            const tracosDoEstagio = estagio.caracteristicas || [];
            return (
              <li
                key={estagio.id}
                className="grid grid-cols-1 gap-x-8 gap-y-3 rounded-lg border border-white/10 bg-black/35 p-5 backdrop-blur-md md:grid-cols-[11rem_1fr]"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                    Nível total {nivelMinimoTraco(estagio)}
                  </p>
                  <h3 className={`mt-1 text-xl font-light ${visual.tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
                    {estagio.titulo}
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">{bonusDoEstagio(estagio) || 'Ponto de partida'}</p>
                  {condicaoExigida(estagio, condicoes) && (
                    <p className={`mt-2 inline-block rounded-full border ${visual.tema.border.split(' ')[0]} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${visual.tema.text}`}>
                      Exige a {condicaoExigida(estagio, condicoes)?.titulo}
                    </p>
                  )}
                </div>
                <div className="space-y-4">
                  {condicaoExigida(estagio, condicoes) && (
                    <p className="text-xs leading-relaxed text-gray-400">{condicaoExigida(estagio, condicoes)?.descricao}</p>
                  )}
                  {tracosDoEstagio.length === 0 ? (
                    <p className="text-sm leading-relaxed text-gray-400">
                      Aqui entra só o primeiro poder da marca que você escolher.
                    </p>
                  ) : (
                    <ul className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2">
                      {tracosDoEstagio.map(traco => (
                        <li key={traco.id}>
                          <h4 className="text-sm font-bold text-gray-200">{traco.titulo}</h4>
                          <p className="mt-1 text-xs leading-relaxed text-gray-400">{traco.descricao}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {marca && estiloMarca && (
        <section>
          <h2 className={`mb-3 text-3xl font-bold ${visual.tema.text} uppercase tracking-wider`} style={{ fontFamily: 'Cinzel, serif' }}>
            {rotuloMarca}
          </h2>
          <p className="mb-6 max-w-3xl text-gray-400">{natureza.descricao_variantes}</p>

          <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label={`Escolha um ${rotuloMarca}`}>
            {marcas.map(item => {
              const estilo = estiloDaMarca(item.id);
              const ativa = item.id === marca.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => escolherMarca(item.id)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    ativa ? `${estilo.border} bg-white/10 ${estilo.text} font-bold` : 'border-white/10 text-gray-400 hover:text-gray-100'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: estilo.tinta }} />
                  {item.titulo}
                </button>
              );
            })}
          </div>

          <motion.article
            key={marca.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`rounded-xl border-l-2 ${estiloMarca.border} border-y border-r border-y-white/5 border-r-white/5 bg-black/45 p-6 sm:p-8 backdrop-blur-md`}
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: estiloMarca.tinta }} />
              <h3 className={`text-3xl font-light ${estiloMarca.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
                {marca.nome_completo || marca.titulo}
              </h3>
              {seloDaMarca(marca) && (
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">{seloDaMarca(marca)}</span>
              )}
              {marca.somente_mestre === true && (
                <span className={`rounded-full border ${estiloMarca.border} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${estiloMarca.text}`}>
                  Só o Mestre concede
                </span>
              )}
            </div>
            {marca.descricao && (
              <p className="mb-6 max-w-3xl text-base font-light leading-relaxed text-gray-300/80">{marca.descricao}</p>
            )}

            <ol className="space-y-6 border-t border-white/10 pt-6">
              {(marca.caracteristicas || []).map(traco => {
                const nivel = nivelMinimoTraco(traco);
                const degrau = nomeDoDegrau.get(nivel);
                return (
                  <li key={traco.id} className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-[8.5rem_1fr]">
                    <p className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-gray-500 sm:pt-1">
                      {degrau ? nomeCurtoDoEstagio({ id: '', titulo: degrau }) : 'Avançado'}
                      <span className="block text-gray-600">nível {nivel}</span>
                    </p>
                    <div>
                      <h4 className="text-base font-bold text-gray-100">
                        {traco.titulo}
                        {condicaoExigida(traco, condicoes) && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                            exige a {condicaoExigida(traco, condicoes)?.titulo}
                          </span>
                        )}
                      </h4>
                      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-300/80">{traco.descricao}</p>
                      <Etiquetas traco={traco} />
                    </div>
                  </li>
                );
              })}
            </ol>

            {typeof marca.provacao === 'string' && marca.provacao && (
              <div className="mt-8 border-t border-white/10 pt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                  {condicoes[0]?.titulo || 'Provação'} desta marca
                </p>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-300/80">{marca.provacao}</p>
              </div>
            )}

            {oposta && temaOposto && (
              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5 text-sm text-gray-400">
                <span>Marca oposta:</span>
                <button
                  type="button"
                  onClick={() => abrirNatureza(oposta.natureza.natureza.id, oposta.marca.id)}
                  className={`inline-flex items-center gap-1.5 font-bold ${estiloDaMarca(oposta.marca.id).text} hover:underline`}
                >
                  {oposta.marca.titulo}
                  <span className="font-normal text-gray-500">({oposta.natureza.natureza.titulo})</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            )}
          </motion.article>
        </section>
      )}
    </motion.div>
  );
};

export default EspiritoNatureza;
