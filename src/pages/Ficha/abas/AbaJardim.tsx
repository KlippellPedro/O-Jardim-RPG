import { useEffect, useMemo, useState } from 'react';
import { Sprout, Search, ArrowRightLeft, Sparkles, Filter, Gem, X, Check, ChevronDown, ArrowUpDown } from 'lucide-react';
import {
  catalogoJardimDisponivel,
  catalogoJardimHabilidadesDisponivel,
  catalogoJardimUnicosDisponivel,
  comprarHabilidadeNoJardim,
  comprarPoderNoJardim,
  comprarUnicoNoJardim,
  habilidadesVendaveisJardim,
  poderesVendaveisJardim,
  resumoFichaTecnica,
  unicosVendaveisJardim,
  venderHabilidadeDeClasseNoJardim,
  venderHabilidadeDoJardim,
  venderPoderDeClasseNoJardim,
  venderPoderDoJardim,
  venderUnicoNoJardim,
  type IHabilidadeCatalogoJardim,
  type IHabilidadeVendavelJardim,
  type IPoderCatalogoJardim,
  type IPoderVendavelJardim,
  type IUnicoVendavelJardim,
} from '../../../services/progressaoFichaService';
import type { IUnicoJardim } from '../../../types/catalogo';
import { ModalConfirmacao } from '../components/ModalConfirmacao';

type TTipoFiltro = 'todos' | 'poder' | 'habilidade' | 'unico';
type TOrdem = 'barato' | 'caro' | 'nome';

const PASSO_LISTA = 24;

type TUnicoCatalogo = { unico: IUnicoJardim; jaAdquirido: boolean };

type TVendavel =
  | { tipo: 'poder'; dado: IPoderVendavelJardim }
  | { tipo: 'habilidade'; dado: IHabilidadeVendavelJardim }
  | { tipo: 'unico'; dado: IUnicoVendavelJardim };

type TCatalogo =
  | { tipo: 'poder'; dado: IPoderCatalogoJardim }
  | { tipo: 'habilidade'; dado: IHabilidadeCatalogoJardim }
  | { tipo: 'unico'; dado: TUnicoCatalogo };

const TIPOS_FILTRO: Array<{ value: TTipoFiltro; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'poder', label: 'Poderes' },
  { value: 'habilidade', label: 'Habilidades' },
  { value: 'unico', label: 'Únicos' },
];

const TIER_LABEL: Record<string, string> = {
  simples: 'Simples',
  notavel: 'Notável',
  extraordinaria: 'Extraordinária',
  lendaria: 'Lendária',
};

const TIER_COR: Record<string, string> = {
  simples: 'border-slate-400/30 bg-slate-500/10 text-slate-200',
  notavel: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
  extraordinaria: 'border-violet-400/30 bg-violet-500/10 text-violet-200',
  lendaria: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
};

const TIPO_UNICO_LABEL: Record<string, string> = {
  ataque: 'Ataque',
  suporte: 'Suporte',
  utilidade: 'Utilidade',
};

export const AbaJardim = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const [busca, setBusca] = useState('');
  const [filtroClasse, setFiltroClasse] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState<TTipoFiltro>('todos');
  const [ordem, setOrdem] = useState<TOrdem>('barato');
  const [soPagaveis, setSoPagaveis] = useState(false);
  const [ocultarAdquiridos, setOcultarAdquiridos] = useState(false);
  const [limite, setLimite] = useState(PASSO_LISTA);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [confirmacao, setConfirmacao] = useState<{ titulo: string; mensagem: string; acao: () => void } | null>(null);
  const [mensagem, setMensagem] = useState<{ texto: string; erro?: boolean } | null>(null);

  const f = character.ficha || {};
  const sementes = Math.max(0, Math.trunc(Number(f.jardim?.sementes) || 0));

  const poderesVendaveis = useMemo(() => poderesVendaveisJardim(f), [f]);
  const poderesCatalogo = useMemo(() => catalogoJardimDisponivel(f), [f]);
  const habilidadesVendaveis = useMemo(() => habilidadesVendaveisJardim(f), [f]);
  const habilidadesCatalogo = useMemo(() => catalogoJardimHabilidadesDisponivel(f), [f]);
  const unicosVendaveis = useMemo(() => unicosVendaveisJardim(f), [f]);
  const unicosCatalogo = useMemo(() => catalogoJardimUnicosDisponivel(f), [f]);

  const vendaveis: TVendavel[] = useMemo(() => [
    ...poderesVendaveis.map((dado): TVendavel => ({ tipo: 'poder', dado })),
    ...habilidadesVendaveis.map((dado): TVendavel => ({ tipo: 'habilidade', dado })),
    ...unicosVendaveis.map((dado): TVendavel => ({ tipo: 'unico', dado })),
  ], [poderesVendaveis, habilidadesVendaveis, unicosVendaveis]);

  const catalogo: TCatalogo[] = useMemo(() => [
    ...poderesCatalogo.map((dado): TCatalogo => ({ tipo: 'poder', dado })),
    ...habilidadesCatalogo.map((dado): TCatalogo => ({ tipo: 'habilidade', dado })),
    ...unicosCatalogo.map((dado): TCatalogo => ({ tipo: 'unico', dado })),
  ], [poderesCatalogo, habilidadesCatalogo, unicosCatalogo]);

  const classesCatalogo = useMemo(() => {
    const nomes = new Map<string, string>();
    catalogo.forEach((item) => {
      if (item.tipo === 'unico') return;
      nomes.set(item.dado.classeId, item.dado.classeTitulo);
    });
    return [...nomes.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [catalogo]);

  const termoBusca = busca.trim().toLocaleLowerCase('pt-BR');
  const tituloDe = (item: TVendavel | TCatalogo): string => {
    if (item.tipo === 'poder') return 'poder' in item.dado ? item.dado.poder.titulo : item.dado.titulo;
    if (item.tipo === 'habilidade') return 'habilidade' in item.dado ? item.dado.habilidade.titulo : item.dado.titulo;
    return 'unico' in item.dado ? item.dado.unico.titulo : item.dado.titulo;
  };
  const classeTituloDe = (item: TVendavel | TCatalogo): string => {
    if (item.tipo === 'unico') return 'Jardim';
    return 'classeTitulo' in item.dado ? item.dado.classeTitulo : item.dado.origem;
  };
  const classeIdDe = (item: TVendavel | TCatalogo): string | null => (item.tipo === 'unico' ? null : item.dado.classeId);
  const custoSementesDe = (item: TCatalogo): number => (item.tipo === 'unico' ? item.dado.unico.custoSementes : item.dado.custoSementes);

  const descricaoDe = (item: TCatalogo): string => {
    if (item.tipo === 'poder') return item.dado.poder.descricao || '';
    if (item.tipo === 'habilidade') return item.dado.descricaoNoNivelAtual || '';
    return item.dado.unico.descricao || '';
  };
  const jaAdquiridoDe = (item: TCatalogo): boolean => {
    if (item.tipo === 'poder') return item.dado.jaAdquirido;
    if (item.tipo === 'habilidade') return item.dado.jaAdquirida;
    return item.dado.jaAdquirido;
  };

  const passaBusca = (item: TVendavel | TCatalogo) => !termoBusca
    || tituloDe(item).toLocaleLowerCase('pt-BR').includes(termoBusca)
    || classeTituloDe(item).toLocaleLowerCase('pt-BR').includes(termoBusca);
  const passaBuscaCatalogo = (item: TCatalogo) => passaBusca(item)
    || descricaoDe(item).toLocaleLowerCase('pt-BR').includes(termoBusca);
  const passaClasse = (item: TVendavel | TCatalogo) => filtroClasse === 'todas' || classeIdDe(item) === filtroClasse;

  // Contagem de cada aba de tipo respeita a busca e a classe, para o número prometer o que vai aparecer.
  const contagemPorTipo = useMemo(() => {
    const base = catalogo.filter((item) => passaClasse(item) && passaBuscaCatalogo(item));
    return {
      todos: base.length,
      poder: base.filter((item) => item.tipo === 'poder').length,
      habilidade: base.filter((item) => item.tipo === 'habilidade').length,
      unico: base.filter((item) => item.tipo === 'unico').length,
    } as Record<TTipoFiltro, number>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogo, filtroClasse, termoBusca]);

  const vendaveisVisiveis = vendaveis
    .filter((item) => filtroTipo === 'todos' || item.tipo === filtroTipo)
    .filter((item) => passaClasse(item) && passaBusca(item));

  const catalogoVisivel = catalogo
    .filter((item) => filtroTipo === 'todos' || item.tipo === filtroTipo)
    .filter((item) => passaClasse(item) && passaBuscaCatalogo(item))
    .filter((item) => !soPagaveis || (!jaAdquiridoDe(item) && custoSementesDe(item) <= sementes))
    .filter((item) => !ocultarAdquiridos || !jaAdquiridoDe(item))
    .sort((a, b) => {
      // O que já está plantado vai para o fim, para não atrapalhar quem procura algo novo.
      const adq = Number(jaAdquiridoDe(a)) - Number(jaAdquiridoDe(b));
      if (adq !== 0) return adq;
      if (ordem === 'nome') return tituloDe(a).localeCompare(tituloDe(b), 'pt-BR');
      const dif = custoSementesDe(a) - custoSementesDe(b);
      return (ordem === 'caro' ? -dif : dif) || tituloDe(a).localeCompare(tituloDe(b), 'pt-BR');
    });

  useEffect(() => { setLimite(PASSO_LISTA); }, [termoBusca, filtroClasse, filtroTipo, ordem, soPagaveis, ocultarAdquiridos]);

  const alternarExpandido = (chave: string) => setExpandidos((atual) => {
    const proximo = new Set(atual);
    if (proximo.has(chave)) proximo.delete(chave); else proximo.add(chave);
    return proximo;
  });
  const pedirConfirmacao = (dados: { titulo: string; mensagem: string; acao: () => void }) => setConfirmacao(dados);

  const avisar = (texto: string, erro = false) => {
    setMensagem({ texto, erro });
    setTimeout(() => setMensagem((atual) => (atual?.texto === texto ? null : atual)), 3500);
  };

  const executarVenderPoder = (alvo: IPoderVendavelJardim) => {
    const novaLista = alvo.origemTipo === 'classe'
      ? venderPoderDeClasseNoJardim(f, alvo.indice)
      : venderPoderDoJardim(f, alvo.indice);
    if (!novaLista) {
      avisar('Não foi possível podar esse poder agora.', true);
      return;
    }
    onUpdate(alvo.origemTipo === 'classe' ? ['ficha', 'poderesClasseSelecionados'] : ['ficha', 'jardim', 'comprados'], novaLista);
    onUpdate(['ficha', 'jardim', 'sementes'], sementes + alvo.sementesRecebidas);
    avisar(`${alvo.titulo} foi podado. +${alvo.sementesRecebidas} Sementes.`);
  };

  const comprarPoder = (item: IPoderCatalogoJardim) => {
    if (item.jaAdquirido) return;
    if (sementes < item.custoSementes) {
      avisar('Sementes insuficientes para plantar esse poder.', true);
      return;
    }
    const novaLista = comprarPoderNoJardim(f, { classeId: item.classeId, poderId: item.poder.id });
    if (!novaLista) {
      avisar('Esse poder já está plantado na sua ficha.', true);
      return;
    }
    onUpdate(['ficha', 'jardim', 'comprados'], novaLista);
    onUpdate(['ficha', 'jardim', 'sementes'], sementes - item.custoSementes);
    avisar(`${item.poder.titulo} (${item.classeTitulo}) foi plantado no Jardim.`);
  };

  const executarVenderHabilidade = (alvo: IHabilidadeVendavelJardim) => {
    const novaLista = alvo.origemTipo === 'classe'
      ? venderHabilidadeDeClasseNoJardim(f, { classeId: alvo.classeId, habilidadeId: alvo.habilidadeId })
      : venderHabilidadeDoJardim(f, { classeId: alvo.classeId, habilidadeId: alvo.habilidadeId });
    if (!novaLista) {
      avisar('Não foi possível podar essa habilidade agora.', true);
      return;
    }
    onUpdate(alvo.origemTipo === 'classe' ? ['ficha', 'jardim', 'habilidadesVendidas'] : ['ficha', 'jardim', 'habilidadesCompradas'], novaLista);
    onUpdate(['ficha', 'jardim', 'sementes'], sementes + alvo.sementesRecebidas);
    avisar(`${alvo.titulo} foi podada. +${alvo.sementesRecebidas} Sementes.`);
  };

  const comprarHabilidade = (item: IHabilidadeCatalogoJardim) => {
    if (item.jaAdquirida) return;
    if (sementes < item.custoSementes) {
      avisar('Sementes insuficientes para plantar essa habilidade.', true);
      return;
    }
    const novaLista = comprarHabilidadeNoJardim(f, { classeId: item.classeId, habilidadeId: item.habilidade.id });
    if (!novaLista) {
      avisar('Essa habilidade já está plantada na sua ficha.', true);
      return;
    }
    onUpdate(['ficha', 'jardim', 'habilidadesCompradas'], novaLista);
    onUpdate(['ficha', 'jardim', 'sementes'], sementes - item.custoSementes);
    avisar(`${item.habilidade.titulo} (${item.classeTitulo}) foi plantada no Jardim, já no estágio do seu nível atual.`);
  };

  const executarVenderUnico = (alvo: IUnicoVendavelJardim) => {
    const novaLista = venderUnicoNoJardim(f, alvo.id);
    if (!novaLista) {
      avisar('Não foi possível podar esse Único agora.', true);
      return;
    }
    onUpdate(['ficha', 'jardim', 'unicosComprados'], novaLista);
    onUpdate(['ficha', 'jardim', 'sementes'], sementes + alvo.sementesRecebidas);
    avisar(`${alvo.titulo} foi podado. +${alvo.sementesRecebidas} Sementes.`);
  };

  const comprarUnico = (item: TUnicoCatalogo) => {
    if (item.jaAdquirido) return;
    if (sementes < item.unico.custoSementes) {
      avisar('Sementes insuficientes para plantar esse Único.', true);
      return;
    }
    const novaLista = comprarUnicoNoJardim(f, item.unico.id);
    if (!novaLista) {
      avisar('Esse Único já está plantado na sua ficha.', true);
      return;
    }
    onUpdate(['ficha', 'jardim', 'unicosComprados'], novaLista);
    onUpdate(['ficha', 'jardim', 'sementes'], sementes - item.unico.custoSementes);
    avisar(`${item.unico.titulo} foi plantado no Jardim.`);
  };

  const podarItem = (item: TVendavel) => {
    if (item.tipo === 'poder') {
      const alvo = item.dado;
      pedirConfirmacao({
        titulo: 'Podar poder',
        mensagem: `Podar "${alvo.titulo}" em troca de ${alvo.sementesRecebidas} Sementes? O poder some da ficha.`,
        acao: () => executarVenderPoder(alvo),
      });
    } else if (item.tipo === 'habilidade') {
      const alvo = item.dado;
      pedirConfirmacao({
        titulo: 'Podar habilidade',
        mensagem: `Podar "${alvo.titulo}" (todos os ${alvo.estagiosAlcancados} estágios já alcançados) em troca de ${alvo.sementesRecebidas} Sementes? A escada inteira some da ficha.`,
        acao: () => executarVenderHabilidade(alvo),
      });
    } else {
      const alvo = item.dado;
      pedirConfirmacao({
        titulo: 'Podar Único',
        mensagem: `Podar "${alvo.titulo}" em troca de ${alvo.sementesRecebidas} Sementes? Ele some da ficha.`,
        acao: () => executarVenderUnico(alvo),
      });
    }
  };

  const plantarItem = (item: TCatalogo) => {
    if (item.tipo === 'poder') comprarPoder(item.dado);
    else if (item.tipo === 'habilidade') comprarHabilidade(item.dado);
    else comprarUnico(item.dado);
  };

  const chaveVendavel = (item: TVendavel) => (item.tipo === 'poder'
    ? `poder:${item.dado.origemTipo}:${item.dado.classeId}:${item.dado.poderId}:${item.dado.indice}`
    : item.tipo === 'habilidade'
    ? `habilidade:${item.dado.origemTipo}:${item.dado.classeId}:${item.dado.habilidadeId}`
    : `unico:${item.dado.id}`);

  const chaveCatalogo = (item: TCatalogo) => (item.tipo === 'poder'
    ? `poder:${item.dado.classeId}:${item.dado.poder.id}`
    : item.tipo === 'habilidade'
    ? `habilidade:${item.dado.classeId}:${item.dado.habilidade.id}`
    : `unico:${item.dado.unico.id}`);

  const selosTipo = (tipo: TTipoFiltro) => (tipo === 'poder'
    ? 'border-sky-400/30 bg-sky-500/10 text-sky-200'
    : tipo === 'habilidade'
    ? 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200'
    : 'border-violet-400/30 bg-violet-500/10 text-violet-200');

  const rotuloTipo = (tipo: TTipoFiltro) => (tipo === 'poder' ? 'Poder' : tipo === 'habilidade' ? 'Habilidade' : 'Único');

  const irPara = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const cartaoCatalogo = (item: TCatalogo) => {
    const chave = chaveCatalogo(item);
    const custo = custoSementesDe(item);
    const adquirido = jaAdquiridoDe(item);
    const faltam = custo - sementes;
    const podePagar = faltam <= 0;
    const aberto = expandidos.has(chave);
    const descricao = descricaoDe(item);
    const longa = descricao.length > 180;
    const dado = item.dado;
    const titulo = tituloDe(item);
    const especial = item.tipo !== 'unico' && (dado as IPoderCatalogoJardim | IHabilidadeCatalogoJardim).categoriaClasse === 'esquecida';
    const unico = item.tipo === 'unico' ? (dado as TUnicoCatalogo).unico : null;
    const detalhe = item.tipo === 'unico'
      ? `${TIPO_UNICO_LABEL[unico!.tipo] || unico!.tipo}${resumoFichaTecnica(unico!) ? ` · ${resumoFichaTecnica(unico!)}` : ''}`
      : item.tipo === 'habilidade'
      ? `${classeTituloDe(item)} · ${(dado as IHabilidadeCatalogoJardim).estagiosNoNivelAtual} estágio${(dado as IHabilidadeCatalogoJardim).estagiosNoNivelAtual > 1 ? 's' : ''} no seu nível`
      : classeTituloDe(item);
    return (
      <article
        key={chave}
        className={`flex flex-col rounded-xl border p-4 transition-colors ${adquirido ? 'border-lime-400/30 bg-lime-500/[0.04]' : item.tipo === 'unico' ? 'border-violet-400/20 bg-violet-500/[0.03] hover:border-violet-400/40' : 'border-white/5 bg-[#121118]/90 hover:border-white/15'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {item.tipo === 'unico' && <Gem size={13} className="text-violet-300" />}
              <strong className="text-white leading-tight">{titulo}</strong>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${selosTipo(item.tipo)}`}>{rotuloTipo(item.tipo)}</span>
              {unico && (
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${TIER_COR[unico.tier] || TIER_COR.simples}`}>{TIER_LABEL[unico.tier] || unico.tier}</span>
              )}
              {especial && (
                <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-300">Especial</span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-gray-500">{item.tipo === 'unico' ? detalhe : `Classe: ${detalhe}`}</p>
          </div>
          <span className="flex-shrink-0 rounded-lg border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-2.5 py-1.5 text-center leading-none">
            <span className="block text-base font-black text-[#c7a44c]">{custo}</span>
            <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-widest text-[#c7a44c]/70">sementes</span>
          </span>
        </div>
        <p className={`mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-400 ${longa && !aberto ? 'line-clamp-3' : ''}`}>{descricao}</p>
        {longa && (
          <button
            type="button"
            onClick={() => alternarExpandido(chave)}
            className="mt-1 flex items-center gap-1 self-start text-[11px] font-bold text-gray-500 hover:text-gray-300"
          >
            <ChevronDown size={12} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} /> {aberto ? 'Mostrar menos' : 'Ler tudo'}
          </button>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-3">
          <button
            type="button"
            onClick={() => plantarItem(item)}
            disabled={adquirido || !podePagar}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${item.tipo === 'unico' ? 'border-violet-400/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20' : 'border-lime-400/30 bg-lime-500/10 text-lime-200 hover:bg-lime-500/20'}`}
          >
            <Sparkles size={14} /> {adquirido ? (item.tipo === 'habilidade' ? 'Já plantada' : 'Já plantado') : 'Plantar no Jardim'}
          </button>
          {!adquirido && !podePagar && <span className="text-[11px] font-bold text-red-300/80">Faltam {faltam} sementes</span>}
        </div>
      </article>
    );
  };

  const interruptor = (rotulo: string, ligado: boolean, alterar: (valor: boolean) => void) => (
    <label className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors focus-within:ring-2 focus-within:ring-lime-400/40 ${ligado ? 'border-lime-400/30 bg-lime-500/10 text-lime-200' : 'border-white/5 bg-[#121118] text-gray-400 hover:border-white/15 hover:text-gray-200'}`}>
      <input type="checkbox" checked={ligado} onChange={(e) => alterar(e.target.checked)} className="sr-only" />
      <span aria-hidden="true" className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${ligado ? 'border-lime-400 bg-lime-400 text-[#0f0e15]' : 'border-white/20 bg-[#0b0a10] group-hover:border-white/40'}`}>
        {ligado && <Check size={12} strokeWidth={3.5} />}
      </span>
      {rotulo}
    </label>
  );

  const chipTipo = (opcao: { value: TTipoFiltro; label: string }) => (
    <button
      key={opcao.value}
      type="button"
      onClick={() => setFiltroTipo(opcao.value)}
      aria-pressed={filtroTipo === opcao.value}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${filtroTipo === opcao.value ? 'border-lime-400/30 bg-lime-500/15 text-lime-200' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
    >
      {opcao.label}
      <span className={`rounded-full px-1.5 py-px text-[10px] ${filtroTipo === opcao.value ? 'bg-lime-400/20 text-lime-100' : 'bg-white/5 text-gray-500'}`}>{contagemPorTipo[opcao.value]}</span>
    </button>
  );

  const filtrosAtivos = termoBusca !== '' || filtroClasse !== 'todas' || filtroTipo !== 'todos' || soPagaveis || ocultarAdquiridos;
  const limparFiltros = () => {
    setBusca('');
    setFiltroClasse('todas');
    setFiltroTipo('todos');
    setSoPagaveis(false);
    setOcultarAdquiridos(false);
  };

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/5 bg-[#0f0e15] p-5 md:flex-row md:items-center" data-tour="jardim-resumo">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
            <Sprout className="text-lime-400" size={22} /> Jardim
          </h2>
          <p className="max-w-xl text-sm text-gray-400">Pode poderes e habilidades que você não usa em troca de Sementes, e plante poderes, habilidades e Únicos na sua ficha.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-lime-400/20 bg-[#15141b] px-4 py-3">
            <span className="text-3xl font-bold text-lime-400">{sementes}</span>
            <span className="text-sm font-bold uppercase leading-tight tracking-widest text-gray-500">Sementes</span>
          </div>
          <div className="flex gap-2 text-xs font-bold">
            <button type="button" onClick={() => irPara('jardim-catalogo')} className="rounded-lg border border-lime-400/25 bg-lime-500/10 px-3 py-2 text-lime-200 hover:bg-lime-500/20">
              Plantar ({catalogo.length})
            </button>
            <button type="button" onClick={() => irPara('jardim-podar')} className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-red-300 hover:bg-red-500/20">
              Podar ({vendaveis.length})
            </button>
          </div>
        </div>
      </div>

      {mensagem && (
        <div role="status" className={`sticky top-2 z-30 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${mensagem.erro ? 'border-red-400/30 bg-red-950/80 text-red-200' : 'border-lime-400/30 bg-lime-950/80 text-lime-100'}`}>
          {mensagem.texto}
        </div>
      )}

      {/* FILTROS (grudam no topo ao rolar) */}
      <div className="sticky top-0 z-20 space-y-3 rounded-2xl border border-white/5 bg-[#0f0e15]/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur" data-tour="jardim-filtros">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Buscar por nome, classe ou texto do efeito..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar no Jardim"
              className="w-full rounded-xl border border-white/5 bg-[#121118] py-2.5 pl-9 pr-9 text-sm text-white outline-none focus:border-lime-400/40"
            />
            {busca && (
              <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl border border-white/5 bg-[#121118] p-1">
            {TIPOS_FILTRO.map(chipTipo)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <select
              value={filtroClasse}
              onChange={(e) => setFiltroClasse(e.target.value)}
              disabled={filtroTipo === 'unico'}
              aria-label="Filtrar por classe"
              className="appearance-none rounded-lg border border-white/5 bg-[#121118] py-2 pl-8 pr-7 text-xs text-white outline-none focus:border-lime-400/40 disabled:opacity-40"
            >
              <option value="todas">Todas as classes</option>
              {classesCatalogo.map(([id, titulo]) => (
                <option key={id} value={id}>{titulo}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <select
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as TOrdem)}
              aria-label="Ordenar catálogo"
              className="appearance-none rounded-lg border border-white/5 bg-[#121118] py-2 pl-8 pr-7 text-xs text-white outline-none focus:border-lime-400/40"
            >
              <option value="barato">Mais barato primeiro</option>
              <option value="caro">Mais caro primeiro</option>
              <option value="nome">Nome (A a Z)</option>
            </select>
          </div>
          {interruptor('Só o que posso pagar', soPagaveis, setSoPagaveis)}
          {interruptor('Esconder o que já plantei', ocultarAdquiridos, setOcultarAdquiridos)}
          {filtrosAtivos && (
            <button type="button" onClick={limparFiltros} className="ml-auto flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-white">
              <X size={12} /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      <details className="rounded-xl border border-white/5 bg-[#0f0e15] px-4 py-3 text-xs text-gray-400">
        <summary className="cursor-pointer select-none font-bold text-gray-300">Como funciona o Jardim</summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p>Uma habilidade em escada (como Implacável) sai ou entra inteira: podar tira todos os estágios já alcançados, e plantar entrega de uma vez os estágios que o seu nível total já permite. Você só encontra no catálogo o que já cabe no seu nível.</p>
          <p>Únicos não vêm de nenhuma classe: são coisas que só existem no Jardim. O preço é fixo, sem depender do seu nível, e vai de truques simples a poderes lendários no tamanho de uma expansão de domínio. Quanto mais raro, mais Sementes custa.</p>
        </div>
      </details>

      {/* CATÁLOGO */}
      <section id="jardim-catalogo" className="scroll-mt-40 rounded-2xl border border-white/5 bg-[#0f0e15] p-4" data-tour="jardim-catalogo">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-lime-300">Catálogo do Jardim</h3>
            <p className="mt-1 text-xs text-gray-500">Poderes, habilidades de outras classes e Únicos, prontos para plantar na sua ficha com Sementes.</p>
          </div>
          <span className="text-xs text-gray-500">{catalogoVisivel.length} de {catalogo.length} itens</span>
        </div>
        {catalogoVisivel.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-600">
            <p>Nada encontrado com esses filtros.</p>
            {filtrosAtivos && (
              <button type="button" onClick={limparFiltros} className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white">Limpar filtros</button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {catalogoVisivel.slice(0, limite).map(cartaoCatalogo)}
            </div>
            {catalogoVisivel.length > limite && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setLimite((atual) => atual + PASSO_LISTA)}
                  className="rounded-lg border border-lime-400/25 bg-lime-500/10 px-4 py-2 text-xs font-bold text-lime-200 hover:bg-lime-500/20"
                >
                  Mostrar mais ({catalogoVisivel.length - limite} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* PODAR */}
      <section id="jardim-podar" className="scroll-mt-40 rounded-2xl border border-white/5 bg-[#0f0e15] p-4" data-tour="jardim-podar">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#c7a44c]">Podar</h3>
            <p className="mt-1 text-xs text-gray-500">Vender um poder da própria classe libera a vaga de volta na Progressão; vender a habilidade principal tira a escada inteira; vender um Único tira ele da ficha.</p>
          </div>
          <span className="text-xs text-gray-500">{vendaveisVisiveis.length} de {vendaveis.length} itens</span>
        </div>
        {vendaveisVisiveis.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-600">Nada disponível para podar com esses filtros.</p>
        ) : (
          <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5">
            {vendaveisVisiveis.map((item) => {
              const dado = item.dado;
              const origem = item.tipo === 'unico'
                ? `${TIPO_UNICO_LABEL[item.dado.tipo] || item.dado.tipo} · ${TIER_LABEL[item.dado.tier] || item.dado.tier}`
                : `${item.dado.origemTipo === 'jardim' ? 'Jardim' : 'Classe'}: ${item.dado.origem}${item.tipo === 'habilidade' ? ` · ${item.dado.estagiosAlcancados} estágio${item.dado.estagiosAlcancados > 1 ? 's' : ''}` : ''}`;
              return (
                <li key={chaveVendavel(item)} className="flex flex-wrap items-center gap-3 bg-[#121118]/90 px-4 py-3 hover:bg-[#161520]">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-white">{tituloDe(item)}</strong>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${selosTipo(item.tipo)}`}>{rotuloTipo(item.tipo)}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-500">{origem}</p>
                  </div>
                  <span className="flex-shrink-0 rounded-full border border-lime-400/30 bg-lime-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-lime-200">
                    +{dado.sementesRecebidas} sementes
                  </span>
                  <button
                    type="button"
                    onClick={() => podarItem(item)}
                    className="flex flex-shrink-0 items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition-colors hover:bg-red-500/20"
                  >
                    <ArrowRightLeft size={14} /> Podar
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ModalConfirmacao
        isOpen={confirmacao !== null}
        titulo={confirmacao?.titulo || ''}
        mensagem={confirmacao?.mensagem || ''}
        rotuloConfirmar="Podar por Sementes"
        onClose={() => setConfirmacao(null)}
        onConfirmar={() => {
          const acao = confirmacao?.acao;
          setConfirmacao(null);
          acao?.();
        }}
      />
    </div>
  );
};
