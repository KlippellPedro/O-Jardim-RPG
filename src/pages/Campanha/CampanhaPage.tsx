import { useCallback, useEffect, useId, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, CalendarClock, CalendarDays, Car, ChevronRight, Copy, Crown, Dices, Eye, Flame, Globe, History, Hourglass,
  Palette, ScrollText, Shield, ShoppingBag, Sparkles, Swords, Trophy, Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { campanhasApi } from '../../services/campanhasApi';
import { campanhaPainelApi, type IEpilogo, type IMembroDoPainel, type IPainelCampanha } from '../../services/campanhaPainelApi';
import { calendarioMundoApi, type ICalendarioMundo } from '../../services/calendarioMundoApi';
import { engajamentoApi, type ICalendario } from '../../services/engajamentoApi';
import { CarimboRetido, RasuraTitulo } from '../../components/ui/Rasura';
import { ResumoSessaoModal } from '../Sessao/components/ResumoSessaoModal';
import { COR_DA_ESTACAO, textoEmDias } from '../Mundo/calendarioMundo';
import { corLegivel } from '../Ficha/Wizard/corLegivel';
import { CORES_DO_RANK, ICONES_DO_RANK } from '../Quadro/titulosDoRank';
import { IdentidadeModal } from './IdentidadeModal';
import { EpilogoModal } from './EpilogoModal';
import { SeletorDeCampanha } from './SeletorDeCampanha';
import { CronicaCampanha } from './CronicaCampanha';
import {
  ROTULO_PAPEL, corDaCampanha, folhaDaSessao, horasDeHistoria, inicialDaCampanha, presencaDe, textoDeDuracao, textoDeVisita, urlDaCapa,
} from './campanha';
import { confirmar } from '../../components/avisos/confirmacao';
import './campanha.css';

const PORTAIS: Array<{ rotulo: string; dica: string; caminho: string; icone: LucideIcon; cor: string }> = [
  { rotulo: 'Ficha', dica: 'Seu personagem', caminho: '/ficha', icone: Shield, cor: '#e9c46a' },
  { rotulo: 'Sessão', dica: 'A mesa ao vivo', caminho: '/sessao', icone: Swords, cor: '#f87171' },
  { rotulo: 'Quadro', dica: 'Mural, rank e agenda', caminho: '/quadro', icone: ScrollText, cor: '#f2a65a' },
  { rotulo: 'Mundo', dica: 'Lore e Árvores', caminho: '/mundo', icone: Globe, cor: '#5fc9b3' },
  { rotulo: 'Loja', dica: 'Comprar e vender', caminho: '/loja', icone: ShoppingBag, cor: '#fbbf24' },
  { rotulo: 'Livro', dica: 'Regras do jogo', caminho: '/regras', icone: BookOpen, cor: '#a78bfa' },
  { rotulo: 'Frota', dica: 'Veículos do grupo', caminho: '/frota', icone: Car, cor: '#7dd3fc' },
];

const ORDEM_DO_PAPEL: Record<string, number> = { mestre: 0, assistente: 1, jogador: 2, observador: 3 };
const ICONE_DO_PAPEL: Record<string, LucideIcon> = { mestre: Crown, assistente: Sparkles, jogador: Shield, observador: Eye };
const numero = (valor: number) => valor.toLocaleString('pt-BR');

/** O brasão da campanha: um escudo na cor dela com a inicial do nome. */
const Brasao = ({ inicial }: { inicial: string }) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="cp-brasao" viewBox="0 0 64 76" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-fundo`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--cp-acento) 85%, white)' }} />
          <stop offset="1" style={{ stopColor: 'color-mix(in srgb, var(--cp-acento) 45%, #07060a)' }} />
        </linearGradient>
      </defs>
      <path d="M32 2 L61 11 V36 C61 54 48 66 32 74 C16 66 3 54 3 36 V11 Z" fill={`url(#${id}-fundo)`} stroke="rgba(0,0,0,.45)" strokeWidth="1.5" />
      <path d="M32 7.5 L56 15 V36 C56 51 45.5 61 32 68 C18.5 61 8 51 8 36 V15 Z" fill="none" stroke="rgba(255,250,240,.45)" strokeWidth="1.2" />
      <text x="32" y="47" textAnchor="middle" fontSize={inicial.length > 1 ? 22 : 30}>{inicial}</text>
    </svg>
  );
};

const Membro = ({ membro }: { membro: IMembroDoPainel }) => {
  const mestre = membro.papel === 'mestre';
  const Icone = ICONE_DO_PAPEL[membro.papel] ?? Shield;
  const presenca = presencaDe(membro.visto_em);
  return (
    <li className={`cp-membro ${mestre ? 'cp-membro--mestre' : ''}`}>
      <span className="cp-retrato" aria-hidden="true">
        {mestre ? <Crown size={17} /> : membro.nome.slice(0, 1).toUpperCase()}
        <span className={`cp-presenca cp-presenca--${presenca}`} />
      </span>
      <span className="cp-membro__texto">
        <span className="cp-membro__nome">
          <strong>{membro.nome}</strong>
          <small><Icone size={9} className="mr-1 inline" aria-hidden="true" />{ROTULO_PAPEL[membro.papel] ?? membro.papel}</small>
        </span>
        {membro.personagem ? (
          <span className="cp-membro__personagem">{membro.personagem.nome}</span>
        ) : membro.papel === 'jogador' ? (
          <span className="cp-membro__personagem"><em>sem personagem escolhido</em></span>
        ) : null}
        <span className="cp-membro__visto">{textoDeVisita(membro.visto_em)}</span>
      </span>
      {membro.personagem?.nivel ? <span className="cp-nivel" title="Nível do personagem">Nv {membro.personagem.nivel}</span> : null}
    </li>
  );
};

/** A página da campanha: o que é dela (mundo, sessão, quem joga, o que já aconteceu). */
export default function CampanhaPage() {
  const navigate = useNavigate();
  const campanhaAtiva = useAuthStore((estado) => estado.campanhaAtiva);
  const initContexto = useAuthStore((estado) => estado.initContexto);
  const campanhaId = campanhaAtiva?.id;
  const [painel, setPainel] = useState<IPainelCampanha | null>(null);
  const [mundo, setMundo] = useState<ICalendarioMundo | null>(null);
  const [agenda, setAgenda] = useState<ICalendario | null>(null);
  const [numeros, setNumeros] = useState<IEpilogo | null>(null);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(false);
  const [epilogo, setEpilogo] = useState(false);
  const [resumoId, setResumoId] = useState<string | null>(null);
  const [duplicando, setDuplicando] = useState(false);
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    if (!campanhaId) return;
    setErro('');
    try {
      setPainel(await campanhaPainelApi.painel(campanhaId));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir a campanha.');
    }
    // O resto vem dos próprios módulos; se algum falhar, a parte dele só some.
    calendarioMundoApi.obter(campanhaId).then(setMundo).catch(() => setMundo(null));
    engajamentoApi.calendario(campanhaId).then(setAgenda).catch(() => setAgenda(null));
    campanhaPainelApi.epilogo(campanhaId).then(setNumeros).catch(() => setNumeros(null));
  }, [campanhaId]);

  useEffect(() => { setPainel(null); setNumeros(null); void carregar(); }, [carregar]);

  const duplicar = async () => {
    if (!campanhaId || duplicando) return;
    if (!(await confirmar({ titulo: 'Duplicar a campanha', mensagem: 'Criar uma cópia desta campanha só com o conteúdo (Mundo, Loja, informações e calendário)? Fichas, jogadores e histórico não vão.', rotuloConfirmar: 'Criar a cópia' }))) return;
    setDuplicando(true);
    setAviso('');
    try {
      const nova = await campanhaPainelApi.duplicar(campanhaId);
      await initContexto();
      setAviso(`Cópia criada: ${nova.nome}. Troque de campanha pelo seletor no topo para abrir.`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível duplicar.');
    } finally {
      setDuplicando(false);
    }
  };

  const encerrar = async () => {
    if (!campanhaId) return;
    await campanhasApi.arquivar(campanhaId);
    await initContexto();
    navigate('/campanhas');
  };

  if (!campanhaId) {
    return <main className="app-page mx-auto max-w-3xl text-center text-gray-400"><p>Escolha uma campanha para abrir a página dela.</p></main>;
  }

  const nome = painel?.campanha.nome ?? campanhaAtiva?.nome ?? '';
  const identidade = painel?.campanha.identidade ?? campanhaAtiva?.identidade ?? null;
  const cor = corLegivel(corDaCampanha(identidade), 0.2).cor;
  const capa = urlDaCapa(campanhaId, identidade);
  const meuPapel = painel?.meu_papel ?? campanhaAtiva?.papel ?? '';
  const IconePapel = ICONE_DO_PAPEL[meuPapel] ?? Shield;
  const proxima = agenda?.proxima && !agenda.proxima.passou ? agenda.proxima : null;
  const folha = folhaDaSessao(proxima?.em);
  const proximoEvento = mundo?.proximos[0] ?? null;
  const corEstacao = mundo ? COR_DA_ESTACAO[mundo.estacao.chave] ?? cor : cor;
  const membros = [...(painel?.membros ?? [])].sort((a, b) => (ORDEM_DO_PAPEL[a.papel] ?? 9) - (ORDEM_DO_PAPEL[b.papel] ?? 9));
  const online = membros.filter((membro) => presencaDe(membro.visto_em) === 'agora').length;
  const destaques = numeros?.titulos.slice(0, 4) ?? [];
  const gestorDeConteudo = painel?.meu_papel === 'mestre' || painel?.meu_papel === 'assistente';

  return (
    <main className="cp-shell app-page mx-auto flex max-w-6xl flex-col" style={{ '--cp-cor': cor } as CSSProperties}>
      <div className="cp-topo"><SeletorDeCampanha /></div>

      <header className="cp-estandarte">
        {capa
          ? <div className="cp-estandarte__fundo cp-estandarte__fundo--capa" style={{ backgroundImage: `url(${capa})` }} aria-hidden="true" />
          : <><div className="cp-estandarte__fundo" aria-hidden="true" /><span className="cp-estandarte__marca" aria-hidden="true">{inicialDaCampanha(nome)}</span></>}
        <div className="cp-estandarte__conteudo">
          <Brasao inicial={inicialDaCampanha(nome)} />
          <div className="cp-estandarte__texto">
            <div className="cp-estandarte__selos">
              <span className="cp-papel"><IconePapel size={11} aria-hidden="true" /> {ROTULO_PAPEL[meuPapel] ?? 'Membro'}</span>
              {painel?.ao_vivo ? (
                <button type="button" onClick={() => navigate('/sessao')} className="cp-ao-vivo">
                  <i aria-hidden="true" /> Sessão ao vivo · entrar
                </button>
              ) : null}
            </div>
            <h1>{nome}</h1>
            {identidade?.frase
              ? <p className="cp-estandarte__frase">“{identidade.frase}”</p>
              : painel?.campanha.descricao ? <p className="cp-estandarte__descricao">{painel.campanha.descricao}</p> : null}
            <div className="cp-estandarte__acoes">
              {gestorDeConteudo ? (
                <>
                  <button type="button" onClick={() => setEditando(true)} className="cp-botao cp-botao--vidro"><Palette size={14} aria-hidden="true" /> Personalizar</button>
                  <button type="button" onClick={() => void duplicar()} disabled={duplicando} className="cp-botao cp-botao--vidro"><Copy size={14} aria-hidden="true" /> {duplicando ? 'Copiando...' : 'Duplicar como modelo'}</button>
                </>
              ) : null}
              <button type="button" onClick={() => setEpilogo(true)} className="cp-botao cp-botao--vidro">
                <History size={14} aria-hidden="true" /> {painel?.gestor ? 'Epílogo e encerramento' : 'Ver a retrospectiva'}
              </button>
            </div>
          </div>
        </div>

        {numeros ? (
          <dl className="cp-numeros" aria-label="A campanha em números">
            <div><dt>{numeros.sessoes === 1 ? 'Noite jogada' : 'Noites jogadas'}</dt><dd><CalendarDays size={17} aria-hidden="true" />{numero(numeros.sessoes)}</dd></div>
            <div><dt>De história</dt><dd><Hourglass size={17} aria-hidden="true" />{horasDeHistoria(numeros.minutos)}</dd></div>
            <div><dt>Dados rolados</dt><dd><Dices size={17} aria-hidden="true" />{numero(numeros.rolagens)}</dd></div>
            <div><dt>20 naturais</dt><dd><Flame size={17} aria-hidden="true" />{numero(numeros.criticos)}</dd></div>
          </dl>
        ) : null}
      </header>

      {aviso ? <p role="status" className="cp-aviso">{aviso}</p> : null}
      {erro ? <p role="alert" className="cp-erro">{erro}</p> : null}

      <nav className="cp-portais" aria-label="Atalhos da campanha">
        {PORTAIS.map(({ rotulo, dica, caminho, icone: Icone, cor: corDoPortal }) => (
          <button key={caminho} type="button" onClick={() => navigate(caminho)} className="cp-portal" style={{ '--portal-cor': corDoPortal } as CSSProperties}>
            <span className="cp-portal__icone"><Icone size={19} aria-hidden="true" /></span>
            <span className="cp-portal__texto"><strong>{rotulo}</strong><small>{dica}</small></span>
          </button>
        ))}
      </nav>

      {!painel && !erro ? <p className="cp-carregando" aria-busy="true">Abrindo a campanha...</p> : null}

      {painel ? (
        <div className="cp-grade">
          <div className="cp-coluna">
            <div className="cp-dupla">
              <section className="cp-cartao cp-sessao" aria-label="Próxima sessão">
                <div className="cp-cartao__cabeca"><h2 className="cp-cartao__titulo"><CalendarClock size={17} aria-hidden="true" /> Próxima sessão</h2></div>
                <div className="cp-sessao__corpo">
                  <div className={`cp-folha ${folha ? '' : 'cp-folha--vazia'}`} aria-hidden="true">
                    <span className="cp-folha__mes">{folha?.mes ?? '---'}</span>
                    <span className="cp-folha__dia">{folha?.dia ?? '?'}</span>
                    <span className="cp-folha__semana">{folha?.semana ?? 'sem data'}</span>
                  </div>
                  {proxima && folha ? (
                    <div className="cp-sessao__texto">
                      <span className="cp-sessao__quando">{proxima.texto}</span>
                      <span className="cp-sessao__detalhe">{folha.semana}, às <b>{folha.hora}</b></span>
                      {proxima.titulo ? <span className="cp-sessao__detalhe">{proxima.titulo}</span> : null}
                    </div>
                  ) : (
                    <div className="cp-sessao__texto">
                      <span className="cp-sessao__quando">Ainda sem data</span>
                      <span className="cp-sessao__detalhe">{painel.gestor ? 'Marque o dia fixo na Agenda do Quadro.' : 'O Mestre avisa quando marcar.'}</span>
                    </div>
                  )}
                </div>
                {proxima?.nota ? <p className="cp-sessao__nota">{proxima.nota}</p> : null}
                {painel.gestor ? (
                  <div className="cp-sessao__pe">
                    <button type="button" onClick={() => navigate('/quadro?aba=agenda')} className="cp-link"><CalendarClock size={14} aria-hidden="true" /> Abrir a Agenda</button>
                  </div>
                ) : null}
              </section>

              <section className="cp-cartao cp-mundo" aria-label="Hoje no mundo" style={{ '--estacao': corEstacao } as CSSProperties}>
                <div className="cp-cartao__cabeca"><h2 className="cp-cartao__titulo"><Globe size={17} aria-hidden="true" /> Hoje no mundo</h2></div>
                {mundo ? (
                  <>
                    <p className="cp-mundo__data">{mundo.hoje_extenso}</p>
                    {mundo.hora_extenso ? <p className="cp-mundo__hora">{mundo.hora_extenso}</p> : null}
                    <span className="cp-estacao"><i aria-hidden="true" /> {mundo.estacao.rotulo}</span>
                    <p className="cp-mundo__descricao">{mundo.estacao.descricao}</p>
                    {proximoEvento ? (
                      <div className="cp-evento">
                        <span className="cp-evento__quando">{textoEmDias(proximoEvento.em_dias)}</span>
                        {proximoEvento.rasurado
                          ? <span className="min-w-0"><RasuraTitulo semente={proximoEvento.id} className="text-sm" /><span className="mt-1 block"><CarimboRetido texto="Algo se aproxima" /></span></span>
                          : <span className="cp-evento__titulo">{proximoEvento.titulo}</span>}
                      </div>
                    ) : null}
                    <div className="cp-mundo__pe">
                      <button type="button" onClick={() => navigate('/mundo/calendario')} className="cp-link"><CalendarDays size={14} aria-hidden="true" /> Calendário e estações</button>
                    </div>
                  </>
                ) : <p className="cp-vazio">O Mestre ainda não abriu o calendário do mundo.</p>}
              </section>
            </div>

            <section className="cp-cartao" aria-label="Anteriormente">
              <div className="cp-cartao__cabeca"><h2 className="cp-cartao__titulo"><History size={17} aria-hidden="true" /> Anteriormente...</h2></div>
              {painel.anteriormente.length === 0 ? <p className="cp-vazio">A primeira noite ainda vai acontecer. Quando uma sessão terminar, ela entra aqui com o resumo.</p> : (
                <ol className="cp-linha">
                  {painel.anteriormente.map((sessao, indice) => (
                    <li key={sessao.sessao_id} className="cp-marco">
                      <button type="button" onClick={() => setResumoId(sessao.sessao_id)} className="cp-marco__botao">
                        <span className="cp-marco__texto">
                          <span className="cp-marco__data">
                            {indice === 0 ? 'Última sessão · ' : ''}
                            {sessao.encerrada_em ? new Date(sessao.encerrada_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) : 'sem data'}
                          </span>
                          <span className="cp-marco__titulo">{sessao.titulo}</span>
                          <span className="cp-marco__chips">
                            {sessao.duracao_min ? <span className="cp-chip"><Hourglass size={11} aria-hidden="true" /> {textoDeDuracao(sessao.duracao_min)}</span> : null}
                            <span className="cp-chip"><Dices size={11} aria-hidden="true" /> {numero(sessao.rolagens)} rolagens</span>
                            {sessao.criticos ? <span className="cp-chip cp-chip--critico"><Flame size={11} aria-hidden="true" /> {sessao.criticos}× 20 natural</span> : null}
                          </span>
                        </span>
                        <span className="cp-marco__ler">Ler resumo <ChevronRight size={14} aria-hidden="true" /></span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <CronicaCampanha campanhaId={campanhaId} />
          </div>

          <aside className="cp-coluna">
            <section className="cp-cartao" aria-label="A mesa">
              <div className="cp-cartao__cabeca">
                <h2 className="cp-cartao__titulo"><Users size={17} aria-hidden="true" /> A mesa <small>{membros.length} {membros.length === 1 ? 'pessoa' : 'pessoas'}{online ? ` · ${online} por aqui` : ''}</small></h2>
              </div>
              <ul className="cp-membros">
                {membros.map((membro) => <Membro key={membro.usuario_id} membro={membro} />)}
              </ul>
            </section>

            {numeros && (numeros.mvp || destaques.length) ? (
              <section className="cp-cartao" aria-label="Destaques da campanha">
                <div className="cp-cartao__cabeca">
                  <h2 className="cp-cartao__titulo"><Trophy size={17} aria-hidden="true" /> Destaques</h2>
                  <button type="button" onClick={() => navigate('/quadro?aba=rank')} className="cp-link">Ver o Rank <ChevronRight size={13} aria-hidden="true" /></button>
                </div>
                <ul className="cp-destaques">
                  {numeros.mvp ? (
                    <li className="cp-destaque" style={{ '--cor': '#e9c46a' } as CSSProperties}>
                      <span className="cp-destaque__icone" aria-hidden="true"><Crown size={15} /></span>
                      <span className="cp-destaque__texto"><small>Mais vezes MVP</small><strong>{numeros.mvp.nome}</strong><span>{numeros.mvp.votos} {numeros.mvp.votos === 1 ? 'voto' : 'votos'} da mesa</span></span>
                    </li>
                  ) : null}
                  {destaques.map((titulo) => {
                    const Icone = ICONES_DO_RANK[titulo.chave] ?? Trophy;
                    return (
                      <li key={titulo.chave} className="cp-destaque" style={{ '--cor': CORES_DO_RANK[titulo.chave] ?? cor } as CSSProperties}>
                        <span className="cp-destaque__icone" aria-hidden="true"><Icone size={15} /></span>
                        <span className="cp-destaque__texto"><small>{titulo.titulo}</small><strong>{titulo.nome}</strong><span>{titulo.frase}</span></span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </aside>
        </div>
      ) : null}

      {editando && painel ? (
        <IdentidadeModal
          campanhaId={campanhaId}
          identidade={painel.campanha.identidade}
          onFechar={() => setEditando(false)}
          onSalvo={(nova) => { setPainel({ ...painel, campanha: { ...painel.campanha, identidade: nova } }); setEditando(false); void initContexto(); }}
        />
      ) : null}
      {epilogo ? (
        <EpilogoModal
          campanhaId={campanhaId}
          campanhaNome={nome}
          cor={cor}
          podeEncerrar={painel?.meu_papel === 'mestre'}
          onEncerrar={encerrar}
          onFechar={() => setEpilogo(false)}
        />
      ) : null}
      {resumoId ? <ResumoSessaoModal sessaoId={resumoId} onClose={() => setResumoId(null)} /> : null}
    </main>
  );
}
