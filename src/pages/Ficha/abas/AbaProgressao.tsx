import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  Crown,
  LockKeyhole,
  Search,
  Sparkles,
  Swords,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { LEGADOS_CATALOGO, RACAS_CATALOGO, CLASSES_CATALOGO } from '../../../services/catalogoService';
import { ATRIBUTOS, capacidadeModificacoesRaciais } from '../../../services/calculoService';
import { NOMES_ATRIBUTOS } from '../components/AtributosSection';
import { useAuthStore } from '../../../store/useAuthStore';
import { ProgressaoClasses } from '../components/ProgressaoClasses';
import { FormulaIngredients } from '../../../components/materials/FormulaIngredients';
import { CookingIngredients } from '../../../components/materials/CookingIngredients';
import {
  avaliarLegado,
  caracteristicasRaciaisAutomaticas,
  classesDaFicha,
  descreverPreRequisitos,
  escolhasHabilidadeDisponiveis,
  eventosDesbloqueados,
  habilidadesAutomaticas,
  legadosSelecionados,
  podeEscolherOpcaoHabilidade,
  podeSelecionarPoder,
  poderesSelecionados,
  resumoFichaTecnica,
  selecoesHabilidadeValidas,
  selecoesPoderValidas,
  vagasLegado,
  vagasPoderDaClasse,
  type ILegadoCatalogo,
} from '../../../services/progressaoFichaService';

type SecaoProgressaoId = 'raca' | 'habilidades' | 'escolhas' | 'poderes' | 'eventos' | 'legados';
type FiltroDisponibilidade = 'todos' | 'disponiveis' | 'selecionados';

const normalizarBusca = (valor: unknown) => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR');

const correspondeBusca = (termo: string, ...campos: unknown[]) => (
  !termo || campos.some((campo) => normalizarBusca(campo).includes(termo))
);

const Card = ({ titulo, origem, descricao, detalhe }: { titulo: string; origem: string; descricao: string; detalhe?: string }) => (
  <details className="group rounded-xl border border-white/[0.07] bg-[#111017] transition-colors open:border-[#c7a44c]/20 open:bg-[#141219]">
    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 marker:content-none">
      <span className="min-w-0">
        <span className="block truncate font-bold text-white">{titulo}</span>
        {detalhe && <span className="mt-1 block text-xs font-bold text-emerald-300">{detalhe}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="rounded-full border border-[#c7a44c]/25 bg-[#c7a44c]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#c7a44c]">{origem}</span>
        <ChevronDown size={15} className="text-gray-600 transition-transform group-open:rotate-180" />
      </span>
    </summary>
    <p className="border-t border-white/[0.05] px-4 pb-4 pt-3 whitespace-pre-line text-sm leading-relaxed text-gray-400">{descricao}</p>
  </details>
);

const Secao = ({ titulo, resumo, quantidade, icone, children, tourId, aberta, onToggle }: {
  titulo: string;
  resumo: string;
  quantidade?: number;
  icone: React.ReactNode;
  children: React.ReactNode;
  tourId?: string;
  aberta: boolean;
  onToggle: () => void;
}) => (
  <section className={`overflow-hidden rounded-2xl border bg-[#0f0e15] transition-colors ${aberta ? 'border-[#c7a44c]/20' : 'border-white/[0.06]'}`} data-tour={tourId}>
    <button type="button" onClick={onToggle} aria-expanded={aberta} className="flex w-full items-center gap-3 p-5 text-left md:p-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-black/25">{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-white">{titulo}</span>
          {typeof quantidade === 'number' && <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold text-gray-400">{quantidade}</span>}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-gray-500">{resumo}</span>
      </span>
      <ChevronDown size={18} className={`shrink-0 text-gray-500 transition-transform ${aberta ? 'rotate-180 text-[#c7a44c]' : ''}`} />
    </button>
    {aberta && <div className="border-t border-white/[0.06] p-5 md:p-6">{children}</div>}
  </section>
);

export const AbaProgressao = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const [buscaLegado, setBuscaLegado] = useState('');
  const [buscaGeral, setBuscaGeral] = useState('');
  const [filtroPoder, setFiltroPoder] = useState<FiltroDisponibilidade>('todos');
  const [filtroLegado, setFiltroLegado] = useState<FiltroDisponibilidade>('todos');
  const [secoesAbertas, setSecoesAbertas] = useState<Set<SecaoProgressaoId>>(() => new Set(['poderes']));
  const ficha = character.ficha || {};
  const usuario = useAuthStore((state) => state.usuario);
  const campanha = useAuthStore((state) => state.campanhaAtiva);
  const isMestre = usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador' || campanha?.papel === 'mestre' || campanha?.papel === 'assistente';
  const classes = classesDaFicha(ficha);
  // ProgressaoClasses quer os slots crus ({classeId, nivel}), não os já
  // resolvidos de classesDaFicha - mesmo fallback de AbaFicha.tsx pra ficha
  // legada sem `classes` (só o `classeId` antigo).
  const classeSlots: { classeId: string; nivel: number }[] = ficha.classes?.length
    ? ficha.classes
    : (ficha.classeId ? [{ classeId: ficha.classeId, nivel: ficha.nivel || 1 }] : []);
  const selecoesPoder = selecoesPoderValidas(ficha);
  const idsLegados: string[] = Array.isArray(ficha.legadosSelecionados) ? ficha.legadosSelecionados : [];
  const tracos = caracteristicasRaciaisAutomaticas(ficha);
  const raca = RACAS_CATALOGO.find((item) => item.id === ficha.racaId);
  const escolhaRacial = ficha.escolhaRacial || {};
  // As opções escolhidas aparecem como cartões próprios na aba Habilidades;
  // aqui já existe a grade interativa delas logo abaixo, então evitamos repetir.
  const habilidades = habilidadesAutomaticas(ficha).filter((item) => item.subtipo !== 'escolha');
  const escolhasHabilidade = escolhasHabilidadeDisponiveis(ficha);
  const eventos = eventosDesbloqueados(ficha);
  const poderes = poderesSelecionados(ficha);
  const legados = legadosSelecionados(ficha);
  const vagasLegados = vagasLegado(ficha);

  const catalogoLegados = useMemo(() => {
    const termos = [buscaLegado, buscaGeral].map((item) => normalizarBusca(item.trim())).filter(Boolean);
    return (LEGADOS_CATALOGO as ILegadoCatalogo[]).filter((item) => termos.every((termo) => correspondeBusca(
      termo,
      item.titulo,
      item.descricao,
      descreverPreRequisitos(item.pre_requisitos).join(' '),
    )));
  }, [buscaGeral, buscaLegado]);

  const adicionarPoder = (classeId: string, poderId: string) => {
    if (!window.confirm('A escolha de um poder de classe é permanente para jogadores. Confirmar?')) return;
    onUpdate(['ficha', 'poderesClasseSelecionados'], [...selecoesPoder, { classeId, poderId }]);
  };
  const removerPoder = (classeId: string, poderId: string) => {
    const indice = selecoesPoder.findIndex((item) => item.classeId === classeId && item.poderId === poderId);
    onUpdate(['ficha', 'poderesClasseSelecionados'], selecoesPoder.filter((_, atual) => atual !== indice));
  };
  const escolherOpcaoHabilidade = (chave: string, opcaoId: string) => {
    const atuais = selecoesHabilidadeValidas(ficha);
    onUpdate(['ficha', 'escolhasHabilidade'], { ...atuais, [chave]: [...(atuais[chave] || []), opcaoId] });
  };
  const removerOpcaoHabilidade = (chave: string, opcaoId: string) => {
    const atuais = selecoesHabilidadeValidas(ficha);
    const lista = [...(atuais[chave] || [])];
    const indice = lista.indexOf(opcaoId);
    if (indice >= 0) lista.splice(indice, 1);
    onUpdate(['ficha', 'escolhasHabilidade'], { ...atuais, [chave]: lista });
  };
  const adicionarLegado = (id: string) => {
    if (!window.confirm('A escolha de um Legado é permanente para jogadores. Confirmar?')) return;
    onUpdate(['ficha', 'legadosSelecionados'], [...idsLegados, id]);
  };
  const removerLegado = (id: string) => {
    const indice = idsLegados.indexOf(id);
    onUpdate(['ficha', 'legadosSelecionados'], idsLegados.filter((_, atual) => atual !== indice));
  };
  const atualizarEscolhaRacial = (campo: string, ids: string[]) => onUpdate(['ficha', 'escolhaRacial'], { ...escolhaRacial, [campo]: ids });
  const alternarFragmentoConhecido = (id: string) => {
    const atuais: string[] = escolhaRacial.fragmentosConhecidosIds || [];
    const maximo = Math.max(0, Number(raca?.fragmentos_config?.conhecidos_maximo) || 0);
    if (atuais.includes(id)) {
      onUpdate(['ficha', 'escolhaRacial'], {
        ...escolhaRacial,
        fragmentosConhecidosIds: atuais.filter((item) => item !== id),
        fragmentosExpressosIds: (escolhaRacial.fragmentosExpressosIds || []).filter((item: string) => item !== id),
      });
    } else if (atuais.length < maximo) atualizarEscolhaRacial('fragmentosConhecidosIds', [...atuais, id]);
  };
  const alternarFragmentoExpresso = (id: string) => {
    const conhecidos: string[] = escolhaRacial.fragmentosConhecidosIds || [];
    const atuais: string[] = escolhaRacial.fragmentosExpressosIds || [];
    const maximo = Math.max(0, Number(raca?.fragmentos_config?.expressos) || 0);
    if (atuais.includes(id)) atualizarEscolhaRacial('fragmentosExpressosIds', atuais.filter((item) => item !== id));
    else if (conhecidos.includes(id) && atuais.length < maximo) atualizarEscolhaRacial('fragmentosExpressosIds', [...atuais, id]);
  };
  const configuracaoAtributos = raca?.escolha_atributos;
  const campoAtributos = String(configuracaoAtributos?.campo || 'atributosRaciais');
  const totalAtributos = Math.max(0, Math.trunc(Number(configuracaoAtributos?.total) || 0));
  const atributosEscolhidos: string[] = Array.isArray(escolhaRacial[campoAtributos]) ? escolhaRacial[campoAtributos] : [];
  const alternarAtributoRacial = (atributo: string) => {
    if (atributosEscolhidos.includes(atributo)) {
      atualizarEscolhaRacial(campoAtributos, atributosEscolhidos.filter((item) => item !== atributo));
    } else if (atributosEscolhidos.length < totalAtributos) {
      atualizarEscolhaRacial(campoAtributos, [...atributosEscolhidos, atributo]);
    }
  };
  const alternarModificacao = (id: string) => {
    const atuais: string[] = escolhaRacial.modificacoesIds || [];
    const maximo = capacidadeModificacoesRaciais(raca || null, Number(ficha.nivel) || 1);
    if (atuais.includes(id)) atualizarEscolhaRacial('modificacoesIds', atuais.filter((item) => item !== id));
    else if (atuais.length < maximo) atualizarEscolhaRacial('modificacoesIds', [...atuais, id]);
  };

  const termoBusca = normalizarBusca(buscaGeral.trim());
  const tracosVisiveis = tracos.filter((item) => correspondeBusca(termoBusca, item.titulo, item.descricao, item.origem));
  const habilidadesVisiveis = habilidades.filter((item) => correspondeBusca(termoBusca, item.titulo, item.descricao, item.origem));
  const eventosVisiveis = eventos.filter((item) => correspondeBusca(termoBusca, item.titulo, item.descricao, item.origem));
  const poderesVisiveis = poderes.filter((item) => correspondeBusca(termoBusca, item.titulo, item.descricao, item.origem));
  const vagasPoderes = classes.reduce((total, { classe, nivel }) => total + vagasPoderDaClasse(classe, nivel), 0);
  const vagasPoderesAbertas = Math.max(0, vagasPoderes - selecoesPoder.length);
  const vagasEscolhasAbertas = escolhasHabilidade.reduce(
    (total, escolha) => total + Math.max(0, escolha.vagas - escolha.selecionadas.length),
    0,
  );
  const vagasRaciaisAbertas = Math.max(0, totalAtributos - atributosEscolhidos.length);
  const vagasLegadosAbertas = Math.max(0, vagasLegados - idsLegados.length);
  const totalPendencias = vagasPoderesAbertas + vagasEscolhasAbertas + vagasRaciaisAbertas + vagasLegadosAbertas;

  // Quem chega nesta aba por causa de uma pendência (ex.: clicando no sino
  // de pendências) não escolhe qual seção abrir - então, ao montar, abrimos
  // de saída toda seção que ainda tenha uma escolha pendente.
  useEffect(() => {
    const secoesPendentes: SecaoProgressaoId[] = [];
    if (vagasRaciaisAbertas > 0) secoesPendentes.push('raca');
    if (vagasEscolhasAbertas > 0) secoesPendentes.push('escolhas');
    if (vagasPoderesAbertas > 0) secoesPendentes.push('poderes');
    if (vagasLegadosAbertas > 0) secoesPendentes.push('legados');
    if (secoesPendentes.length) {
      setSecoesAbertas((atuais) => new Set([...atuais, ...secoesPendentes]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resultadosBusca = useMemo(() => {
    if (!termoBusca) return [];
    const resultados: Array<{ id: string; titulo: string; grupo: string; secao: SecaoProgressaoId }> = [];
    tracos.forEach((item) => {
      if (correspondeBusca(termoBusca, item.titulo, item.descricao, item.origem)) resultados.push({ id: `raca-${item.id}`, titulo: item.titulo, grupo: 'Raça', secao: 'raca' });
    });
    (raca?.fragmentos || []).forEach((item: any) => {
      if (correspondeBusca(termoBusca, item.titulo, item.descricao)) resultados.push({ id: `fragmento-${item.id}`, titulo: item.titulo, grupo: 'Fragmento racial', secao: 'raca' });
    });
    (raca?.modificacoes || []).forEach((item: any) => {
      if (correspondeBusca(termoBusca, item.titulo, item.descricao)) resultados.push({ id: `modificacao-${item.id}`, titulo: item.titulo, grupo: 'Modificação racial', secao: 'raca' });
    });
    habilidades.forEach((item) => {
      if (correspondeBusca(termoBusca, item.titulo, item.descricao, item.origem)) resultados.push({ id: `habilidade-${item.id}`, titulo: item.titulo, grupo: 'Habilidade', secao: 'habilidades' });
    });
    escolhasHabilidade.forEach((escolha) => escolha.opcoes.forEach((opcao) => {
      if (correspondeBusca(termoBusca, opcao.titulo, opcao.descricao, opcao.acao)) resultados.push({ id: `escolha-${escolha.chave}-${opcao.id}`, titulo: opcao.titulo, grupo: escolha.rotulo, secao: 'escolhas' });
    }));
    classes.forEach(({ classe }) => (classe.poderes || []).forEach((poder) => {
      if (correspondeBusca(termoBusca, poder.titulo, poder.descricao, poder.pre_requisitos?.join(' '))) resultados.push({ id: `poder-${classe.id}-${poder.id}`, titulo: poder.titulo, grupo: classe.titulo, secao: 'poderes' });
    }));
    eventos.forEach((item) => {
      if (correspondeBusca(termoBusca, item.titulo, item.descricao, item.origem)) resultados.push({ id: `evento-${item.id}`, titulo: item.titulo, grupo: 'Evento', secao: 'eventos' });
    });
    (LEGADOS_CATALOGO as ILegadoCatalogo[]).forEach((item) => {
      if (correspondeBusca(termoBusca, item.titulo, item.descricao, descreverPreRequisitos(item.pre_requisitos).join(' '))) resultados.push({ id: `legado-${item.id}`, titulo: item.titulo, grupo: 'Legado', secao: 'legados' });
    });
    return resultados;
  }, [classes, escolhasHabilidade, eventos, habilidades, raca, termoBusca, tracos]);

  const alternarSecao = (id: SecaoProgressaoId) => {
    setSecoesAbertas((atuais) => {
      const proximas = new Set(atuais);
      if (proximas.has(id)) proximas.delete(id);
      else proximas.add(id);
      return proximas;
    });
  };

  const rolarPara = (seletor: string) => {
    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelector(seletor)?.scrollIntoView({ behavior: reduzirMovimento ? 'auto' : 'smooth', block: 'start' });
  };

  const abrirSecao = (id: SecaoProgressaoId) => {
    setSecoesAbertas((atuais) => new Set([...atuais, id]));
    window.setTimeout(() => rolarPara(`[data-tour="progressao-${id}"]`), 80);
  };

  const legadosVisiveis = catalogoLegados.filter((legado) => {
    const selecionado = idsLegados.includes(legado.id);
    const avaliacao = avaliarLegado(legado, ficha, idsLegados);
    if (filtroLegado === 'disponiveis') return avaliacao.permitido;
    if (filtroLegado === 'selecionados') return selecionado;
    return true;
  });

  const secoesNavegacao: Array<{ id: SecaoProgressaoId; rotulo: string; quantidade: number; pendente?: number }> = [
    { id: 'raca', rotulo: 'Raça', quantidade: tracos.length, pendente: vagasRaciaisAbertas },
    { id: 'habilidades', rotulo: 'Habilidades', quantidade: habilidades.length },
    ...(escolhasHabilidade.length ? [{ id: 'escolhas' as const, rotulo: 'Escolhas', quantidade: escolhasHabilidade.length, pendente: vagasEscolhasAbertas }] : []),
    { id: 'poderes', rotulo: 'Poderes', quantidade: poderes.length, pendente: vagasPoderesAbertas },
    { id: 'eventos', rotulo: 'Eventos', quantidade: eventos.length },
    { id: 'legados', rotulo: 'Legados', quantidade: legados.length, pendente: vagasLegadosAbertas },
  ];

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-[#c7a44c]/15 bg-[#0f0e15] p-5 sm:p-7" data-tour="progressao-resumo">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(199,164,76,0.14),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.08),transparent_36%)]" />
        <div className="relative">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c7a44c]">Caminho do personagem</p>
              <h2 className="text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>Progressão</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">Consulte o que já foi conquistado, encontre opções pelo nome e conclua apenas as escolhas que ainda estão abertas.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 lg:min-w-[390px]">
              <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Nível total</span>
                <strong className="mt-1 block text-lg text-white">{classes.reduce((total, item) => total + item.nivel, 0) || Number(ficha.nivel) || 1}</strong>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Conquistas</span>
                <strong className="mt-1 block text-lg text-white">{habilidades.length + poderes.length + eventos.length + legados.length}</strong>
              </div>
              <div className={`rounded-xl border p-3 ${totalPendencias ? 'border-amber-400/20 bg-amber-400/[0.07]' : 'border-emerald-400/15 bg-emerald-400/[0.05]'}`}>
                <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Escolhas abertas</span>
                <strong className={`mt-1 block text-lg ${totalPendencias ? 'text-amber-200' : 'text-emerald-200'}`}>{totalPendencias}</strong>
              </div>
            </div>
          </div>

          <div className="relative mt-6">
            <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={buscaGeral}
              onChange={(event) => setBuscaGeral(event.target.value)}
              placeholder="Buscar habilidade, poder, evento, escolha ou Legado..."
              aria-label="Buscar em toda a progressão"
              className="w-full rounded-2xl border border-white/10 bg-black/35 py-3.5 pl-11 pr-11 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-[#c7a44c]/45"
            />
            {buscaGeral && <button type="button" onClick={() => setBuscaGeral('')} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-white"><X size={15} /></button>}
          </div>

          {termoBusca && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0a10]/95 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <span className="text-xs font-bold text-white">{resultadosBusca.length} resultado(s)</span>
                <span className="text-[10px] text-gray-500">Selecione para abrir a seção</span>
              </div>
              {resultadosBusca.length ? (
                <div className="custom-scrollbar grid max-h-64 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
                  {resultadosBusca.slice(0, 16).map((resultado) => (
                    <button key={resultado.id} type="button" onClick={() => abrirSecao(resultado.secao)} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]">
                      <span className="min-w-0 truncate text-xs font-bold text-gray-200">{resultado.titulo}</span>
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-[#c7a44c]">{resultado.grupo}</span>
                    </button>
                  ))}
                </div>
              ) : <p className="px-4 py-5 text-center text-xs text-gray-500">Nenhum resultado encontrado. Tente outro nome ou efeito.</p>}
            </div>
          )}
        </div>
      </header>

      <nav className="custom-scrollbar flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#0f0e15] p-2" aria-label="Atalhos da progressão">
        <button type="button" onClick={() => rolarPara('[data-tour="progressao-classes"]')} className="flex shrink-0 items-center gap-2 rounded-xl border border-transparent px-3.5 py-2.5 text-xs font-bold text-gray-400 transition-colors hover:border-white/10 hover:text-white">
          Classes <span className="text-[10px] opacity-60">{classes.length}</span>
        </button>
        {secoesNavegacao.map((secao) => (
          <button key={secao.id} type="button" onClick={() => abrirSecao(secao.id)} className={`relative flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-colors ${secoesAbertas.has(secao.id) ? 'border-[#c7a44c]/30 bg-[#c7a44c]/10 text-[#e1c76f]' : 'border-transparent text-gray-400 hover:border-white/10 hover:text-white'}`}>
            {secao.rotulo}
            <span className="text-[10px] opacity-60">{secao.quantidade}</span>
            {!!secao.pendente && <span className="flex min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-black text-black" title={`${secao.pendente} escolha(s) aberta(s)`}>{secao.pendente}</span>}
          </button>
        ))}
      </nav>

      <ProgressaoClasses classes={classeSlots} catalogoClasses={CLASSES_CATALOGO} />

      <Secao
        titulo="Características raciais"
        resumo="Traços automáticos e escolhas específicas da raça."
        quantidade={tracos.length}
        icone={<Users size={18} className="text-emerald-400" />}
        tourId="progressao-raca"
        aberta={secoesAbertas.has('raca')}
        onToggle={() => alternarSecao('raca')}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {tracosVisiveis.map((item) => <Card key={item.id} titulo={item.titulo} origem={item.origem} descricao={item.descricao} />)}
          {!tracosVisiveis.length && <p className="text-sm text-gray-500">{termoBusca ? 'Nenhuma característica corresponde à busca.' : 'A raça atual não possui características estruturadas no catálogo.'}</p>}
        </div>
        {configuracaoAtributos && totalAtributos > 0 && (
          <div className="mt-5 rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
            <h4 className="font-bold text-white">{(configuracaoAtributos as any).titulo || 'Atributos Raciais'}</h4>
            <p className="mt-1 text-xs text-gray-500">
              Escolha {totalAtributos} atributo{totalAtributos === 1 ? '' : 's'} distinto{totalAtributos === 1 ? '' : 's'} para receber +{configuracaoAtributos.bonus_por_escolha || 0}. Selecionados: {atributosEscolhidos.length}/{totalAtributos}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ATRIBUTOS.map((atributo) => {
                const selecionado = atributosEscolhidos.includes(atributo);
                const cheio = !selecionado && atributosEscolhidos.length >= totalAtributos;
                return (
                  <button
                    key={atributo}
                    type="button"
                    disabled={cheio}
                    onClick={() => alternarAtributoRacial(atributo)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                      selecionado ? 'border-amber-400/50 bg-amber-400/10 text-amber-200' : 'border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    {NOMES_ATRIBUTOS[atributo]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {Array.isArray(raca?.fragmentos) && raca.fragmentos.length > 0 && (
          <div className="mt-5 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
            <h4 className="font-bold text-white">Fragmentos do Amálgamo</h4>
            <p className="mt-1 text-xs text-gray-500">Conhecidos: {(escolhaRacial.fragmentosConhecidosIds || []).length}/{raca.fragmentos_config?.conhecidos_maximo || 0}. Expressos: {(escolhaRacial.fragmentosExpressosIds || []).length}/{raca.fragmentos_config?.expressos || 0}.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {raca.fragmentos.filter((item: any) => correspondeBusca(termoBusca, item.titulo, item.descricao)).map((item: any) => {
                const conhecido = (escolhaRacial.fragmentosConhecidosIds || []).includes(item.id);
                const expresso = (escolhaRacial.fragmentosExpressosIds || []).includes(item.id);
                return <div key={item.id} className="rounded-lg border border-white/5 bg-black/20 p-3"><strong className="text-sm text-white">{item.titulo}</strong><p className="mt-1 text-xs text-gray-400">{item.descricao}</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => alternarFragmentoConhecido(item.id)} className={`rounded border px-2 py-1 text-xs font-bold ${conhecido ? 'border-emerald-500/40 text-emerald-300' : 'border-white/10 text-gray-400'}`}>{conhecido ? 'Conhecido' : 'Conhecer'}</button><button type="button" disabled={!conhecido} onClick={() => alternarFragmentoExpresso(item.id)} className={`rounded border px-2 py-1 text-xs font-bold disabled:opacity-30 ${expresso ? 'border-[#c7a44c]/40 text-[#c7a44c]' : 'border-white/10 text-gray-400'}`}>{expresso ? 'Expresso' : 'Expressar'}</button></div></div>;
              })}
            </div>
          </div>
        )}
        {Array.isArray(raca?.modificacoes) && raca.modificacoes.length > 0 && (
          <div className="mt-5 rounded-xl border border-sky-500/15 bg-sky-500/5 p-4">
            <h4 className="font-bold text-white">Modificações do Autômato</h4>
            <p className="mt-1 text-xs text-gray-500">Instaladas: {(escolhaRacial.modificacoesIds || []).length}/{capacidadeModificacoesRaciais(raca, Number(ficha.nivel) || 1)}. Modificações ativas só funcionam com as passivas e pré-requisitos descritos.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {raca.modificacoes.filter((item: any) => correspondeBusca(termoBusca, item.titulo, item.descricao)).map((item: any) => { const instalada = (escolhaRacial.modificacoesIds || []).includes(item.id); return <div key={item.id} className="rounded-lg border border-white/5 bg-black/20 p-3"><div className="flex items-start justify-between gap-2"><strong className="text-sm text-white">{item.titulo}</strong><button type="button" onClick={() => alternarModificacao(item.id)} className={`rounded border px-2 py-1 text-xs font-bold ${instalada ? 'border-red-500/30 text-red-300' : 'border-sky-500/30 text-sky-300'}`}>{instalada ? 'Remover' : 'Instalar'}</button></div><p className="mt-1 text-xs text-gray-400">{item.descricao}</p></div>; })}
            </div>
          </div>
        )}
      </Secao>

      <Secao
        titulo="Habilidades de classe"
        resumo="Habilidades recebidas automaticamente conforme o nível."
        quantidade={habilidades.length}
        icone={<BookOpen size={18} className="text-sky-400" />}
        tourId="progressao-habilidades"
        aberta={secoesAbertas.has('habilidades')}
        onToggle={() => alternarSecao('habilidades')}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {habilidadesVisiveis.map((item) => <Card key={item.id} titulo={item.titulo} origem={item.origem} detalhe={`Estágio liberado no nível ${item.nivel}`} descricao={item.descricao} />)}
          {!habilidadesVisiveis.length && <p className="text-sm text-gray-500">{termoBusca ? 'Nenhuma habilidade corresponde à busca.' : 'Nenhuma habilidade de classe foi liberada.'}</p>}
        </div>
      </Secao>

      {escolhasHabilidade.length > 0 && (
        <Secao
          titulo="Escolhas de habilidade"
          resumo="Catálogos internos de habilidades, com vagas e requisitos."
          quantidade={escolhasHabilidade.length}
          icone={<Wrench size={18} className="text-amber-400" />}
          tourId="progressao-escolhas"
          aberta={secoesAbertas.has('escolhas')}
          onToggle={() => alternarSecao('escolhas')}
        >
          <div className="space-y-4">
            {escolhasHabilidade.map((escolha) => {
              const grupoCorresponde = correspondeBusca(termoBusca, escolha.rotulo, escolha.descricao, escolha.classeTitulo);
              const opcoesVisiveis = escolha.opcoes.filter((opcao) => grupoCorresponde || correspondeBusca(termoBusca, opcao.titulo, opcao.descricao, opcao.acao));
              if (!opcoesVisiveis.length) return null;
              return (
              <div key={escolha.chave} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-white">{escolha.rotulo}</strong>
                  <span className="text-xs font-bold text-[#c7a44c]">{escolha.selecionadas.length}/{escolha.vagas} vagas · {escolha.classeTitulo}</span>
                </div>
                {escolha.escalonamento?.nivel ? (
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-[11px] font-bold text-sky-200">
                    {escolha.escalonamento.rotulo}: {escolha.escalonamento.nivel} de {escolha.escalonamento.teto}
                  </div>
                ) : null}
                {escolha.descricao && <p className="mb-3 text-xs leading-relaxed text-gray-500">{escolha.descricao}</p>}
                <div className="grid gap-2 md:grid-cols-2">
                  {opcoesVisiveis.map((opcao) => {
                    const quantidade = escolha.selecionadas.filter((item) => item.id === opcao.id).length;
                    const avaliacao = podeEscolherOpcaoHabilidade(escolha, opcao.id);
                    return (
                      <div key={opcao.id} className={`rounded-lg border p-3 ${quantidade ? 'border-[#c7a44c]/40 bg-[#c7a44c]/5' : 'border-white/5 bg-[#121118]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <strong className="text-sm text-white">{opcao.titulo}</strong>
                            {opcao.acao && <p className="mt-1 text-xs text-gray-500">{opcao.acao}</p>}
                          </div>
                          <div className="flex gap-1">
                            {quantidade > 0 && <button type="button" onClick={() => removerOpcaoHabilidade(escolha.chave, opcao.id)} className="rounded-lg border border-red-500/30 px-2 py-1 text-xs font-bold text-red-300">Tirar</button>}
                            <button type="button" disabled={!avaliacao.permitido} title={avaliacao.motivo} onClick={() => escolherOpcaoHabilidade(escolha.chave, opcao.id)} className="rounded-lg border border-[#c7a44c]/30 px-2 py-1 text-xs font-bold text-[#c7a44c] disabled:cursor-not-allowed disabled:opacity-30">Escolher{quantidade ? ` (${quantidade})` : ''}</button>
                          </div>
                        </div>
                        <details className="group/detalhe mt-3 rounded-lg border border-white/[0.06] bg-black/20">
                          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 marker:content-none hover:text-white">
                            Ver descrição e efeitos <ChevronDown size={13} className="transition-transform group-open/detalhe:rotate-180" />
                          </summary>
                          <div className="border-t border-white/[0.05] p-3">
                            <p className="text-xs leading-relaxed text-gray-400">{opcao.descricao}</p>
                            {escolha.classeId === 'alquimista' && escolha.habilidadeId === 'formulas' && (
                              <FormulaIngredients formulaId={opcao.id} compact nivelFormula={escolha.escalonamento?.nivel} />
                            )}
                            {escolha.classeId === 'cozinheiro' && escolha.habilidadeId === 'cardapio' && (
                              <CookingIngredients recipeId={opcao.id} compact recipeLevel={escolha.escalonamento?.nivel} />
                            )}
                            {opcao.escalonamento && <p className="mt-2 text-xs leading-relaxed text-sky-200/70">{opcao.escalonamento}</p>}
                            {resumoFichaTecnica({ ...opcao, acao: undefined }) && <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">{resumoFichaTecnica({ ...opcao, acao: undefined })}</p>}
                          </div>
                        </details>
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        </Secao>
      )}

      <Secao
        titulo="Poderes de classe"
        resumo={`${vagasPoderesAbertas} vaga(s) aberta(s); filtre o catálogo antes de escolher.`}
        quantidade={poderes.length}
        icone={<Swords size={18} className="text-orange-400" />}
        tourId="progressao-poderes"
        aberta={secoesAbertas.has('poderes')}
        onToggle={() => alternarSecao('poderes')}
      >
        <div className="mb-5 grid gap-3 lg:grid-cols-2">
          {poderesVisiveis.map((item) => <Card key={item.id} titulo={item.titulo} origem={item.origem} detalhe={item.custoMana ? `${item.custoMana} Mana` : 'Sem custo de Mana'} descricao={item.descricao} />)}
          {!poderesVisiveis.length && <p className="text-sm text-gray-500">{termoBusca ? 'Nenhum poder escolhido corresponde à busca. Veja o catálogo abaixo.' : 'Use as vagas abaixo para escolher seus poderes.'}</p>}
        </div>
        <div className="mb-4 flex flex-col justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3 sm:flex-row sm:items-center">
          <div>
            <strong className="text-xs text-white">Catálogo de poderes</strong>
            <p className="mt-1 text-[10px] text-gray-500">Os motivos de bloqueio continuam visíveis em cada opção.</p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar poderes">
            {([
              ['todos', 'Todos'],
              ['disponiveis', 'Disponíveis'],
              ['selecionados', 'Escolhidos'],
            ] as const).map(([valor, rotulo]) => (
              <button key={valor} type="button" onClick={() => setFiltroPoder(valor)} aria-pressed={filtroPoder === valor} className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold transition-colors ${filtroPoder === valor ? 'border-orange-400/35 bg-orange-400/10 text-orange-200' : 'border-white/[0.07] text-gray-500 hover:text-white'}`}>{rotulo}</button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {classes.map(({ classe, nivel }) => {
            const selecionados = selecoesPoder.filter((item) => item.classeId === classe.id);
            const vagas = vagasPoderDaClasse(classe, nivel);
            const poderesClasse = (classe.poderes || []).filter((poder) => {
              const quantidade = selecionados.filter((item) => item.poderId === poder.id).length;
              const avaliacao = podeSelecionarPoder(poder, classe, nivel, selecoesPoder, ficha);
              if (!correspondeBusca(termoBusca, poder.titulo, poder.descricao, poder.pre_requisitos?.join(' '))) return false;
              if (filtroPoder === 'disponiveis') return avaliacao.permitido;
              if (filtroPoder === 'selecionados') return quantidade > 0;
              return true;
            });
            return (
              <div key={classe.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <strong className="text-white">{classe.titulo}</strong>
                  <span className="text-xs font-bold text-[#c7a44c]">{selecionados.length}/{vagas} vagas</span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {poderesClasse.map((poder) => {
                    const quantidade = selecionados.filter((item) => item.poderId === poder.id).length;
                    const avaliacao = podeSelecionarPoder(poder, classe, nivel, selecoesPoder, ficha);
                    return (
                      <div key={poder.id} className={`rounded-xl border p-3 ${quantidade ? 'border-orange-400/25 bg-orange-400/[0.05]' : 'border-white/5 bg-[#121118]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div><strong className="text-sm text-white">{poder.titulo}</strong><p className="mt-1 text-xs text-gray-500">{poder.custo_mana || 0} Mana</p></div>
                          <div className="flex gap-1">
                            {quantidade > 0 && isMestre && <button type="button" onClick={() => removerPoder(classe.id, poder.id)} className="rounded-lg border border-red-500/30 px-2 py-1 text-xs font-bold text-red-300">Remover</button>}
                            <button type="button" disabled={!avaliacao.permitido} title={avaliacao.motivo} onClick={() => adicionarPoder(classe.id, poder.id)} className="rounded-lg border border-[#c7a44c]/30 px-2 py-1 text-xs font-bold text-[#c7a44c] disabled:cursor-not-allowed disabled:opacity-30">Escolher{quantidade ? ` (${quantidade})` : ''}</button>
                          </div>
                        </div>
                        {quantidade > 0 && <p className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300"><Check size={11} /> Escolhido {quantidade > 1 ? `${quantidade} vezes` : ''}</p>}
                        {(poder.pre_requisitos || []).length > 0 && <p className="mt-2 text-[11px] text-amber-300">Requisito: {poder.pre_requisitos?.join('; ')}</p>}
                        <details className="group/detalhe mt-3 rounded-lg border border-white/[0.06] bg-black/20">
                          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 marker:content-none hover:text-white">Ver descrição e efeitos <ChevronDown size={13} className="transition-transform group-open/detalhe:rotate-180" /></summary>
                          <div className="border-t border-white/[0.05] p-3">
                            <p className="text-xs leading-relaxed text-gray-400">{poder.descricao}</p>
                            {resumoFichaTecnica(poder) && <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">{resumoFichaTecnica(poder)}</p>}
                          </div>
                        </details>
                      </div>
                    );
                  })}
                  {!poderesClasse.length && <p className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-gray-500 md:col-span-2">Nenhum poder desta classe corresponde aos filtros.</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Secao>

      <Secao
        titulo="Eventos de classe"
        resumo="Marcos narrativos e mecânicos recebidos automaticamente."
        quantidade={eventos.length}
        icone={<Sparkles size={18} className="text-fuchsia-400" />}
        tourId="progressao-eventos"
        aberta={secoesAbertas.has('eventos')}
        onToggle={() => alternarSecao('eventos')}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {eventosVisiveis.map((item) => <Card key={item.id} titulo={item.titulo} origem={item.origem} detalhe={`Disponível desde o nível ${item.nivel}`} descricao={item.descricao} />)}
          {!eventosVisiveis.length && <p className="text-sm text-gray-500">{termoBusca ? 'Nenhum evento corresponde à busca.' : 'Nenhum evento foi liberado.'}</p>}
        </div>
      </Secao>

      <Secao
        titulo="Legados de Ascensão"
        resumo={`${idsLegados.length}/${vagasLegados} vaga(s) preenchida(s); pesquise por nome, efeito ou requisito.`}
        quantidade={legados.length}
        icone={<Crown size={18} className="text-[#c7a44c]" />}
        tourId="progressao-legados"
        aberta={secoesAbertas.has('legados')}
        onToggle={() => alternarSecao('legados')}
      >
        <div className="mb-5 grid gap-3 lg:grid-cols-2">
          {legados.map((item, indice) => (
            <div key={`${item.id}-${indice}`} className="relative">
              <Card titulo={item.titulo} origem="Legado" descricao={item.descricao} />
              {isMestre && <button type="button" onClick={() => removerLegado(item.id)} className="absolute bottom-3 right-3 text-xs font-bold text-red-300">Remover</button>}
            </div>
          ))}
          {!legados.length && <p className="text-sm text-gray-500">O primeiro Legado é liberado no nível total 5.</p>}
        </div>
        <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input value={buscaLegado} onChange={(event) => setBuscaLegado(event.target.value)} placeholder="Buscar Legado por nome, efeito ou requisito..." className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-[#c7a44c]/50" />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar Legados">
            {([
              ['todos', 'Todos'],
              ['disponiveis', 'Disponíveis'],
              ['selecionados', 'Escolhidos'],
            ] as const).map(([valor, rotulo]) => (
              <button key={valor} type="button" onClick={() => setFiltroLegado(valor)} aria-pressed={filtroLegado === valor} className={`rounded-lg border px-3 py-2 text-[10px] font-bold transition-colors ${filtroLegado === valor ? 'border-[#c7a44c]/35 bg-[#c7a44c]/10 text-[#e1c76f]' : 'border-white/[0.07] text-gray-500 hover:text-white'}`}>{rotulo}</button>
            ))}
          </div>
        </div>
        <div className="grid max-h-[32rem] gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
          {legadosVisiveis.map((legado) => {
            const avaliacao = avaliarLegado(legado, ficha, idsLegados);
            const preRequisitos = descreverPreRequisitos(legado.pre_requisitos);
            const selecionado = idsLegados.includes(legado.id);
            return (
              <div key={legado.id} className={`rounded-xl border p-3 ${selecionado ? 'border-[#c7a44c]/30 bg-[#c7a44c]/[0.06]' : 'border-white/5 bg-[#121118]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm text-white">{legado.titulo}</strong>
                  {selecionado ? (
                    <span className="flex items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.07] px-2 py-1 text-[10px] font-bold text-emerald-200"><Check size={11} /> Escolhido</span>
                  ) : (
                    <button type="button" disabled={!avaliacao.permitido} title={avaliacao.motivo} onClick={() => adicionarLegado(legado.id)} className="flex items-center gap-1 rounded-lg border border-[#c7a44c]/30 px-2 py-1 text-xs font-bold text-[#c7a44c] disabled:cursor-not-allowed disabled:opacity-30">
                      {!avaliacao.permitido && <LockKeyhole size={11} />} Escolher
                    </button>
                  )}
                </div>
                {!avaliacao.permitido && avaliacao.motivo !== 'Todas as vagas de Legado já foram preenchidas.' && <p className="mt-2 text-[11px] text-amber-300">{avaliacao.motivo}</p>}
                <details className="group/detalhe mt-3 rounded-lg border border-white/[0.06] bg-black/20">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 marker:content-none hover:text-white">Ver descrição e requisitos <ChevronDown size={13} className="transition-transform group-open/detalhe:rotate-180" /></summary>
                  <div className="border-t border-white/[0.05] p-3">
                    <p className="text-xs leading-relaxed text-gray-400">{legado.descricao}</p>
                    {!!preRequisitos.length && <p className="mt-2 text-[11px] text-gray-500"><span className="font-bold uppercase tracking-wider">Pré-requisitos:</span> {preRequisitos.join(', ')}</p>}
                  </div>
                </details>
              </div>
            );
          })}
          {!legadosVisiveis.length && <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-gray-500 lg:col-span-2">Nenhum Legado corresponde à busca e aos filtros atuais.</p>}
        </div>
      </Secao>
    </div>
  );
};
