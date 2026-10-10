import { useMemo, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import {
  GRUPOS_PROFICIENCIA,
  GRUPOS_RESISTENCIA,
  MODOS_RESISTENCIA,
  normalizarProficiencia,
  normalizarResistencias,
  rotuloProficiencia,
  semAcento,
  type IGrupoCatalogo,
  type IOpcaoCatalogo,
  type IResistenciaFicha,
  type ModoResistencia,
} from '../utils/catalogoResistProf';

interface ISeletorCatalogoProps {
  grupos: ReadonlyArray<IGrupoCatalogo>;
  jaEscolhidos: ReadonlySet<string>;
  placeholderBusca: string;
  rotuloPersonalizada: string;
  onEscolher: (opcao: IOpcaoCatalogo) => void;
  onPersonalizada: (texto: string) => void;
  onFechar: () => void;
}

/** Painel de busca sobre um catálogo agrupado. O que não está nele entra como personalizado. */
const SeletorCatalogo = ({ grupos, jaEscolhidos, placeholderBusca, rotuloPersonalizada, onEscolher, onPersonalizada, onFechar }: ISeletorCatalogoProps) => {
  const [busca, setBusca] = useState('');
  const termo = semAcento(busca);
  const filtrados = useMemo(() => grupos
    .map((grupo) => ({
      ...grupo,
      itens: termo ? grupo.itens.filter((opcao) => semAcento(opcao.nome).includes(termo)) : grupo.itens,
    }))
    .filter((grupo) => grupo.itens.length > 0), [grupos, termo]);
  const nomeExato = busca.trim() && grupos.some((grupo) => grupo.itens.some((opcao) => semAcento(opcao.nome) === termo));

  return (
    <div className="rounded-xl border border-[#c7a44c]/20 bg-black/30 p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 focus-within:border-[#c7a44c]/50">
          <Search size={13} className="shrink-0 text-gray-500" aria-hidden="true" />
          <input
            autoFocus
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onFechar();
              if (event.key === 'Enter' && busca.trim() && filtrados.length === 0) onPersonalizada(busca.trim());
            }}
            placeholder={placeholderBusca}
            aria-label={placeholderBusca}
            className="w-full bg-transparent text-xs text-white placeholder:text-gray-600 focus:outline-none"
          />
        </label>
        <button type="button" onClick={onFechar} aria-label="Fechar catálogo" className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white">
          <X size={14} />
        </button>
      </div>
      <div className="custom-scrollbar max-h-60 space-y-3 overflow-y-auto pr-1">
        {filtrados.map((grupo) => (
          <div key={grupo.titulo}>
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-600">{grupo.titulo}</p>
            <div className="flex flex-wrap gap-1.5">
              {grupo.itens.map((opcao) => {
                const escolhido = jaEscolhidos.has(opcao.id);
                return (
                  <button
                    key={opcao.id}
                    type="button"
                    disabled={escolhido}
                    title={opcao.dica}
                    onClick={() => onEscolher(opcao)}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-gray-300 transition-colors hover:border-[#c7a44c]/50 hover:text-white disabled:cursor-default disabled:border-[#c7a44c]/20 disabled:text-[#c7a44c]/70"
                  >
                    {escolhido && <Check size={11} aria-hidden="true" />}
                    {opcao.nome}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <p className="px-1 py-2 text-xs text-gray-500">Nada no catálogo com esse nome.</p>
        )}
      </div>
      <button
        type="button"
        disabled={!busca.trim() || Boolean(nomeExato)}
        onClick={() => onPersonalizada(busca.trim())}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#c7a44c]/30 px-3 py-1.5 text-[11px] font-bold text-[#c7a44c] transition-colors hover:bg-[#c7a44c]/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={12} aria-hidden="true" />
        {busca.trim() && !nomeExato ? `${rotuloPersonalizada}: "${busca.trim()}"` : 'Não está na lista? Digite o nome acima'}
      </button>
    </div>
  );
};

interface ICartaoProps {
  titulo: string;
  contagem: number;
  podeEditar: boolean;
  aberto: boolean;
  onAlternar: () => void;
  rotuloAdicionar: string;
  dataTour?: string;
  children: React.ReactNode;
}

const CartaoDiario = ({ titulo, contagem, podeEditar, aberto, onAlternar, rotuloAdicionar, dataTour, children }: ICartaoProps) => (
  <div className="flex min-w-0 flex-col gap-2" data-tour={dataTour}>
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{titulo}</label>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold text-gray-500">{contagem}</span>
      </div>
      {podeEditar && (
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={aberto}
          className="inline-flex items-center gap-1 rounded-md border border-[#c7a44c]/25 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#c7a44c] transition-colors hover:bg-[#c7a44c]/10"
        >
          <Plus size={11} aria-hidden="true" />
          {rotuloAdicionar}
        </button>
      )}
    </div>
    {children}
  </div>
);

const VAZIO = 'flex min-h-[100px] items-center justify-center rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs leading-relaxed text-gray-600';
const LISTA = 'custom-scrollbar flex max-h-[320px] min-h-[100px] flex-col gap-2 overflow-y-auto rounded-xl border border-white/5 bg-[#121118] p-2.5';

interface IResistenciasProps {
  ficha: any;
  isMestre: boolean;
  onUpdate: any;
}

export const ResistenciasSection = ({ ficha, isMestre, onUpdate }: IResistenciasProps) => {
  const [aberto, setAberto] = useState(false);
  const lista = useMemo(() => normalizarResistencias(ficha.resistencias), [ficha.resistencias]);
  const textoAntigo = typeof ficha.resistenciasTexto === 'string' ? ficha.resistenciasTexto : '';
  const escolhidos = useMemo(() => new Set(lista.map((entrada) => entrada.id).filter(Boolean)), [lista]);

  const salvar = (proxima: IResistenciaFicha[]) => onUpdate(['ficha', 'resistencias'], proxima);
  const adicionar = (entrada: Pick<IResistenciaFicha, 'id' | 'nome'>) => {
    salvar([...lista, { ...entrada, modo: 'resistencia', valor: null, nota: '' }]);
  };
  const alterar = (indice: number, parcial: Partial<IResistenciaFicha>) => {
    salvar(lista.map((entrada, i) => (i === indice ? { ...entrada, ...parcial } : entrada)));
  };

  return (
    <CartaoDiario
      titulo="Resistências"
      contagem={lista.length}
      podeEditar={isMestre}
      aberto={aberto}
      onAlternar={() => setAberto((valor) => !valor)}
      rotuloAdicionar="Adicionar"
      dataTour="ficha-resistencias"
    >
      {isMestre && aberto && (
        <SeletorCatalogo
          grupos={GRUPOS_RESISTENCIA}
          jaEscolhidos={escolhidos}
          placeholderBusca="Buscar: fogo, corte, doença, medo..."
          rotuloPersonalizada="Criar resistência"
          onEscolher={(opcao) => adicionar({ id: opcao.id, nome: opcao.nome })}
          onPersonalizada={(texto) => adicionar({ id: '', nome: texto })}
          onFechar={() => setAberto(false)}
        />
      )}
      {lista.length === 0 && !textoAntigo ? (
        <div className={VAZIO}>
          {isMestre ? 'Nenhuma resistência ainda. Use Adicionar para escolher no catálogo ou criar uma própria.' : 'Nenhuma resistência registrada.'}
        </div>
      ) : (
        <div className={LISTA}>
          {lista.map((entrada, indice) => (
            <div key={`${entrada.id || entrada.nome}-${indice}`} className="group rounded-lg border border-white/5 bg-black/30 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="break-words text-xs font-bold text-gray-200">{entrada.nome}</div>
                  {!entrada.id && <div className="text-[9px] uppercase tracking-wider text-gray-600">Personalizada</div>}
                </div>
                {isMestre ? (
                  <button
                    type="button"
                    onClick={() => salvar(lista.filter((_, i) => i !== indice))}
                    aria-label={`Remover ${entrada.nome}`}
                    className="-mr-1 -mt-1 shrink-0 rounded-md p-1.5 text-gray-600 transition-colors hover:bg-red-400/10 hover:text-red-300"
                  >
                    <X size={13} />
                  </button>
                ) : (
                  <span className="shrink-0 rounded-md bg-white/[0.05] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#c7a44c]">
                    {MODOS_RESISTENCIA.find((modo) => modo.id === entrada.modo)?.rotulo}
                    {entrada.modo !== 'imunidade' && entrada.valor !== null ? ` ${entrada.valor}` : ''}
                  </span>
                )}
              </div>
              {isMestre && (
                <div className="mt-2 flex items-center gap-2">
                  <select
                    aria-label={`Tipo de proteção contra ${entrada.nome}`}
                    value={entrada.modo}
                    onChange={(event) => alterar(indice, { modo: event.target.value as ModoResistencia, ...(event.target.value === 'imunidade' ? { valor: null } : {}) })}
                    className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#0d0c12] px-1.5 py-1 text-[11px] text-gray-300 focus:border-[#c7a44c]/50 focus:outline-none"
                  >
                    {MODOS_RESISTENCIA.map((modo) => <option key={modo.id} value={modo.id}>{modo.rotulo}</option>)}
                  </select>
                  {entrada.modo !== 'imunidade' && (
                    <input
                      type="number"
                      min={0}
                      aria-label={`Valor de ${entrada.nome}`}
                      value={entrada.valor ?? ''}
                      placeholder="—"
                      onChange={(event) => alterar(indice, { valor: event.target.value === '' ? null : Math.max(0, Number(event.target.value)) })}
                      className="w-14 shrink-0 rounded-md border border-white/10 bg-[#0d0c12] px-1.5 py-1 text-center text-[11px] font-bold text-white focus:border-[#c7a44c]/50 focus:outline-none"
                    />
                  )}
                </div>
              )}
              {isMestre ? (
                <input
                  type="text"
                  aria-label={`Anotação sobre ${entrada.nome}`}
                  value={entrada.nota}
                  maxLength={200}
                  placeholder="Anotação (opcional): de onde vem, até quando..."
                  onChange={(event) => alterar(indice, { nota: event.target.value })}
                  className="mt-2 w-full border-b border-white/5 bg-transparent pb-1 text-[11px] text-gray-400 placeholder:text-gray-700 focus:border-[#c7a44c]/40 focus:outline-none"
                />
              ) : entrada.nota ? (
                <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">{entrada.nota}</p>
              ) : null}
            </div>
          ))}
          {textoAntigo && (
            <div className="rounded-lg border border-dashed border-white/10 p-2.5">
              <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-gray-600">Anotações</div>
              <textarea
                aria-label="Anotações sobre resistências"
                readOnly={!isMestre}
                value={textoAntigo}
                rows={Math.min(8, Math.max(2, textoAntigo.split('\n').length))}
                onChange={(event) => onUpdate(['ficha', 'resistenciasTexto'], event.target.value)}
                className="w-full resize-none bg-transparent text-xs leading-relaxed text-gray-400 focus:outline-none read-only:cursor-default"
              />
            </div>
          )}
        </div>
      )}
    </CartaoDiario>
  );
};

interface IProficienciasProps {
  ficha: any;
  isMestre: boolean;
  onUpdate: any;
}

export const ProficienciasSection = ({ ficha, isMestre, onUpdate }: IProficienciasProps) => {
  const [aberto, setAberto] = useState(false);
  const lista: string[] = useMemo(
    () => (Array.isArray(ficha.proficiencias) ? ficha.proficiencias : []).map((valor: unknown) => String(valor)).filter((valor: string) => valor.trim()),
    [ficha.proficiencias],
  );
  const escolhidos = useMemo(() => new Set(lista.map(normalizarProficiencia)), [lista]);

  const adicionar = (valor: string) => {
    const canonico = normalizarProficiencia(valor);
    if (!canonico || escolhidos.has(canonico)) return;
    onUpdate(['ficha', 'proficiencias'], [...lista, canonico]);
  };

  return (
    <CartaoDiario
      titulo="Proficiências"
      contagem={lista.length}
      podeEditar={isMestre}
      aberto={aberto}
      onAlternar={() => setAberto((valor) => !valor)}
      rotuloAdicionar="Adicionar"
      dataTour="ficha-proficiencias"
    >
      {isMestre && aberto && (
        <SeletorCatalogo
          grupos={GRUPOS_PROFICIENCIA}
          jaEscolhidos={escolhidos}
          placeholderBusca="Buscar: armas, escudos, ferramentas..."
          rotuloPersonalizada="Criar proficiência"
          onEscolher={(opcao) => adicionar(opcao.id)}
          onPersonalizada={adicionar}
          onFechar={() => setAberto(false)}
        />
      )}
      {lista.length === 0 ? (
        <div className={VAZIO}>
          {isMestre ? 'Nenhuma proficiência ainda. Use Adicionar para escolher no catálogo ou criar uma própria.' : 'Nenhuma proficiência registrada.'}
        </div>
      ) : (
        <div className={LISTA}>
          <div className="flex flex-wrap gap-1.5">
            {lista.map((valor, indice) => {
              const { rotulo, personalizada } = rotuloProficiencia(valor);
              return (
                <span
                  key={`${valor}-${indice}`}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${personalizada ? 'border-dashed border-white/15 text-gray-300' : 'border-[#c7a44c]/25 bg-[#c7a44c]/[0.06] text-[#e0c878]'}`}
                >
                  {rotulo}
                  {isMestre && (
                    <button
                      type="button"
                      onClick={() => onUpdate(['ficha', 'proficiencias'], lista.filter((_, i) => i !== indice))}
                      aria-label={`Remover ${rotulo}`}
                      className="rounded text-gray-500 transition-colors hover:text-red-300"
                    >
                      <X size={11} />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </CartaoDiario>
  );
};
