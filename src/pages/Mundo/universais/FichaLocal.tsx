import React from 'react';
import { ChevronRight, Compass, Crown, Landmark, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { identidadeDe } from './identidadesFaccao';
import { identidadeDeLocal } from './identidadesLocal';
import { ICONES_DE_LOCAL } from './iconesDeLocal';
import type { IRegistro } from './registros';

interface IFichaProps {
  registro: IRegistro;
  acoes: React.ReactNode;
  rotuloDaSecao: string;
}

const paragrafos = (texto: string): string[] => texto.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);

/** Ficha de Local: a rosa dos ventos, "onde fica" em faixa e quem responde por ele. */
export const FichaLocal = ({ registro, acoes, rotuloDaSecao }: IFichaProps) => {
  const info = registro.local;
  if (!info) return null;
  const relacoes: Array<[React.ReactNode, string, string]> = [
    [<Crown key="r" size={14} />, 'Responsável', info.responsavel],
    [<Landmark key="d" size={14} />, 'Domínio', info.dominio],
  ];
  const preenchidas = relacoes.filter(([, , valor]) => valor);
  const identidade = identidadeDeLocal(registro.origemId ?? '');
  const Icone = identidade ? ICONES_DE_LOCAL[identidade.icone] : Compass;
  return (
    <article className="ru-ficha ru-ficha--local lg:sticky lg:top-5" data-padrao={identidade?.padrao}>
      <header className="ru-ficha__cabeca p-5 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--sec)', filter: 'brightness(1.3)' }}>{rotuloDaSecao}</span>
          <div className="flex flex-wrap items-center gap-2">{acoes}</div>
        </div>
        <div className="flex items-center gap-5 sm:gap-7">
          <div className="ru-medalhao shrink-0" aria-hidden="true"><Icone size={40} strokeWidth={1.3} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-bold leading-[1.05] text-white sm:text-5xl" style={{ fontFamily: 'Cinzel, serif' }}>{registro.titulo}</h2>
            {registro.subtitulo ? <p className="mt-3 text-sm font-bold uppercase tracking-widest text-gray-500">{registro.subtitulo}</p> : null}
          </div>
        </div>
        {info.localizacao ? (
          <p className="ru-faixa mt-6"><MapPin size={16} aria-hidden="true" /> <span><small>Onde fica</small>{info.localizacao}</span></p>
        ) : null}
        {info.faccao ? (
          <Link to={`/mundo/universal?secao=faccoes&registro=padrao:faccoes:${encodeURIComponent(info.faccao.id)}`} className="ru-faixa ru-faixa--link mt-3" style={identidadeDe(info.faccao.id) ? ({ '--sec-rgb': identidadeDe(info.faccao.id)?.rgb } as React.CSSProperties) : undefined}>
            <Users size={16} aria-hidden="true" /> <span><small>Sede de</small>{info.faccao.titulo}</span> <ChevronRight size={16} className="ml-auto" aria-hidden="true" />
          </Link>
        ) : null}
      </header>

      <div className="space-y-8 p-5 sm:p-8">
        <div className="space-y-4 text-base leading-8 text-gray-300 sm:text-lg sm:leading-9">
          {paragrafos(registro.descricao).map((paragrafo, indice) => <p key={indice}>{paragrafo}</p>)}
        </div>
        {registro.camposAjustados ? (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {registro.campos.map(([nome, valor]) => (
              <div key={nome} className="rounded-xl border border-white/10 bg-[#0b0f14] p-4">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{nome}</dt>
                <dd className="mt-1 text-sm leading-6 text-gray-200">{valor}</dd>
              </div>
            ))}
          </dl>
        ) : preenchidas.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {preenchidas.map(([icone, rotulo, valor]) => (
              <div key={rotulo} className="ru-dica ru-dica--local">
                <span className="ru-dica__rotulo">{icone} {rotulo}</span>
                <p>{valor}</p>
              </div>
            ))}
          </div>
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
