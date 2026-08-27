import { useEffect, useMemo, useState } from 'react';
import { Search, PackagePlus, UserCog, Loader2, Users, FolderPlus, Folder, FolderX, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { PersonagemApiRecord } from '../../services/personagensApi';
import { RACAS_CATALOGO, CLASSES_CATALOGO } from '../../services/catalogoService';

interface MembroCampanha {
  id: string;
  nome_exibicao: string;
}

interface PastaPersonagens {
  id: string;
  nome: string;
}

interface PersonagensPainelProps {
  personagens: PersonagemApiRecord[];
  membros: MembroCampanha[];
  loading: boolean;
  busca: string;
  onBuscaChange: (valor: string) => void;
  transferindoId: string | null;
  erroTransferencia: string | null;
  onTransferir: (personagemId: string, novoDonoUsuarioId: string) => void;
  onConcederNovo: () => void;
  onConcederPara: (personagemId: string) => void;
}

const gerarId = () => (
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `pasta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
);

function tituloRaca(personagem: PersonagemApiRecord): string | null {
  const racaId = (personagem.ficha as any)?.racaId;
  if (!racaId) return null;
  return (RACAS_CATALOGO as any[]).find((r) => r.id === racaId)?.titulo || null;
}

function tituloClasses(personagem: PersonagemApiRecord): string | null {
  const classes = Array.isArray((personagem.ficha as any)?.classes) ? (personagem.ficha as any).classes : [];
  const nomes = classes
    .map((c: any) => (CLASSES_CATALOGO as any[]).find((catalogo) => catalogo.id === c?.classeId)?.titulo)
    .filter(Boolean);
  return nomes.length ? nomes.join(' / ') : null;
}

export const PersonagensPainel: React.FC<PersonagensPainelProps> = ({
  personagens,
  membros,
  loading,
  busca,
  onBuscaChange,
  transferindoId,
  erroTransferencia,
  onTransferir,
  onConcederNovo,
  onConcederPara,
}) => {
  const { campanhaAtiva, atualizarConfiguracoes } = useAuthStore();
  const config = campanhaAtiva?.configuracoes || {};

  const [pastas, setPastas] = useState<PastaPersonagens[]>(config.personagens_pastas || []);
  const [pastaPorPersonagem, setPastaPorPersonagem] = useState<Record<string, string>>(config.personagens_pasta_por_id || {});
  const [ordem, setOrdem] = useState<string[]>(config.personagens_ordem || []);
  const [pastaAtiva, setPastaAtiva] = useState<string>('todos');
  const [criandoPasta, setCriandoPasta] = useState(false);
  const [novaPastaNome, setNovaPastaNome] = useState('');

  useEffect(() => {
    setPastas(config.personagens_pastas || []);
    setPastaPorPersonagem(config.personagens_pasta_por_id || {});
    setOrdem(config.personagens_ordem || []);
    setPastaAtiva('todos');
  }, [campanhaAtiva?.id]);

  const persistir = (patch: Record<string, unknown>) => {
    void atualizarConfiguracoes(patch);
  };

  const ordemCompleta = useMemo(() => {
    const idsAtuais = new Set(personagens.map((p) => p.id));
    const conhecidos = ordem.filter((id) => idsAtuais.has(id));
    const faltando = personagens.map((p) => p.id).filter((id) => !conhecidos.includes(id));
    return [...conhecidos, ...faltando];
  }, [ordem, personagens]);

  const personagensOrdenados = useMemo(() => (
    ordemCompleta.map((id) => personagens.find((p) => p.id === id)).filter(Boolean) as PersonagemApiRecord[]
  ), [ordemCompleta, personagens]);

  const contagemPorPasta = useMemo(() => {
    const mapa: Record<string, number> = {};
    personagens.forEach((p) => {
      const pastaId = pastaPorPersonagem[p.id];
      if (pastaId) mapa[pastaId] = (mapa[pastaId] || 0) + 1;
    });
    return mapa;
  }, [personagens, pastaPorPersonagem]);

  const personagensFiltrados = useMemo(() => personagensOrdenados.filter((p) => {
    const passaBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
    const passaPasta = pastaAtiva === 'todos' || (pastaPorPersonagem[p.id] || '') === pastaAtiva;
    return passaBusca && passaPasta;
  }), [personagensOrdenados, busca, pastaAtiva, pastaPorPersonagem]);

  const criarPasta = () => {
    const nome = novaPastaNome.trim();
    if (!nome) return;
    const nova: PastaPersonagens = { id: gerarId(), nome };
    const proximasPastas = [...pastas, nova];
    setPastas(proximasPastas);
    persistir({ personagens_pastas: proximasPastas });
    setNovaPastaNome('');
    setCriandoPasta(false);
  };

  const excluirPasta = (pastaId: string) => {
    if (!window.confirm('Excluir esta pasta? Os personagens dela voltam pra "Sem pasta".')) return;
    const proximasPastas = pastas.filter((p) => p.id !== pastaId);
    const proximoMapa = { ...pastaPorPersonagem };
    Object.keys(proximoMapa).forEach((personagemId) => {
      if (proximoMapa[personagemId] === pastaId) delete proximoMapa[personagemId];
    });
    setPastas(proximasPastas);
    setPastaPorPersonagem(proximoMapa);
    persistir({ personagens_pastas: proximasPastas, personagens_pasta_por_id: proximoMapa });
    if (pastaAtiva === pastaId) setPastaAtiva('todos');
  };

  const moverParaPasta = (personagemId: string, pastaId: string) => {
    const proximoMapa = { ...pastaPorPersonagem };
    if (pastaId) proximoMapa[personagemId] = pastaId;
    else delete proximoMapa[personagemId];
    setPastaPorPersonagem(proximoMapa);
    persistir({ personagens_pasta_por_id: proximoMapa });
  };

  const moverNaOrdem = (personagemId: string, direcao: -1 | 1) => {
    const indiceFiltrado = personagensFiltrados.findIndex((p) => p.id === personagemId);
    const vizinho = personagensFiltrados[indiceFiltrado + direcao];
    if (!vizinho) return;
    const proximaOrdem = [...ordemCompleta];
    const indiceA = proximaOrdem.indexOf(personagemId);
    const indiceB = proximaOrdem.indexOf(vizinho.id);
    [proximaOrdem[indiceA], proximaOrdem[indiceB]] = [proximaOrdem[indiceB], proximaOrdem[indiceA]];
    setOrdem(proximaOrdem);
    persistir({ personagens_ordem: proximaOrdem });
  };

  return (
    <div className="bg-[#0a090e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
      <div className="p-6 md:p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-primary/5 to-transparent">
        <h2 className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Cinzel, serif' }}>
          <Users className="text-primary" size={20} /> Personagens da Campanha
        </h2>

        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              aria-label="Buscar personagem"
              placeholder="Buscar personagem..."
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <button
            onClick={onConcederNovo}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-sm font-bold transition-colors"
          >
            <PackagePlus size={16} /> Conceder da Loja
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8">
        {erroTransferencia && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {erroTransferencia}
          </div>
        )}

        {/* PASTAS */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPastaAtiva('todos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              pastaAtiva === 'todos' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            Todos ({personagens.length})
          </button>
          {pastas.map((pasta) => (
            <div
              key={pasta.id}
              className={`flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                pastaAtiva === pasta.id ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/5 text-gray-400 border-white/10'
              }`}
            >
              <button onClick={() => setPastaAtiva(pasta.id)} className="flex items-center gap-1.5 hover:text-white">
                <Folder size={12} /> {pasta.nome} ({contagemPorPasta[pasta.id] || 0})
              </button>
              <button
                onClick={() => excluirPasta(pasta.id)}
                title="Excluir pasta"
                className="rounded-full p-0.5 text-gray-500 hover:bg-red-500/20 hover:text-red-400"
              >
                <X size={11} />
              </button>
            </div>
          ))}

          {criandoPasta ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={novaPastaNome}
                onChange={(e) => setNovaPastaNome(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') criarPasta(); if (e.key === 'Escape') { setCriandoPasta(false); setNovaPastaNome(''); } }}
                placeholder="Nome da pasta"
                className="w-40 bg-black/50 border border-white/10 rounded-full py-1.5 px-3 text-xs text-white focus:outline-none focus:border-primary/50"
              />
              <button onClick={criarPasta} className="rounded-full bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 text-xs font-bold hover:bg-primary/30">Criar</button>
              <button onClick={() => { setCriandoPasta(false); setNovaPastaNome(''); }} className="text-gray-500 hover:text-white p-1"><X size={14} /></button>
            </div>
          ) : (
            <button
              onClick={() => setCriandoPasta(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-dashed border-white/15 text-gray-500 hover:text-primary hover:border-primary/30 transition-colors"
            >
              <FolderPlus size={13} /> Nova pasta
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-12 flex justify-center text-primary">
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : personagensFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {pastaAtiva !== 'todos' ? (
                <span className="inline-flex items-center gap-2"><FolderX size={16} /> Nenhum personagem nesta pasta ainda.</span>
              ) : 'Nenhum personagem encontrado.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {personagensFiltrados.map((p, idx) => {
              const raca = tituloRaca(p);
              const classes = tituloClasses(p);
              return (
                <div
                  key={p.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-primary/30 transition-colors flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-white truncate" style={{ fontFamily: 'Cinzel, serif' }}>{p.nome}</h3>
                      {(raca || classes) && (
                        <p className="text-xs text-primary/80 mt-0.5 truncate">
                          {[raca, classes].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        onClick={() => moverNaOrdem(p.id, -1)}
                        disabled={idx === 0}
                        aria-label={`Mover ${p.nome} pra cima`}
                        className="rounded-lg border border-white/10 p-1 text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moverNaOrdem(p.id, 1)}
                        disabled={idx === personagensFiltrados.length - 1}
                        aria-label={`Mover ${p.nome} pra baixo`}
                        className="rounded-lg border border-white/10 p-1 text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
                    <span>Versão: {p.versao}</span>
                    <span>Moedas: {p.carteira?.reduce((acc, c) => acc + c.saldo, 0) || 0}</span>
                  </div>

                  <div className="text-xs text-gray-500 mb-4 space-y-0.5">
                    <p className="truncate">Criado por: <span className="text-gray-400">{p.criado_por_nome || '-'}</span></p>
                    <p className="truncate">Jogador: <span className="text-gray-400">{p.dono_nome || 'Sem jogador atribuído'}</span></p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1.5">
                        <UserCog size={12} /> Transferir para
                      </label>
                      <select
                        aria-label={`Transferir ${p.nome} para outro jogador`}
                        value={p.dono_usuario_id || ''}
                        disabled={transferindoId === p.id}
                        onChange={(e) => onTransferir(p.id, e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                      >
                        <option value="" disabled>Selecione…</option>
                        {membros.map((membro) => (
                          <option key={membro.id} value={membro.id}>{membro.nome_exibicao}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1.5">
                        <Folder size={12} /> Pasta
                      </label>
                      <select
                        aria-label={`Mover ${p.nome} pra pasta`}
                        value={pastaPorPersonagem[p.id] || ''}
                        onChange={(e) => moverParaPasta(p.id, e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors"
                      >
                        <option value="">Sem pasta</option>
                        {pastas.map((pasta) => (
                          <option key={pasta.id} value={pasta.id}>{pasta.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <a href={`/ficha/${p.id}`} className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-center text-sm font-bold border border-primary/20 hover:bg-primary/20 transition-colors">
                      Ver Ficha
                    </a>
                    <button
                      onClick={() => onConcederPara(p.id)}
                      title="Conceder item, criatura ou propriedade da loja"
                      className="px-3 py-2 rounded-xl bg-white/5 text-gray-300 border border-white/10 hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      <PackagePlus size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonagensPainel;
