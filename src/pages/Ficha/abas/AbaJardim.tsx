import { useMemo, useState } from 'react';
import { Sprout, Search, ArrowRightLeft, Sparkles, Filter, Gem } from 'lucide-react';
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

type TTipoFiltro = 'todos' | 'poder' | 'habilidade' | 'unico';

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

  const combinarFiltros = <T extends TVendavel | TCatalogo>(itens: T[], comFiltroClasse: boolean) => itens
    .filter((item) => filtroTipo === 'todos' || item.tipo === filtroTipo)
    .filter((item) => !comFiltroClasse || filtroClasse === 'todas' || classeIdDe(item) === filtroClasse)
    .filter((item) => !termoBusca
      || tituloDe(item).toLocaleLowerCase('pt-BR').includes(termoBusca)
      || classeTituloDe(item).toLocaleLowerCase('pt-BR').includes(termoBusca));

  const vendaveisVisiveis = combinarFiltros(vendaveis, true);
  const catalogoVisivel = combinarFiltros(catalogo, true)
    .sort((a, b) => custoSementesDe(a) - custoSementesDe(b));

  const avisar = (texto: string, erro = false) => {
    setMensagem({ texto, erro });
    setTimeout(() => setMensagem((atual) => (atual?.texto === texto ? null : atual)), 3500);
  };

  const venderPoder = (alvo: IPoderVendavelJardim) => {
    if (!window.confirm(`Podar "${alvo.titulo}" em troca de ${alvo.sementesRecebidas} Sementes? O poder some da ficha.`)) return;
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

  const venderHabilidade = (alvo: IHabilidadeVendavelJardim) => {
    if (!window.confirm(`Podar "${alvo.titulo}" (todos os ${alvo.estagiosAlcancados} estágios já alcançados) em troca de ${alvo.sementesRecebidas} Sementes? A escada inteira some da ficha.`)) return;
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

  const venderUnico = (alvo: IUnicoVendavelJardim) => {
    if (!window.confirm(`Podar "${alvo.titulo}" em troca de ${alvo.sementesRecebidas} Sementes? Ele some da ficha.`)) return;
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

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" data-tour="jardim-resumo">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2" style={{ fontFamily: 'Cinzel, serif' }}>
            <Sprout className="text-lime-400" size={22} /> Jardim
          </h2>
          <p className="text-gray-400 text-sm max-w-xl">Pode poderes e habilidades que você não usa em troca de Sementes, e plante poderes, habilidades e Únicos na sua ficha.</p>
        </div>
        <div className="flex items-center gap-3 bg-[#15141b] border border-lime-400/20 rounded-xl px-4 py-3">
          <span className="text-3xl font-bold text-lime-400">{sementes}</span>
          <span className="text-sm text-gray-500 uppercase tracking-widest font-bold leading-tight">Sementes</span>
        </div>
      </div>

      {mensagem && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${mensagem.erro ? 'border-red-400/30 bg-red-500/10 text-red-300' : 'border-lime-400/30 bg-lime-500/10 text-lime-200'}`}>
          {mensagem.texto}
        </div>
      )}

      {/* FILTROS */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-3" data-tour="jardim-filtros">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Buscar por nome ou classe..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-[#121118] border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-white focus:border-lime-400/40 outline-none text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/5 bg-[#121118] p-1">
          {TIPOS_FILTRO.map((opcao) => (
            <button
              key={opcao.value}
              type="button"
              onClick={() => setFiltroTipo(opcao.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${filtroTipo === opcao.value ? 'bg-lime-500/15 text-lime-200 border border-lime-400/30' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}
            >
              {opcao.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
          <select
            value={filtroClasse}
            onChange={(e) => setFiltroClasse(e.target.value)}
            disabled={filtroTipo === 'unico'}
            className="bg-[#121118] border border-white/5 rounded-xl py-2.5 pl-9 pr-8 text-white focus:border-lime-400/40 outline-none text-sm appearance-none disabled:opacity-40"
          >
            <option value="todas">Todas as classes</option>
            {classesCatalogo.map(([id, titulo]) => (
              <option key={id} value={id}>{titulo}</option>
            ))}
          </select>
        </div>
      </div>

      {filtroTipo !== 'poder' && filtroTipo !== 'unico' && (
        <p className="rounded-xl border border-amber-400/20 bg-amber-500/[0.05] px-4 py-3 text-xs text-amber-200/80">
          Uma habilidade em escada (como Implacável) sai ou entra inteira: podar tira todos os estágios já alcançados, e plantar entrega de uma vez os estágios que o seu nível total já permite. Você só encontra no catálogo o que já cabe no seu nível — nada de "nível 5" estando no nível 1.
        </p>
      )}
      {(filtroTipo === 'unico' || filtroTipo === 'todos') && (
        <p className="rounded-xl border border-violet-400/20 bg-violet-500/[0.05] px-4 py-3 text-xs text-violet-200/80">
          Únicos não vêm de nenhuma classe: são coisas que só existem no Jardim. O preço é fixo, sem depender do seu nível, e vai de truques simples a poderes lendários no tamanho de uma expansão de domínio — quanto mais raro, mais Sementes custa.
        </p>
      )}

      {/* PODAR */}
      <section className="bg-[#0f0e15] border border-white/5 rounded-2xl p-4" data-tour="jardim-podar">
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#c7a44c]">Podar</h3>
          <p className="mt-1 text-xs text-gray-500">Vender um poder da própria classe libera a vaga de volta na Progressão; vender a habilidade principal tira a escada inteira; vender um Único tira ele da ficha.</p>
        </div>
        {vendaveisVisiveis.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-600">Nada disponível para podar com esse filtro.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {vendaveisVisiveis.map((item) => {
              const chave = item.tipo === 'poder'
                ? `poder:${item.dado.origemTipo}:${item.dado.classeId}:${item.dado.poderId}:${item.dado.indice}`
                : item.tipo === 'habilidade'
                ? `habilidade:${item.dado.origemTipo}:${item.dado.classeId}:${item.dado.habilidadeId}`
                : `unico:${item.dado.id}`;
              const titulo = tituloDe(item);
              const sementesRecebidas = item.dado.sementesRecebidas;
              return (
                <article key={chave} className="rounded-xl border border-white/5 bg-[#121118]/90 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-white">{titulo}</strong>
                        {item.tipo === 'unico' ? (
                          <>
                            <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-200">Único</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${TIER_COR[item.dado.tier] || TIER_COR.simples}`}>{TIER_LABEL[item.dado.tier] || item.dado.tier}</span>
                          </>
                        ) : (
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${item.tipo === 'poder' ? 'border-sky-400/30 bg-sky-500/10 text-sky-200' : 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200'}`}>
                            {item.tipo === 'poder' ? 'Poder' : 'Habilidade'}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {item.tipo === 'unico'
                          ? TIPO_UNICO_LABEL[item.dado.tipo] || item.dado.tipo
                          : item.dado.origemTipo === 'jardim' ? `Jardim: ${item.dado.origem}` : `Classe: ${item.dado.origem}`}
                        {item.tipo === 'habilidade' && ` · ${item.dado.estagiosAlcancados} estágio${item.dado.estagiosAlcancados > 1 ? 's' : ''} alcançado${item.dado.estagiosAlcancados > 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <span className="rounded-full border border-lime-400/30 bg-lime-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-lime-200 flex-shrink-0">
                      +{sementesRecebidas} sementes
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => (item.tipo === 'poder' ? venderPoder(item.dado) : item.tipo === 'habilidade' ? venderHabilidade(item.dado) : venderUnico(item.dado))}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20 transition-colors"
                  >
                    <ArrowRightLeft size={14} /> Podar por Sementes
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* CATÁLOGO */}
      <section className="bg-[#0f0e15] border border-white/5 rounded-2xl p-4" data-tour="jardim-catalogo">
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-lime-300">Catálogo do Jardim</h3>
          <p className="mt-1 text-xs text-gray-500">Poderes, habilidades de outras classes e Únicos, prontos para plantar na sua ficha com Sementes.</p>
        </div>
        {catalogoVisivel.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-600">Nada encontrado com esse filtro.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 max-h-[32rem] overflow-y-auto pr-1 custom-scrollbar">
            {catalogoVisivel.map((item) => {
              if (item.tipo === 'poder') {
                const dado = item.dado;
                const podeComprar = !dado.jaAdquirido && sementes >= dado.custoSementes;
                return (
                  <article key={`poder:${dado.classeId}:${dado.poder.id}`} className={`rounded-xl border p-4 ${dado.jaAdquirido ? 'border-lime-400/30 bg-lime-500/[0.04]' : 'border-white/5 bg-[#121118]/90'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-white">{dado.poder.titulo}</strong>
                          <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-200">Poder</span>
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                          Classe: {dado.classeTitulo}
                          {dado.categoriaClasse === 'esquecida' && (
                            <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-300">Especial</span>
                          )}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#c7a44c] flex-shrink-0">
                        {dado.custoSementes} sementes
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-400">{dado.poder.descricao}</p>
                    <button
                      type="button"
                      onClick={() => comprarPoder(dado)}
                      disabled={dado.jaAdquirido || !podeComprar}
                      className="mt-3 flex items-center gap-2 rounded-lg border border-lime-400/30 bg-lime-500/10 px-3 py-2 text-xs font-bold text-lime-200 hover:bg-lime-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Sparkles size={14} /> {dado.jaAdquirido ? 'Já plantado' : 'Plantar no Jardim'}
                    </button>
                  </article>
                );
              }
              if (item.tipo === 'habilidade') {
                const dado = item.dado;
                const podeComprar = !dado.jaAdquirida && sementes >= dado.custoSementes;
                return (
                  <article key={`habilidade:${dado.classeId}:${dado.habilidade.id}`} className={`rounded-xl border p-4 ${dado.jaAdquirida ? 'border-lime-400/30 bg-lime-500/[0.04]' : 'border-white/5 bg-[#121118]/90'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-white">{dado.habilidade.titulo}</strong>
                          <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-fuchsia-200">Habilidade</span>
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                          Classe: {dado.classeTitulo} · {dado.estagiosNoNivelAtual} estágio{dado.estagiosNoNivelAtual > 1 ? 's' : ''} no seu nível
                          {dado.categoriaClasse === 'esquecida' && (
                            <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-300">Especial</span>
                          )}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#c7a44c] flex-shrink-0">
                        {dado.custoSementes} sementes
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-400">{dado.descricaoNoNivelAtual}</p>
                    <button
                      type="button"
                      onClick={() => comprarHabilidade(dado)}
                      disabled={dado.jaAdquirida || !podeComprar}
                      className="mt-3 flex items-center gap-2 rounded-lg border border-lime-400/30 bg-lime-500/10 px-3 py-2 text-xs font-bold text-lime-200 hover:bg-lime-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Sparkles size={14} /> {dado.jaAdquirida ? 'Já plantada' : 'Plantar no Jardim'}
                    </button>
                  </article>
                );
              }
              const dado = item.dado;
              const podeComprar = !dado.jaAdquirido && sementes >= dado.unico.custoSementes;
              const ficha = resumoFichaTecnica(dado.unico);
              return (
                <article key={`unico:${dado.unico.id}`} className={`rounded-xl border p-4 ${dado.jaAdquirido ? 'border-lime-400/30 bg-lime-500/[0.04]' : 'border-violet-400/20 bg-violet-500/[0.03]'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Gem size={13} className="text-violet-300" />
                        <strong className="text-white">{dado.unico.titulo}</strong>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${TIER_COR[dado.unico.tier] || TIER_COR.simples}`}>{TIER_LABEL[dado.unico.tier] || dado.unico.tier}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-500">{TIPO_UNICO_LABEL[dado.unico.tipo] || dado.unico.tipo}{ficha ? ` · ${ficha}` : ''}</p>
                    </div>
                    <span className="rounded-full border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#c7a44c] flex-shrink-0">
                      {dado.unico.custoSementes} sementes
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-400">{dado.unico.descricao}</p>
                  <button
                    type="button"
                    onClick={() => comprarUnico(dado)}
                    disabled={dado.jaAdquirido || !podeComprar}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200 hover:bg-violet-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Sparkles size={14} /> {dado.jaAdquirido ? 'Já plantado' : 'Plantar no Jardim'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
