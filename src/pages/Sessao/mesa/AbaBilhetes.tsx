import { useState, type CSSProperties } from 'react';
import { Check, Mail, MailOpen, Send, Trash2 } from 'lucide-react';
import type { EstiloBilhete, IBilhete } from '../../../services/mesaApi';
import { BilheteAberto, ESTILOS_BILHETE } from './BilheteAberto';

interface IAbaBilhetesProps {
  bilhetes: IBilhete[];
  gestor: boolean;
  ocupado: boolean;
  jogadores: Array<{ usuario_id: string; nome: string }>;
  agir: (acao: string, dados?: Record<string, unknown>) => Promise<boolean>;
}

const quando = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Miniatura do papel escolhido: mostra como o bilhete vai chegar. */
const Amostra = ({ estilo, ativo }: { estilo: EstiloBilhete; ativo: boolean }) => {
  const visual = ESTILOS_BILHETE[estilo];
  return (
    <span
      className="flex h-16 w-full flex-col justify-center gap-1 rounded-md px-3 text-left"
      style={{ background: visual.folha, border: `1px solid ${ativo ? '#f3dc8f' : visual.borda}`, fontFamily: visual.fonte, boxShadow: ativo ? '0 0 0 2px rgba(243,220,143,0.35)' : undefined } as CSSProperties}
    >
      <span className="text-[11px] font-bold leading-none" style={{ color: visual.titulo }}>{visual.rotulo}</span>
      <span className="h-[3px] w-4/5 rounded-full" style={{ backgroundColor: visual.tinta, opacity: 0.35 }} />
      <span className="h-[3px] w-3/5 rounded-full" style={{ backgroundColor: visual.tinta, opacity: 0.25 }} />
    </span>
  );
};

export const AbaBilhetes = ({ bilhetes, gestor, ocupado, jogadores, agir }: IAbaBilhetesProps) => {
  const [aberto, setAberto] = useState<{ id: string; animar: boolean } | null>(null);
  const [destino, setDestino] = useState('');
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [estilo, setEstilo] = useState<EstiloBilhete>('papel');

  const bilheteAberto = aberto ? bilhetes.find((item) => item.id === aberto.id) ?? null : null;

  const abrir = (bilhete: IBilhete) => {
    const primeira = !bilhete.aberto_em && !gestor;
    setAberto({ id: bilhete.id, animar: primeira });
    if (primeira) void agir('bilhete_abrir', { bilhete_id: bilhete.id });
  };

  const enviar = async () => {
    const alvo = destino || jogadores[0]?.usuario_id;
    if (!alvo || !titulo.trim() || !texto.trim()) return;
    if (await agir('bilhete_enviar', { para_usuario_id: alvo, titulo, texto, estilo })) {
      setTitulo('');
      setTexto('');
    }
  };

  const novos = bilhetes.filter((bilhete) => !bilhete.aberto_em);
  const lidos = bilhetes.filter((bilhete) => bilhete.aberto_em);
  const lista = gestor ? [...bilhetes].reverse() : lidos;

  return (
    <div className="space-y-6">
      {gestor ? (
        <form className="mesa-cartao space-y-4" onSubmit={(evento) => { evento.preventDefault(); void enviar(); }}>
          <h3 className="mesa-titulo !mb-0"><Send size={14} /> Passar um bilhete em segredo</h3>
          {jogadores.length === 0 ? <p className="text-sm text-gray-500">Não há jogadores na campanha para receber bilhetes.</p> : (
            <>
              <label className="mesa-rotulo">
                Para quem
                <select className="mesa-campo" value={destino || jogadores[0].usuario_id} onChange={(evento) => setDestino(evento.target.value)}>
                  {jogadores.map((jogador) => <option key={jogador.usuario_id} value={jogador.usuario_id}>{jogador.nome}</option>)}
                </select>
              </label>
              <div>
                <span className="mesa-rotulo mb-1.5">Como chega</span>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="Estilo do bilhete">
                  {(Object.keys(ESTILOS_BILHETE) as EstiloBilhete[]).map((chave) => (
                    <button key={chave} type="button" aria-pressed={estilo === chave} onClick={() => setEstilo(chave)} aria-label={ESTILOS_BILHETE[chave].rotulo}><Amostra estilo={chave} ativo={estilo === chave} /></button>
                  ))}
                </div>
              </div>
              <input className="mesa-campo" value={titulo} maxLength={80} onChange={(evento) => setTitulo(evento.target.value)} placeholder="Título (ex.: Você reparou nisto)" aria-label="Título do bilhete" />
              <textarea className="mesa-campo" value={texto} maxLength={2000} onChange={(evento) => setTexto(evento.target.value)} placeholder="O que só esse jogador sabe ou percebe..." aria-label="Texto do bilhete" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-gray-500">{texto.length}/2000</span>
                <button type="submit" className="mesa-botao mesa-botao--ouro" disabled={ocupado || !titulo.trim() || !texto.trim()}><Send size={15} /> Enviar bilhete</button>
              </div>
            </>
          )}
        </form>
      ) : null}

      {!gestor && novos.length ? (
        <section aria-label="Bilhetes novos">
          <h3 className="mesa-titulo !text-[#c7a44c]"><Mail size={14} /> Chegou um bilhete para você</h3>
          <ul className="space-y-2.5">
            {novos.map((bilhete) => (
              <li key={bilhete.id}>
                <button type="button" onClick={() => abrir(bilhete)} className="mesa-bilhete mesa-bilhete--novo transition-transform hover:scale-[1.01]">
                  <span className="mesa-bilhete__selo"><Mail size={22} className="text-[#f3dc8f]" aria-hidden="true" /></span>
                  <span>
                    <span className="block font-bold text-white">Toque para desamassar</span>
                    <span className="text-xs text-gray-400">Recebido às {quando(bilhete.criado_em)} · só você vê</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label={gestor ? 'Bilhetes enviados' : 'Bilhetes lidos'}>
        <h3 className="mesa-titulo">{gestor ? 'Enviados nesta sessão' : 'Já lidos'}</h3>
        {lista.length === 0 ? (
          <div className="mesa-cartao mesa-cartao--vazio">
            <Mail className="mx-auto mb-2 text-gray-600" size={26} aria-hidden="true" />
            {gestor ? 'Nenhum bilhete enviado ainda.' : 'Nada por aqui ainda.'}
          </div>
        ) : (
          <ul className="space-y-2">
            {lista.map((bilhete) => (
              <li key={bilhete.id} className="mesa-bilhete">
                <span className="mesa-bilhete__selo">
                  {bilhete.aberto_em ? <MailOpen size={19} className="text-emerald-300" aria-hidden="true" /> : <Mail size={19} className="text-amber-300" aria-hidden="true" />}
                </span>
                <button type="button" onClick={() => abrir(bilhete)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-bold text-white">{bilhete.titulo}</span>
                  <span className="text-xs text-gray-500">
                    {gestor ? `Para ${bilhete.para_nome ?? '?'} · ` : ''}{quando(bilhete.criado_em)}
                    {gestor ? (bilhete.aberto_em ? <span className="ml-1.5 inline-flex items-center gap-0.5 text-emerald-300"><Check size={11} /> lido</span> : <span className="ml-1.5 text-amber-300">ainda fechado</span>) : null}
                  </span>
                </button>
                {gestor ? <button type="button" className="mesa-botao mesa-botao--pequeno mesa-botao--icone" aria-label={`Apagar o bilhete ${bilhete.titulo}`} onClick={() => void agir('bilhete_apagar', { bilhete_id: bilhete.id })}><Trash2 size={14} /></button> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {bilheteAberto && aberto ? <BilheteAberto bilhete={bilheteAberto} animar={aberto.animar} onFechar={() => setAberto(null)} /> : null}
    </div>
  );
};
