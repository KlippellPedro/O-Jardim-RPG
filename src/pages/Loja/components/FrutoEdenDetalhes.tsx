import React from 'react';
import { Sparkles, Zap, Link2, ShieldAlert, Sunrise } from 'lucide-react';

interface PoderFruto {
  id?: string;
  nome: string;
  tipo?: string;
  custo?: { recurso?: string; valor?: number };
  acao?: string;
  alcance?: string;
  duracao?: string;
  estagio?: string;
  descricao?: string;
  melhoriaDespertada?: { nome?: string; descricao?: string };
}

const rotuloCusto = (custo?: PoderFruto['custo']): string => {
  const valor = Number(custo?.valor);
  if (!Number.isFinite(valor) || valor <= 0) return '';
  return `${valor} de ${custo?.recurso === 'estamina' ? 'Estamina' : 'Mana'}`;
};

const Bloco: React.FC<{ icone: React.ReactNode; titulo: string; cor: string; children: React.ReactNode }> = ({ icone, titulo, cor, children }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
    <div className={`mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] ${cor}`}>{icone} {titulo}</div>
    {children}
  </div>
);

const Linha: React.FC<{ rotulo: string; texto?: string }> = ({ rotulo, texto }) => (
  texto ? (
    <p className="mt-2 text-sm leading-6 text-gray-300 first:mt-0">
      <strong className="font-bold text-white">{rotulo}</strong> {texto}
    </p>
  ) : null
);

/** Detalhes de um Fruto do Éden na Loja: lore em destaque e as regras em blocos,
 * em vez de um parágrafo único com tudo junto. */
export const FrutoEdenDetalhes: React.FC<{ dados: Record<string, any> }> = ({ dados }) => {
  const poderes: PoderFruto[] = Array.isArray(dados.poderesFicha) ? dados.poderesFicha : [];
  const temPoderesEstruturados = poderes.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {dados.lore ? (
        <p className="border-l-2 border-[#c7a44c]/50 pl-4 text-lg italic leading-relaxed text-gray-300">{dados.lore}</p>
      ) : null}

      {(dados.fluxo || dados.deidade) ? (
        <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
          {dados.deidade ? <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-amber-200">Deidade: {dados.deidade}</span> : null}
        </div>
      ) : null}

      <Bloco icone={<Link2 size={14} />} titulo="Vínculo" cor="text-amber-300">
        <Linha rotulo="Ao consumir:" texto={dados.passivo} />
        <Linha rotulo="Ao despertar:" texto={dados.passivoDespertado} />
      </Bloco>

      {temPoderesEstruturados ? (
        poderes.map((poder) => {
          const custo = rotuloCusto(poder.custo);
          const soDespertado = poder.estagio === 'despertado';
          return (
            <Bloco
              key={poder.id || poder.nome}
              icone={soDespertado ? <Sunrise size={14} /> : <Zap size={14} />}
              titulo={soDespertado ? 'Só depois do Despertar' : poder.tipo === 'Reação' ? 'Reação' : 'Poder'}
              cor={soDespertado ? 'text-fuchsia-300' : 'text-cyan-300'}
            >
              <h4 className="text-base font-bold text-white">{poder.nome}</h4>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-500">
                {[custo, poder.acao, poder.alcance && `alcance ${poder.alcance}`, poder.duracao].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-300">{poder.descricao}</p>
              {poder.melhoriaDespertada?.descricao ? (
                <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-6 text-fuchsia-100/80">
                  <strong className="font-bold text-fuchsia-200">Ao despertar, {poder.melhoriaDespertada.nome}:</strong> {poder.melhoriaDespertada.descricao}
                </p>
              ) : null}
            </Bloco>
          );
        })
      ) : (
        <>
          <Bloco icone={<Zap size={14} />} titulo="Técnica" cor="text-cyan-300">
            <Linha rotulo="Antes de despertar:" texto={dados.tecnica} />
            <Linha rotulo="Depois de despertar:" texto={dados.tecnicaDespertada} />
            {dados.custo ? <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-500">{dados.custo}{dados.frequencia ? ` · ${dados.frequencia}` : ''}</p> : null}
          </Bloco>
          <Bloco icone={<Sunrise size={14} />} titulo="Despertar" cor="text-fuchsia-300">
            <Linha rotulo="" texto={dados.despertar} />
          </Bloco>
        </>
      )}

      <Bloco icone={<ShieldAlert size={14} />} titulo="Limite" cor="text-rose-300">
        <Linha rotulo="" texto={dados.fraqueza} />
        <p className="mt-2 text-xs text-gray-500">Só um Fruto do Éden fica vinculado a cada criatura. Consumir outro troca o vínculo anterior.</p>
      </Bloco>

      {dados.descricao ? (
        <details className="group rounded-xl border border-white/10 bg-black/20 p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white">
            <Sparkles size={14} /> Texto completo da regra
          </summary>
          <p className="mt-3 text-sm leading-6 text-gray-400">{dados.descricao}</p>
        </details>
      ) : null}
    </div>
  );
};

export default FrutoEdenDetalhes;
