import React from 'react';
import { Activity, DoorOpen, Eye, Flame, Footprints, Heart, Shield, Sparkles, Swords, Timer, Zap } from 'lucide-react';
import { SecaoLoot } from '../../Sessao/components/CriaturaDetalhe';
import { agruparHabilidades, degrauDoVd, numeroDaPericia, rgbDoDegrau } from './bestiario';
import type { IRegistro } from './registros';

interface IFichaProps {
  registro: IRegistro;
  gestor: boolean;
  campanhaId?: string;
  /** Botões de editar e marcas do Mestre, montados pela página (iguais em todas as seções). */
  acoes: React.ReactNode;
  rotuloDaSecao: string;
}

const ATRIBUTOS: Array<[string, string]> = [
  ['forca', 'Força'], ['agilidade', 'Agilidade'], ['vigor', 'Vigor'], ['presenca', 'Presença'], ['intelecto', 'Intelecto'],
];

const ROTULO_RARIDADE: Record<string, string> = {
  comum: 'Comum', incomum: 'Incomum', raro: 'Raro', epico: 'Épica', lendario: 'Lendária',
};

const ROTULO_PAPEL: Record<string, string> = {
  lacaio: 'Lacaio', padrao: 'Padrão', elite: 'Elite', chefe: 'Chefe', solo: 'Solo',
};

/** O selo ganha cor pelo efeito que tem sobre quem enfrenta a criatura. */
const COR_DO_SELO: Record<string, string> = {
  Medo: 'border-violet-400/40 bg-violet-400/10 text-violet-200',
  Mutilação: 'border-red-400/40 bg-red-400/10 text-red-200',
  Anunciado: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
  Combo: 'border-orange-300/40 bg-orange-300/10 text-orange-200',
  Cura: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200',
};
const SELO_NEUTRO = 'border-white/15 bg-white/[0.04] text-gray-300';

/** Tamanho do selo de VD e do título conforme o peso da criatura (0 a 4). */
const TAMANHO_DO_SELO = ['3.5rem', '4rem', '4.5rem', '5rem', '5.75rem'];
const TAMANHO_DO_TITULO = ['text-2xl sm:text-3xl', 'text-3xl sm:text-4xl', 'text-3xl sm:text-5xl', 'text-4xl sm:text-5xl', 'text-4xl sm:text-6xl'];

const paragrafos = (texto: string): string[] => texto.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);

const Numero = ({ icone, rotulo, valor, tom }: { icone: React.ReactNode; rotulo: string; valor: React.ReactNode; tom: string }) => (
  <div className={`rounded-xl border px-3 py-2.5 ${tom}`}>
    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70">{icone} {rotulo}</span>
    {/* Deslocamento às vezes traz uma frase ("0m (presa ao estreito que habita)"): vira texto corrido, não número grande. */}
    <span className={`mt-0.5 block ${typeof valor === 'string' && valor.length > 10 ? 'text-sm font-semibold leading-snug' : 'text-xl font-black leading-tight tabular-nums'}`}>{valor}</span>
  </div>
);

const Titulo = ({ icone, children }: { icone?: React.ReactNode; children: React.ReactNode }) => (
  <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">{icone}{children}</h3>
);

/** A ficha de uma criatura de fábrica do Bestiário: peso, números, habilidades separadas, sinais e loot. */
export const FichaCriatura = ({ registro, gestor, campanhaId, acoes, rotuloDaSecao }: IFichaProps) => {
  const criatura = registro.criatura;
  if (!criatura) return null;
  const degrau = degrauDoVd(criatura.vd);
  const habilidades = agruparHabilidades(criatura.habilidades);
  const marcadores = [
    criatura.classe,
    criatura.categoria,
    criatura.familia ? `${criatura.familia}${criatura.estagio ? ` (${criatura.estagio})` : ''}` : '',
    ROTULO_RARIDADE[criatura.raridade] ?? criatura.raridade,
    ROTULO_PAPEL[criatura.papel] ?? criatura.papel,
    criatura.nivel != null ? `Nível ${criatura.nivel}` : '',
    // Etiquetas de fábrica (subtipo, Contratável) e as que o Mestre acrescentou.
    ...registro.etiquetas,
  ].filter((item, indice, lista) => item && lista.findIndex((outro) => outro.toLowerCase() === item.toLowerCase()) === indice);

  return (
    <article
      className="ru-ficha ru-ficha--peso ru-ficha--criatura lg:sticky lg:top-5"
      data-peso={degrau.peso}
      style={{ '--deg-rgb': rgbDoDegrau(degrau) } as React.CSSProperties}
    >
      <header className="ru-ficha__cabeca p-5 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--sec)' }}>{rotuloDaSecao}</span>
          <div className="flex flex-wrap items-center gap-2">{acoes}</div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="ru-selo-vd shrink-0" style={{ width: TAMANHO_DO_SELO[degrau.peso], height: TAMANHO_DO_SELO[degrau.peso] }} aria-label={`Valor de desafio ${criatura.vd ?? 'sem valor'}`}>
            <small>VD</small>
            <strong style={{ fontSize: degrau.peso >= 4 ? '1.9rem' : degrau.peso >= 2 ? '1.6rem' : '1.35rem' }}>{criatura.vd ?? '-'}</strong>
          </div>
          <div className="min-w-0 flex-1">
            <span className="ru-degrau">{degrau.rotulo}</span>
            <h2 className={`mt-1.5 font-bold leading-[1.05] text-white ${TAMANHO_DO_TITULO[Math.max(0, degrau.peso - (registro.titulo.length > 22 ? 1 : 0))]}`} style={{ fontFamily: 'Cinzel, serif' }}>{registro.titulo}</h2>
            {registro.subtitulo ? <p className="mt-2 text-xs font-bold uppercase tracking-widest text-gray-500">{registro.subtitulo}</p> : null}
          </div>
        </div>
        <ul className="mt-5 flex flex-wrap gap-2">
          {marcadores.map((marcador) => (
            <li key={marcador} className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-gray-300">{marcador}</li>
          ))}
        </ul>
      </header>

      <div className="space-y-8 p-5 sm:p-8">
        {registro.descricao ? (
          <div className="space-y-4 text-base leading-8 text-gray-300 sm:text-lg sm:leading-9">
            {paragrafos(registro.descricao).map((paragrafo, indice) => <p key={indice}>{paragrafo}</p>)}
          </div>
        ) : null}

        {registro.camposAjustados ? (
          <dl className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {registro.campos.map(([nome, valor]) => (
              <div key={nome} className="bg-[#0b0f14] p-4">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{nome}</dt>
                <dd className="mt-1 text-sm leading-6 text-gray-200">{valor}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {criatura.pv != null ? <Numero icone={<Heart size={11} />} rotulo="Vida" valor={criatura.pv.toLocaleString('pt-BR')} tom="border-red-400/25 bg-red-400/[0.07] text-red-100" /> : null}
              {criatura.defesa != null ? <Numero icone={<Shield size={11} />} rotulo="Defesa" valor={criatura.defesa} tom="border-white/12 bg-white/[0.04] text-white" /> : null}
              {criatura.iniciativa != null ? <Numero icone={<Timer size={11} />} rotulo="Iniciativa" valor={criatura.iniciativa} tom="border-white/12 bg-white/[0.04] text-white" /> : null}
              {criatura.mana != null ? <Numero icone={<Zap size={11} />} rotulo="Mana" valor={criatura.mana.toLocaleString('pt-BR')} tom="border-sky-400/25 bg-sky-400/[0.07] text-sky-100" /> : null}
              {criatura.estamina != null ? <Numero icone={<Activity size={11} />} rotulo="Estamina" valor={criatura.estamina.toLocaleString('pt-BR')} tom="border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-100" /> : null}
              {criatura.deslocamento ? <Numero icone={<Footprints size={11} />} rotulo="Deslocamento" valor={criatura.deslocamento} tom="border-white/12 bg-white/[0.04] text-white" /> : null}
            </div>
            {criatura.atributos ? (
              <section>
                <Titulo>Atributos</Titulo>
                <div className="grid grid-cols-5 gap-2">
                  {ATRIBUTOS.map(([chave, rotulo]) => (
                    <div key={chave} className="rounded-xl border border-white/10 bg-black/30 py-2.5 text-center">
                      <span className="block text-[9px] font-bold uppercase tracking-tight text-gray-500 sm:text-[10px] sm:tracking-wider">{rotulo}</span>
                      <span className="text-lg font-black tabular-nums text-white">{criatura.atributos?.[chave] ?? '-'}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}

        {registro.blocosAjustados ? (
          registro.blocos.map((bloco) => (
            <section key={bloco.titulo} className="border-l-2 pl-4" style={{ borderColor: 'rgba(var(--deg-rgb), .5)' }}>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{bloco.titulo}</h3>
              <ul className="space-y-1.5 text-sm leading-7 text-gray-300 sm:text-base">{bloco.itens.map((item, indice) => <li key={indice}>{item}</li>)}</ul>
            </section>
          ))
        ) : (
          <>
            {criatura.ataques.length > 0 ? (
              <section>
                <Titulo icone={<Swords size={13} />}>Ataques</Titulo>
                <ul className="space-y-2">
                  {criatura.ataques.map((ataque) => (
                    <li key={ataque.nome} className="rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                      <strong className="block text-sm text-white">{ataque.nome}</strong>
                      {ataque.detalhe ? <span className="mt-0.5 block font-mono text-xs leading-5 text-gray-400">{ataque.detalhe}</span> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {criatura.pericias.length > 0 ? (
              <section>
                <Titulo>Testes</Titulo>
                <div className="flex flex-wrap gap-2">
                  {criatura.pericias.map((pericia) => {
                    const { nome, valor } = numeroDaPericia(pericia);
                    return (
                      <span key={pericia} className="inline-flex items-baseline gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-gray-300">
                        {nome}{valor ? <strong className="font-mono text-sm text-white">{valor}</strong> : null}
                      </span>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {habilidades.ativas.length > 0 ? (
              <section>
                <Titulo icone={<Sparkles size={13} />}>Habilidades</Titulo>
                <ul className="space-y-2.5">
                  {habilidades.ativas.map((habilidade, indice) => (
                    <li key={`${habilidade.nome}-${indice}`} className="ru-habilidade">
                      <div className="flex flex-wrap items-center gap-2">
                        {habilidade.nome ? <strong className="text-base text-white">{habilidade.nome}</strong> : null}
                        {habilidade.selos.map((selo) => (
                          <span key={selo} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${COR_DO_SELO[selo] ?? SELO_NEUTRO}`}>{selo}</span>
                        ))}
                      </div>
                      <p className="mt-1.5 text-sm leading-7 text-gray-300 sm:text-base">{habilidade.regra}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {habilidades.passivas.length > 0 ? (
              <section>
                <Titulo>Características</Titulo>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {habilidades.passivas.map((habilidade, indice) => (
                    <li key={`${habilidade.nome}-${indice}`} className="rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3 text-sm leading-6 text-gray-400">
                      {habilidade.nome ? <strong className="block text-gray-200">{habilidade.nome}</strong> : null}
                      {habilidade.regra}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}

        {!registro.blocosAjustados && (habilidades.sinais.length > 0 || habilidades.evitar.length > 0) ? (
          <section>
            <Titulo>Para quem vai enfrentar</Titulo>
            <div className="grid gap-3 sm:grid-cols-2">
              {habilidades.sinais.map((item, indice) => (
                <div key={`sinal-${indice}`} className="ru-dica ru-dica--sinais">
                  <span className="ru-dica__rotulo"><Eye size={14} aria-hidden="true" /> Sinais</span>
                  <p>{item.regra}</p>
                </div>
              ))}
              {habilidades.evitar.map((item, indice) => (
                <div key={`evitar-${indice}`} className="ru-dica ru-dica--evitar">
                  <span className="ru-dica__rotulo"><DoorOpen size={14} aria-hidden="true" /> Como evitar</span>
                  <p>{item.regra}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {gestor && criatura.fases.length > 0 ? (
          <section>
            <Titulo icone={<Flame size={13} />}>Fases do chefe (só o Mestre vê)</Titulo>
            <ol className="space-y-2.5">
              {criatura.fases.map((fase, indice) => (
                <li key={fase.nome} className="rounded-xl border border-red-400/20 bg-red-400/[0.045] px-4 py-3.5 text-sm leading-6 text-gray-300">
                  <strong className="block text-base text-white">
                    Fase {indice + 2}: {fase.nome}
                    {fase.quando != null ? <span className="ml-2 text-[11px] font-semibold text-red-300">a partir de {Math.round(fase.quando * 100)}% da Vida</span> : <span className="ml-2 text-[11px] font-semibold text-gray-500">só pelo Mestre</span>}
                  </strong>
                  {fase.anuncio ? <span className="mt-1 block italic text-gray-200">{fase.anuncio}</span> : null}
                  {fase.mudancas.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-400">{fase.mudancas.map((mudanca) => <li key={mudanca}>{mudanca}</li>)}</ul> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {campanhaId && registro.origemId ? (
          <SecaoLoot campanhaId={campanhaId} monstroId={registro.origemId} somenteLeitura={!gestor} />
        ) : null}

        {criatura.funcao ? <p className="text-sm leading-6 text-gray-500"><strong className="text-gray-400">Contratada para:</strong> {criatura.funcao}</p> : null}
      </div>
    </article>
  );
};
