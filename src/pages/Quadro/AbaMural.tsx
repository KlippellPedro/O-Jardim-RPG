import { useEffect, useRef, useState } from 'react';
import { Camera, Crown, Heart, Quote, Trash2 } from 'lucide-react';
import { mesaApi, type ISessaoResumo } from '../../services/mesaApi';
import { engajamentoApi, type IItemMural, type IMvp } from '../../services/engajamentoApi';
import { reduzirImagem } from './reduzirImagem';
import { separarMural } from './quadro';

interface IAbaMuralProps {
  campanhaId: string;
  gestor: boolean;
}

const campo = 'w-full rounded-xl border border-white/10 bg-[#0b0a10] px-3 py-2.5 text-sm text-white outline-none focus:border-[#c7a44c]/50';
const quando = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

const BotaoCurtir = ({ item, onCurtir }: { item: IItemMural; onCurtir: (item: IItemMural) => void }) => (
  <button
    type="button"
    aria-pressed={item.votei}
    aria-label={`${item.votei ? 'Tirar a curtida de' : 'Curtir'} ${item.tipo === 'foto' ? 'esta foto' : 'esta frase'}, ${item.votos} curtida(s)`}
    onClick={() => onCurtir(item)}
    className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${item.votei ? 'border-rose-400/50 bg-rose-400/15 text-rose-200' : 'border-white/10 text-gray-400 hover:text-white'}`}
  >
    <Heart size={13} fill={item.votei ? 'currentColor' : 'none'} /> {item.votos}
  </button>
);

/** Votação de MVP da noite: o placar só aparece depois que a pessoa vota. */
const CartaoMvp = ({ campanhaId, gestor }: { campanhaId: string; gestor: boolean }) => {
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
  return (
    <section className="rounded-2xl border border-[#c7a44c]/25 bg-gradient-to-br from-[#c7a44c]/10 to-transparent p-5" aria-label="MVP da noite">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#c7a44c]"><Crown size={14} /> MVP da noite</h3>
        <select value={sessaoId} onChange={(evento) => setSessaoId(evento.target.value)} aria-label="Sessão do MVP" className="min-h-10 rounded-lg border border-white/10 bg-[#0b0a10] px-3 text-xs text-white">
          {sessoes.map((sessao) => <option key={sessao.id} value={sessao.id}>{sessao.titulo || 'Sessão'} · {quando(sessao.iniciada_em)}</option>)}
        </select>
      </div>
      {erro ? <p role="alert" className="mb-3 text-sm text-red-300">{erro}</p> : null}
      {mvp ? (
        <>
          {!gestor ? (
            <div className="flex flex-wrap gap-2">
              {mvp.candidatos.map((candidato) => (
                <button key={candidato.usuario_id} type="button" aria-pressed={mvp.meu_voto === candidato.usuario_id} onClick={() => void votar(candidato.usuario_id)} className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${mvp.meu_voto === candidato.usuario_id ? 'border-[#c7a44c]/70 bg-[#c7a44c]/20 text-[#f3dc8f]' : 'border-white/10 text-gray-300 hover:text-white'}`}>{candidato.nome}</button>
              ))}
            </div>
          ) : null}
          <p className="mt-3 text-xs text-gray-500" role="status">{mvp.votaram} de {mvp.total_eleitores} já votaram.{!gestor && !mvp.meu_voto ? ' Vote para ver o placar (voto em si mesmo não vale).' : ''}</p>
          {mvp.resultado && mvp.resultado.total_votos > 0 ? (
            <div className="mt-3 space-y-1.5">
              {mvp.resultado.ranking.map((item) => (
                <div key={item.usuario_id} className="flex items-center gap-3 text-sm">
                  <span className={`w-28 truncate font-bold ${vencedores.some((v) => v.usuario_id === item.usuario_id) ? 'text-[#f3dc8f]' : 'text-gray-300'}`}>{item.nome}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/60"><div className="h-full rounded-full bg-[#c7a44c]" style={{ width: `${(item.votos / (mvp.resultado?.ranking[0]?.votos || 1)) * 100}%` }} /></div>
                  <span className="w-6 text-right text-xs text-gray-400">{item.votos}</span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
};

export const AbaMural = ({ campanhaId, gestor }: IAbaMuralProps) => {
  const [itens, setItens] = useState<IItemMural[] | null>(null);
  const [erro, setErro] = useState('');
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

  const apagar = (item: IItemMural) => {
    if (window.confirm(item.tipo === 'foto' ? 'Apagar esta foto do mural?' : 'Apagar esta frase do mural?')) void executar(() => engajamentoApi.apagarItem(campanhaId, item.id));
  };

  const { fotos, frases } = separarMural(itens ?? []);

  return (
    <div className="space-y-6">
      <CartaoMvp campanhaId={campanhaId} gestor={gestor} />

      <div className="grid gap-4 lg:grid-cols-2">
        <form className="space-y-3 rounded-2xl border border-white/10 bg-[#0f0e15] p-5" onSubmit={(evento) => { evento.preventDefault(); publicarFrase(); }}>
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500"><Quote size={13} /> Frase da mesa</h3>
          <textarea value={frase} maxLength={300} onChange={(evento) => setFrase(evento.target.value)} placeholder="Aquela frase que ninguém vai esquecer..." aria-label="Frase" className={`${campo} min-h-20`} />
          <input value={quemDisse} maxLength={60} onChange={(evento) => setQuemDisse(evento.target.value)} placeholder="Quem disse? (deixe vazio se foi você)" aria-label="Quem disse" className={campo} />
          <button type="submit" disabled={enviando || !frase.trim()} className="min-h-11 rounded-xl border border-[#c7a44c]/40 bg-[#c7a44c]/15 px-5 text-sm font-bold text-[#f3dc8f] disabled:opacity-40">Pendurar no mural</button>
        </form>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0f0e15] p-5">
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500"><Camera size={13} /> Foto do grupo</h3>
          <input value={legenda} maxLength={140} onChange={(evento) => setLegenda(evento.target.value)} placeholder="Legenda (opcional)" aria-label="Legenda da foto" className={campo} />
          <input ref={arquivoRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Escolher foto" onChange={(evento) => escolherFoto(evento.target.files?.[0])} />
          <button type="button" disabled={enviando} onClick={() => arquivoRef.current?.click()} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#c7a44c]/40 bg-[#c7a44c]/15 px-5 text-sm font-bold text-[#f3dc8f] disabled:opacity-40"><Camera size={15} /> {enviando ? 'Enviando...' : 'Escolher foto'}</button>
          <p className="text-[11px] text-gray-600">A foto é reduzida no seu aparelho antes de subir. O mural guarda até 40.</p>
        </div>
      </div>

      {erro ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{erro}</p> : null}
      {!itens ? <p className="py-8 text-center text-sm text-gray-500" aria-busy="true">Abrindo o mural...</p> : null}
      {itens && itens.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-gray-500">O mural está vazio. Pendure a primeira frase ou foto.</p> : null}

      {frases.length ? (
        <section aria-label="Frases">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">Frases ({frases.length})</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {frases.map((item) => (
              <figure key={item.id} className={`relative flex flex-col justify-between rounded-2xl border p-5 ${item.melhor_da_noite ? 'border-[#c7a44c]/60 bg-gradient-to-br from-[#c7a44c]/15 to-transparent' : 'border-white/10 bg-[#0f0e15]'}`}>
                {item.melhor_da_noite ? <span className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-[#c7a44c] px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-black"><Crown size={10} /> Melhor da noite</span> : null}
                <blockquote className="text-lg leading-8 text-gray-100" style={{ fontFamily: 'Georgia, serif' }}>“{item.texto}”</blockquote>
                <figcaption className="mt-4 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs text-gray-500">{item.autor} · {quando(item.criado_em)}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <BotaoCurtir item={item} onCurtir={curtir} />
                    {item.pode_apagar ? <button type="button" aria-label="Apagar frase" onClick={() => apagar(item)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-500 hover:text-red-400"><Trash2 size={13} /></button> : null}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {fotos.length ? (
        <section aria-label="Fotos">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">Fotos ({fotos.length})</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fotos.map((item) => (
              <figure key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f0e15]">
                {item.imagem ? <img src={item.imagem} alt={item.texto || `Foto de ${item.publicado_por}`} loading="lazy" className="aspect-[4/3] w-full object-cover" /> : null}
                <figcaption className="flex items-center justify-between gap-2 p-3">
                  <span className="min-w-0 text-xs text-gray-400"><span className="block truncate text-gray-200">{item.texto || 'Sem legenda'}</span>{item.publicado_por} · {quando(item.criado_em)}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <BotaoCurtir item={item} onCurtir={curtir} />
                    {item.pode_apagar ? <button type="button" aria-label="Apagar foto" onClick={() => apagar(item)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-500 hover:text-red-400"><Trash2 size={13} /></button> : null}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};
