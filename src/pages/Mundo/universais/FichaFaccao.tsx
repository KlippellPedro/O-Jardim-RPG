import React from 'react';
import { Link } from 'react-router-dom';
import { BellRing, Building2, ChevronRight, Crown, MapPin, Skull, Cpu, Crosshair, FlaskConical, Globe2, HeartPulse, Landmark, Languages, PackageOpen, Route, ShieldAlert, Swords } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { monograma, tipoLegivel } from './artefatos';
import { Brasao } from './Brasao';
import { identidadeDe } from './identidadesFaccao';
import type { IRegistro } from './registros';

interface IFichaProps {
  registro: IRegistro;
  acoes: React.ReactNode;
  rotuloDaSecao: string;
}

const ICONE_DO_TIPO: Record<string, LucideIcon> = {
  'instituicao-financeira': Landmark,
  'corporacao-tecnologica': Cpu,
  'rede-de-transporte': Route,
  'ordem-de-contencao': ShieldAlert,
  'instituicao-de-pesquisa': FlaskConical,
  'guilda-de-cacadores': Crosshair,
  'casa-de-traducao': Languages,
  'sociedade-de-registro': BellRing,
  'ordem-de-socorro': HeartPulse,
  'rede-de-contrabando': PackageOpen,
  'culto-sanguinario': Skull,
  'organizacao-criminosa': Crosshair,
};

const paragrafos = (texto: string): string[] => texto.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);

/** Ficha de Facção: brasão com monograma, o alcance como faixa e a atuação pública em destaque. */
export const FichaFaccao = ({ registro, acoes, rotuloDaSecao }: IFichaProps) => {
  const info = registro.faccao;
  if (!info) return null;
  const Icone = ICONE_DO_TIPO[info.tipo] ?? Building2;
  const alcance = registro.subtitulo || info.alcance;
  return (
    <article className="ru-ficha ru-ficha--faccao lg:sticky lg:top-5">
      <header className="ru-ficha__cabeca p-5 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--sec)', filter: 'brightness(1.3)' }}>{rotuloDaSecao}</span>
          <div className="flex flex-wrap items-center gap-2">{acoes}</div>
        </div>
        <div className="flex items-center gap-5 sm:gap-7">
          <div className="ru-brasao shrink-0" aria-hidden="true">
            <Brasao forma={identidadeDe(registro.origemId ?? '')?.forma} className="h-full w-full" />
            <Icone size={20} strokeWidth={1.6} className="ru-brasao__icone" />
            <strong className="ru-brasao__letras">{monograma(registro.titulo)}</strong>
          </div>
          <div className="min-w-0 flex-1">
            <span className="ru-degrau">{tipoLegivel(info.tipo)}</span>
            <h2 className="mt-1.5 text-3xl font-bold leading-[1.05] text-white sm:text-5xl" style={{ fontFamily: 'Cinzel, serif' }}>{registro.titulo}</h2>
          </div>
        </div>
        {alcance ? (
          <p className="ru-faixa mt-6"><Globe2 size={16} aria-hidden="true" /> <span><small>Alcance</small>{alcance}</span></p>
        ) : null}
        {info.lider ? (
          <Link to={`/mundo/universal?secao=seres&registro=padrao:seres:${encodeURIComponent(info.lider.id)}`} className="ru-faixa ru-faixa--link mt-3">
            <Crown size={16} aria-hidden="true" /> <span><small>Liderada por</small>{info.lider.titulo}</span> <ChevronRight size={16} className="ml-auto" aria-hidden="true" />
          </Link>
        ) : null}
        {info.sede ? (
          <Link to={`/mundo/universal?secao=locais&registro=padrao:locais:${encodeURIComponent(info.sede.id)}`} className="ru-faixa ru-faixa--link mt-3">
            <MapPin size={16} aria-hidden="true" /> <span><small>Sede</small>{info.sede.titulo}</span> <ChevronRight size={16} className="ml-auto" aria-hidden="true" />
          </Link>
        ) : null}
      </header>

      <div className="space-y-8 p-5 sm:p-8">
        {info.proposta ? (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">Proposta: ainda não é canônica, só o Mestre vê esta facção.</p>
        ) : null}
        {registro.descricao ? (
          <section>
            <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">Atuação pública</h3>
            <blockquote className="ru-citacao">
              {paragrafos(registro.descricao).map((paragrafo, indice) => <p key={indice}>{paragrafo}</p>)}
            </blockquote>
          </section>
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
        ) : null}
        {registro.blocos.map((bloco) => (
          <section key={bloco.titulo} className="ru-bloco">
            <h3>{bloco.titulo}</h3>
            <ul className="space-y-1.5 text-sm leading-7 text-gray-300 sm:text-base">{bloco.itens.map((item, indice) => <li key={indice}>{item}</li>)}</ul>
          </section>
        ))}
        <p className="flex items-start gap-2 text-sm leading-6 text-gray-500"><Swords size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> Prestígio e fama com esta facção, e o que cada nível rende, estão no Livro de Regras, em Facções.</p>
      </div>
    </article>
  );
};
