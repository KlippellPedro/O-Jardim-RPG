import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Coins, HandCoins, Plus, Search, Users, X } from 'lucide-react';
import { lojaApi, type LojaCatalogEntry } from '../../../services/lojaApi';
import {
  FAIXAS,
  OFICIO_PERSONALIZADO,
  TITULO_OFICIO_MAXIMO,
  contatosIniciais,
  formatarLunaris,
  kitSugerido,
  linhaDeRenda,
  obterFaixa,
  obterOficio,
  oficiosDaFaixa,
  podeAcrescentar,
  raridadeNoKit,
  totalDeItens,
  vagasLivres,
  type IEscolhaDoKit,
  type IFaixaOficio,
} from '../../../services/oficios';

export interface IEstadoOficio {
  /** Faixa aberta na tela. Com ofício escolhido, é a faixa dele. */
  faixaId: string;
  /** Id de um ofício do catálogo, `personalizado` ou vazio enquanto não escolhe. */
  oficioId: string;
  tituloPersonalizado: string;
  kit: IEscolhaDoKit[];
}

export const ESTADO_OFICIO_INICIAL: IEstadoOficio = {
  faixaId: 'trabalhador',
  oficioId: '',
  tituloPersonalizado: '',
  kit: [],
};

export function faixaDoEstado(estado: IEstadoOficio): IFaixaOficio {
  const doCatalogo = obterOficio(estado.oficioId);
  return obterFaixa(doCatalogo ? doCatalogo.faixa : estado.faixaId);
}

export function tituloDoEstado(estado: IEstadoOficio): string {
  if (estado.oficioId === OFICIO_PERSONALIZADO) return estado.tituloPersonalizado.trim();
  return obterOficio(estado.oficioId)?.titulo || '';
}

interface PassoOficioProps {
  campanhaId: string | null;
  estado: IEstadoOficio;
  onChange: (estado: IEstadoOficio) => void;
  tituloPericia: (id: string) => string;
  /** Perícias escolhidas no passo anterior: o grau nelas decide a linha da renda. */
  pericias: Record<string, string>;
  onAjuda: (titulo: string, texto: string) => void;
}

const ROTULO_RARIDADE: Record<string, string> = { comum: 'Comum', incomum: 'Incomum' };
const COR_RARIDADE: Record<string, string> = {
  comum: 'border-gray-400/30 bg-gray-400/10 text-gray-300',
  incomum: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
};

const AJUDA_OFICIO = [
  'O ofício é o que o seu personagem fazia para viver até a história começar.',
  'Ele decide com quanto dinheiro você começa, quantos itens escolhe e de que raridade, e quanto ganha quando volta a trabalhar no tempo entre aventuras.',
  'Trabalhar paga o custo de vida e sobra pouco: a ficha soma só a sobra. A renda cheia pede grau numa das duas perícias do ofício (Aprendiz no Trabalhador, Treinado no Artesão ou soldado, Especialista no Especialista). Sem o grau, você ganha na linha de baixo até treinar.',
  'Quem vem de baixo começa com pouco no bolso e mais gente conhecida. Quem estudou começa com equipamento melhor e com alguém esperando o retorno do que pagou.',
  'Não achou o seu? Use "Outro ofício", escreva o nome e escolha a faixa que mais combina. O Mestre confere.',
].join('\n\n');

export const PassoOficio: React.FC<PassoOficioProps> = ({ campanhaId, estado, onChange, tituloPericia, pericias, onAjuda }) => {
  const [catalogo, setCatalogo] = useState<LojaCatalogEntry[] | null>(null);
  const [erroCatalogo, setErroCatalogo] = useState(false);
  const [busca, setBusca] = useState('');
  const [itemManual, setItemManual] = useState('');

  useEffect(() => {
    if (!campanhaId) {
      setErroCatalogo(true);
      return undefined;
    }
    const controle = new AbortController();
    lojaApi.listarCatalogo(campanhaId, controle.signal)
      .then((resposta) => setCatalogo(resposta.itens))
      .catch(() => { if (!controle.signal.aborted) setErroCatalogo(true); });
    return () => controle.abort();
  }, [campanhaId]);

  const elegiveis = useMemo(
    () => (catalogo || [])
      .map((entrada) => ({ entrada, raridade: raridadeNoKit(entrada) }))
      .filter((item): item is { entrada: LojaCatalogEntry; raridade: 'comum' | 'incomum' } => item.raridade !== null),
    [catalogo],
  );
  const catalogoPorId = useMemo(() => new Map(elegiveis.map(({ entrada }) => [entrada.id, entrada])), [elegiveis]);

  const faixa = faixaDoEstado(estado);
  const faixaAberta = obterFaixa(estado.faixaId);
  const oficio = obterOficio(estado.oficioId);
  const vagas = vagasLivres(faixa, estado.kit);

  // O kit sugerido só entra quando o catálogo chega depois da escolha do ofício.
  useEffect(() => {
    if (!catalogo || !oficio || estado.kit.length > 0) return;
    const sugerido = kitSugerido(oficio, faixa, catalogoPorId);
    if (sugerido.length) onChange({ ...estado, kit: sugerido });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogo]);

  const escolherOficio = (oficioId: string) => {
    const escolhido = obterOficio(oficioId);
    const faixaNova = obterFaixa(escolhido?.faixa);
    onChange({ ...estado, oficioId, faixaId: faixaNova.id, kit: kitSugerido(escolhido, faixaNova, catalogoPorId) });
  };

  const abrirFaixa = (faixaId: string) => {
    if (estado.oficioId === OFICIO_PERSONALIZADO) {
      // No ofício próprio a faixa é a escolha: troca e tira o que deixou de caber.
      const nova = obterFaixa(faixaId);
      const kit: IEscolhaDoKit[] = [];
      estado.kit.forEach((escolha) => { if (podeAcrescentar(nova, kit, escolha.raridade)) kit.push(escolha); });
      onChange({ ...estado, faixaId, kit });
      return;
    }
    onChange({ ...estado, faixaId });
  };

  const tirar = (indice: number) => onChange({ ...estado, kit: estado.kit.filter((_, i) => i !== indice) });
  const acrescentar = (escolha: IEscolhaDoKit) => {
    if (!podeAcrescentar(faixa, estado.kit, escolha.raridade)) return;
    onChange({ ...estado, kit: [...estado.kit, escolha] });
  };

  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const resultados = vagas.total > 0
    ? elegiveis
        .filter(({ raridade }) => (raridade === 'incomum' ? vagas.incomum > 0 : true))
        .filter(({ entrada }) => !termo || entrada.titulo.toLocaleLowerCase('pt-BR').includes(termo))
        .sort((a, b) => (a.raridade === b.raridade ? a.entrada.titulo.localeCompare(b.entrada.titulo, 'pt-BR') : a.raridade === 'incomum' ? -1 : 1))
        .slice(0, termo ? 30 : 12)
    : [];

  const contatos = contatosIniciais(oficio, faixa);
  const renda = linhaDeRenda({ id: estado.oficioId, faixa: faixa.id }, pericias);
  const listaDaFaixa = oficiosDaFaixa(faixaAberta.id);
  const personalizado = estado.oficioId === OFICIO_PERSONALIZADO;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4"
    >
      <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
        <div className="flex items-center gap-2">
          <Briefcase size={20} className="text-primary" />
          <h3 className="text-xl font-bold text-white">Ofício e começo de vida</h3>
          <button
            type="button"
            onClick={() => onAjuda('Para que serve o ofício?', AJUDA_OFICIO)}
            className="rounded-full px-2 text-xs text-gray-400 underline-offset-2 hover:text-primary hover:underline"
          >
            Como funciona?
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-400">
          O que o seu personagem fazia para viver até a aventura começar? Isso decide o dinheiro, os itens e quanto ele ganha por mês.
        </p>
      </div>

      <div role="tablist" aria-label="Faixas de ofício" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {FAIXAS.map((item) => {
          const ativa = item.id === faixaAberta.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => abrirFaixa(item.id)}
              className={`min-w-0 rounded-xl border p-3 text-left transition-all ${ativa ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/30 hover:border-white/30'}`}
            >
              <span className="block truncate text-sm font-bold text-white">{item.titulo}</span>
              <span className="mt-1 block text-[11px] text-amber-200/80">{formatarLunaris(item.lunaris_iniciais)} no bolso</span>
              <span className="block text-[11px] text-gray-400">
                {item.itens.comum} {item.itens.comum === 1 ? 'comum' : 'comuns'}{item.itens.incomum ? ` + ${item.itens.incomum} incomum` : ''}
              </span>
              <span className="block text-[11px] text-gray-500">
                {item.por_dia} por dia, {item.sobra_por_dia === 1 ? 'sobra 1' : `sobram ${item.sobra_por_dia}`}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-gray-400">{faixaAberta.resumo}</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {listaDaFaixa.map((item) => {
          const ativo = estado.oficioId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={ativo}
              onClick={() => escolherOficio(item.id)}
              className={`rounded-xl border p-3 text-left transition-all ${ativo ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-black/30 hover:border-white/30'}`}
            >
              <span className="block text-sm font-bold text-white">{item.titulo}</span>
              <span className="mt-1 block text-xs leading-snug text-gray-400">{item.descricao}</span>
              <span className="mt-2 block text-[10px] uppercase tracking-wider text-gray-500">
                Combina com {item.pericias.map(tituloPericia).join(' e ')}
              </span>
            </button>
          );
        })}
        <div className={`rounded-xl border p-3 transition-all ${personalizado ? 'border-green-500 bg-green-500/10' : 'border-dashed border-white/15 bg-black/20'}`}>
          <button type="button" onClick={() => onChange({ ...estado, oficioId: OFICIO_PERSONALIZADO, faixaId: faixaAberta.id, kit: personalizado ? estado.kit : [] })} className="block w-full text-left">
            <span className="block text-sm font-bold text-white">Outro ofício</span>
            <span className="mt-1 block text-xs text-gray-400">Escreva o seu. Ele entra na faixa {faixaAberta.titulo}.</span>
          </button>
          {personalizado ? (
            <input
              type="text"
              value={estado.tituloPersonalizado}
              onChange={(evento) => onChange({ ...estado, tituloPersonalizado: evento.target.value })}
              maxLength={TITULO_OFICIO_MAXIMO}
              placeholder="Ex: domador de vespas, coveiro, tradutor"
              aria-label="Nome do seu ofício"
              autoFocus
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none"
            />
          ) : null}
        </div>
      </div>

      {estado.oficioId ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300">O que você leva</h4>
            <div className="flex items-start gap-3">
              <Coins size={18} className="mt-0.5 shrink-0 text-amber-300" />
              <div>
                <p className="text-sm font-bold text-white">{formatarLunaris(faixa.lunaris_iniciais)} na carteira</p>
                <p className="text-xs text-gray-400">Faixa {faixa.titulo}, vida de {faixa.classe_social.toLocaleLowerCase('pt-BR')}.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <HandCoins size={18} className="mt-0.5 shrink-0 text-amber-300" />
              <div>
                <p className="text-sm font-bold text-white">Renda do ofício</p>
                <p className="text-xs text-gray-400">{faixa.renda_rotulo} Você recebe quando trabalha no tempo entre aventuras.</p>
                {renda.falta ? (
                  <p className="mt-1 text-xs text-amber-200/80">
                    Com as perícias que você escolheu, por enquanto ganha na linha {renda.faixa.titulo} ({renda.faixa.por_dia} por dia, sobra {renda.faixa.sobra_por_dia}).
                    {' '}A renda cheia pede grau {renda.falta.rotulo}{renda.falta.pericias.length ? ` em ${renda.falta.pericias.join(' ou ')}` : ' numa perícia do ofício'}.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users size={18} className="mt-0.5 shrink-0 text-sky-300" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">Gente que você conhece</p>
                <ul className="mt-1 space-y-1 text-xs text-gray-400">
                  {contatos.map((contato) => (
                    <li key={`${contato.quem}-${contato.ramo}`}>
                      {contato.quem}: contato {contato.confianca >= 2 ? 'Amigo' : 'Conhecido'}, ramo {contato.ramo}.
                    </li>
                  ))}
                  {faixa.obrigacao ? <li className="text-amber-200/80">{faixa.obrigacao}: uma Dívida para combinar com o Mestre.</li> : null}
                </ul>
                <p className="mt-1 text-[11px] text-gray-500">Entram nos seus Vínculos, prontos para ganhar nome e rosto.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300">Itens iniciais</h4>
              <span className={`text-xs font-bold ${estado.kit.length > 0 ? 'text-green-400' : 'text-primary'}`}>
                {estado.kit.length} de {totalDeItens(faixa)}
                {faixa.itens.incomum ? ` (até ${faixa.itens.incomum} incomum)` : ''}
              </span>
            </div>
            <ul className="space-y-2">
              {estado.kit.map((escolha, indice) => (
                <li key={`${escolha.itemId || escolha.titulo}-${indice}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${COR_RARIDADE[escolha.raridade]}`}>{ROTULO_RARIDADE[escolha.raridade]}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-white">{escolha.titulo}</span>
                  {!escolha.itemId ? <span className="shrink-0 text-[10px] text-gray-500">escrito por você</span> : null}
                  <button type="button" onClick={() => tirar(indice)} aria-label={`Tirar ${escolha.titulo}`} className="shrink-0 rounded-full p-1 text-gray-500 hover:text-red-300">
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>

            {vagas.total > 0 ? (
              <div className="space-y-2">
                {catalogo ? (
                  <>
                    <label className="relative block">
                      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="search"
                        value={busca}
                        onChange={(evento) => setBusca(evento.target.value)}
                        placeholder="Procurar na Loja (arma, armadura, poção, ferramenta)"
                        aria-label="Procurar item da Loja"
                        className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-8 pr-3 text-sm text-white focus:border-primary/50 focus:outline-none"
                      />
                    </label>
                    <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto pr-1 custom-scrollbar">
                      {resultados.map(({ entrada, raridade }) => (
                        <button
                          key={entrada.id}
                          type="button"
                          onClick={() => acrescentar({ itemId: entrada.id, titulo: entrada.titulo, raridade })}
                          className={`rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-primary/60 ${COR_RARIDADE[raridade]}`}
                          title={`${ROTULO_RARIDADE[raridade]}, ${entrada.preco.valor} ${entrada.preco.moeda} na Loja`}
                        >
                          {entrada.titulo}
                        </button>
                      ))}
                      {resultados.length === 0 ? <span className="text-xs text-gray-500">Nada com esse nome entre os itens que cabem.</span> : null}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    {erroCatalogo ? 'A Loja não respondeu agora. Você ainda pode escrever os seus itens.' : 'Abrindo a Loja...'}
                  </p>
                )}
                <form
                  className="flex gap-2"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    const titulo = itemManual.trim();
                    if (titulo.length < 2) return;
                    acrescentar({ titulo, raridade: 'comum' });
                    setItemManual('');
                  }}
                >
                  <input
                    type="text"
                    value={itemManual}
                    onChange={(evento) => setItemManual(evento.target.value)}
                    maxLength={200}
                    placeholder="Ou escreva um item comum seu"
                    aria-label="Escrever um item comum"
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none"
                  />
                  <button type="submit" disabled={itemManual.trim().length < 2} className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-gray-300 hover:text-white disabled:opacity-40">
                    <Plus size={14} /> Pôr
                  </button>
                </form>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Vagas cheias. Tire um item para trocar.</p>
            )}
            <p className="text-[11px] text-gray-500">Item da Loja entra como se fosse comprado. Item escrito por você conta como comum e o Mestre aprova.</p>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-gray-500">Escolha um ofício para ver o que o seu personagem leva.</p>
      )}
    </motion.div>
  );
};
