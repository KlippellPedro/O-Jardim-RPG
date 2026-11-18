import { useCallback, useEffect, useState } from 'react';
import { BellRing, Repeat } from 'lucide-react';
import { engajamentoApi, type ICalendario } from '../../services/engajamentoApi';
import { CalendarioSessoes } from './CalendarioSessoes';
import { DIAS_DA_SEMANA } from './quadro';

/** Só o Mestre vê: define a sessão fixa da semana, marca extras e escolhe os avisos do Discord. */
export const AbaAgenda = ({ campanhaId, onMudou }: { campanhaId: string; onMudou?: () => void }) => {
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
      onMudou?.();
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

  if (!dados) return erro ? <p role="alert" className="qd-erro">{erro}</p> : <p className="qd-carregando" aria-busy="true">Abrindo a agenda...</p>;

  return (
    <div className="qd-agenda">
      <div className="qd-agenda__coluna">
        <form className="qd-painel qd-form" onSubmit={(evento) => void salvar(evento)}>
          <div>
            <h3 className="qd-painel__titulo"><Repeat size={16} aria-hidden="true" /> Sessão fixa da semana</h3>
            <p className="qd-painel__sub">Horário de Brasília. Os lembretes de 24 horas e de 1 hora saem sozinhos.</p>
          </div>
          <label className="qd-chave">
            A mesa joga toda semana
            <input type="checkbox" checked={ativa} onChange={(evento) => setAtiva(evento.target.checked)} />
          </label>
          <div className="qd-form__dupla">
            <select value={dia} disabled={!ativa} onChange={(evento) => setDia(Number(evento.target.value))} aria-label="Dia da semana" className="qd-campo">
              {DIAS_DA_SEMANA.map((nome, indice) => <option key={nome} value={indice}>Toda {nome.toLowerCase()}</option>)}
            </select>
            <input type="time" value={hora} disabled={!ativa} onChange={(evento) => setHora(evento.target.value)} aria-label="Hora" className="qd-campo" />
          </div>
          <input value={titulo} maxLength={120} disabled={!ativa} onChange={(evento) => setTitulo(evento.target.value)} placeholder="Nome da campanha ou da mesa (opcional)" aria-label="Título" className="qd-campo" />
          <textarea value={nota} maxLength={600} disabled={!ativa} onChange={(evento) => setNota(evento.target.value)} placeholder="Recado fixo para o grupo (opcional)" aria-label="Recado" className="qd-campo" />
          <p className="qd-painel__sub">Se um dia não der, toque no dia do calendário e cancele só aquela semana. Para uma sessão extra, toque no dia e marque uma especial.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={salvando} className="qd-botao">{salvando ? 'Salvando...' : 'Salvar sessão fixa'}</button>
            {aviso ? <p role="status" className="qd-ok">{aviso}</p> : null}
          </div>
          {erro ? <p role="alert" className="qd-erro">{erro}</p> : null}
        </form>

        <section className="qd-painel" aria-label="Avisos no Discord">
          <h3 className="qd-painel__titulo"><BellRing size={16} aria-hidden="true" /> Avisos no Discord</h3>
          <p className="qd-painel__sub">Escolha o que o Jornalista publica no servidor. No site, todos os avisos chegam sempre. Só funciona com o servidor vinculado à campanha.</p>
          <ul className="qd-avisos">
            {Object.entries(dados.avisos_rotulos ?? {}).map(([chave, rotulo]) => (
              <li key={chave}>
                <label className="qd-chave">
                  {rotulo}
                  <input type="checkbox" checked={Boolean(dados.avisos?.[chave])} onChange={(evento) => void alternarAviso(chave, evento.target.checked)} />
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <CalendarioSessoes key={versao} campanhaId={campanhaId} editavel onMudou={() => { void carregar(); onMudou?.(); }} />
    </div>
  );
};
