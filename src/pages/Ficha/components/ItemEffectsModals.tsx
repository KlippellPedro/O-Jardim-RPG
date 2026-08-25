import { useEffect, useState } from 'react';
import { Minus, Plus, Sparkles, Trash2, Wrench } from 'lucide-react';
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
  type IRegraRaridadeEquipamento,
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

/** Atalhos para os bônus que mais aparecem, pra não ter que montar tudo na mão. */
const ATALHOS_EFEITO: Array<{ rotulo: string; categoria: TCategoriaEfeitoEquipamento; alvo: string; valor: number }> = [
  { rotulo: 'Defesa +1', categoria: 'combate', alvo: 'defesa', valor: 1 },
  { rotulo: 'Vida +5', categoria: 'recurso', alvo: 'vidaMaxima', valor: 5 },
  { rotulo: 'Mana +5', categoria: 'recurso', alvo: 'manaMaxima', valor: 5 },
  { rotulo: 'Ataque +1', categoria: 'combate', alvo: 'ataque', valor: 1 },
  { rotulo: 'Dano +1', categoria: 'combate', alvo: 'dano', valor: 1 },
  { rotulo: 'Força +1', categoria: 'atributo', alvo: 'forca', valor: 1 },
];

const RARIDADES = RARIDADES_EQUIPAMENTO.map((raridade) => ({
  value: raridade.id,
  label: raridade.titulo,
  labelClassName: classeTextoRaridade(raridade.id),
}));

const PADRAO_NUMERICO = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/;

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

export function resumoEfeitoEquipamento(efeito: IEfeitoEquipamento, pericias: IPericiaOpcao[]) {
  const alvo = rotuloAlvo(efeito, pericias);
  if (efeito.modo === 'bonus') return `${alvo} ${efeito.valor >= 0 ? '+' : ''}${efeito.valor}`;
  return `${alvo}: ${Math.abs(efeito.valor)} ${efeito.modo}`;
}

/**
 * Editor de efeitos automáticos. Os tetos de raridade do livro entram só como
 * sugestão visível: nada aqui bloqueia, corta ou trava um valor, porque a mesa
 * precisa poder burlar o livro quando a história pedir.
 */
export function EditorEfeitos({
  efeitos,
  onChange,
  pericias,
  readOnly = false,
  maxEfeitos,
  sugestaoEfeitos,
  sugestaoValor,
  sugestaoRotulo,
  contexto = 'item',
  inline = false,
  titulo = 'Efeitos automáticos',
}: {
  efeitos: IEfeitoEquipamento[];
  onChange?: (efeitos: IEfeitoEquipamento[]) => void;
  pericias: IPericiaOpcao[];
  readOnly?: boolean;
  /** Teto real, usado só onde a ficha precisa mesmo de um (poderes e habilidades). */
  maxEfeitos?: number;
  /** Quantidade que o livro recomenda. Só informa, nunca impede. */
  sugestaoEfeitos?: number;
  /** Valor por efeito que o livro recomenda. Só informa, nunca corta. */
  sugestaoValor?: number;
  /** Nome da regra que gerou a sugestão, por exemplo "Comum". */
  sugestaoRotulo?: string;
  contexto?: 'item' | 'poder' | 'habilidade';
  /** Mostra a lista direto no lugar, sem esconder atrás de mais um modal. */
  inline?: boolean;
  titulo?: string;
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [rascunhosValor, setRascunhosValor] = useState<Record<string, string>>({});
  const atingiuLimite = maxEfeitos !== undefined && efeitos.length >= maxEfeitos;

  const adicionar = (base?: Partial<IEfeitoEquipamento>) => {
    if (atingiuLimite) return;
    onChange?.([...efeitos, {
      id: gerarId('efeito'),
      categoria: 'recurso',
      alvo: 'vidaMaxima',
      modo: 'bonus',
      valor: 1,
      ...base,
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

  const remover = (id: string) => onChange?.(efeitos.filter((item) => item.id !== id));

  const limparRascunho = (id: string) => setRascunhosValor((atual) => {
    const proximo = { ...atual };
    delete proximo[id];
    return proximo;
  });

  const passo = (efeito: IEfeitoEquipamento, delta: number) => {
    const bruto = efeito.valor + delta;
    const valor = efeito.modo === 'bonus' ? bruto : Math.max(1, Math.trunc(Math.abs(bruto)));
    limparRascunho(efeito.id);
    atualizar(efeito.id, { valor });
  };

  const renderResumo = () => (
    efeitos.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {efeitos.map((efeito) => (
          <span key={efeito.id} className="rounded-lg border border-[#c7a44c]/20 bg-[#c7a44c]/5 px-2.5 py-1 text-xs font-bold text-[#c7a44c]">
            {resumoEfeitoEquipamento(efeito, pericias)}
          </span>
        ))}
      </div>
    ) : <p className="text-xs italic text-gray-600">Nenhum efeito automático configurado.</p>
  );

  if (readOnly) {
    return renderResumo();
  }

  const acimaDoValorSugerido = sugestaoValor !== undefined
    && efeitos.some((efeito) => Math.abs(efeito.valor) > sugestaoValor);
  const acimaDaQuantidadeSugerida = sugestaoEfeitos !== undefined && efeitos.length > sugestaoEfeitos;
  const ondeSugere = sugestaoRotulo ? ` em ${sugestaoRotulo}` : '';
  const faixaSugerida = sugestaoValor !== undefined ? ` de -${sugestaoValor} a +${sugestaoValor}` : '';
  const textoDaSugestao = sugestaoEfeitos === 0
    ? `O livro não prevê bônus próprios${ondeSugere}.`
    : sugestaoEfeitos !== undefined
      ? `O livro sugere até ${sugestaoEfeitos} efeito(s)${ondeSugere}, com valor${faixaSugerida}.`
      : sugestaoValor !== undefined
        ? `O livro sugere valores${faixaSugerida}${ondeSugere}.`
        : '';

  const listaDeEfeitos = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {ATALHOS_EFEITO.map((atalho) => (
            <button
              key={atalho.rotulo}
              type="button"
              onClick={() => adicionar({ categoria: atalho.categoria, alvo: atalho.alvo, valor: atalho.valor })}
              disabled={atingiuLimite}
              className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] font-bold text-gray-400 transition-colors hover:border-[#c7a44c]/40 hover:text-[#c7a44c] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {atalho.rotulo}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => adicionar()}
          disabled={atingiuLimite}
          className="flex shrink-0 items-center gap-1 rounded-md border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-3 py-1.5 text-xs font-bold text-[#c7a44c] hover:bg-[#c7a44c]/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={13} /> Efeito
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {efeitos.map((efeito) => {
          const alvos = alvosDaCategoria(efeito.categoria, pericias);
          const efeitoDeRolagem = efeito.categoria === 'pericia' && efeito.modo !== 'bonus';
          const modosDisponiveis = efeito.categoria === 'pericia' ? MODOS_APLICACAO : MODOS_APLICACAO.slice(0, 1);
          const foraDaSugestao = sugestaoValor !== undefined && Math.abs(efeito.valor) > sugestaoValor;
          return (
            <div key={efeito.id} className="rounded-xl border border-white/5 bg-black/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <strong className="truncate text-sm font-bold text-[#c7a44c]">{resumoEfeitoEquipamento(efeito, pericias)}</strong>
                <button
                  type="button"
                  onClick={() => remover(efeito.id)}
                  aria-label={`Remover efeito ${resumoEfeitoEquipamento(efeito, pericias)}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-600">{efeitoDeRolagem ? 'Quantidade' : 'Valor'}</label>
                  <div className="flex min-w-0 items-stretch gap-1">
                    <button
                      type="button"
                      onClick={() => passo(efeito, -1)}
                      aria-label={`Diminuir valor de ${rotuloAlvo(efeito, pericias)}`}
                      className="flex w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/40 text-gray-400 hover:border-[#c7a44c]/40 hover:text-[#c7a44c]"
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      aria-label={efeitoDeRolagem ? 'Quantidade' : 'Valor'}
                      type="text"
                      inputMode="decimal"
                      value={rascunhosValor[efeito.id] ?? String(efeito.valor)}
                      onChange={(event) => {
                        const texto = event.target.value;
                        setRascunhosValor((atual) => ({ ...atual, [efeito.id]: texto }));
                        if (!PADRAO_NUMERICO.test(texto.trim())) return;
                        const convertido = Number(texto.replace(',', '.'));
                        if (!Number.isFinite(convertido)) return;
                        const numeroSeguro = Math.max(Number.MIN_SAFE_INTEGER, Math.min(Number.MAX_SAFE_INTEGER, convertido));
                        atualizar(efeito.id, { valor: efeitoDeRolagem ? Math.max(1, Math.trunc(Math.abs(numeroSeguro))) : numeroSeguro });
                      }}
                      onBlur={() => limparRascunho(efeito.id)}
                      className="w-full min-w-0 rounded-md border border-white/5 bg-[#121118] px-2 py-2.5 text-center text-sm font-bold text-gray-200 outline-none transition-colors focus:border-[#c7a44c]/50"
                    />
                    <button
                      type="button"
                      onClick={() => passo(efeito, 1)}
                      aria-label={`Aumentar valor de ${rotuloAlvo(efeito, pericias)}`}
                      className="flex w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/40 text-gray-400 hover:border-[#c7a44c]/40 hover:text-[#c7a44c]"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>
              {foraDaSugestao ? (
                <p className="mt-2 text-[11px] text-amber-300/80">
                  Passa do que o livro sugere para {sugestaoRotulo || 'esta raridade'} (até {sugestaoValor}). A ficha aplica assim mesmo.
                </p>
              ) : null}
            </div>
          );
        })}

        {efeitos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/5 py-5 text-center text-xs text-gray-600">
            Nenhum efeito automático. Use um atalho acima ou clique em "+ Efeito".
          </div>
        ) : null}
      </div>

      <p className="text-[11px] leading-relaxed text-gray-600">
        Bônus e penalidade aceitam qualquer valor, positivo ou negativo. Vantagem e desvantagem só existem em perícia, contam como 1 efeito e se anulam uma a uma.
        {maxEfeitos !== undefined ? ` Cabem ${maxEfeitos} efeitos aqui.` : ''}
      </p>

      {textoDaSugestao ? (
        <p className={`text-[11px] ${acimaDoValorSugerido || acimaDaQuantidadeSugerida ? 'text-amber-300/80' : 'text-gray-600'}`}>
          {textoDaSugestao} Passe disso quando a história pedir.
        </p>
      ) : null}
    </div>
  );

  if (inline) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{titulo}</p>
        {listaDeEfeitos}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{titulo}</p>
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
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <p className="text-xs text-gray-400">
            Atributos, recursos, combate e perícias são recalculados automaticamente enquanto o efeito estiver na ficha.
          </p>
          {listaDeEfeitos}
        </div>
      </FichaModal>
    </div>
  );
}

function ListaModificacoes({
  modificacoes,
  onChange,
  pericias,
  readOnly,
  regraRaridade,
}: {
  modificacoes: IModificacaoEquipamento[];
  onChange?: (modificacoes: IModificacaoEquipamento[]) => void;
  pericias: IPericiaOpcao[];
  readOnly: boolean;
  regraRaridade: IRegraRaridadeEquipamento;
}) {
  const adicionar = () => {
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

  const acimaDaSugestao = modificacoes.length > regraRaridade.modificacoesMaximas;

  return (
    <div className="flex flex-col gap-4">
      {!readOnly ? (
        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs ${acimaDaSugestao ? 'text-amber-300/80' : 'text-gray-500'}`}>
            {acimaDaSugestao
              ? `O livro sugere até ${regraRaridade.modificacoesMaximas} modificação(ões) em ${regraRaridade.titulo}, e este item tem ${modificacoes.length}. Segue valendo na ficha.`
              : `O livro sugere até ${regraRaridade.modificacoesMaximas} modificação(ões) em ${regraRaridade.titulo}. Você pode passar disso.`}
          </p>
          <button type="button" onClick={adicionar} className="flex shrink-0 items-center gap-1 rounded-lg border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-3 py-2 text-xs font-bold text-[#c7a44c] hover:bg-[#c7a44c]/20">
            <Plus size={14} /> Adicionar mod
          </button>
        </div>
      ) : null}

      {modificacoes.map((modificacao, indice) => (
        <div key={modificacao.id} className="rounded-xl border border-white/5 bg-[#121118]">
          <div className="flex items-center justify-between gap-3 border-b border-white/5 p-4">
            <div className="flex min-w-0 items-center gap-2">
              {modificacao.tipo === 'especial' ? <Sparkles size={15} className="shrink-0 text-[#c7a44c]" /> : <Wrench size={15} className="shrink-0 text-gray-500" />}
              <strong className="truncate text-sm text-white">{modificacao.nome.trim() || `Modificação ${indice + 1}`}</strong>
            </div>
            <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-widest ${
              modificacao.efeitos.length > 0
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                : modificacao.efeito.trim()
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                  : 'border-white/10 bg-black/20 text-gray-500'
            }`}>
              {modificacao.efeitos.length > 0 ? 'Bônus automático' : modificacao.efeito.trim() ? 'Regra manual' : 'Sem efeito'}
            </span>
          </div>
          <div className="flex flex-col gap-4 p-4">
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
                <div className="border-t border-white/5 pt-3">
                  <EditorEfeitos
                    efeitos={modificacao.efeitos}
                    pericias={pericias}
                    inline
                    maxEfeitos={EFEITOS_POR_MODIFICACAO_MAXIMOS}
                    titulo="Bônus desta modificação"
                    sugestaoValor={regraRaridade.valorMaximoPorEfeito}
                    sugestaoRotulo={regraRaridade.titulo}
                    onChange={(efeitos) => atualizar(modificacao.id, { efeitos })}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      ))}

      {modificacoes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/5 py-10 text-center text-sm text-gray-600">Nenhuma modificação neste item.</div>
      ) : null}
    </div>
  );
}

/** Vista somente leitura das modificações, usada nos cartões do inventário. */
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
  return (
    <FichaModal isOpen={isOpen} onClose={onClose} title={itemNome ? `Modificações: ${itemNome}` : 'Modificações do item'} size="lg" nested>
      <ListaModificacoes
        modificacoes={modificacoes}
        onChange={onChange}
        pericias={pericias}
        readOnly={readOnly}
        regraRaridade={obterRegraRaridade(raridade)}
      />
      <div className="mt-4 flex justify-end border-t border-white/5 pt-4">
        <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-bold text-gray-400 hover:border-white/30 hover:text-white">Voltar ao item</button>
      </div>
    </FichaModal>
  );
}

/**
 * Painel único do item: raridade, bônus próprios e modificações no mesmo lugar,
 * em vez de dois modais separados que escondiam cada efeito atrás de mais dois
 * cliques.
 */
export function EfeitosItemModal({
  isOpen,
  onClose,
  raridade,
  efeitosRaridade,
  modificacoes,
  onRaridadeChange,
  onEfeitosRaridadeChange,
  onModificacoesChange,
  pericias,
  categoria = 'geral',
  itemNome,
  abaInicial = 'raridade',
  readOnly = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  raridade: string;
  efeitosRaridade: IEfeitoEquipamento[];
  modificacoes: IModificacaoEquipamento[];
  onRaridadeChange: (raridade: string) => void;
  onEfeitosRaridadeChange: (efeitos: IEfeitoEquipamento[]) => void;
  onModificacoesChange: (modificacoes: IModificacaoEquipamento[]) => void;
  pericias: IPericiaOpcao[];
  categoria?: CategoriaEquipamentoId;
  itemNome?: string;
  abaInicial?: 'raridade' | 'modificacoes';
  readOnly?: boolean;
}) {
  const [aba, setAba] = useState<'raridade' | 'modificacoes'>(abaInicial);
  useEffect(() => {
    if (isOpen) setAba(abaInicial);
  }, [abaInicial, isOpen]);
  const regraRaridade = obterRegraRaridade(raridade);
  const dom = DONS_RARIDADE_POR_CATEGORIA[categoria]?.[regraRaridade.id];
  const totalEfeitos = efeitosRaridade.length + modificacoes.reduce((soma, mod) => soma + mod.efeitos.length, 0);

  const abas: Array<{ id: 'raridade' | 'modificacoes'; rotulo: string; contagem: number }> = [
    { id: 'raridade', rotulo: 'Raridade e bônus', contagem: efeitosRaridade.length },
    { id: 'modificacoes', rotulo: 'Modificações', contagem: modificacoes.length },
  ];

  return (
    <FichaModal isOpen={isOpen} onClose={onClose} title={itemNome ? `Bônus: ${itemNome}` : 'Bônus e modificações'} size="lg" nested>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 p-1.5">
          {abas.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAba(item.id)}
              aria-pressed={aba === item.id}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                aba === item.id ? 'bg-[#c7a44c]/15 text-[#c7a44c]' : 'text-gray-500 hover:text-white'
              }`}
            >
              {item.rotulo} <span className="ml-1 opacity-60">({item.contagem})</span>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-600">
          {totalEfeitos} efeito(s) automático(s) neste item, somando raridade e modificações. Todos entram na ficha enquanto o item estiver equipado.
        </p>

        {!readOnly ? (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
            As mudanças ficam no rascunho do item. Depois de voltar, use <strong>Salvar Alterações</strong> para gravá-las.
          </p>
        ) : null}

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {aba === 'raridade' ? (
            <div className="flex flex-col gap-5">
              <div className="max-w-xs">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Raridade</label>
                <Select value={raridade} options={RARIDADES} onChange={onRaridadeChange} disabled={readOnly} className="w-full uppercase" />
              </div>
              <div className="rounded-xl border border-[#c7a44c]/20 bg-[#c7a44c]/5 p-4">
                <div className="flex items-center gap-2 text-[#c7a44c]"><Sparkles size={15} /><strong className="text-sm">Dom de {regraRaridade.titulo}</strong></div>
                <p className="mt-2 text-sm text-gray-300">{dom}</p>
                <p className="mt-2 text-xs text-gray-500">{regraRaridade.principio}</p>
                {regraRaridade.requerMestre ? <p className="mt-2 text-xs font-bold text-amber-300">Requer aprovação do Mestre.</p> : null}
              </div>
              <EditorEfeitos
                efeitos={efeitosRaridade}
                onChange={readOnly ? undefined : onEfeitosRaridadeChange}
                pericias={pericias}
                inline={!readOnly}
                readOnly={readOnly}
                titulo="Bônus próprios do item"
                sugestaoEfeitos={regraRaridade.efeitosRaridadeMaximos}
                sugestaoValor={regraRaridade.valorMaximoPorEfeito}
                sugestaoRotulo={regraRaridade.titulo}
              />
            </div>
          ) : (
            <ListaModificacoes
              modificacoes={modificacoes}
              onChange={onModificacoesChange}
              pericias={pericias}
              readOnly={readOnly}
              regraRaridade={regraRaridade}
            />
          )}
        </div>

        <div className="flex justify-end border-t border-white/5 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-bold text-gray-400 hover:border-white/30 hover:text-white">{readOnly ? 'Fechar' : 'Voltar ao item'}</button>
        </div>
      </div>
    </FichaModal>
  );
}
