import { useState } from 'react';
import { Plus, Sparkles, Trash2, Wrench } from 'lucide-react';
import { Select } from '../../../components/ui/Select';
import type {
  IEfeitoEquipamento,
  IModificacaoEquipamento,
  TCategoriaEfeitoEquipamento,
  TModoEfeitoEquipamento,
} from '../../../services/equipamentoService';
import { FichaModal } from './FichaModal';
import { LabeledInput } from './SharedFichaComponents';
import { classeTextoRaridade } from '../../../services/lojaCatalogService';
import {
  DONS_RARIDADE_POR_CATEGORIA,
  EFEITOS_POR_MODIFICACAO_MAXIMOS,
  RARIDADES_EQUIPAMENTO,
  obterRegraRaridade,
  type CategoriaEquipamentoId,
} from '../../../../data/regras/raridadesEquipamentos';

interface IPericiaOpcao {
  id: string;
  titulo: string;
}

const ALVOS_FIXOS: Record<Exclude<TCategoriaEfeitoEquipamento, 'pericia'>, Array<{ value: string; label: string }>> = {
  atributo: [
    { value: 'forca', label: 'Força' },
    { value: 'destreza', label: 'Destreza' },
    { value: 'constituicao', label: 'Constituição' },
    { value: 'inteligencia', label: 'Inteligência' },
    { value: 'sabedoria', label: 'Sabedoria' },
    { value: 'carisma', label: 'Carisma' },
    { value: 'fluxo', label: 'Fluxo' },
  ],
  recurso: [
    { value: 'vidaMaxima', label: 'Vida máxima' },
    { value: 'manaMaxima', label: 'Mana máxima' },
    { value: 'sanidadeMaxima', label: 'Sanidade máxima' },
    { value: 'cansacoMaximo', label: 'Cansaço máximo' },
  ],
  combate: [
    { value: 'defesa', label: 'Defesa' },
    { value: 'iniciativa', label: 'Iniciativa' },
    { value: 'movimento', label: 'Movimento' },
    { value: 'ataque', label: 'Todos os ataques' },
    { value: 'dano', label: 'Dano Corpo a Corpo/Distância' },
    { value: 'margemAmeaca', label: 'Margem de Ameaça' },
    { value: 'multiplicadorCritico', label: 'Multiplicador Crítico' },
  ],
};

const CATEGORIAS = [
  { value: 'atributo', label: 'Atributo' },
  { value: 'recurso', label: 'Recurso' },
  { value: 'combate', label: 'Combate' },
  { value: 'pericia', label: 'Perícia' },
];

const MODOS_APLICACAO = [
  { value: 'bonus', label: 'Bônus / penalidade' },
  { value: 'vantagem', label: 'Vantagem' },
  { value: 'desvantagem', label: 'Desvantagem' },
];

const RARIDADES = RARIDADES_EQUIPAMENTO.map((raridade) => ({
  value: raridade.id,
  label: raridade.titulo,
  labelClassName: classeTextoRaridade(raridade.id),
}));

function gerarId(prefixo: string) {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function alvosDaCategoria(categoria: TCategoriaEfeitoEquipamento, pericias: IPericiaOpcao[]) {
  if (categoria === 'pericia') return pericias.map((pericia) => ({ value: pericia.id, label: pericia.titulo }));
  return ALVOS_FIXOS[categoria];
}

function rotuloAlvo(efeito: IEfeitoEquipamento, pericias: IPericiaOpcao[]) {
  return alvosDaCategoria(efeito.categoria, pericias).find((opcao) => opcao.value === efeito.alvo)?.label || efeito.alvo;
}

export function EditorEfeitos({
  efeitos,
  onChange,
  pericias,
  readOnly = false,
  maxEfeitos,
  valorMaximo,
  contexto = 'item',
}: {
  efeitos: IEfeitoEquipamento[];
  onChange?: (efeitos: IEfeitoEquipamento[]) => void;
  pericias: IPericiaOpcao[];
  readOnly?: boolean;
  maxEfeitos?: number;
  /** Itens recebem o teto da raridade. Poderes e habilidades omitem este
   * valor e aceitam qualquer número finito, positivo ou negativo. */
  valorMaximo?: number;
  contexto?: 'item' | 'poder' | 'habilidade';
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [rascunhosValor, setRascunhosValor] = useState<Record<string, string>>({});
  const atingiuLimite = maxEfeitos !== undefined && efeitos.length >= maxEfeitos;
  const adicionar = () => {
    if (atingiuLimite) return;
    onChange?.([...efeitos, {
      id: gerarId('efeito'),
      categoria: 'recurso',
      alvo: 'vidaMaxima',
      modo: 'bonus',
      valor: 1,
    }]);
  };

  const atualizar = (id: string, atualizacao: Partial<IEfeitoEquipamento>) => {
    onChange?.(efeitos.map((efeito) => {
      if (efeito.id !== id) return efeito;
      const proximo = { ...efeito, ...atualizacao };
      if (atualizacao.categoria) {
        const opcoes = alvosDaCategoria(atualizacao.categoria, pericias);
        proximo.alvo = opcoes[0]?.value || '';
        proximo.modo = 'bonus';
      }
      if (proximo.categoria !== 'pericia') proximo.modo = 'bonus';
      if (atualizacao.modo && atualizacao.modo !== 'bonus') {
        proximo.valor = Math.max(1, Math.abs(proximo.valor) || 1);
      }
      return proximo;
    }));
  };

  const renderResumo = () => (
    efeitos.length > 0 ? (
      <div className="flex flex-col gap-2">
        {efeitos.map((efeito) => (
          <div key={efeito.id} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs text-gray-300">
            <strong className="text-[#c7a44c]">{rotuloAlvo(efeito, pericias)}</strong>
            <span className="ml-2">
              {efeito.modo === 'bonus'
                ? `${efeito.valor >= 0 ? '+' : ''}${efeito.valor}`
                : `${Math.abs(efeito.valor)} ${efeito.modo}`}
            </span>
          </div>
        ))}
      </div>
    ) : <p className="text-xs italic text-gray-600">Nenhum efeito automático configurado.</p>
  );

  if (readOnly) {
    return renderResumo();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Efeitos automáticos</p>
          <p className="mt-1 text-xs text-gray-600">
            {contexto === 'poder'
              ? 'Ficam ativos enquanto o poder permanecer na ficha.'
              : contexto === 'habilidade'
                ? 'Ficam ativos enquanto a habilidade permanecer na ficha.'
                : 'Só ficam ativos enquanto o item estiver equipado.'}
          </p>
        </div>
        <button type="button" onClick={() => setModalAberto(true)} className="flex shrink-0 items-center gap-1 rounded-md border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-3 py-1.5 text-xs font-bold text-[#c7a44c] hover:bg-[#c7a44c]/20 hover:text-white">
          <Wrench size={13} /> {efeitos.length > 0 ? 'Editar Efeitos' : 'Configurar'}
        </button>
      </div>

      {efeitos.length > 0 && renderResumo()}

      <FichaModal isOpen={modalAberto} onClose={() => setModalAberto(false)} title="Efeitos Automáticos" nested size="lg">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Configure os valores automáticos gerados por este {contexto}.</p>
              <p className="mt-1 text-[10px] leading-relaxed text-gray-600">
                Atributos, recursos, combate e perícias são recalculados automaticamente enquanto o efeito estiver na ficha.
              </p>
            </div>
            <button type="button" onClick={adicionar} disabled={atingiuLimite} className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#c7a44c] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
              <Plus size={13} /> Efeito
            </button>
          </div>

          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
            {efeitos.map((efeito, indice) => {
              const alvos = alvosDaCategoria(efeito.categoria, pericias);
              const efeitoDeRolagem = efeito.categoria === 'pericia' && efeito.modo !== 'bonus';
              const modosDisponiveis = efeito.categoria === 'pericia' ? MODOS_APLICACAO : MODOS_APLICACAO.slice(0, 1);
              return (
                <div key={efeito.id} className="rounded-xl border border-white/5 bg-black/20 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <strong className="text-xs uppercase tracking-widest text-gray-500">Efeito {indice + 1}</strong>
                    <button
                      type="button"
                      onClick={() => onChange?.(efeitos.filter((item) => item.id !== efeito.id))}
                      aria-label={`Remover efeito ${indice + 1}`}
                      className="flex h-8 w-8 items-center justify-center rounded border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="min-w-0">
                      <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-gray-600">Área</label>
                      <Select value={efeito.categoria} options={CATEGORIAS} onChange={(valor) => atualizar(efeito.id, { categoria: valor as TCategoriaEfeitoEquipamento })} className="w-full" />
                    </div>
                    <div className="min-w-0">
                      <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-gray-600">Alvo</label>
                      <Select value={efeito.alvo} options={alvos} onChange={(valor) => atualizar(efeito.id, { alvo: valor })} className="w-full" />
                    </div>
                    <div className="min-w-0">
                      <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-gray-600">Aplicação</label>
                      <Select value={efeito.modo} options={modosDisponiveis} onChange={(valor) => atualizar(efeito.id, { modo: valor as TModoEfeitoEquipamento })} className="w-full" />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{efeitoDeRolagem ? 'Quantidade' : 'Valor'}</label>
                      <input
                        aria-label={efeitoDeRolagem ? 'Quantidade' : 'Valor'}
                        type="text"
                        inputMode="decimal"
                        value={rascunhosValor[efeito.id] ?? String(efeito.valor)}
                        onChange={(event) => {
                          const texto = event.target.value;
                          setRascunhosValor((atual) => ({ ...atual, [efeito.id]: texto }));
                          if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(texto.trim())) return;
                          const convertido = Number(texto.replace(',', '.'));
                          if (!Number.isFinite(convertido)) return;
                          const numeroSeguro = Math.max(Number.MIN_SAFE_INTEGER, Math.min(Number.MAX_SAFE_INTEGER, convertido));
                          const limitado = typeof valorMaximo === 'number'
                            ? Math.max(-valorMaximo, Math.min(valorMaximo, numeroSeguro))
                            : numeroSeguro;
                          atualizar(efeito.id, { valor: efeitoDeRolagem ? Math.max(1, Math.trunc(Math.abs(limitado))) : limitado });
                        }}
                        onBlur={() => setRascunhosValor((atual) => {
                          const proximo = { ...atual };
                          delete proximo[efeito.id];
                          return proximo;
                        })}
                        className="w-full min-w-0 rounded-md border border-white/5 bg-[#121118] px-3 py-2.5 text-sm text-gray-300 outline-none transition-colors focus:border-[#c7a44c]/50"
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-gray-600">
                    Bônus/penalidade altera o total e aceita qualquer valor numérico positivo ou negativo. Vantagem e desvantagem ficam disponíveis somente para perícias, onde adicionam dados inteiros e se anulam uma a uma.
                  </p>
                </div>
              );
            })}

            {efeitos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/5 py-5 text-center text-xs text-gray-600">
                Nenhum efeito automático. Clique em "+ Efeito" para adicionar.
              </div>
            ) : null}
          </div>

          {maxEfeitos !== undefined ? (
            <p className="text-[10px] text-gray-600">
              {contexto === 'poder'
                ? 'Limite do poder'
                : contexto === 'habilidade'
                  ? 'Limite da habilidade'
                  : 'Limite desta raridade'}: {maxEfeitos} efeito(s)
              {typeof valorMaximo === 'number'
                ? `, com valor entre -${valorMaximo} e +${valorMaximo}.`
                : '. Os valores não possuem teto fixo.'}
            </p>
          ) : null}
        </div>
      </FichaModal>
    </div>
  );
}

export function ModificacoesItemModal({
  isOpen,
  onClose,
  modificacoes,
  onChange,
  pericias,
  readOnly = false,
  itemNome,
  raridade = 'comum',
}: {
  isOpen: boolean;
  onClose: () => void;
  modificacoes: IModificacaoEquipamento[];
  onChange?: (modificacoes: IModificacaoEquipamento[]) => void;
  pericias: IPericiaOpcao[];
  readOnly?: boolean;
  itemNome?: string;
  raridade?: string;
}) {
  const regraRaridade = obterRegraRaridade(raridade);
  const limiteAtingido = modificacoes.length >= regraRaridade.modificacoesMaximas;
  const adicionar = () => {
    if (limiteAtingido) return;
    onChange?.([...modificacoes, {
      id: gerarId('modificacao'),
      nome: '',
      efeito: '',
      tipo: 'comum',
      efeitos: [],
    }]);
  };

  const atualizar = (id: string, atualizacao: Partial<IModificacaoEquipamento>) => {
    onChange?.(modificacoes.map((modificacao) => modificacao.id === id ? { ...modificacao, ...atualizacao } : modificacao));
  };

  return (
    <FichaModal isOpen={isOpen} onClose={onClose} title={itemNome ? `Modificações: ${itemNome}` : 'Modificações do item'} size="lg" nested>
      <div className="flex flex-col gap-4">
        {!readOnly ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">{regraRaridade.titulo}: até {regraRaridade.modificacoesMaximas} modificação(ões). Bônus entram na ficha enquanto o item estiver equipado.</p>
            <button type="button" onClick={adicionar} disabled={limiteAtingido} className="flex shrink-0 items-center gap-1 rounded-lg border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-3 py-2 text-xs font-bold text-[#c7a44c] hover:bg-[#c7a44c]/20 disabled:cursor-not-allowed disabled:opacity-40">
              <Plus size={14} /> Adicionar mod
            </button>
          </div>
        ) : null}

        {modificacoes.map((modificacao, indice) => (
          <details key={modificacao.id} open={readOnly || modificacoes.length === 1} className="group rounded-xl border border-white/5 bg-[#121118]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-2">
                {modificacao.tipo === 'especial' ? <Sparkles size={15} className="shrink-0 text-[#c7a44c]" /> : <Wrench size={15} className="shrink-0 text-gray-500" />}
                <strong className="truncate text-sm text-white">{modificacao.nome.trim() || `Modificação ${indice + 1}`}</strong>
              </div>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-600">{modificacao.efeitos.length} efeitos</span>
            </summary>
            <div className="flex flex-col gap-4 border-t border-white/5 p-4">
              {readOnly ? (
                <>
                  {modificacao.efeito ? <p className="text-sm text-gray-400">{modificacao.efeito}</p> : null}
                  <EditorEfeitos efeitos={modificacao.efeitos} pericias={pericias} readOnly />
                </>
              ) : (
                <>
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[1fr_160px_36px] sm:items-end">
                    <LabeledInput label="Nome do mod" value={modificacao.nome} placeholder="Ex.: Cano longo" onChange={(valor: string) => atualizar(modificacao.id, { nome: valor })} />
                    <div className="min-w-0">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Tipo</label>
                      <Select value={modificacao.tipo} options={[{ value: 'comum', label: 'Comum' }, { value: 'especial', label: 'Especial' }]} onChange={(valor) => atualizar(modificacao.id, { tipo: valor === 'especial' ? 'especial' : 'comum' })} className="w-full" />
                    </div>
                    <button type="button" onClick={() => onChange?.(modificacoes.filter((item) => item.id !== modificacao.id))} aria-label="Remover modificação" className="flex h-10 w-9 items-center justify-center rounded border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <LabeledInput label="Descrição do efeito" value={modificacao.efeito} placeholder="Ex.: Melhora a estabilidade da arma" onChange={(valor: string) => atualizar(modificacao.id, { efeito: valor })} />
                  <EditorEfeitos
                    efeitos={modificacao.efeitos}
                    pericias={pericias}
                    maxEfeitos={EFEITOS_POR_MODIFICACAO_MAXIMOS}
                    valorMaximo={regraRaridade.valorMaximoPorEfeito}
                    onChange={(efeitos) => atualizar(modificacao.id, { efeitos })}
                  />
                </>
              )}
            </div>
          </details>
        ))}

        {modificacoes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/5 py-10 text-center text-sm text-gray-600">Nenhuma modificação neste item.</div>
        ) : null}

        <div className="flex justify-end border-t border-white/5 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-bold text-gray-400 hover:border-white/30 hover:text-white">Concluir</button>
        </div>
      </div>
    </FichaModal>
  );
}

export function RaridadeItemModal({
  isOpen,
  onClose,
  raridade,
  efeitos,
  onRaridadeChange,
  onEfeitosChange,
  pericias,
  categoria = 'geral',
}: {
  isOpen: boolean;
  onClose: () => void;
  raridade: string;
  efeitos: IEfeitoEquipamento[];
  onRaridadeChange: (raridade: string) => void;
  onEfeitosChange: (efeitos: IEfeitoEquipamento[]) => void;
  pericias: IPericiaOpcao[];
  categoria?: CategoriaEquipamentoId;
}) {
  const regraRaridade = obterRegraRaridade(raridade);
  const dom = DONS_RARIDADE_POR_CATEGORIA[categoria]?.[regraRaridade.id];
  return (
    <FichaModal isOpen={isOpen} onClose={onClose} title="Raridade e vantagens" size="lg" nested>
      <div className="flex flex-col gap-5">
        <div className="max-w-xs">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Raridade</label>
          <Select value={raridade} options={RARIDADES} onChange={onRaridadeChange} className="w-full uppercase" />
        </div>
        <div className="rounded-xl border border-[#c7a44c]/20 bg-[#c7a44c]/5 p-4">
          <div className="flex items-center gap-2 text-[#c7a44c]"><Sparkles size={15} /><strong className="text-sm">Dom de {regraRaridade.titulo}</strong></div>
          <p className="mt-2 text-sm text-gray-300">{dom}</p>
          <p className="mt-2 text-xs text-gray-500">{regraRaridade.principio}</p>
          {regraRaridade.requerMestre ? <p className="mt-2 text-xs font-bold text-amber-300">Requer aprovação do Mestre.</p> : null}
        </div>
        <EditorEfeitos
          efeitos={efeitos}
          onChange={onEfeitosChange}
          pericias={pericias}
          maxEfeitos={regraRaridade.efeitosRaridadeMaximos}
          valorMaximo={regraRaridade.valorMaximoPorEfeito}
        />
        <div className="flex justify-end border-t border-white/5 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-bold text-gray-400 hover:border-white/30 hover:text-white">Concluir</button>
        </div>
      </div>
    </FichaModal>
  );
}
