import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Crown, Eye, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  livroDaVerdadeApi,
  paginaEstaRetida,
  type ILivroDaVerdade,
  type IPaginaAberta,
  type IPaginaDeLendaEmPe,
  type IPaginaRetida,
} from '../../services/livroDaVerdadeApi';
import { CarimboRetido, RasuraTexto, RasuraTitulo } from '../../components/ui/Rasura';
import { confirmar } from '../../components/avisos/confirmacao';

const botao = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-200 transition hover:bg-white/10 hover:text-white disabled:opacity-40';

const dataCurta = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : null);

const PaginaAbertaCartao = ({ pagina, gestor, ocupado, onDesfazer }: { pagina: IPaginaAberta; gestor: boolean; ocupado: boolean; onDesfazer: () => void }) => {
  const quando = dataCurta(pagina.caiu_em);
  return (
    <article className="flex flex-col rounded-2xl border border-[#c7a44c]/30 bg-[#12100a] p-5 shadow-[0_0_30px_rgba(199,164,76,0.06)]" data-testid="pagina-aberta">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e3c363]"><Crown size={12} aria-hidden="true" /> Lenda caída</p>
      <h2 className="mt-1 text-xl font-bold leading-tight text-white" style={{ fontFamily: 'Cinzel, serif' }}>{pagina.nome}</h2>
      <p className="text-sm italic text-[#e3c363]/80">{pagina.epiteto}</p>
      <div className="mt-3 space-y-2.5 text-sm leading-6 text-white/75">
        {pagina.verdade.map((paragrafo) => <p key={paragrafo}>{paragrafo}</p>)}
      </div>
      <div className="mt-4 rounded-xl border border-[#c7a44c]/25 bg-[#c7a44c]/[0.06] p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e3c363]">O que mudou no mundo</p>
        <p className="mt-1 text-sm leading-6 text-white/85">{pagina.consequencia}</p>
        {pagina.efeitos.length ? (
          <ul className="mt-2.5 space-y-1.5 border-t border-[#c7a44c]/20 pt-2.5" aria-label="Efeitos em jogo">
            {pagina.efeitos.map((efeito) => <li key={efeito} className="text-[13px] leading-5 text-[#f0d685]/90">{efeito}</li>)}
          </ul>
        ) : null}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-white/40">
        {quando ? `Caiu em ${quando}` : 'Caiu'}{pagina.sessao ? ` · ${pagina.sessao}` : ''}
        {pagina.por.length ? ` · Estavam lá: ${pagina.por.join(', ')}` : ''}
      </p>
      {gestor ? (
        <button type="button" onClick={onDesfazer} disabled={ocupado} className={`${botao} mt-3 self-start`}>
          <RotateCcw size={13} aria-hidden="true" /> Desfazer a queda
        </button>
      ) : null}
    </article>
  );
};

const PaginaRetidaCartao = ({ pagina }: { pagina: IPaginaRetida }) => (
  <article className="relative flex flex-col rounded-2xl border border-white/[0.07] bg-[#0b0a10] p-5" data-testid="pagina-retida">
    <RasuraTitulo semente={pagina.id} className="text-xl" />
    <div className="mt-4"><RasuraTexto semente={pagina.id} linhas={4} /></div>
    <div className="mt-4 flex justify-end"><CarimboRetido texto="Página retida" /></div>
  </article>
);

const PaginaDoMestreCartao = ({ pagina, ocupado, onMarcar }: { pagina: IPaginaDeLendaEmPe; ocupado: boolean; onMarcar: () => void }) => (
  <article className="flex flex-col rounded-2xl border border-white/[0.07] bg-[#0b0a10] p-5" data-testid="pagina-em-pe">
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">De pé · VD {pagina.vd}</p>
    <h2 className="mt-1 text-lg font-bold leading-tight text-white/80" style={{ fontFamily: 'Cinzel, serif' }}>{pagina.nome}</h2>
    <p className="text-sm italic text-white/45">{pagina.epiteto}</p>
    <details className="mt-3 text-sm leading-6 text-white/55">
      <summary className="cursor-pointer text-xs font-bold text-white/60 hover:text-white">Ler a página que abre quando ela cair (só você vê)</summary>
      <div className="mt-2 space-y-2">
        {pagina.verdade.map((paragrafo) => <p key={paragrafo}>{paragrafo}</p>)}
        <p className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-white/75">{pagina.consequencia}</p>
        {pagina.efeitos.length ? <ul className="list-disc space-y-1 pl-5 text-white/65">{pagina.efeitos.map((efeito) => <li key={efeito}>{efeito}</li>)}</ul> : null}
      </div>
    </details>
    <button type="button" onClick={onMarcar} disabled={ocupado} className={`${botao} mt-3 self-start`}>
      <Eye size={13} aria-hidden="true" /> Marcar como caída
    </button>
  </article>
);

export default function LivroDaVerdadePage() {
  const navigate = useNavigate();
  const campanhaId = useAuthStore((estado) => estado.campanhaAtiva?.id);
  const papel = useAuthStore((estado) => estado.campanhaAtiva?.papel);
  const [livro, setLivro] = useState<ILivroDaVerdade | null>(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

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

  if (!campanhaId) {
    return <main className="app-page mx-auto max-w-3xl text-center text-gray-400"><p>Escolha uma campanha para abrir o Livro da Verdade.</p></main>;
  }

  return (
    <main className="app-page mx-auto w-full max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => navigate('/mundo')} className={botao}><ArrowLeft size={14} aria-hidden="true" /> Mundo</button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-yellow-500 sm:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}><BookOpen size={26} aria-hidden="true" /> Livro da Verdade</h1>
          <p className="mt-1 text-sm text-white/55">O que o Jardim confessa quando uma lenda cai. Cada página só abre depois da queda.</p>
        </div>
        {livro ? (
          <span className="rounded-full border border-[#c7a44c]/25 bg-[#c7a44c]/10 px-3 py-1 font-mono text-xs font-bold text-[#e3c363]" data-testid="contagem-do-livro">
            {livro.caidas} de {livro.total} páginas abertas
          </span>
        ) : null}
      </div>

      {livro?.gestor ? (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-white/55">
          Você vê todas as páginas. A mesa só vê as das lendas que já caíram, e no lugar das outras vai uma página rasurada. A queda é registrada sozinha quando a lenda chega a 0 de Vida na Sessão; se ela caiu fora da mesa virtual, marque aqui.
        </p>
      ) : null}
      {erro ? <p className="mb-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-xs text-amber-100" role="alert">{erro}</p> : null}
      {!livro && !erro ? <p className="text-sm text-white/45" role="status">Abrindo o livro...</p> : null}
      {livro && livro.entradas.length === 0 ? <p className="text-sm text-white/45">O livro ainda não tem páginas.</p> : null}

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {livro?.entradas.map((pagina) => {
          if (paginaEstaRetida(pagina)) return <PaginaRetidaCartao key={pagina.id} pagina={pagina} />;
          if (pagina.caida) {
            return (
              <PaginaAbertaCartao
                key={pagina.id}
                pagina={pagina}
                gestor={ehMestre}
                ocupado={ocupado}
                onDesfazer={async () => {
                  if (await confirmar({ titulo: 'Desfazer a queda', mensagem: `Desfazer a queda de ${pagina.nome}? A página fecha, o marco some do calendário e o selo sai de quem o ganhou. A manchete já publicada no Discord continua lá.`, rotuloConfirmar: 'Desfazer a queda', tom: 'perigo' })) {
                    void agir(() => livroDaVerdadeApi.desfazerQueda(campanhaId, pagina.id));
                  }
                }}
              />
            );
          }
          return (
            <PaginaDoMestreCartao
              key={pagina.id}
              pagina={pagina}
              ocupado={ocupado || !ehMestre}
              onMarcar={async () => {
                if (await confirmar({ titulo: 'Marcar a queda', mensagem: `Marcar ${pagina.nome} como caída? A página abre para a mesa, a consequência entra no calendário e o grupo ganha o selo.`, rotuloConfirmar: 'Marcar como caída' })) {
                  void agir(() => livroDaVerdadeApi.marcarQueda(campanhaId, pagina.id));
                }
              }}
            />
          );
        })}
      </div>
    </main>
  );
}
