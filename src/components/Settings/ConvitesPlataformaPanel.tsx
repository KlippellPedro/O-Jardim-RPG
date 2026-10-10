import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Loader2, Plus, Ticket, Trash2 } from 'lucide-react';
import { adminApi, type ConvitePlataforma } from '../../services/adminApi';
import { authApi } from '../../services/authApi';
import { Select } from '../ui/Select';
import { confirmar } from '../avisos/confirmacao';

const VALIDADES = [
  { value: '1', label: '1 dia' },
  { value: '3', label: '3 dias' },
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
];

const SITUACAO: Record<ConvitePlataforma['situacao'], { rotulo: string; classe: string }> = {
  ativo: { rotulo: 'Ativo', classe: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' },
  usado: { rotulo: 'Usado', classe: 'border-sky-400/30 bg-sky-400/10 text-sky-200' },
  expirado: { rotulo: 'Venceu', classe: 'border-white/10 bg-white/[0.04] text-gray-400' },
  revogado: { rotulo: 'Revogado', classe: 'border-red-400/30 bg-red-400/10 text-red-200' },
};

const MODO_CADASTRO: Record<string, string> = {
  aberto: 'Agora o cadastro está aberto: qualquer pessoa cria conta, com ou sem convite. O convite passa a valer quando o cadastro for por convite.',
  convite: 'O cadastro está por convite: só cria conta quem tiver um código válido.',
  fechado: 'O cadastro está fechado: ninguém cria conta, nem com convite.',
};

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

/** Convites para criar conta na plataforma. Não colocam ninguém em campanha:
 * isso continua com o convite da própria mesa, que o Mestre gera. */
export const ConvitesPlataformaPanel = () => {
  const [convites, setConvites] = useState<ConvitePlataforma[]>([]);
  const [verTodos, setVerTodos] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [modo, setModo] = useState<string | null>(null);
  const [validade, setValidade] = useState('7');
  const [usos, setUsos] = useState(1);
  const [nota, setNota] = useState('');
  const [gerando, setGerando] = useState(false);
  const [novo, setNovo] = useState<{ codigo: string; nota: string; expira_em: string; max_usos: number } | null>(null);
  const [copiado, setCopiado] = useState<'codigo' | 'link' | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await adminApi.listarConvites(verTodos);
      setConvites(resposta.convites);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível listar os convites.');
    } finally {
      setCarregando(false);
    }
  }, [verTodos]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => {
    authApi.modoDeCadastro().then((resposta: { modo?: string }) => setModo(resposta?.modo ?? null)).catch(() => setModo(null));
  }, []);

  const gerar = async () => {
    if (gerando) return;
    setGerando(true);
    setErro(null);
    try {
      const criado = await adminApi.criarConvite({ expira_em_dias: Number(validade), max_usos: usos, nota });
      setNovo(criado);
      setNota('');
      setUsos(1);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível gerar o convite.');
    } finally {
      setGerando(false);
    }
  };

  const revogar = async (convite: ConvitePlataforma) => {
    if (!(await confirmar({ titulo: 'Revogar o convite', mensagem: `Revogar o convite${convite.nota ? ` de ${convite.nota}` : ''}? Quem ainda não usou não vai conseguir criar conta com ele.`, rotuloConfirmar: 'Revogar', tom: 'perigo' }))) return;
    try {
      await adminApi.revogarConvite(convite.id);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível revogar.');
    }
  };

  const link = novo ? `${window.location.origin}/cadastro?convite=${encodeURIComponent(novo.codigo)}` : '';
  const copiar = async (texto: string, qual: 'codigo' | 'link') => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      window.setTimeout(() => setCopiado(null), 2000);
    } catch {
      setErro('Não deu para copiar. Selecione o texto e copie à mão.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
          <Ticket size={20} className="text-primary" /> Convites da plataforma
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-gray-400">
          Para alguém criar uma conta no Jardim. O convite não coloca a pessoa em nenhuma campanha: depois de entrar, ela usa o convite da mesa que o Mestre gera.
        </p>
        {modo ? <p className="mt-2 max-w-3xl rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-300">{MODO_CADASTRO[modo] ?? `Modo de cadastro: ${modo}.`}</p> : null}
      </div>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Novo convite</h3>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_8rem_auto] md:items-end">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Para quem (só você vê)
            <input value={nota} maxLength={80} onChange={(evento) => setNota(evento.target.value)} placeholder="Ex.: Marina, mesa de sexta" className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm normal-case tracking-normal text-white outline-none focus:border-primary/50" />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Vale por
            <Select value={validade} onChange={setValidade} options={VALIDADES} ariaLabel="Validade do convite" className="mt-1 w-full normal-case tracking-normal" />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Quantas contas
            <input type="number" min={1} max={500} value={usos} onChange={(evento) => setUsos(Math.max(1, Math.min(500, Math.trunc(Number(evento.target.value) || 1))))} className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-center text-sm text-white outline-none focus:border-primary/50" />
          </label>
          <button type="button" onClick={() => void gerar()} disabled={gerando} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50">
            {gerando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Gerar convite
          </button>
        </div>

        {novo ? (
          <div className="mt-4 rounded-xl border border-primary/40 bg-primary/[0.07] p-4" role="status">
            <p className="flex items-center gap-2 text-sm font-bold text-white"><KeyRound size={15} className="text-primary" /> Convite gerado{novo.nota ? ` para ${novo.nota}` : ''}</p>
            <p className="mt-1 text-xs text-amber-200/80">Copie agora: o código não aparece de novo. Se perder, revogue e gere outro.</p>
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 basis-full break-all rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-sm text-primary sm:basis-0 sm:flex-1">{novo.codigo}</code>
                <button type="button" onClick={() => void copiar(novo.codigo, 'codigo')} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-gray-200 hover:bg-white/5 sm:w-auto">
                  {copiado === 'codigo' ? <Check size={13} /> : <Copy size={13} />} Copiar código
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 basis-full break-all rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-xs text-gray-300 sm:basis-0 sm:flex-1">{link}</code>
                <button type="button" onClick={() => void copiar(link, 'link')} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-gray-200 hover:bg-white/5 sm:w-auto">
                  {copiado === 'link' ? <Check size={13} /> : <Copy size={13} />} Copiar link
                </button>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">O link já abre o cadastro com o código preenchido. Vale até {dataCurta(novo.expira_em)}, para {novo.max_usos === 1 ? '1 conta' : `${novo.max_usos} contas`}.</p>
          </div>
        ) : null}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">{verTodos ? 'Convites dos últimos 30 dias' : 'Convites ativos'}</h3>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input type="checkbox" checked={verTodos} onChange={(evento) => setVerTodos(evento.target.checked)} />
            Mostrar também usados, vencidos e revogados
          </label>
        </div>
        {carregando ? (
          <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Carregando…</p>
        ) : convites.length === 0 ? (
          <p className="rounded-xl border border-white/5 bg-black/20 px-4 py-6 text-center text-sm text-gray-500">{verTodos ? 'Nenhum convite nos últimos 30 dias.' : 'Nenhum convite ativo.'}</p>
        ) : (
          <ul className="space-y-2">
            {convites.map((convite) => (
              <li key={convite.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SITUACAO[convite.situacao].classe}`}>{SITUACAO[convite.situacao].rotulo}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{convite.nota || <span className="italic text-gray-500">sem nota</span>}</p>
                  <p className="text-xs text-gray-500">
                    {convite.usos} de {convite.max_usos} {convite.max_usos === 1 ? 'conta' : 'contas'} · criado em {dataCurta(convite.criado_em)}{convite.criado_por_nome ? ` por ${convite.criado_por_nome}` : ''} · {convite.situacao === 'expirado' ? 'venceu' : 'vale até'} {dataCurta(convite.expira_em)}
                  </p>
                </div>
                {convite.situacao === 'ativo' ? (
                  <button type="button" onClick={() => void revogar(convite)} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:border-red-400/30 hover:text-red-300 sm:w-auto">
                    <Trash2 size={13} /> Revogar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {erro ? <p role="alert" className="rounded-lg bg-red-400/10 px-3 py-2 text-sm text-red-200">{erro}</p> : null}
    </div>
  );
};
