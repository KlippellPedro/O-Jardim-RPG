import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarDays, Crown, Eye, Megaphone, RotateCcw, ShoppingBag, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  livroDaVerdadeApi,
  paginaEstaRetida,
  type ILivroDaVerdade,
  type IPaginaAberta,
  type IPaginaDeLendaEmPe,
  type IPaginaRetida,
  type PaginaDoLivro,
} from '../../services/livroDaVerdadeApi';
import { CarimboRetido, RasuraTexto, RasuraTitulo } from '../../components/ui/Rasura';
import { confirmar } from '../../components/avisos/confirmacao';

const botao = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-200 transition hover:bg-white/10 hover:text-white disabled:opacity-40';
const cinzel = { fontFamily: 'Cinzel, serif' };

const dataCurta = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : null);

const Secao = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <section className="mt-6">
    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e3c363]">{titulo}</h3>
    <div className="mt-2">{children}</div>
  </section>
);

const ListaDoQueAcontece = ({ fatos }: { fatos: string[] }) => (
  <ul className="space-y-2">
    {fatos.map((fato) => (
      <li key={fato} className="flex gap-2.5 text-sm leading-6 text-white/85">
        <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c7a44c]" aria-hidden="true" />
        <span>{fato}</span>
      </li>
    ))}
  </ul>
);

const EfeitosNoSite = ({ efeitos }: { efeitos: string[] }) => (
  efeitos.length ? (
    <Secao titulo="No site">
      <ul className="space-y-2">
        {efeitos.map((efeito) => (
          <li key={efeito} className="flex gap-2.5 rounded-xl border border-[#c7a44c]/25 bg-[#c7a44c]/[0.06] p-3 text-[13px] leading-5 text-[#f0d685]/90">
            <ShoppingBag size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{efeito}</span>
          </li>
        ))}
      </ul>
    </Secao>
  ) : null
);

const Registro = ({ paragrafos }: { paragrafos: string[] }) => (
  <div className="space-y-3 border-l-2 border-[#c7a44c]/30 pl-4 text-[15px] leading-7 text-white/80" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
    {paragrafos.map((paragrafo) => <p key={paragrafo}>{paragrafo}</p>)}
  </div>
);

const Cabecalho = ({ selo, nome, epiteto }: { selo: ReactNode; nome: string; epiteto: string }) => (
  <header>
    <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">{selo}</p>
    <h2 className="mt-1.5 text-2xl font-bold leading-tight text-white sm:text-3xl" style={cinzel}>{nome}</h2>
    <p className="text-sm italic text-[#e3c363]/80">{epiteto}</p>
  </header>
);

const PaginaAberta = ({ pagina, gestor, ocupado, onDesfazer }: { pagina: IPaginaAberta; gestor: boolean; ocupado: boolean; onDesfazer: () => void }) => {
  const quando = dataCurta(pagina.caiu_em);
  return (
    <article data-testid="pagina-aberta">
      <Cabecalho
        nome={pagina.nome}
        epiteto={pagina.epiteto}
        selo={<><Crown size={12} className="text-[#e3c363]" aria-hidden="true" /><span className="text-[#e3c363]">Caiu</span>{quando ? <span>· {quando}</span> : null}{pagina.sessao ? <span>· {pagina.sessao}</span> : null}</>}
      />
      <Secao titulo="Registro do cronista"><Registro paragrafos={pagina.verdade} /></Secao>
      <Secao titulo="O que muda no mundo"><ListaDoQueAcontece fatos={pagina.acontece} /></Secao>
      <EfeitosNoSite efeitos={pagina.efeitos} />
      {pagina.por.length ? <p className="mt-6 text-xs leading-5 text-white/50">Estavam lá: {pagina.por.join(', ')}.</p> : null}
      {gestor ? (
        <button type="button" onClick={onDesfazer} disabled={ocupado} className={`${botao} mt-5`}>
          <RotateCcw size={13} aria-hidden="true" /> Desfazer a queda
        </button>
      ) : null}
    </article>
  );
};

const PaginaDeLendaEmPe = ({ pagina, ocupado, onMarcar }: { pagina: IPaginaDeLendaEmPe; ocupado: boolean; onMarcar: () => void }) => (
  <article data-testid="pagina-em-pe">
    <Cabecalho nome={pagina.nome} epiteto={pagina.epiteto} selo={<><span>De pé</span><span>· VD {pagina.vd}</span><span>· só você vê esta página</span></>} />
    <Secao titulo="O que muda quando cair"><ListaDoQueAcontece fatos={pagina.acontece} /></Secao>
    <EfeitosNoSite efeitos={pagina.efeitos} />
    <Secao titulo="O registro que a mesa vai ler"><Registro paragrafos={pagina.verdade} /></Secao>
    <Secao titulo="O que sai sozinho na queda">
      <ul className="space-y-2.5 text-[13px] leading-5 text-white/70">
        <li className="flex gap-2.5"><Megaphone size={14} className="mt-0.5 shrink-0 text-white/45" aria-hidden="true" /><span>Manchete no Discord: <strong className="font-semibold text-white/90">{pagina.manchete}</strong> Logo abaixo vai a lista do que acontece e quem estava na cena.</span></li>
        <li className="flex gap-2.5"><CalendarDays size={14} className="mt-0.5 shrink-0 text-white/45" aria-hidden="true" /><span>Calendário: "A queda de {pagina.nome}" entra aberto no dia de hoje do mundo.</span></li>
        <li className="flex gap-2.5"><Sparkles size={14} className="mt-0.5 shrink-0 text-white/45" aria-hidden="true" /><span>Selo secreto <strong className="font-semibold text-white/90">{pagina.selo}</strong> para cada personagem de jogador que estiver na cena.</span></li>
      </ul>
    </Secao>
    <button type="button" onClick={onMarcar} disabled={ocupado} className={`${botao} mt-6`}>
      <Eye size={13} aria-hidden="true" /> Marcar como caída
    </button>
  </article>
);

const PaginaRetida = ({ pagina }: { pagina: IPaginaRetida }) => (
  <article data-testid="pagina-retida">
    <RasuraTitulo semente={pagina.id} className="text-2xl" />
    <div className="mt-6"><RasuraTexto semente={pagina.id} linhas={5} /></div>
    <div className="mt-5"><RasuraTexto semente={`${pagina.id}:2`} linhas={3} /></div>
    <p className="mt-6 text-xs leading-5 text-white/45">Esta página só abre quando a lenda dela cair.</p>
    <div className="mt-3 flex justify-end"><CarimboRetido texto="Página retida" /></div>
  </article>
);

const ItemDoSumario = ({ pagina, ativa, numero, onEscolher }: { pagina: PaginaDoLivro; ativa: boolean; numero: number; onEscolher: () => void }) => {
  const base = `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${ativa ? 'bg-[#c7a44c]/15 text-white' : 'text-white/65 hover:bg-white/[0.05] hover:text-white'}`;
  if (paginaEstaRetida(pagina)) {
    return (
      <button type="button" onClick={onEscolher} className={base} aria-current={ativa ? 'page' : undefined} aria-label={`Página ${numero}, retida`}>
        <span className="w-5 shrink-0 font-mono text-[10px] text-white/30">{numero}</span>
        <span className="min-w-0 flex-1"><RasuraTitulo semente={pagina.id} className="text-sm" /></span>
      </button>
    );
  }
  return (
    <button type="button" onClick={onEscolher} className={base} aria-current={ativa ? 'page' : undefined}>
      <span className="w-5 shrink-0 font-mono text-[10px] text-white/30">{numero}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={cinzel}>{pagina.nome}</span>
      {pagina.caida
        ? <Crown size={12} className="shrink-0 text-[#e3c363]" aria-label="caiu" />
        : <span className="shrink-0 font-mono text-[10px] text-white/35">VD {pagina.vd}</span>}
    </button>
  );
};

export default function LivroDaVerdadePage() {
  const navigate = useNavigate();
  const campanhaId = useAuthStore((estado) => estado.campanhaAtiva?.id);
  const papel = useAuthStore((estado) => estado.campanhaAtiva?.papel);
  const [livro, setLivro] = useState<ILivroDaVerdade | null>(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const folha = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    if (!campanhaId) return;
    try {
      setLivro(await livroDaVerdadeApi.obter(campanhaId));
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir o Livro da Verdade.');
    }
  }, [campanhaId]);

  useEffect(() => { void carregar(); }, [carregar]);

  const agir = async (acao: () => Promise<ILivroDaVerdade>) => {
    setOcupado(true);
    setErro('');
    try {
      setLivro(await acao());
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível concluir.');
    } finally {
      setOcupado(false);
    }
  };

  const ehMestre = papel === 'mestre';
  const entradas = livro?.entradas ?? [];
  // Sem escolha, abre na página mais recente que caiu; se nenhuma caiu, na primeira do livro.
  const pagina = useMemo(() => {
    const achada = entradas.find((item) => item.id === escolhida);
    if (achada) return achada;
    const caidas = entradas.filter((item) => item.caida);
    return caidas[caidas.length - 1] ?? entradas[0] ?? null;
  }, [entradas, escolhida]);

  const escolher = (id: string) => {
    setEscolhida(id);
    // No celular o sumário fica em cima; leva a pessoa até a página escolhida.
    if (window.matchMedia('(max-width: 1023px)').matches) folha.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!campanhaId) {
    return <main className="app-page mx-auto max-w-3xl text-center text-gray-400"><p>Escolha uma campanha para abrir o Livro da Verdade.</p></main>;
  }

  return (
    <main className="app-page mx-auto w-full max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => navigate('/mundo')} className={botao}><ArrowLeft size={14} aria-hidden="true" /> Mundo</button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-yellow-500 sm:text-3xl" style={cinzel}><BookOpen size={26} aria-hidden="true" /> Livro da Verdade</h1>
          <p className="mt-1 text-sm text-white/55">O registro do que mudou no mundo depois que cada lenda caiu.</p>
        </div>
        {livro ? (
          <span className="rounded-full border border-[#c7a44c]/25 bg-[#c7a44c]/10 px-3 py-1 font-mono text-xs font-bold text-[#e3c363]" data-testid="contagem-do-livro">
            {livro.caidas} de {livro.total} páginas abertas
          </span>
        ) : null}
      </div>

      {livro?.gestor ? (
        <details className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-white/60">
          <summary className="cursor-pointer font-bold text-white/75 hover:text-white">Como o livro funciona</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>A mesa só lê as páginas das lendas que já caíram. As outras aparecem rasuradas, sem nome.</li>
            <li>Quando uma lenda chega a 0 de Vida na Sessão, a queda é registrada sozinha. Se ela caiu fora da mesa virtual, abra a página dela e marque à mão.</li>
            <li>Na primeira queda, o site abre a página para todos, põe a queda no calendário, aplica o que estiver em "No site", manda a manchete para o Discord e dá o selo a quem estava na cena.</li>
            <li>Desfazer a queda fecha a página, tira o marco e os efeitos do calendário e o selo de quem ganhou. A manchete publicada fica no Discord.</li>
          </ul>
        </details>
      ) : null}
      {erro ? <p className="mb-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-xs text-amber-100" role="alert">{erro}</p> : null}
      {!livro && !erro ? <p className="text-sm text-white/45" role="status">Abrindo o livro...</p> : null}
      {livro && entradas.length === 0 ? <p className="text-sm text-white/45">O livro ainda não tem páginas.</p> : null}

      {livro && pagina ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <nav aria-label="Sumário do Livro da Verdade" className="rounded-2xl border border-white/[0.07] bg-[#0b0a10] p-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
            <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Sumário</p>
            <div className="max-h-72 space-y-0.5 overflow-y-auto lg:max-h-none">
              {entradas.map((item, indice) => (
                <ItemDoSumario key={item.id} pagina={item} numero={indice + 1} ativa={item.id === pagina.id} onEscolher={() => escolher(item.id)} />
              ))}
            </div>
          </nav>

          <div ref={folha} className="scroll-mt-20 rounded-2xl border border-[#c7a44c]/20 bg-[#100e0a] p-5 shadow-[0_0_40px_rgba(199,164,76,0.05)] sm:p-8">
            {paginaEstaRetida(pagina) ? <PaginaRetida pagina={pagina} /> : pagina.caida ? (
              <PaginaAberta
                pagina={pagina}
                gestor={ehMestre}
                ocupado={ocupado}
                onDesfazer={async () => {
                  if (await confirmar({ titulo: 'Desfazer a queda', mensagem: `Desfazer a queda de ${pagina.nome}? A página fecha, o marco e os efeitos saem do calendário e o selo sai de quem o ganhou. A manchete já publicada no Discord continua lá.`, rotuloConfirmar: 'Desfazer a queda', tom: 'perigo' })) {
                    void agir(() => livroDaVerdadeApi.desfazerQueda(campanhaId, pagina.id));
                  }
                }}
              />
            ) : (
              <PaginaDeLendaEmPe
                pagina={pagina}
                ocupado={ocupado || !ehMestre}
                onMarcar={async () => {
                  if (await confirmar({ titulo: 'Marcar a queda', mensagem: `Marcar ${pagina.nome} como caída? A página abre para a mesa, a queda entra no calendário, a manchete vai para o Discord e o grupo ganha o selo.`, rotuloConfirmar: 'Marcar como caída' })) {
                    void agir(() => livroDaVerdadeApi.marcarQueda(campanhaId, pagina.id));
                  }
                }}
              />
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
