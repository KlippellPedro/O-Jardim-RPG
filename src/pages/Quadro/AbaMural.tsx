import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Camera, Crown, Heart, Pin, Quote, Trash2 } from 'lucide-react';
import { mesaApi, type ISessaoResumo } from '../../services/mesaApi';
import { engajamentoApi, type IItemMural, type IMvp } from '../../services/engajamentoApi';
import { reduzirImagem } from './reduzirImagem';
import { estiloDoPapel, filtrarMural, porcentagem, separarMural, type FiltroMural } from './quadro';
import { confirmar } from '../../components/avisos/confirmacao';

interface IAbaMuralProps {
  campanhaId: string;
  gestor: boolean;
}

const quando = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

const BotaoCurtir = ({ item, onCurtir }: { item: IItemMural; onCurtir: (item: IItemMural) => void }) => (
  <button
    type="button"
    aria-pressed={item.votei}
    aria-label={`${item.votei ? 'Tirar a curtida de' : 'Curtir'} ${item.tipo === 'foto' ? 'esta foto' : 'esta frase'}, ${item.votos} curtida(s)`}
    onClick={() => onCurtir(item)}
    className={`qd-papel-botao ${item.votei ? 'is-curtido' : ''}`}
  >
    <Heart size={13} fill={item.votei ? 'currentColor' : 'none'} aria-hidden="true" /> {item.votos}
  </button>
);

const BotaoApagar = ({ rotulo, onApagar }: { rotulo: string; onApagar: () => void }) => (
  <button type="button" aria-label={rotulo} onClick={onApagar} className="qd-papel-botao qd-papel-botao--apagar">
    <Trash2 size={13} aria-hidden="true" />
  </button>
);

/** Votação de MVP da noite: o placar só aparece depois que a pessoa vota. */
const PlacaMvp = ({ campanhaId, gestor }: { campanhaId: string; gestor: boolean }) => {
  const [sessoes, setSessoes] = useState<ISessaoResumo[]>([]);
  const [sessaoId, setSessaoId] = useState('');
  const [mvp, setMvp] = useState<IMvp | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    mesaApi.sessoes(campanhaId).then((resposta) => {
      if (!ativo) return;
      const lista = resposta.sessoes.filter((sessao) => sessao.status !== 'preparacao');
      setSessoes(lista);
      setSessaoId((atual) => atual || lista[0]?.id || '');
    }).catch(() => undefined);
    return () => { ativo = false; };
  }, [campanhaId]);

  useEffect(() => {
    if (!sessaoId) { setMvp(null); return undefined; }
    let ativo = true;
    engajamentoApi.mvp(campanhaId, sessaoId)
      .then((resposta) => { if (ativo) { setMvp(resposta); setErro(''); } })
      .catch((falha) => { if (ativo) setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir a votação.'); });
    return () => { ativo = false; };
  }, [campanhaId, sessaoId]);

  if (sessoes.length === 0) return null;

  const votar = async (alvo: string) => {
    try {
      setMvp(await engajamentoApi.votarMvp(campanhaId, sessaoId, alvo));
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível votar.');
    }
  };

  const vencedores = mvp?.resultado?.vencedores ?? [];
  const temPlacar = Boolean(mvp?.resultado && mvp.resultado.total_votos > 0);
  const maiorVoto = mvp?.resultado?.ranking[0]?.votos || 1;
  const titulo = temPlacar && vencedores.length
    ? vencedores.map((vencedor) => vencedor.nome).join(' e ')
    : 'Quem brilhou nesta sessão?';

  return (
    <section className="qd-mvp" aria-label="MVP da noite">
      <span className="qd-mvp__medalhao" aria-hidden="true"><Crown size={28} /></span>
      <div className="min-w-0">
        <div className="qd-mvp__topo">
          <div className="min-w-0">
            <span className="qd-eyebrow">{temPlacar && vencedores.length ? (vencedores.length > 1 ? 'Empate no MVP da noite' : 'MVP da noite') : 'Votação de MVP'}</span>
            <h3>{titulo}</h3>
          </div>
          <select value={sessaoId} onChange={(evento) => setSessaoId(evento.target.value)} aria-label="Sessão do MVP" className="qd-mvp__select">
            {sessoes.map((sessao) => <option key={sessao.id} value={sessao.id}>{sessao.titulo || 'Sessão'} · {quando(sessao.iniciada_em)}</option>)}
          </select>
        </div>
        {erro ? <p role="alert" className="qd-erro mt-3">{erro}</p> : null}
        {mvp ? (
          <>
            {!gestor ? (
              <div className="qd-mvp__candidatos">
                {mvp.candidatos.map((candidato) => (
                  <button
                    key={candidato.usuario_id}
                    type="button"
                    aria-pressed={mvp.meu_voto === candidato.usuario_id}
                    onClick={() => void votar(candidato.usuario_id)}
                    className={`qd-candidato ${mvp.meu_voto === candidato.usuario_id ? 'is-votado' : ''}`}
                  >
                    <span className="qd-candidato__inicial" aria-hidden="true">{candidato.nome.charAt(0).toUpperCase()}</span>
                    {candidato.nome}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="qd-mvp__status" role="status">
              {mvp.votaram} de {mvp.total_eleitores} já votaram.{!gestor && !mvp.meu_voto ? ' Vote para ver o placar. Voto em si mesmo não vale.' : ''}
            </p>
            {temPlacar ? (
              <div className="qd-mvp__placar">
                {mvp.resultado?.ranking.map((item) => (
                  <div key={item.usuario_id} className={`qd-mvp__linha ${vencedores.some((v) => v.usuario_id === item.usuario_id) ? 'is-vencedor' : ''}`}>
                    <span>{item.nome}</span>
                    <span className="qd-mvp__barra" aria-hidden="true"><i style={{ width: `${porcentagem(item.votos, maiorVoto)}%` }} /></span>
                    <b>{item.votos}</b>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
};

const NotaDaMesa = ({ item, onCurtir, onApagar }: { item: IItemMural; onCurtir: (item: IItemMural) => void; onApagar: (item: IItemMural) => void }) => {
  const papel = estiloDoPapel(item.id);
  return (
    <figure
      className={`qd-nota ${item.melhor_da_noite ? 'is-melhor' : ''}`}
      style={{ '--giro': `${papel.giro}deg`, '--papel': papel.papel, '--alfinete': papel.alfinete } as CSSProperties}
    >
      <span className="qd-alfinete" aria-hidden="true" />
      {item.melhor_da_noite ? <span className="qd-nota__melhor"><Crown size={10} aria-hidden="true" /> Melhor da noite</span> : null}
      <blockquote>“{item.texto}”</blockquote>
      <figcaption>
        <span className="qd-nota__quem">
          <strong>{item.autor}</strong>
          <small>{quando(item.criado_em)}</small>
        </span>
        <span className="qd-papel-acoes">
          <BotaoCurtir item={item} onCurtir={onCurtir} />
          {item.pode_apagar ? <BotaoApagar rotulo="Apagar frase" onApagar={() => onApagar(item)} /> : null}
        </span>
      </figcaption>
    </figure>
  );
};

const FotoDaMesa = ({ item, onCurtir, onApagar }: { item: IItemMural; onCurtir: (item: IItemMural) => void; onApagar: (item: IItemMural) => void }) => {
  const papel = estiloDoPapel(item.id);
  return (
    <figure className="qd-polaroide" style={{ '--giro': `${papel.giro}deg` } as CSSProperties}>
      <span className="qd-fita" aria-hidden="true" />
      {item.imagem ? <img src={item.imagem} alt={item.texto || `Foto de ${item.publicado_por}`} loading="lazy" /> : null}
      <figcaption>
        <span className="qd-polaroide__legenda">
          <strong>{item.texto || 'Sem legenda'}</strong>
          <small>{item.publicado_por} · {quando(item.criado_em)}</small>
        </span>
        <span className="qd-papel-acoes">
          <BotaoCurtir item={item} onCurtir={onCurtir} />
          {item.pode_apagar ? <BotaoApagar rotulo="Apagar foto" onApagar={() => onApagar(item)} /> : null}
        </span>
      </figcaption>
    </figure>
  );
};

export const AbaMural = ({ campanhaId, gestor }: IAbaMuralProps) => {
  const [itens, setItens] = useState<IItemMural[] | null>(null);
  const [erro, setErro] = useState('');
  const [modo, setModo] = useState<'frase' | 'foto'>('frase');
  const [filtro, setFiltro] = useState<FiltroMural>('tudo');
  const [frase, setFrase] = useState('');
  const [quemDisse, setQuemDisse] = useState('');
  const [legenda, setLegenda] = useState('');
  const [enviando, setEnviando] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    try {
      setItens((await engajamentoApi.mural(campanhaId)).itens);
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir o mural.');
    }
  };
  useEffect(() => { void carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [campanhaId]);

  const executar = async (acao: () => Promise<unknown>) => {
    setEnviando(true);
    setErro('');
    try {
      await acao();
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível concluir.');
    } finally {
      setEnviando(false);
    }
  };

  const publicarFrase = () => {
    if (!frase.trim()) return;
    void executar(async () => {
      await engajamentoApi.publicarCitacao(campanhaId, frase, quemDisse);
      setFrase('');
      setQuemDisse('');
    });
  };

  const escolherFoto = (arquivo: File | undefined) => {
    if (!arquivo) return;
    void executar(async () => {
      const imagem = await reduzirImagem(arquivo);
      await engajamentoApi.publicarFoto(campanhaId, imagem, legenda);
      setLegenda('');
    });
    if (arquivoRef.current) arquivoRef.current.value = '';
  };

  const curtir = (item: IItemMural) => {
    // Resposta imediata na tela; o servidor confirma em seguida.
    setItens((atuais) => atuais?.map((atual) => (atual.id === item.id ? { ...atual, votei: !atual.votei, votos: atual.votos + (atual.votei ? -1 : 1) } : atual)) ?? null);
    void engajamentoApi.alternarVoto(campanhaId, item.id).then(() => carregar()).catch(() => carregar());
  };

  const apagar = async (item: IItemMural) => {
    const foto = item.tipo === 'foto';
    if (await confirmar({ titulo: foto ? 'Apagar a foto' : 'Apagar a frase', mensagem: foto ? 'Apagar esta foto do mural?' : 'Apagar esta frase do mural?', rotuloConfirmar: 'Apagar', tom: 'perigo' })) void executar(() => engajamentoApi.apagarItem(campanhaId, item.id));
  };

  const { fotos, frases } = separarMural(itens ?? []);
  const visiveis = filtrarMural(itens ?? [], filtro);

  return (
    <div className="flex flex-col gap-5">
      <PlacaMvp campanhaId={campanhaId} gestor={gestor} />

      <section className="qd-painel qd-pendurar" aria-label="Pendurar no mural">
        <div className="qd-pendurar__cabeca">
          <h3 className="qd-painel__titulo"><Pin size={16} aria-hidden="true" /> Pendurar no mural</h3>
          <div className="qd-segmentos" role="group" aria-label="O que pendurar">
            <button type="button" aria-pressed={modo === 'frase'} onClick={() => setModo('frase')} className={`qd-segmento ${modo === 'frase' ? 'is-ativo' : ''}`}><Quote size={13} aria-hidden="true" /> Frase da mesa</button>
            <button type="button" aria-pressed={modo === 'foto'} onClick={() => setModo('foto')} className={`qd-segmento ${modo === 'foto' ? 'is-ativo' : ''}`}><Camera size={13} aria-hidden="true" /> Foto do grupo</button>
          </div>
        </div>

        {modo === 'frase' ? (
          <form className="grid gap-3" onSubmit={(evento) => { evento.preventDefault(); publicarFrase(); }}>
            <textarea value={frase} maxLength={300} onChange={(evento) => setFrase(evento.target.value)} placeholder="Aquela frase que ninguém vai esquecer..." aria-label="Frase" className="qd-campo" />
            <div className="qd-pendurar__linha">
              <input value={quemDisse} maxLength={60} onChange={(evento) => setQuemDisse(evento.target.value)} placeholder="Quem disse? (vazio se foi você)" aria-label="Quem disse" className="qd-campo" />
              <span className="qd-contador" aria-hidden="true">{frase.length}/300</span>
              <button type="submit" disabled={enviando || !frase.trim()} className="qd-botao"><Pin size={15} aria-hidden="true" /> {enviando ? 'Pendurando...' : 'Pendurar'}</button>
            </div>
          </form>
        ) : (
          <div className="grid gap-3">
            <div className="qd-pendurar__linha">
              <input value={legenda} maxLength={140} onChange={(evento) => setLegenda(evento.target.value)} placeholder="Legenda (opcional)" aria-label="Legenda da foto" className="qd-campo" />
              <input ref={arquivoRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Escolher foto" onChange={(evento) => escolherFoto(evento.target.files?.[0])} />
              <button type="button" disabled={enviando} onClick={() => arquivoRef.current?.click()} className="qd-botao"><Camera size={15} aria-hidden="true" /> {enviando ? 'Enviando...' : 'Escolher foto'}</button>
            </div>
            <p className="qd-pendurar__nota">A foto é reduzida no seu aparelho antes de subir. O mural guarda até 40.</p>
          </div>
        )}
      </section>

      {erro ? <p role="alert" className="qd-erro">{erro}</p> : null}

      {itens && itens.length > 0 ? (
        <div className="qd-filtros">
          <div className="qd-segmentos" role="group" aria-label="Mostrar no mural">
            {([
              ['tudo', 'Tudo', itens.length],
              ['frases', 'Frases', frases.length],
              ['fotos', 'Fotos', fotos.length],
            ] as Array<[FiltroMural, string, number]>).map(([valor, rotulo, total]) => (
              <button key={valor} type="button" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)} className={`qd-segmento ${filtro === valor ? 'is-ativo' : ''}`}>
                {rotulo} <small>{total}</small>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <section className="qd-cortica" aria-label="Mural da mesa" aria-busy={!itens}>
        {!itens ? <p className="qd-carregando" style={{ color: '#d9c3a0' }}>Abrindo o mural...</p> : null}
        {itens && visiveis.length === 0 ? (
          <div className="qd-vazio">
            <Pin size={28} aria-hidden="true" />
            <strong>{itens.length === 0 ? 'O mural está vazio' : filtro === 'fotos' ? 'Nenhuma foto ainda' : 'Nenhuma frase ainda'}</strong>
            <p>{itens.length === 0 ? 'Pendure a primeira frase que fez a mesa rir ou uma foto do grupo.' : 'Use o campo acima para pendurar a primeira.'}</p>
          </div>
        ) : null}
        {visiveis.length ? (
          <div className="qd-mural">
            {visiveis.map((item) => (
              <div key={item.id}>
                {item.tipo === 'foto'
                  ? <FotoDaMesa item={item} onCurtir={curtir} onApagar={(alvo) => void apagar(alvo)} />
                  : <NotaDaMesa item={item} onCurtir={curtir} onApagar={(alvo) => void apagar(alvo)} />}
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
};
