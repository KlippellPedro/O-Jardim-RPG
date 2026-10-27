import React from 'react';
import { MessageCircle, Users } from 'lucide-react';
import { inicialDe, type IRegistro } from './registros';

interface IFichaProps {
  registro: IRegistro;
  acoes: React.ReactNode;
  rotuloDaSecao: string;
}

const paragrafos = (texto: string): string[] => texto.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);

/** Ficha de Idioma: a inicial em destaque, o povo que fala, o texto da língua, o cumprimento em destaque e a grade
 * com o som, a escrita e onde se ouve. O criador só aparece nas poucas línguas que guardam o nome de quem as fez. */
export const FichaIdioma = ({ registro, acoes, rotuloDaSecao }: IFichaProps) => {
  const info = registro.idioma;
  if (!info) return null;
  const cumprimento = registro.campos.find(([nome]) => nome === 'Cumprimento')?.[1];
  const grade = registro.campos.filter(([nome]) => nome !== 'Cumprimento');
  return (
    <article className="ru-ficha ru-ficha--idioma lg:sticky lg:top-5">
      <header className="ru-ficha__cabeca p-5 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--sec)', filter: 'brightness(1.3)' }}>{rotuloDaSecao} · Idioma</span>
          <div className="flex flex-wrap items-center gap-2">{acoes}</div>
        </div>
        <div className="flex items-center gap-5 sm:gap-7">
          <div className="ru-inicial shrink-0" aria-hidden="true">{inicialDe(registro.titulo)}</div>
          <div className="min-w-0 flex-1">
            <h2 className="text-4xl font-bold leading-[1.05] text-white sm:text-6xl" style={{ fontFamily: 'Cinzel, serif' }}>{registro.titulo}</h2>
            {registro.subtitulo ? <p className="mt-3 text-sm font-bold uppercase tracking-widest text-gray-500">{registro.subtitulo}</p> : null}
          </div>
        </div>
        <p className="ru-faixa mt-6"><Users size={16} aria-hidden="true" /> <span><small>Falado por</small>{info.universal ? 'Todos os povos' : info.povo}</span></p>
      </header>

      <div className="space-y-8 p-5 sm:p-8">
        <div className="space-y-4 text-base leading-8 text-gray-300 sm:text-lg sm:leading-9">
          {paragrafos(registro.descricao).map((paragrafo, indice) => <p key={indice}>{paragrafo}</p>)}
        </div>
        {cumprimento ? (
          <div className="ru-dica ru-dica--local">
            <span className="ru-dica__rotulo"><MessageCircle size={14} aria-hidden="true" /> Cumprimento</span>
            <p>{cumprimento}</p>
          </div>
        ) : null}
        {grade.length ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {grade.map(([nome, valor]) => (
              <div key={nome} className="rounded-xl border border-white/10 bg-[#0b0f14] p-4">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{nome}</dt>
                <dd className="mt-1 text-sm leading-6 text-gray-200">{valor}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {registro.blocos.map((bloco) => (
          <section key={bloco.titulo} className="ru-bloco">
            <h3>{bloco.titulo}</h3>
            <ul className="space-y-1.5 text-sm leading-7 text-gray-300 sm:text-base">{bloco.itens.map((item, indice) => <li key={indice}>{item}</li>)}</ul>
          </section>
        ))}
      </div>
    </article>
  );
};
