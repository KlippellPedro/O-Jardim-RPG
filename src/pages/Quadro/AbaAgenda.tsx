import { useCallback, useEffect, useState } from 'react';
import { BellRing, Repeat } from 'lucide-react';
import { engajamentoApi, type ICalendario } from '../../services/engajamentoApi';
import { CalendarioSessoes } from './CalendarioSessoes';
import { DIAS_DA_SEMANA } from './quadro';

const campo = 'w-full rounded-xl border border-white/10 bg-[#0b0a10] px-3 py-2.5 text-sm text-white outline-none focus:border-[#c7a44c]/50';

/** Só o Mestre vê: define a sessão fixa da semana, marca extras e escolhe os avisos do Discord. */
export const AbaAgenda = ({ campanhaId }: { campanhaId: string }) => {
  const [dados, setDados] = useState<ICalendario | null>(null);
  const [ativa, setAtiva] = useState(true);
  const [dia, setDia] = useState(4);
  const [hora, setHora] = useState('18:00');
  const [titulo, setTitulo] = useState('');
  const [nota, setNota] = useState('');
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [versao, setVersao] = useState(0);

  const carregar = useCallback(async () => {
    try {
      const resposta = await engajamentoApi.calendario(campanhaId);
      setDados(resposta);
      if (resposta.recorrencia) {
        setAtiva(resposta.recorrencia.ativa);
        setDia(resposta.recorrencia.dia_semana);
        setHora(resposta.recorrencia.hora);
        setTitulo(resposta.recorrencia.titulo);
        setNota(resposta.recorrencia.nota);
      } else {
        setAtiva(false);
      }
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir a agenda.');
    }
  }, [campanhaId]);
  useEffect(() => { void carregar(); }, [carregar]);

  const salvar = async (evento: { preventDefault: () => void }) => {
    evento.preventDefault();
    setSalvando(true);
    setErro('');
    setAviso('');
    try {
      const resposta = await engajamentoApi.definirRecorrencia(campanhaId, { ativa, dia_semana: dia, hora, titulo, nota });
      setAviso(ativa ? `Sessão fixa salva: ${resposta.texto}.` : 'Sessão fixa desligada.');
      await carregar();
      setVersao((atual) => atual + 1);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const alternarAviso = async (chave: string, ligado: boolean) => {
    setDados((atual) => (atual?.avisos ? { ...atual, avisos: { ...atual.avisos, [chave]: ligado } } : atual));
    try {
      await engajamentoApi.definirAvisos(campanhaId, { [chave]: ligado });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar o aviso.');
      await carregar();
    }
  };

  if (!dados) return erro ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{erro}</p> : <p className="py-10 text-center text-sm text-gray-500" aria-busy="true">Abrindo a agenda...</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <form className="space-y-3 rounded-2xl border border-white/10 bg-[#0f0e15] p-5" onSubmit={(evento) => void salvar(evento)}>
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500"><Repeat size={13} /> Sessão fixa da semana</h3>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 px-4 text-sm text-gray-200">
            A mesa joga toda semana
            <input type="checkbox" checked={ativa} onChange={(evento) => setAtiva(evento.target.checked)} className="h-5 w-5 accent-[#c7a44c]" />
          </label>
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <select value={dia} disabled={!ativa} onChange={(evento) => setDia(Number(evento.target.value))} aria-label="Dia da semana" className={campo}>
              {DIAS_DA_SEMANA.map((nome, indice) => <option key={nome} value={indice}>Toda {nome.toLowerCase()}</option>)}
            </select>
            <input type="time" value={hora} disabled={!ativa} onChange={(evento) => setHora(evento.target.value)} aria-label="Hora" className={campo} />
          </div>
          <input value={titulo} maxLength={120} disabled={!ativa} onChange={(evento) => setTitulo(evento.target.value)} placeholder="Nome da campanha ou da mesa (opcional)" aria-label="Título" className={campo} />
          <textarea value={nota} maxLength={600} disabled={!ativa} onChange={(evento) => setNota(evento.target.value)} placeholder="Recado fixo (opcional)" aria-label="Recado" className={`${campo} min-h-16`} />
          <p className="text-[11px] leading-5 text-gray-600">Horário de Brasília. Se um dia não der, abra o calendário ao lado, toque no dia e cancele só aquela semana. Para uma sessão extra, toque no dia e marque uma especial. Os lembretes de 24 horas e 1 hora saem sozinhos.</p>
          <button type="submit" disabled={salvando} className="min-h-11 rounded-xl border border-[#c7a44c]/40 bg-[#c7a44c]/15 px-5 text-sm font-bold text-[#f3dc8f] disabled:opacity-40">Salvar sessão fixa</button>
          {aviso ? <p role="status" className="text-sm text-emerald-300">{aviso}</p> : null}
          {erro ? <p role="alert" className="text-sm text-red-300">{erro}</p> : null}
        </form>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#0f0e15] p-5" aria-label="Avisos no Discord">
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500"><BellRing size={13} /> Avisos no Discord</h3>
          <p className="text-sm leading-6 text-gray-400">Escolha o que o Jornalista publica no servidor. No site, todos os avisos chegam sempre. Só funciona com o servidor vinculado à campanha.</p>
          <ul className="space-y-2">
            {Object.entries(dados.avisos_rotulos ?? {}).map(([chave, rotulo]) => (
              <li key={chave}>
                <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-200">
                  {rotulo}
                  <input type="checkbox" checked={Boolean(dados.avisos?.[chave])} onChange={(evento) => void alternarAviso(chave, evento.target.checked)} className="h-5 w-5 accent-[#c7a44c]" />
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <CalendarioSessoes key={versao} campanhaId={campanhaId} editavel onMudou={() => void carregar()} />
    </div>
  );
};
