import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, RotateCcw, Search } from 'lucide-react';
import { vibrar } from '../../../utils/vibracaoDoApp';
import {
  ROTULO_TIPO_MESA,
  agruparAcoesMesa,
  desmarcarUso,
  filtrarAcoesMesa,
  marcarUso,
  usosRestantes,
  zerarUsos,
  type IAcaoMesa,
  type TipoAcaoMesa,
  type UsosMarcados,
} from '../../../services/acoesDeMesa';

interface IAcoesDeMesaProps {
  personagemId: string;
  acoes: IAcaoMesa[];
  /** Gasta o custo de um uso (Mana ou Estamina). */
  onGastar: (recurso: 'mana' | 'estamina', valor: number) => void;
}

/** A partir daqui a lista ganha busca: abaixo disso, rolar já basta. */
const ITENS_PARA_BUSCA = 20;

const chaveUsos = (personagemId: string) => `jardim:mesa-usos:${personagemId}`;

// Os contadores ficam no aparelho: são da cena, e a ficha não precisa guardá-los.
function lerUsos(personagemId: string): UsosMarcados {
  try {
    const bruto = window.localStorage.getItem(chaveUsos(personagemId));
    const lido = bruto ? JSON.parse(bruto) : {};
    return lido && typeof lido === 'object' && !Array.isArray(lido) ? lido : {};
  } catch {
    return {};
  }
}

function gravarUsos(personagemId: string, usos: UsosMarcados) {
  try {
    window.localStorage.setItem(chaveUsos(personagemId), JSON.stringify(usos));
  } catch {
    // Sem armazenamento (aba anônima, bloqueio): os contadores valem só até fechar.
  }
}

/** O texto da ação além do rótulo do grupo ("antes do ataque", "no momento da conjuração"). */
function detalheDaAcao(item: IAcaoMesa): string {
  const resto = item.acao
    .replace(/^(a[cç][aã]o (livre|padr[aã]o|completa|de movimento)|rea[cç][aã]o|passivo)\b[,.]?\s*/i, '')
    .trim();
  return resto && item.tipo !== 'fora' ? resto : item.tipo === 'fora' ? item.acao : '';
}

const custoRotulo = (item: IAcaoMesa) => [
  item.custoMana ? `${item.custoMana} Mana` : '',
  item.custoEstamina ? `${item.custoEstamina} Estamina` : '',
].filter(Boolean).join(' · ');

interface IItemProps {
  item: IAcaoMesa;
  usos: UsosMarcados;
  onMarcar: (item: IAcaoMesa) => void;
  onDesmarcar: (item: IAcaoMesa) => void;
  onUsar: (item: IAcaoMesa) => void;
}

const ItemDeMesa = ({ item, usos, onMarcar, onDesmarcar, onUsar }: IItemProps) => {
  const [aberto, setAberto] = useState(false);
  const restantes = usosRestantes(usos, item);
  const esgotado = restantes === 0;
  const detalhe = detalheDaAcao(item);
  const custo = custoRotulo(item);
  return (
    <li className={`rounded-xl border px-3 py-2 ${esgotado ? 'border-white/5 bg-black/30 opacity-60' : 'border-white/10 bg-[#0f0e15]'}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          aria-expanded={aberto}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-snug text-white">{item.titulo}</span>
            {detalhe || item.limite ? (
              <span className="block text-[11px] leading-4">
                {detalhe ? <span className="text-[#e3c46f]">{detalhe}</span> : null}
                {detalhe && item.limite ? <span className="text-gray-600"> · </span> : null}
                {item.limite ? <span className="text-gray-500">{item.limite.rotulo}</span> : null}
              </span>
            ) : null}
          </span>
          <ChevronDown size={14} className={`shrink-0 text-gray-500 transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {item.limite && item.limite.janela !== 'rodada' ? (
          <span className="flex shrink-0 items-center gap-1" role="group" aria-label={`Usos de ${item.titulo}: ${restantes} de ${item.limite.vezes} ${item.limite.rotulo.replace(/^\d+× /, '')}`}>
            {Array.from({ length: item.limite.vezes }, (_, indice) => {
              const usado = indice < (usos[item.id] || 0);
              return (
                <button
                  key={indice}
                  type="button"
                  onClick={() => { vibrar('toque'); if (usado) onDesmarcar(item); else onMarcar(item); }}
                  aria-label={usado ? `Desmarcar um uso de ${item.titulo}` : `Marcar um uso de ${item.titulo}`}
                  aria-pressed={usado}
                  className={`h-8 w-8 rounded-full border text-[11px] font-bold active:scale-95 ${usado ? 'border-white/10 bg-white/5 text-gray-600' : 'border-[#c7a44c]/60 bg-[#c7a44c]/15 text-[#f3dc8f]'}`}
                >
                  {usado ? '×' : '●'}
                </button>
              );
            })}
          </span>
        ) : null}
        {custo ? <span className="shrink-0 text-[11px] font-bold text-gray-400">{custo.replace(' Mana', ' M').replace(' Estamina', ' E')}</span> : null}
        {custo ? (
          <button
            type="button"
            disabled={esgotado}
            onClick={() => onUsar(item)}
            className="min-h-9 shrink-0 rounded-lg border border-[#c7a44c]/40 bg-[#c7a44c]/10 px-3 text-xs font-bold text-[#e3c46f] active:scale-95 disabled:opacity-40"
            aria-label={`Usar ${item.titulo} e gastar ${custo}`}
          >
            Usar
          </button>
        ) : null}
      </div>
      {aberto ? <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-gray-300">{item.descricao}</p> : null}
    </li>
  );
};

/** "No seu turno": o que pede decisão, por tipo de ação, com os contadores de
 * cena à vista. Passivos e o que é de fora de combate ficam numa aba à parte. */
export const AcoesDeMesa = ({ personagemId, acoes, onGastar }: IAcoesDeMesaProps) => {
  const { grupos, passivos, fora } = useMemo(() => agruparAcoesMesa(acoes), [acoes]);
  const abas = useMemo(() => [
    ...grupos.map((grupo) => ({ tipo: grupo.tipo, rotulo: grupo.rotulo, itens: grupo.itens })),
    ...(passivos.length ? [{ tipo: 'passivo' as TipoAcaoMesa, rotulo: ROTULO_TIPO_MESA.passivo, itens: passivos }] : []),
    ...(fora.length ? [{ tipo: 'fora' as TipoAcaoMesa, rotulo: ROTULO_TIPO_MESA.fora, itens: fora }] : []),
  ], [grupos, passivos, fora]);
  const [aba, setAba] = useState<TipoAcaoMesa | null>(null);
  const [busca, setBusca] = useState('');
  const [usos, setUsos] = useState<UsosMarcados>(() => lerUsos(personagemId));

  useEffect(() => { setUsos(lerUsos(personagemId)); }, [personagemId]);

  if (!abas.length) return null;
  const atual = abas.find((item) => item.tipo === aba) || abas[0];
  const mudarUsos = (proximo: UsosMarcados) => { setUsos(proximo); gravarUsos(personagemId, proximo); };
  const comBusca = acoes.length >= ITENS_PARA_BUSCA;
  const visiveis = busca.trim() ? filtrarAcoesMesa(abas.flatMap((item) => item.itens), busca) : atual.itens;
  const porOrigem = visiveis.reduce<Array<{ origem: string; itens: IAcaoMesa[] }>>((lista, item) => {
    const grupo = lista.find((entrada) => entrada.origem === item.origem);
    if (grupo) grupo.itens.push(item);
    else lista.push({ origem: item.origem, itens: [item] });
    return lista;
  }, []);
  const temContador = acoes.some((item) => item.limite && item.limite.janela !== 'rodada');
  const marcados = Object.values(usos).reduce((total, vezes) => total + vezes, 0);

  const usar = (item: IAcaoMesa) => {
    if (usosRestantes(usos, item) === 0) return;
    vibrar('toque');
    if (item.custoMana) onGastar('mana', item.custoMana);
    if (item.custoEstamina) onGastar('estamina', item.custoEstamina);
    mudarUsos(marcarUso(usos, item));
  };

  return (
    <section aria-label="No seu turno" className="rounded-2xl border border-[#c7a44c]/20 bg-[#0b0a10] p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c7a44c]">No seu turno</h3>
        <span className="text-[11px] text-gray-500">{acoes.length - passivos.length - fora.length} pedem decisão · {passivos.length} passivos</span>
      </div>

      {comBusca ? (
        <label className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3">
          <Search size={14} className="text-gray-500" aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar habilidade, poder ou classe"
            aria-label="Buscar no que você pode fazer"
            className="min-h-11 w-full bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none"
          />
        </label>
      ) : null}

      {!busca.trim() ? (
        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Tipo de ação">
          {abas.map((item) => {
            const ativa = item.tipo === atual.tipo;
            const secundaria = item.tipo === 'passivo' || item.tipo === 'fora';
            return (
              <button
                key={item.tipo}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => setAba(item.tipo)}
                className={`min-h-10 shrink-0 rounded-lg border px-2.5 text-xs font-bold ${ativa
                  ? 'border-[#c7a44c]/60 bg-[#c7a44c]/15 text-[#f3dc8f]'
                  : secundaria ? 'border-white/5 text-gray-600' : 'border-white/10 text-gray-300'}`}
              >
                {item.rotulo} <span className="opacity-60">{item.itens.length}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {porOrigem.length ? porOrigem.map((grupo) => (
        <div key={grupo.origem} className="mb-3 last:mb-0">
          {porOrigem.length > 1 ? <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">{grupo.origem}</h4> : null}
          <ul className="space-y-2">
            {grupo.itens.map((item) => (
              <ItemDeMesa
                key={item.id}
                item={item}
                usos={usos}
                onMarcar={(alvo) => mudarUsos(marcarUso(usos, alvo))}
                onDesmarcar={(alvo) => mudarUsos(desmarcarUso(usos, alvo))}
                onUsar={usar}
              />
            ))}
          </ul>
        </div>
      )) : (
        <p className="rounded-xl border border-dashed border-white/10 py-4 text-center text-sm text-gray-600">Nada encontrado.</p>
      )}

      {temContador ? (
        <div className="mt-3 border-t border-white/5 pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
            <RotateCcw size={11} aria-hidden="true" /> Zerar usos {marcados ? <span className="normal-case tracking-normal text-gray-600">({marcados} marcados)</span> : null}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {([['cena', 'Nova cena'], ['descanso', 'Descansei'], ['sessao', 'Nova sessão']] as const).map(([janela, rotulo]) => (
              <button
                key={janela}
                type="button"
                disabled={!marcados}
                onClick={() => { vibrar('toque'); mudarUsos(zerarUsos(usos, acoes, janela)); }}
                className="min-h-10 rounded-lg border border-white/10 text-xs font-bold text-gray-300 active:scale-95 disabled:opacity-40"
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};
