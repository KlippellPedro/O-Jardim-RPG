import { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarClock, ChevronLeft, ChevronRight, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { engajamentoApi, type ICalendario, type ISessaoDoCalendario } from '../../services/engajamentoApi';
import { DIAS_CURTOS, formatarDataDaSessao, horaLocal, mesDe, montarMes, rotuloDoMes, sessoesPorDia, somarMeses } from './quadro';
import './quadro.css';

interface ICalendarioSessoesProps {
  campanhaId: string;
  /** Mestre: toca num dia para cancelar a sessão fixa ou marcar uma especial. */
  editavel?: boolean;
  onMudou?: () => void;
}

const hojeIso = () => {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
};

const classeDaSessao = (sessao: ISessaoDoCalendario) => {
  if (sessao.cancelada) return 'qd-cal__sessao--cancelada';
  if (sessao.tipo === 'especial') return 'qd-cal__sessao--especial';
  return 'qd-cal__sessao--fixa';
};

/** O calendário do grupo: a sessão fixa da semana, as canceladas (riscadas) e as especiais. */
export const CalendarioSessoes = ({ campanhaId, editavel = false, onMudou }: ICalendarioSessoesProps) => {
  const [mes, setMes] = useState(() => mesDe(new Date()));
  const [dados, setDados] = useState<ICalendario | null>(null);
  const [erro, setErro] = useState('');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [hora, setHora] = useState('20:00');
  const [titulo, setTitulo] = useState('');
  const [nota, setNota] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setDados(await engajamentoApi.calendario(campanhaId, mes));
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir o calendário.');
    }
  }, [campanhaId, mes]);

  useEffect(() => { void carregar(); }, [carregar]);

  const semanas = useMemo(() => montarMes(mes), [mes]);
  const porDia = useMemo(() => sessoesPorDia(dados?.sessoes ?? []), [dados]);
  const hoje = hojeIso();

  const executar = async (acao: () => Promise<unknown>) => {
    setOcupado(true);
    setErro('');
    try {
      await acao();
      await carregar();
      onMudou?.();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível concluir.');
    } finally {
      setOcupado(false);
    }
  };

  const marcarEspecial = () => {
    if (!selecionado) return;
    const instante = new Date(`${selecionado}T${hora}`);
    if (Number.isNaN(instante.getTime())) { setErro('Escolha uma hora válida.'); return; }
    void executar(async () => {
      await engajamentoApi.marcarEspecial(campanhaId, { em: instante.toISOString(), titulo, nota });
      setTitulo('');
      setNota('');
    });
  };

  const sessoesDoSelecionado = selecionado ? porDia.get(selecionado) ?? [] : [];

  return (
    <section className="qd-cal" aria-label="Calendário de sessões">
      <header className="qd-cal__cabeca">
        <h2 className="qd-cal__titulo"><CalendarClock size={17} aria-hidden="true" /> Calendário da mesa</h2>
        <div className="qd-cal__nav">
          <button type="button" aria-label="Mês anterior" onClick={() => setMes((atual) => somarMeses(atual, -1))} className="qd-botao-icone"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => setMes(mesDe(new Date()))} className="qd-cal__mes" title="Voltar para o mês atual">{rotuloDoMes(mes)}</button>
          <button type="button" aria-label="Próximo mês" onClick={() => setMes((atual) => somarMeses(atual, 1))} className="qd-botao-icone"><ChevronRight size={16} /></button>
        </div>
      </header>

      {dados?.proxima ? (
        <p className="qd-cal__proxima">
          <BellRing size={15} aria-hidden="true" />
          <span>
            <strong>Próxima: {dados.proxima.texto}</strong>, {formatarDataDaSessao(dados.proxima.em)}
            {dados.proxima.titulo ? <> · {dados.proxima.titulo}</> : null}
          </span>
        </p>
      ) : (
        <p className="qd-cal__info">{dados ? 'Nenhuma sessão marcada ainda.' : 'Carregando...'}</p>
      )}
      {dados?.recorrencia || dados?.proxima?.nota ? (
        <p className="qd-cal__info">
          {dados?.recorrencia ? <>{dados.recorrencia.texto}{dados.recorrencia.titulo ? `: ${dados.recorrencia.titulo}` : ''}.</> : null}
          {dados?.proxima?.nota ? <> {dados.proxima.nota}</> : null}
        </p>
      ) : null}

      <div className="qd-cal__grade" role="grid" aria-label={rotuloDoMes(mes)}>
        {DIAS_CURTOS.map((dia) => <div key={dia} className="qd-cal__semana" role="columnheader">{dia}</div>)}
        {semanas.flat().map((celula, indice) => {
          if (!celula.data) return <div key={`vazio-${indice}`} role="gridcell" />;
          const sessoes = porDia.get(celula.data) ?? [];
          const ehHoje = celula.data === hoje;
          const ativo = selecionado === celula.data;
          const classe = [
            'qd-cal__dia',
            ehHoje ? 'is-hoje' : '',
            ativo ? 'is-ativo' : '',
            sessoes.length ? 'tem-sessao' : '',
            celula.data < hoje ? 'is-passado' : '',
          ].filter(Boolean).join(' ');
          const conteudo = (
            <>
              <span className="qd-cal__num">{celula.dia}</span>
              {sessoes.map((sessao, i) => (
                <span key={`${sessao.em}-${i}`} className={`qd-cal__sessao ${classeDaSessao(sessao)}`} title={`${sessao.titulo || (sessao.tipo === 'fixa' ? 'Sessão fixa' : 'Sessão especial')}${sessao.cancelada ? ' (cancelada)' : ''}`}>
                  {horaLocal(sessao.em)}
                </span>
              ))}
            </>
          );
          return editavel ? (
            <button key={celula.data} type="button" role="gridcell" aria-selected={ativo} aria-label={`${celula.dia} de ${rotuloDoMes(mes)}${sessoes.length ? `, ${sessoes.length} sessão(ões)` : ''}`} onClick={() => setSelecionado(ativo ? null : celula.data)} className={classe}>{conteudo}</button>
          ) : (
            <div key={celula.data} role="gridcell" className={classe} aria-current={ehHoje ? 'date' : undefined}>{conteudo}</div>
          );
        })}
      </div>

      <ul className="qd-cal__legenda">
        <li><i className="fixa" /> Sessão fixa</li>
        <li><i className="especial" /> Sessão especial</li>
        <li><i className="cancelada" /> Cancelada</li>
      </ul>

      {erro ? <p role="alert" className="qd-erro mt-3">{erro}</p> : null}

      {editavel && selecionado ? (
        <div className="qd-cal__dia-aberto">
          <div className="flex items-center justify-between gap-2">
            <h3>{new Date(`${selecionado}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            <button type="button" aria-label="Fechar o dia" onClick={() => setSelecionado(null)} className="qd-botao-icone"><X size={15} /></button>
          </div>
          {sessoesDoSelecionado.map((sessao, i) => (
            <div key={`${sessao.em}-${i}`} className={`qd-cal__linha-sessao ${sessao.cancelada ? 'is-cancelada' : ''}`}>
              <span>{horaLocal(sessao.em)} · {sessao.tipo === 'fixa' ? 'Sessão fixa' : 'Sessão especial'}{sessao.titulo ? `: ${sessao.titulo}` : ''}</span>
              {sessao.tipo === 'fixa' ? (
                <button type="button" disabled={ocupado} onClick={() => void executar(() => engajamentoApi.alternarCancelamento(campanhaId, sessao.data))} className="qd-botao qd-botao--fantasma qd-botao--mini">
                  {sessao.cancelada ? <><RotateCcw size={12} aria-hidden="true" /> Restaurar</> : <><X size={12} aria-hidden="true" /> Cancelar esta semana</>}
                </button>
              ) : sessao.id ? (
                <button type="button" disabled={ocupado} aria-label="Apagar a sessão especial" onClick={() => void executar(() => engajamentoApi.apagarEspecial(campanhaId, sessao.id as string))} className="qd-botao-icone qd-botao-icone--perigo"><Trash2 size={13} /></button>
              ) : null}
            </div>
          ))}
          <form className="grid gap-2" onSubmit={(evento) => { evento.preventDefault(); marcarEspecial(); }}>
            <p className="qd-cal__rotulo">Marcar sessão especial neste dia</p>
            <div className="qd-cal__dupla">
              <input type="time" value={hora} onChange={(evento) => setHora(evento.target.value)} aria-label="Hora" className="qd-campo" />
              <input value={titulo} maxLength={120} onChange={(evento) => setTitulo(evento.target.value)} placeholder="Título (opcional)" aria-label="Título da sessão especial" className="qd-campo" />
            </div>
            <input value={nota} maxLength={600} onChange={(evento) => setNota(evento.target.value)} placeholder="Recado para o grupo (opcional)" aria-label="Recado" className="qd-campo" />
            <div>
              <button type="submit" disabled={ocupado} className="qd-botao qd-botao--especial"><Plus size={14} aria-hidden="true" /> Marcar e avisar a mesa</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
};

export default CalendarioSessoes;
