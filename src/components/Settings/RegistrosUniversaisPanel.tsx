import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Crown, Loader2, Pencil, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useResolvedWorld } from '../../hooks/useResolvedWorld';
import {
  registrosUniversaisApi,
  type IDadosRegistro,
  type IRegistroDoServidor,
  type RevelacaoRegistro,
} from '../../services/registrosUniversaisApi';
import { registrosDeFabrica } from '../../pages/Mundo/universais/dadosPadrao';
import { EditorDeRegistro } from '../../pages/Mundo/universais/EditorDeRegistro';
import {
  ROTULO_REVELACAO,
  SECOES_UNIVERSAIS,
  filtrarRegistros,
  mesclarRegistros,
  type IRegistro,
  type ISecaoUniversal,
} from '../../pages/Mundo/universais/registros';

interface IRegistrosUniversaisPanelProps {
  campanhaId: string;
  /** Seres e locais são lore e têm a própria aba: este atalho leva até ela. */
  onAbrirLore?: () => void;
}

const REVELACOES: RevelacaoRegistro[] = ['aberto', 'rasurado', 'oculto'];

/** O editor dos Registros Universais da campanha: todos os registros (de fábrica e do Mestre),
 * de todas as seções, com a revelação de cada um a um toque. */
export function RegistrosUniversaisPanel({ campanhaId, onAbrirLore }: IRegistrosUniversaisPanelProps) {
  const { catalog, factions } = useResolvedWorld(campanhaId);
  const [doServidor, setDoServidor] = useState<IRegistroDoServidor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [secao, setSecao] = useState<ISecaoUniversal>(SECOES_UNIVERSAIS[0]);
  const [busca, setBusca] = useState('');
  const [editor, setEditor] = useState<{ registro: IRegistro | null } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    registrosUniversaisApi.obter(campanhaId)
      .then((resposta) => { if (ativo) setDoServidor(resposta.registros); })
      .catch((falha) => { if (ativo) setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar os registros.'); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [campanhaId]);

  const fabrica = useMemo(() => registrosDeFabrica({ catalog, factions, isMestre: true, loreRevelado: [], loreOculto: [] }), [catalog, factions]);
  const todos = useMemo(() => mesclarRegistros(fabrica, doServidor, true), [fabrica, doServidor]);
  const daSecao = useMemo(() => todos.filter((registro) => registro.secao === secao.id), [todos, secao.id]);
  const lista = useMemo(() => filtrarRegistros(daSecao, busca, '', true).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR')), [daSecao, busca]);

  const salvar = useCallback(async (registro: IRegistro | null, dados: IDadosRegistro, revelacao: RevelacaoRegistro) => {
    const resposta = registro?.serverId
      ? await registrosUniversaisApi.editar(campanhaId, registro.serverId, { secao: secao.id, revelacao, dados })
      : await registrosUniversaisApi.salvar(campanhaId, { secao: secao.id, origem_id: registro?.origemId ?? null, revelacao, dados });
    setDoServidor(resposta.registros);
    setEditor(null);
  }, [campanhaId, secao.id]);

  const trocarRevelacao = async (registro: IRegistro, revelacao: RevelacaoRegistro) => {
    if (registro.revelacao === revelacao) return;
    setOcupado(registro.chave);
    setErro('');
    try {
      // Registro de fábrica sem ajuste nasce só com a revelação (dados vazios = usa o original).
      // Registro que já foi ajustado guarda de novo os mesmos campos, trocando só a revelação.
      const dados: IDadosRegistro = registro.serverId
        ? { titulo: registro.titulo, subtitulo: registro.subtitulo, descricao: registro.descricao, campos: registro.campos, blocos: registro.blocos, etiquetas: registro.etiquetas }
        : {};
      await salvar(registro, dados, revelacao);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar.');
    } finally {
      setOcupado(null);
    }
  };

  const desfazer = async (registro: IRegistro) => {
    if (!registro.serverId) return;
    const resposta = await registrosUniversaisApi.apagar(campanhaId, registro.serverId);
    setDoServidor(resposta.registros);
    setEditor(null);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.05] px-4 py-3 text-xs leading-5 text-gray-300">
        Os Registros Universais desta campanha: criaturas, seres, facções, locais, artefatos, personagens, glossário e rumores. Edite qualquer um e escolha o que os jogadores enxergam. Seções inteiras se escondem em <strong className="text-white">Visibilidade</strong>.
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Seções dos registros">
        {SECOES_UNIVERSAIS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={item.id === secao.id} onClick={() => { setSecao(item); setBusca(''); }} className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold ${item.id === secao.id ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-100' : 'border-white/10 text-gray-400 hover:text-white'}`}>
            {item.rotulo} <span className="text-gray-500">{todos.filter((registro) => registro.secao === item.id).length}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block min-w-[12rem] flex-1">
          <span className="sr-only">Buscar</span>
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar nesta seção..." className="min-h-11 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan-300/50" />
        </label>
        <button type="button" onClick={() => setEditor({ registro: null })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 text-xs font-bold text-cyan-100 hover:bg-cyan-300/20"><Plus size={14} /> {secao.novo}</button>
      </div>

      {erro ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{erro}</p> : null}
      {carregando ? <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Carregando...</p> : null}

      {(secao.id === 'seres' || secao.id === 'locais') ? (
        <p className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-xs leading-5 text-amber-100/80">
          Os registros de fábrica desta seção são lore do Mundo: o texto deles se edita na aba <button type="button" onClick={onAbrirLore} className="font-bold underline">Lore</button>, e a liberação para os jogadores está em Visibilidade. Aqui você cria registros novos.
        </p>
      ) : null}

      {lista.length === 0 && !carregando ? <p className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-gray-500">Nenhum registro {busca ? 'com essa busca' : 'nesta seção ainda'}.</p> : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-black/25">
          {lista.map((registro) => (
            <li key={registro.chave} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{registro.titulo || '(sem nome)'}</p>
                <p className="truncate text-[11px] text-gray-500">
                  {registro.subtitulo || registro.etiquetas[0] || ' '}
                  {registro.proprio ? ' · do Mestre' : registro.editado ? ' · ajustado' : ' · de fábrica'}
                </p>
              </div>
              <div className="flex overflow-hidden rounded-lg border border-white/10" role="group" aria-label={`Revelação de ${registro.titulo}`}>
                {REVELACOES.map((opcao) => (
                  <button key={opcao} type="button" disabled={ocupado === registro.chave || registro.editor === 'lore'} aria-pressed={registro.revelacao === opcao} title={ROTULO_REVELACAO[opcao]} onClick={() => void trocarRevelacao(registro, opcao)} className={`min-h-9 px-3 text-[11px] font-bold capitalize disabled:opacity-40 ${registro.revelacao === opcao ? 'bg-cyan-300/20 text-cyan-100' : 'text-gray-500 hover:text-white'}`}>{opcao}</button>
                ))}
              </div>
              {registro.editor === 'servidor' ? <button type="button" onClick={() => setEditor({ registro })} aria-label={`Editar ${registro.titulo}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:text-white"><Pencil size={14} /></button> : <span className="w-9" />}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-4 border-t border-white/10 pt-4 text-xs text-gray-400">
        <Link to="/mundo/calendario" className="inline-flex items-center gap-1.5 hover:text-white"><CalendarDays size={13} /> Calendário e estações (edite na própria página)</Link>
        <Link to="/campanha" className="inline-flex items-center gap-1.5 hover:text-white"><Crown size={13} /> Capa, cor e frase da campanha (edite na página da campanha)</Link>
      </div>

      {editor ? (
        <EditorDeRegistro
          secao={secao}
          registro={editor.registro}
          onSalvar={(dados, revelacao) => salvar(editor.registro, dados, revelacao)}
          onDesfazer={editor.registro?.serverId ? () => desfazer(editor.registro as IRegistro) : undefined}
          onFechar={() => setEditor(null)}
        />
      ) : null}
    </div>
  );
}
