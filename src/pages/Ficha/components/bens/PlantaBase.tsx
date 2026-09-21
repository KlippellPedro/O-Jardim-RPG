import { useMemo, useState } from 'react';
import { ArrowUpCircle, Lock, Plus, Trash2 } from 'lucide-react';
import {
  acharCatalogo,
  acharPatamar,
  construcoesPossiveis,
  custoDoNivel,
  espacosUsados,
  melhoriaDaInstalacao,
  nivelDoCatalogo,
  proximoPatamar,
  type CustoBase,
  type InstalacaoPlanta,
} from '../../utils/plantaBase';

const COLUNAS_PADRAO = 5;

const COR_INSTALACAO: Record<string, string> = {
  dormitorio: 'border-sky-400/40 bg-sky-500/15 text-sky-100',
  'area-medica': 'border-rose-400/40 bg-rose-500/15 text-rose-100',
  oficina: 'border-orange-400/40 bg-orange-500/15 text-orange-100',
  laboratorio: 'border-violet-400/40 bg-violet-500/15 text-violet-100',
  armazem: 'border-yellow-400/40 bg-yellow-500/15 text-yellow-100',
  'hangar-estabulo': 'border-teal-400/40 bg-teal-500/15 text-teal-100',
  seguranca: 'border-slate-300/40 bg-slate-400/15 text-slate-100',
};
const COR_PERSONALIZADA = 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100';

const lunaris = (valor: number) => `${valor.toLocaleString('pt-BR')} L$`;
const custoTexto = (custo: CustoBase) =>
  `${lunaris(custo.aquisicao)}${custo.manutencao > 0 ? ` · +${lunaris(custo.manutencao)}/mês` : ''}`;

interface PlantaBaseProps {
  patamar: string | null | undefined;
  instalacoes: InstalacaoPlanta[];
  /** Clique numa vaga vazia ou no botão de editar: abre o editor de quem chama. */
  onEditar?: () => void;
  /** Só passa quando a pessoa pode remover instalação sem abrir o editor. */
  onRemover?: (id: string) => void;
  /** Colunas da grade de vagas. Em espaço apertado (prévia do modal) use menos. */
  colunas?: number;
}

/** A base vista como planta: cada instalação ocupa os quadradinhos que custa,
 * as vagas livres aparecem tracejadas, e o painel embaixo diz o que cada nível
 * faz, o que dá para melhorar e o que ainda cabe. Só apresenta: nenhuma regra
 * de custo ou de espaço é criada aqui, tudo vem de data/regras/bases.ts. */
export const PlantaBase = ({ patamar: patamarTexto, instalacoes, onEditar, onRemover, colunas = COLUNAS_PADRAO }: PlantaBaseProps) => {
  const COLUNAS = colunas;
  const patamar = acharPatamar(patamarTexto);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);

  const usados = espacosUsados(instalacoes);
  const total = patamar?.espacos ?? usados;
  const livres = Math.max(0, total - usados);
  const estourou = Boolean(patamar) && usados > total;
  const selecionada = instalacoes.find((i) => i.id === selecionadaId) ?? null;

  const melhorias = useMemo(
    () => instalacoes.map((i) => melhoriaDaInstalacao(i, patamar, livres)).filter((m): m is NonNullable<typeof m> => Boolean(m)),
    [instalacoes, patamar, livres],
  );
  const podeConstruir = useMemo(() => construcoesPossiveis(instalacoes, patamar, livres), [instalacoes, patamar, livres]);
  const subida = proximoPatamar(patamar);

  const catalogoSel = selecionada ? acharCatalogo(selecionada.nome) : undefined;
  const nivelSel = selecionada ? nivelDoCatalogo(catalogoSel, selecionada.nivel) : undefined;
  const melhoriaSel = selecionada ? melhorias.find((m) => m.instalacao.id === selecionada.id) : undefined;

  if (!patamar && instalacoes.length === 0) {
    return <p className="mt-4 text-xs text-gray-500">Defina um patamar (Posto, Sede, Complexo ou Fortaleza) para ver a planta e o que dá para construir.</p>;
  }

  return (
    <div className="mt-4 space-y-3 border-t border-emerald-500/10 pt-4" data-planta-base data-tour="bens-planta">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[11px]">
          <span className="font-bold uppercase tracking-widest text-emerald-400/80">
            Planta{patamar ? ` · ${patamar.titulo}` : ''}
          </span>
          <span className={estourou ? 'font-bold text-red-300' : 'text-gray-400'}>
            {patamar ? `${usados}/${total} espaços` : `${usados} espaços`}
            {patamar ? <span className="text-gray-600"> · até {patamar.ocupantes} ocupantes · nível máx. {patamar.nivelInstalacaoMaximo}</span> : null}
          </span>
        </div>
        {patamar ? (
          <div
            className="h-1.5 overflow-hidden rounded-full bg-black/40"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={Math.min(usados, total)}
            aria-label="Espaços ocupados"
          >
            <div className={`h-full ${estourou ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, (usados / Math.max(1, total)) * 100)}%` }} />
          </div>
        ) : null}
      </div>

      {estourou ? <p className="text-xs text-red-300">As instalações ocupam mais espaços do que o patamar comporta. Ajuste no editor.</p> : null}

      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${COLUNAS}, minmax(0, 1fr))` }}>
        {instalacoes.map((inst) => {
          const catalogo = acharCatalogo(inst.nome);
          const ativa = selecionadaId === inst.id;
          return (
            <button
              key={inst.id}
              type="button"
              onClick={() => setSelecionadaId(ativa ? null : inst.id)}
              aria-pressed={ativa}
              style={{ gridColumn: `span ${Math.min(COLUNAS, Math.max(1, inst.espacos))}` }}
              className={`min-h-[3.25rem] rounded-lg border px-2 py-1.5 text-left transition-shadow ${COR_INSTALACAO[catalogo?.id ?? ''] ?? COR_PERSONALIZADA} ${ativa ? 'ring-2 ring-white/60' : 'hover:brightness-125'}`}
            >
              <span className="block truncate text-xs font-bold">{inst.nome || 'Sem nome'}</span>
              <span className="block text-[10px] opacity-70">Nível {inst.nivel} · {inst.espacos} esp.</span>
            </button>
          );
        })}
        {Array.from({ length: patamar ? livres : 0 }).map((_, indice) => (
          <button
            key={`livre-${indice}`}
            type="button"
            onClick={onEditar}
            disabled={!onEditar}
            aria-label="Vaga livre: adicionar instalação"
            className="flex min-h-[3.25rem] items-center justify-center rounded-lg border border-dashed border-white/15 text-white/25 transition-colors enabled:hover:border-emerald-400/50 enabled:hover:text-emerald-300 disabled:cursor-default"
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        ))}
      </div>

      {selecionada ? (
        <div className="space-y-2 rounded-lg border border-white/10 bg-black/25 p-3 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-white">{selecionada.nome} · Nível {selecionada.nivel}</p>
              {catalogoSel ? <p className="mt-0.5 text-gray-500">{catalogoSel.descricao}</p> : <p className="mt-0.5 text-gray-500">Instalação personalizada: os efeitos são os que estiverem combinados na mesa.</p>}
            </div>
            {onRemover ? (
              <button type="button" onClick={() => onRemover(selecionada.id)} className="rounded p-1.5 text-gray-500 hover:text-red-300" aria-label={`Remover ${selecionada.nome}`}>
                <Trash2 size={13} />
              </button>
            ) : null}
          </div>
          {nivelSel ? (
            <>
              <ul className="list-disc space-y-0.5 pl-4 text-gray-300">
                {nivelSel.efeitos.map((efeito) => <li key={efeito}>{efeito}</li>)}
              </ul>
              <p className="text-gray-500">
                {nivelSel.capacidade ? `Capacidade ${nivelSel.capacidade} · ` : ''}
                Custo do nível: {custoTexto(custoDoNivel(nivelSel))}
              </p>
            </>
          ) : null}
          {catalogoSel ? <p className="text-[11px] text-gray-600">{catalogoSel.limite}</p> : null}
          {melhoriaSel ? (
            <p className={melhoriaSel.bloqueio ? 'text-amber-300' : 'text-emerald-300'}>
              Próximo nível ({melhoriaSel.proximo.nivel}): {melhoriaSel.proximo.efeitos[0]}
            </p>
          ) : null}
        </div>
      ) : instalacoes.length > 0 ? (
        <p className="text-[11px] text-gray-600">Toque numa instalação para ver o que ela faz e quanto custa.</p>
      ) : null}

      {melhorias.length > 0 ? (
        <section aria-label="Melhorias possíveis" className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">Melhorias possíveis</p>
          <ul className="space-y-1">
            {melhorias.map((m) => (
              <li key={m.instalacao.id} className="flex items-start gap-2 rounded-lg bg-black/20 px-3 py-2 text-xs">
                {m.bloqueio ? <Lock size={13} className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true" /> : <ArrowUpCircle size={13} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />}
                <div className="min-w-0">
                  <p className="text-gray-200">
                    {m.instalacao.nome}: nível {m.instalacao.nivel} → {m.proximo.nivel}
                    <span className="text-gray-500"> · {custoTexto(m.custo)}{m.espacosExtras > 0 ? ` · +${m.espacosExtras} esp.` : ''}</span>
                  </p>
                  {m.bloqueio === 'patamar' ? (
                    <p className="text-amber-300">Precisa de patamar {m.patamarNecessario ? m.patamarNecessario.titulo : 'maior'} ou superior (nível máximo hoje: {patamar?.nivelInstalacaoMaximo}).</p>
                  ) : null}
                  {m.bloqueio === 'espacos' ? (
                    <p className="text-amber-300">Faltam {m.espacosExtras - livres} espaço(s) livre(s). Libere uma vaga ou suba o patamar.</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {podeConstruir.length > 0 ? (
        <section aria-label="Ainda dá para construir" className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">Ainda dá para construir</p>
          <div className="flex flex-wrap gap-1.5">
            {podeConstruir.map(({ catalogo, nivel, custo }) => (
              <span
                key={catalogo.id}
                title={`${catalogo.descricao} ${nivel.efeitos[0]}`}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${COR_INSTALACAO[catalogo.id] ?? COR_PERSONALIZADA}`}
              >
                {catalogo.titulo} {nivel.nivel} · {nivel.espacos} esp. · {lunaris(custo.aquisicao)}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {subida ? (
        <p className="text-[11px] text-gray-500">
          Subir para <strong className="text-gray-300">{subida.proximo.titulo}</strong>: +{subida.espacosExtras} espaços, até {subida.proximo.ocupantes} ocupantes, instalações até o nível {subida.proximo.nivelInstalacaoMaximo} · {custoTexto(subida.custo)}.
        </p>
      ) : null}

      {onEditar ? (
        <button type="button" onClick={onEditar} className="text-[11px] font-bold text-emerald-300 underline-offset-2 hover:underline">
          Editar instalações
        </button>
      ) : null}
    </div>
  );
};
