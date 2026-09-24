import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Copy, Eye, EyeOff, Pencil, Plus, Search, Trash2, Undo2 } from 'lucide-react';
import {
  calendarioMundoApi,
  type ChaveEstacao,
  type ICalendarioMundo,
  type IEventoDoMestre,
  type Repeticao,
  type Revelacao,
} from '../../services/calendarioMundoApi';
import { atalhosDeTempo, rotuloDoEvento, tempoDesde } from './calendarioMundo';

const ROTULO_DO_TIPO = { fixo: 'dia fixo', extra: 'dia a mais', aleatorio: 'dia sorteado' } as const;

const REPETICOES: Array<{ id: Repeticao; rotulo: string }> = [
  { id: 'unico', rotulo: 'Só uma vez' },
  { id: 'mensal', rotulo: 'Todo mês' },
  { id: 'anual', rotulo: 'Todo ano' },
];

const campo = 'w-full min-h-11 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/50';
const botao = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-200 transition hover:bg-white/10 hover:text-white disabled:opacity-40';
const cartao = 'space-y-5 rounded-3xl border border-yellow-600/20 bg-[#0c0b11]/85 p-5';
const tituloDoCartao = 'text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-500';

const REVELACOES: Array<{ id: Revelacao; rotulo: string; ajuda: string }> = [
  { id: 'oculto', rotulo: 'Oculto', ajuda: 'Os jogadores nem sabem que existe.' },
  { id: 'rasurado', rotulo: 'Rasurado', ajuda: 'Veem que algo acontece nesse dia, sem saber o quê.' },
  { id: 'aberto', rotulo: 'Aberto', ajuda: 'Título e texto à vista.' },
];

type FiltroDeEventos = 'todos' | Revelacao | 'passaram';

const FILTROS: Array<{ id: FiltroDeEventos; rotulo: string }> = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'oculto', rotulo: 'Ocultos' },
  { id: 'rasurado', rotulo: 'Rasurados' },
  { id: 'aberto', rotulo: 'Abertos' },
  { id: 'passaram', rotulo: 'Já passaram' },
];

/** Data escolhida no calendário para o Mestre marcar um acontecimento. `n` muda a cada pedido, para repetir o mesmo dia funcionar. */
export interface IPreenchimento {
  mes: number;
  dia: number;
  ano: number;
  n: number;
}

interface IPainelProps {
  campanhaId: string;
  dados: ICalendarioMundo;
  ocupado: boolean;
  agir: (acao: () => Promise<ICalendarioMundo>) => Promise<void>;
  preencher: IPreenchimento | null;
}

/** Só o Mestre (e o criador da plataforma): mexer no tempo do mundo e cuidar dos acontecimentos. */
export const PainelCalendarioMestre = ({ campanhaId, dados, ocupado, agir, preencher }: IPainelProps) => {
  const meses = dados.config.meses;
  const eventos = dados.todos_eventos ?? [];
  const historico = dados.historico ?? [];
  const eventosDoAno = dados.eventos_do_ano ?? [];
  const diasExtrasCriados = dados.config.dias_extras_criados ?? [];
  const mesesParaDiaExtra = dados.config.meses_para_dia_extra ?? [];

  const [ano, setAno] = useState(String(dados.hoje.ano));
  const [mes, setMes] = useState(dados.hoje.mes);
  const [dia, setDia] = useState(String(dados.hoje.dia));
  const [dias, setDias] = useState('7');
  const [nomesMeses, setNomesMeses] = useState<string[] | null>(null);

  const [titulo, setTitulo] = useState('');
  const [nota, setNota] = useState('');
  const [eMes, setEMes] = useState(dados.hoje.mes);
  const [eDia, setEDia] = useState(String(dados.hoje.dia));
  const [eAno, setEAno] = useState(String(dados.hoje.ano));
  const [repeticao, setRepeticao] = useState<Repeticao>('unico');
  const [duracao, setDuracao] = useState('1');
  const [revelacao, setRevelacao] = useState<Revelacao>('rasurado');
  const [extraMes, setExtraMes] = useState<number | null>(null);
  const [extraNome, setExtraNome] = useState('');
  const [extraDescricao, setExtraDescricao] = useState('');
  const tituloRef = useRef<HTMLInputElement>(null);

  const [filtro, setFiltro] = useState<FiltroDeEventos>('todos');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<string | null>(null);

  useEffect(() => {
    setAno(String(dados.hoje.ano));
    setMes(dados.hoje.mes);
    setDia(String(dados.hoje.dia));
  }, [dados.hoje.ano, dados.hoje.mes, dados.hoje.dia]);

  useEffect(() => {
    if (!preencher) return;
    setEMes(preencher.mes);
    setEDia(String(preencher.dia));
    setEAno(String(preencher.ano));
    setRepeticao('unico');
    setDuracao('1');
    document.getElementById('marcar-acontecimento')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    tituloRef.current?.focus({ preventScroll: true });
  }, [preencher]);

  const atalhos = useMemo(
    () => atalhosDeTempo(dados.hoje, dados.config, dados.proximos),
    [dados.hoje, dados.config, dados.proximos],
  );

  const escondidosQueJaPassaram = eventos.filter((evento) => evento.passou && evento.revelacao !== 'aberto').length;

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return eventos.filter((evento) => {
      if (filtro === 'passaram' ? !evento.passou : filtro !== 'todos' && evento.revelacao !== filtro) return false;
      return !termo || `${evento.titulo} ${evento.nota}`.toLocaleLowerCase('pt-BR').includes(termo);
    });
  }, [eventos, filtro, busca]);

  const moverTempo = (quantidade: number) => void agir(() => calendarioMundoApi.avancar(campanhaId, quantidade));
  const ultimaMudanca = historico[0];

  const duplicar = (evento: IEventoDoMestre) => {
    setTitulo(evento.titulo);
    setNota(evento.nota);
    setEMes(evento.mes);
    setEDia(String(evento.dia));
    setEAno(String(evento.ano ?? dados.hoje.ano));
    setRepeticao(evento.repeticao);
    setDuracao(String(evento.duracao));
    setRevelacao(evento.revelacao);
    document.getElementById('marcar-acontecimento')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    tituloRef.current?.focus({ preventScroll: true });
  };

  return (
    <section className="grid gap-6 lg:grid-cols-2" aria-label="Ferramentas do Mestre">
      <div className={cartao}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className={tituloDoCartao}>Mexer no tempo</h3>
          <p className="text-xs text-gray-500">Hoje: {dados.hoje_extenso}</p>
        </div>

        <div>
          <p className="mb-2 text-xs text-gray-400">Avançar ou voltar o dia do mundo</p>
          <div className="flex flex-wrap gap-2">
            {[-30, -7, -3, -1, 1, 3, 7, 30].map((quantidade) => (
              <button key={quantidade} type="button" className={botao} disabled={ocupado} onClick={() => moverTempo(quantidade)}>
                {quantidade > 0 ? '+' : '−'}{Math.abs(quantidade)}
              </button>
            ))}
            <input className={`${campo} !w-20`} type="number" value={dias} onChange={(evento) => setDias(evento.target.value)} aria-label="Quantidade de dias (negativa volta no tempo)" />
            <button type="button" className={botao} disabled={ocupado || !Number(dias)} onClick={() => moverTempo(Number(dias))}>Aplicar</button>
          </div>
        </div>

        {atalhos.length ? (
          <div>
            <p className="mb-2 text-xs text-gray-400">Pular até</p>
            <div className="flex flex-wrap gap-2">
              {atalhos.map((atalho) => (
                <button key={atalho.id} type="button" className={botao} disabled={ocupado} onClick={() => moverTempo(atalho.dias)} title={`Avança ${atalho.dias} ${atalho.dias === 1 ? 'dia' : 'dias'}`}>
                  <CalendarClock size={13} /> {atalho.rotulo} <span className="font-normal text-gray-500">({atalho.dias === 1 ? 'amanhã' : `${atalho.dias} dias`})</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-xs text-gray-400">Definir a data de hoje</p>
          <div className="grid grid-cols-[4.5rem_1fr_4.5rem_auto] gap-2">
            <input className={campo} type="number" value={dia} min={1} max={dados.config.dias_por_mes[mes] ?? 28} onChange={(evento) => setDia(evento.target.value)} aria-label="Dia" />
            <select className={campo} value={mes} onChange={(evento) => setMes(Number(evento.target.value))} aria-label="Mês">{meses.map((nome, indice) => <option key={nome + indice} value={indice}>{nome}</option>)}</select>
            <input className={campo} type="number" value={ano} onChange={(evento) => setAno(evento.target.value)} aria-label="Ano" />
            <button type="button" className={botao} disabled={ocupado} onClick={() => void agir(() => calendarioMundoApi.definirHoje(campanhaId, { ano: Number(ano), mes, dia: Number(dia) }))}>Definir</button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-gray-400">Estação especial (vale até a estação do mês mudar)</p>
          <div className="flex flex-wrap gap-2">
            {([[null, 'Nenhuma'], ['noite_eterna', 'Noite Eterna'], ['eclipse', 'Eclipse']] as Array<[ChaveEstacao | null, string]>).map(([chave, rotulo]) => (
              <button key={rotulo} type="button" className={botao} aria-pressed={dados.estacao_especial === chave} style={dados.estacao_especial === chave ? { borderColor: '#c7a44c', color: '#f3dc8f' } : undefined} disabled={ocupado} onClick={() => void agir(() => calendarioMundoApi.estacaoEspecial(campanhaId, chave))}>{rotulo}</button>
            ))}
          </div>
        </div>

        <details className="rounded-2xl border border-white/[0.07] bg-black/25 p-3">
          <summary className="cursor-pointer text-xs font-bold text-gray-300">
            Eventos do ano ({eventosDoAno.filter((evento) => evento.ativo).length} de {eventosDoAno.length} ligados)
          </summary>
          <p className="mt-2 text-xs leading-5 text-gray-500">
            Valem para todas as Árvores: o mês só marca em que época do ano cada um cai. Os de dia sorteado caem num dia diferente a cada ano e os jogadores só os veem quando o dia chega. Desligar tira o evento do calendário desta campanha, sem mudar o tamanho do mês.
          </p>
          <ul className="mt-3 space-y-2">
            {eventosDoAno.map((evento) => (
              <li key={evento.id}>
                <label className="flex cursor-pointer items-start gap-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={evento.ativo}
                    disabled={ocupado}
                    onChange={(alvo) => {
                      const desligados = eventosDoAno.filter((item) => !item.ativo && item.id !== evento.id).map((item) => item.id);
                      void agir(() => calendarioMundoApi.config(campanhaId, { eventos_desligados: alvo.target.checked ? desligados : [...desligados, evento.id] }));
                    }}
                  />
                  <span className="min-w-0">
                    <span className={evento.ativo ? 'font-bold text-white' : 'font-bold text-gray-500 line-through'}>{evento.nome}</span>
                    <span className="block text-[10px] uppercase tracking-widest text-gray-500">
                      {meses[evento.mes]} · {ROTULO_DO_TIPO[evento.tipo]}{evento.tipo === 'aleatorio' ? `: neste ano, dia ${evento.dia}` : `: dia ${evento.dia}`}{evento.duracao > 1 ? `, dura ${evento.duracao} dias` : ''}{evento.criado ? ' · criado por você' : ''}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </details>

        <details className="rounded-2xl border border-white/[0.07] bg-black/25 p-3">
          <summary className="cursor-pointer text-xs font-bold text-gray-300">
            Dias a mais nos meses ({diasExtrasCriados.length} criados)
          </summary>
          <p className="mt-2 text-xs leading-5 text-gray-500">
            Dá um dia 29 a um mês que tem 28 dias, com nome e texto. Vale só para esta campanha e aparece como qualquer dia a mais do calendário.
          </p>
          {diasExtrasCriados.length ? (
            <ul className="mt-3 space-y-2">
              {diasExtrasCriados.map((extra) => (
                <li key={extra.mes} className="flex items-start justify-between gap-2 rounded-xl border border-white/[0.07] bg-black/25 p-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{extra.nome}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">dia 29 · {meses[extra.mes]}</p>
                    {extra.descricao ? <p className="mt-1 text-xs leading-5 text-gray-400">{extra.descricao}</p> : null}
                  </div>
                  <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-gray-500 hover:text-red-400" aria-label={`Apagar o dia a mais ${extra.nome}`} disabled={ocupado} onClick={() => { if (window.confirm(`Apagar o dia a mais "${extra.nome}"? Acontecimentos marcados nele vão para o dia 28.`)) void agir(() => calendarioMundoApi.apagarDiaExtra(campanhaId, extra.mes)); }}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          ) : null}
          {mesesParaDiaExtra.length ? (
            <form
              className="mt-3 space-y-2"
              onSubmit={(evento) => {
                evento.preventDefault();
                const mesEscolhido = extraMes ?? mesesParaDiaExtra[0];
                if (!extraNome.trim()) return;
                void agir(() => calendarioMundoApi.criarDiaExtra(campanhaId, { mes: mesEscolhido, nome: extraNome, descricao: extraDescricao })).then(() => { setExtraNome(''); setExtraDescricao(''); setExtraMes(null); });
              }}
            >
              <select className={campo} value={extraMes ?? mesesParaDiaExtra[0]} onChange={(evento) => setExtraMes(Number(evento.target.value))} aria-label="Mês que ganha o dia a mais">
                {mesesParaDiaExtra.map((indice) => <option key={indice} value={indice}>{meses[indice]}</option>)}
              </select>
              <input className={campo} value={extraNome} maxLength={40} onChange={(evento) => setExtraNome(evento.target.value)} placeholder="Nome do dia (ex.: Dia do Recomeço)" aria-label="Nome do dia a mais" />
              <textarea className={`${campo} min-h-16`} value={extraDescricao} maxLength={300} onChange={(evento) => setExtraDescricao(evento.target.value)} placeholder="O que esse dia é (opcional)" aria-label="Texto do dia a mais" />
              <button type="submit" className={botao} disabled={ocupado || !extraNome.trim()}><Plus size={14} /> Criar dia a mais</button>
            </form>
          ) : <p className="mt-3 text-xs text-gray-600">Todos os meses já têm um dia a mais.</p>}
        </details>

        <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-gray-300">Últimas mudanças de data</p>
            <button type="button" className={botao} disabled={ocupado || !ultimaMudanca} onClick={() => void agir(() => calendarioMundoApi.desfazer(campanhaId))} title={ultimaMudanca ? `Desfaz: ${ultimaMudanca.texto}` : 'Nada para desfazer'}>
              <Undo2 size={13} /> Desfazer a última
            </button>
          </div>
          {historico.length ? (
            <ul className="mt-2 space-y-1">
              {historico.slice(0, 5).map((mudanca, indice) => (
                <li key={`${mudanca.quando}-${indice}`} className="flex justify-between gap-3 text-xs text-gray-400">
                  <span className={indice === 0 ? 'text-gray-200' : undefined}>{mudanca.texto}</span>
                  <span className="shrink-0 text-gray-600">{tempoDesde(mudanca.quando)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-xs text-gray-600">Ainda não houve mudanças.</p>}
        </div>

        <label className="flex items-start gap-2 text-xs leading-5 text-gray-400">
          <input type="checkbox" className="mt-0.5" checked={Boolean(dados.config.sincronizar_discord)} onChange={(evento) => void agir(() => calendarioMundoApi.config(campanhaId, { sincronizar_discord: evento.target.checked }))} />
          Manter a estação do Discord igual à do calendário (o Jornalista usa a estação para sortear o loot).
        </label>
        <details>
          <summary className="cursor-pointer text-xs font-bold text-gray-400 hover:text-white">Renomear os meses</summary>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(nomesMeses ?? meses).map((nome, indice) => (
              <input key={indice} className={campo} value={nome} maxLength={24} aria-label={`Nome do mês ${indice + 1}`} onChange={(evento) => setNomesMeses((atual) => (atual ?? meses).map((item, i) => (i === indice ? evento.target.value : item)))} />
            ))}
          </div>
          <button type="button" className={`${botao} mt-3`} disabled={ocupado || !nomesMeses || nomesMeses.some((nome) => !nome.trim())} onClick={() => { if (nomesMeses) void agir(() => calendarioMundoApi.config(campanhaId, { meses: nomesMeses })).then(() => setNomesMeses(null)); }}>Salvar nomes</button>
        </details>
      </div>

      <div className={cartao}>
        <h3 className={tituloDoCartao}>Acontecimentos</h3>
        <form
          id="marcar-acontecimento"
          className="space-y-3"
          onSubmit={(evento) => {
            evento.preventDefault();
            if (!titulo.trim()) return;
            void agir(() => calendarioMundoApi.criarEvento(campanhaId, { titulo, nota, mes: eMes, dia: Number(eDia), ano: repeticao === 'unico' ? Number(eAno) : null, anual: repeticao === 'anual', repeticao, duracao: Math.max(1, Number(duracao) || 1), revelacao })).then(() => { setTitulo(''); setNota(''); setDuracao('1'); });
          }}
        >
          <input ref={tituloRef} className={campo} value={titulo} maxLength={80} onChange={(evento) => setTitulo(evento.target.value)} placeholder="Ex.: Festa da Colheita, o selo se rompe" aria-label="Título do acontecimento" />
          <textarea className={`${campo} min-h-20`} value={nota} maxLength={600} onChange={(evento) => setNota(evento.target.value)} placeholder="O que acontece (só aparece quando estiver aberto)" aria-label="Texto do acontecimento" />
          <div className="grid grid-cols-[4.5rem_1fr_5rem] gap-2">
            <input className={campo} type="number" min={1} max={repeticao === 'mensal' ? 28 : dados.config.dias_por_mes[eMes] ?? 28} value={eDia} onChange={(evento) => setEDia(evento.target.value)} aria-label="Dia do acontecimento" />
            <select className={campo} value={eMes} disabled={repeticao === 'mensal'} onChange={(evento) => setEMes(Number(evento.target.value))} aria-label="Mês do acontecimento">{meses.map((nome, indice) => <option key={nome + indice} value={indice}>{nome}</option>)}</select>
            <input className={campo} type="number" value={eAno} disabled={repeticao !== 'unico'} onChange={(evento) => setEAno(evento.target.value)} aria-label="Ano do acontecimento" />
          </div>
          <CamposDeRepeticao repeticao={repeticao} aoMudarRepeticao={setRepeticao} duracao={duracao} aoMudarDuracao={setDuracao} />
          <div role="group" aria-label="Quanto os jogadores enxergam" className="grid gap-2 sm:grid-cols-3">
            {REVELACOES.map((opcao) => (
              <button key={opcao.id} type="button" aria-pressed={revelacao === opcao.id} onClick={() => setRevelacao(opcao.id)} className="rounded-xl border p-2.5 text-left transition" style={{ borderColor: revelacao === opcao.id ? '#c7a44c' : 'rgba(255,255,255,0.1)', backgroundColor: revelacao === opcao.id ? 'rgba(199,164,76,0.12)' : 'transparent' }}>
                <span className="block text-xs font-bold text-white">{opcao.rotulo}</span>
                <span className="block text-[11px] leading-4 text-gray-500">{opcao.ajuda}</span>
              </button>
            ))}
          </div>
          <button type="submit" className={botao} disabled={ocupado || !titulo.trim()}><Plus size={14} /> Marcar no calendário</button>
        </form>

        <div className="border-t border-white/[0.07] pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-gray-300">Todos os acontecimentos ({eventos.length})</p>
            <button
              type="button"
              className={botao}
              disabled={ocupado || escondidosQueJaPassaram === 0}
              title="Abre para os jogadores tudo que já aconteceu e ainda estava escondido"
              onClick={() => { if (window.confirm(`Abrir ${escondidosQueJaPassaram} ${escondidosQueJaPassaram === 1 ? 'acontecimento que já passou' : 'acontecimentos que já passaram'} para os jogadores? A mesa será avisada.`)) void agir(() => calendarioMundoApi.revelarPassados(campanhaId)); }}
            >
              <Eye size={13} /> Revelar o que já passou{escondidosQueJaPassaram ? ` (${escondidosQueJaPassaram})` : ''}
            </button>
          </div>

          {eventos.length ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {FILTROS.map((opcao) => (
                  <button key={opcao.id} type="button" aria-pressed={filtro === opcao.id} onClick={() => setFiltro(opcao.id)} className="rounded-full border px-3 py-1 text-[11px] font-bold transition" style={{ borderColor: filtro === opcao.id ? '#c7a44c' : 'rgba(255,255,255,0.1)', color: filtro === opcao.id ? '#f3dc8f' : '#9ca3af' }}>{opcao.rotulo}</button>
                ))}
                <label className="relative ml-auto min-w-[9rem] flex-1 sm:max-w-[13rem]">
                  <span className="sr-only">Buscar acontecimento</span>
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input className={`${campo} !min-h-9 !py-1 pl-8 text-xs`} value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar..." />
                </label>
              </div>
              {visiveis.length === 0 ? <p className="text-sm text-gray-500">Nenhum acontecimento neste filtro.</p> : (
                <ul className="space-y-2">
                  {visiveis.map((evento) => (
                    <LinhaDeAcontecimento
                      key={evento.id}
                      evento={evento}
                      meses={meses}
                      diasPorMes={dados.config.dias_por_mes}
                      campanhaId={campanhaId}
                      ocupado={ocupado}
                      agir={agir}
                      editando={editando === evento.id}
                      alternarEdicao={() => setEditando((atual) => (atual === evento.id ? null : evento.id))}
                      duplicar={() => duplicar(evento)}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : <p className="text-sm text-gray-500">Nenhum acontecimento marcado ainda.</p>}
        </div>
      </div>
    </section>
  );
};

interface ICamposDeRepeticaoProps {
  repeticao: Repeticao;
  aoMudarRepeticao: (valor: Repeticao) => void;
  duracao: string;
  aoMudarDuracao: (valor: string) => void;
}

/** Quando repete (uma vez, todo mês, todo ano) e quantos dias dura. */
const CamposDeRepeticao = ({ repeticao, aoMudarRepeticao, duracao, aoMudarDuracao }: ICamposDeRepeticaoProps) => (
  <div className="grid gap-2 sm:grid-cols-2">
    <label className="text-xs text-gray-400">
      <span className="mb-1 block">Repete</span>
      <select className={campo} value={repeticao} onChange={(evento) => aoMudarRepeticao(evento.target.value as Repeticao)} aria-label="Quando o acontecimento se repete">
        {REPETICOES.map((opcao) => <option key={opcao.id} value={opcao.id}>{opcao.rotulo}</option>)}
      </select>
    </label>
    <div className="text-xs text-gray-400">
      <span className="mb-1 block">Dura (dias)</span>
      <div className="flex gap-2">
        <input className={campo} type="number" min={1} max={28} value={duracao} onChange={(evento) => aoMudarDuracao(evento.target.value)} aria-label="Quantos dias dura" />
        <button type="button" className={`${botao} shrink-0 whitespace-nowrap`} title="Uma semana, 7 dias" onClick={() => aoMudarDuracao('7')}>Semana</button>
      </div>
    </div>
  </div>
);

interface ILinhaProps {
  evento: IEventoDoMestre;
  meses: string[];
  diasPorMes: number[];
  campanhaId: string;
  ocupado: boolean;
  agir: IPainelProps['agir'];
  editando: boolean;
  alternarEdicao: () => void;
  duplicar: () => void;
}

const LinhaDeAcontecimento = ({ evento, meses, diasPorMes, campanhaId, ocupado, agir, editando, alternarEdicao, duplicar }: ILinhaProps) => {
  const [titulo, setTitulo] = useState(evento.titulo);
  const [nota, setNota] = useState(evento.nota);
  const [mes, setMes] = useState(evento.mes);
  const [dia, setDia] = useState(String(evento.dia));
  const [ano, setAno] = useState(String(evento.ano ?? 1));
  const [repeticao, setRepeticao] = useState<Repeticao>(evento.repeticao);
  const [duracao, setDuracao] = useState(String(evento.duracao));

  useEffect(() => {
    if (!editando) return;
    setTitulo(evento.titulo);
    setNota(evento.nota);
    setMes(evento.mes);
    setDia(String(evento.dia));
    setAno(String(evento.ano ?? 1));
    setRepeticao(evento.repeticao);
    setDuracao(String(evento.duracao));
  }, [editando, evento]);

  const salvar = () => {
    void agir(() => calendarioMundoApi.editarEvento(campanhaId, evento.id, {
      titulo, nota, mes, dia: Number(dia), repeticao, anual: repeticao === 'anual', duracao: Math.max(1, Number(duracao) || 1),
      ...(repeticao === 'unico' ? { ano: Number(ano) } : {}),
    })).then(alternarEdicao);
  };

  return (
    <li className="rounded-xl border border-white/[0.07] bg-black/25 p-2.5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{evento.titulo}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-500">
            dia {evento.dia}{evento.repeticao === 'mensal' ? '' : ` · ${meses[evento.mes]}`}{evento.repeticao === 'unico' && evento.ano !== null ? `, ano ${evento.ano}` : ''} · {rotuloDoEvento(evento)}{evento.passou ? ' · já passou' : ''}
          </p>
        </div>
        <select className="min-h-9 rounded-lg border border-white/10 bg-black/40 px-2 text-xs text-gray-200" value={evento.revelacao} aria-label={`Revelação de ${evento.titulo}`} disabled={ocupado} onChange={(e) => void agir(() => calendarioMundoApi.editarEvento(campanhaId, evento.id, { revelacao: e.target.value as Revelacao }))}>
          {REVELACOES.map((opcao) => <option key={opcao.id} value={opcao.id}>{opcao.rotulo}</option>)}
        </select>
        {evento.revelacao === 'oculto' ? <EyeOff size={14} className="text-amber-300" aria-label="Oculto dos jogadores" /> : null}
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-500 hover:text-white" aria-label={`Editar ${evento.titulo}`} aria-pressed={editando} onClick={alternarEdicao}><Pencil size={14} /></button>
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-500 hover:text-white" aria-label={`Duplicar ${evento.titulo}`} title="Copiar para o formulário, para marcar em outra data" onClick={duplicar}><Copy size={14} /></button>
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-500 hover:text-red-400" aria-label={`Apagar ${evento.titulo}`} onClick={() => { if (window.confirm(`Apagar "${evento.titulo}" do calendário?`)) void agir(() => calendarioMundoApi.apagarEvento(campanhaId, evento.id)); }}><Trash2 size={14} /></button>
      </div>

      {editando ? (
        <div className="mt-3 space-y-2 border-t border-white/[0.07] pt-3">
          <input className={campo} value={titulo} maxLength={80} onChange={(e) => setTitulo(e.target.value)} aria-label="Título" />
          <textarea className={`${campo} min-h-16`} value={nota} maxLength={600} onChange={(e) => setNota(e.target.value)} aria-label="Texto" />
          <div className="grid grid-cols-[4.5rem_1fr_5rem] gap-2">
            <input className={campo} type="number" min={1} max={repeticao === 'mensal' ? 28 : diasPorMes[mes] ?? 28} value={dia} onChange={(e) => setDia(e.target.value)} aria-label="Dia" />
            <select className={campo} value={mes} disabled={repeticao === 'mensal'} onChange={(e) => setMes(Number(e.target.value))} aria-label="Mês">{meses.map((nome, indice) => <option key={nome + indice} value={indice}>{nome}</option>)}</select>
            <input className={campo} type="number" value={ano} disabled={repeticao !== 'unico'} onChange={(e) => setAno(e.target.value)} aria-label="Ano" />
          </div>
          <CamposDeRepeticao repeticao={repeticao} aoMudarRepeticao={setRepeticao} duracao={duracao} aoMudarDuracao={setDuracao} />
          <div className="flex gap-2">
            <button type="button" className={botao} disabled={ocupado || !titulo.trim()} onClick={salvar}>Salvar</button>
            <button type="button" className={botao} onClick={alternarEdicao}>Cancelar</button>
          </div>
        </div>
      ) : null}
    </li>
  );
};
