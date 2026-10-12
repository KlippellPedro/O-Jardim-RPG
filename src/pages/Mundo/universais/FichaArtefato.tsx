import React from 'react';
import { Cherry, Droplets, Gem, Hourglass, Link2, Repeat, ShieldQuestion, Sparkles, TriangleAlert, Zap } from 'lucide-react';
import { nomeETexto, raridadeDe } from './artefatos';
import type { IRegistro } from './registros';

interface IFichaProps {
  registro: IRegistro;
  acoes: React.ReactNode;
  rotuloDaSecao: string;
}

const paragrafos = (texto: string): string[] => texto.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);

const Uso = ({ icone, rotulo, valor }: { icone: React.ReactNode; rotulo: string; valor: string }) => (
  <div className="rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-3">
    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">{icone} {rotulo}</span>
    <span className="mt-1 block text-sm font-semibold leading-snug text-gray-100">{valor}</span>
  </div>
);

const Titulo = ({ icone, children }: { icone?: React.ReactNode; children: React.ReactNode }) => (
  <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">{icone}{children}</h3>
);

/** Poder com "Nome: texto": o nome em destaque e a regra embaixo. */
const Poder = ({ linha }: { linha: string }) => {
  const { nome, texto } = nomeETexto(linha);
  return (
    <>
      {nome ? <strong className="block text-white">{nome}</strong> : null}
      <span>{texto}</span>
    </>
  );
};

/** Ficha de Artefato e de Fruto do Éden: a raridade (ou a Árvore, no Fruto) manda na cor e na moldura. */
export const FichaArtefato = ({ registro, acoes, rotuloDaSecao }: IFichaProps) => {
  const info = registro.artefato;
  if (!info) return null;
  const raridade = raridadeDe(info.raridade);
  const rgb = registro.corRgb ?? raridade.rgb;
  const Icone = info.fruto ? Cherry : Gem;
  const usos: Array<[React.ReactNode, string, string]> = [
    [<Zap key="a" size={11} />, 'Ativação', info.ativacao],
    [<Repeat key="f" size={11} />, 'Frequência', info.frequencia],
    [<Droplets key="c" size={11} />, 'Custo', info.custo],
    [<ShieldQuestion key="d" size={11} />, 'Teste de quem sofre', info.defesa],
    [<Hourglass key="u" size={11} />, 'Duração', info.duracao],
    [<Sparkles key="n" size={11} />, 'Nível recomendado', info.nivelRecomendado != null ? String(info.nivelRecomendado) : ''],
  ];
  const usosPreenchidos = usos.filter(([, , valor]) => valor);
  const marcadores = [info.fruto ? info.fluxo : '', info.deidade && info.fruto ? info.deidade : '', ...info.tags, info.exigeAutorizacao ? 'Só com autorização do Mestre' : '', ...registro.etiquetas.filter((item) => item !== registro.subtitulo && item !== raridade.rotulo)]
    .filter((item, indice, lista) => item && lista.findIndex((outro) => outro.toLowerCase() === item.toLowerCase()) === indice) as string[];
  const lore = info.fruto ? '' : info.lore;
  const citacao = info.fruto ? registro.descricao : lore;
  const textoPrincipal = info.fruto ? '' : registro.descricao;

  return (
    <article
      className="ru-ficha ru-ficha--peso ru-ficha--artefato lg:sticky lg:top-5"
      data-peso={raridade.peso}
      style={{ '--deg-rgb': rgb } as React.CSSProperties}
    >
      <header className="ru-ficha__cabeca p-5 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--sec)', filter: 'brightness(1.3)' }}>{rotuloDaSecao} · {registro.subtitulo || (info.fruto ? 'Fruto do Éden' : 'Artefato')}</span>
          <div className="flex flex-wrap items-center gap-2">{acoes}</div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="ru-selo-vd shrink-0" style={{ width: '4.5rem', height: '4.5rem' }} aria-hidden="true">
            <Icone size={raridade.peso >= 3 ? 34 : 28} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="ru-degrau">{raridade.rotulo}</span>
            <h2 className={`mt-1.5 font-bold leading-[1.05] text-white ${registro.titulo.length > 22 ? 'text-3xl sm:text-4xl' : 'text-3xl sm:text-5xl'}`} style={{ fontFamily: 'Cinzel, serif' }}>{registro.titulo}</h2>
          </div>
        </div>
        {marcadores.length ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {marcadores.map((marcador) => <li key={marcador} className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-gray-300">{marcador}</li>)}
          </ul>
        ) : null}
      </header>

      <div className="space-y-8 p-5 sm:p-8">
        {citacao ? (
          <blockquote className="ru-citacao">
            {paragrafos(citacao).map((paragrafo, indice) => <p key={indice}>{paragrafo}</p>)}
          </blockquote>
        ) : null}
        {textoPrincipal ? (
          <div className="space-y-4 text-base leading-8 text-gray-300 sm:text-lg sm:leading-9">
            {paragrafos(textoPrincipal).map((paragrafo, indice) => <p key={indice}>{paragrafo}</p>)}
          </div>
        ) : null}

        {registro.camposAjustados ? (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {registro.campos.map(([nome, valor]) => (
              <div key={nome} className="rounded-xl border border-white/10 bg-[#0b0f14] p-4">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{nome}</dt>
                <dd className="mt-1 text-sm leading-6 text-gray-200">{valor}</dd>
              </div>
            ))}
          </dl>
        ) : usosPreenchidos.length ? (
          <section>
            <Titulo>Como se usa</Titulo>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {usosPreenchidos.map(([icone, rotulo, valor]) => <Uso key={rotulo} icone={icone} rotulo={rotulo} valor={valor} />)}
            </div>
          </section>
        ) : null}

        {registro.blocosAjustados ? (
          registro.blocos.map((bloco) => (
            <section key={bloco.titulo} className="border-l-2 pl-4" style={{ borderColor: 'rgba(var(--deg-rgb), .5)' }}>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{bloco.titulo}</h3>
              <ul className="space-y-1.5 text-sm leading-7 text-gray-300 sm:text-base">{bloco.itens.map((item, indice) => <li key={indice}>{item}</li>)}</ul>
            </section>
          ))
        ) : info.fruto ? (
          <>
            {info.passivo || info.tecnica ? (
              <section>
                <Titulo icone={<Sparkles size={13} />}>Poderes</Titulo>
                <div className="ru-poderes">
                  <span className="ru-poderes__cabeca">Antes de despertar</span>
                  <span className="ru-poderes__cabeca ru-poderes__cabeca--desperto">Despertado</span>
                  {([['Passivo', info.passivo, info.passivoDespertado], ['Técnica', info.tecnica, info.tecnicaDespertada]] as const)
                    .filter(([, comum, desperto]) => comum || desperto)
                    .map(([rotulo, comum, desperto]) => (
                      <React.Fragment key={rotulo}>
                        <div className="ru-poderes__celula"><small>{rotulo}</small><Poder linha={comum} /></div>
                        <div className="ru-poderes__celula ru-poderes__celula--desperto"><small>{rotulo}</small><Poder linha={desperto || comum} /></div>
                      </React.Fragment>
                    ))}
                </div>
              </section>
            ) : null}
            {info.despertar ? (
              <section>
                <Titulo icone={<Zap size={13} />}>Despertar</Titulo>
                <div className="ru-habilidade text-sm leading-7 text-gray-300 sm:text-base"><Poder linha={info.despertar} /></div>
              </section>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {info.fraqueza ? (
                <div className="ru-dica ru-dica--fraqueza"><span className="ru-dica__rotulo"><TriangleAlert size={14} aria-hidden="true" /> Fraqueza</span><p>{info.fraqueza}</p></div>
              ) : null}
              {info.vinculo ? (
                <div className="ru-dica ru-dica--vinculo"><span className="ru-dica__rotulo"><Link2 size={14} aria-hidden="true" /> Vínculo</span><p>{info.vinculo}</p></div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            {info.efeito ? (
              <section>
                <Titulo icone={<Sparkles size={13} />}>Em resumo</Titulo>
                <p className="ru-habilidade text-base leading-7 text-gray-100">{info.efeito}</p>
              </section>
            ) : null}
            {info.formas.length ? (
              <section>
                <Titulo>Desperta com o dono</Titulo>
                <ol className="ru-formas">
                  {info.formas.map((forma) => (
                    <li key={forma.nivel}>
                      <span className="ru-formas__nivel">Nível {forma.nivel}</span>
                      <strong className="block text-white">{forma.titulo}</strong>
                      {forma.descricao ? <span className="mt-1 block text-sm leading-6 text-gray-400">{forma.descricao}</span> : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
            {info.dilema ? (
              <div className="ru-dica ru-dica--fraqueza"><span className="ru-dica__rotulo"><TriangleAlert size={14} aria-hidden="true" /> O preço de usar</span><p>{info.dilema}</p></div>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
};
