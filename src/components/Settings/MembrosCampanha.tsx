import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { campanhasApi } from '../../services/campanhasApi';
import { Select } from '../ui/Select';
import { Users, Crown, UserX, Repeat, ScrollText, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const PAPEIS = [
  { value: 'mestre', label: 'Mestre' },
  { value: 'assistente', label: 'Assistente' },
  { value: 'jogador', label: 'Jogador' },
  { value: 'observador', label: 'Observador' },
];

export const MembrosCampanha: React.FC = () => {
  const { campanhaAtiva, membrosCampanha, recarregarCampanhaAtiva } = useAuthStore();
  const isMaster = campanhaAtiva?.papel === 'mestre';

  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoRemover, setConfirmandoRemover] = useState<string | null>(null);
  const [transferindoPara, setTransferindoPara] = useState<string | null>(null);
  const [auditoriaAberta, setAuditoriaAberta] = useState(false);
  const [eventos, setEventos] = useState<any[]>([]);
  const [carregandoAuditoria, setCarregandoAuditoria] = useState(false);

  if (!campanhaAtiva) return null;

  const handleTrocarPapel = async (membroId: string, papel: string) => {
    setProcessando(membroId);
    setErro(null);
    try {
      await campanhasApi.alterarPapel(campanhaAtiva.id, membroId, papel);
      await recarregarCampanhaAtiva();
    } catch (e: any) {
      setErro(e?.message || 'Erro ao trocar o papel do membro.');
    } finally {
      setProcessando(null);
    }
  };

  const handleRemover = async (membroId: string) => {
    setProcessando(membroId);
    setErro(null);
    try {
      await campanhasApi.removerMembro(campanhaAtiva.id, membroId);
      await recarregarCampanhaAtiva();
    } catch (e: any) {
      setErro(e?.message || 'Erro ao remover o membro.');
    } finally {
      setProcessando(null);
      setConfirmandoRemover(null);
    }
  };

  const handleTransferir = async (novoDonoId: string) => {
    setProcessando(novoDonoId);
    setErro(null);
    try {
      await campanhasApi.transferirPropriedade(campanhaAtiva.id, novoDonoId);
      await recarregarCampanhaAtiva();
    } catch (e: any) {
      setErro(e?.message || 'Erro ao transferir a propriedade da campanha.');
    } finally {
      setProcessando(null);
      setTransferindoPara(null);
    }
  };

  const carregarAuditoria = async () => {
    if (auditoriaAberta) {
      setAuditoriaAberta(false);
      return;
    }
    setAuditoriaAberta(true);
    setCarregandoAuditoria(true);
    try {
      const resp: any = await campanhasApi.auditoria(campanhaAtiva.id, 50);
      setEventos(resp.eventos || []);
    } catch (e) {
      console.error('Falha ao carregar auditoria da campanha', e);
    } finally {
      setCarregandoAuditoria(false);
    }
  };

  return (
    <div className="space-y-8">
      {erro && (
        <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">{erro}</div>
      )}

      <section>
        <div className="flex items-center gap-2 mb-1">
          <Users className="text-primary" size={20} />
          <h3 className="text-lg font-bold text-white">Membros da Campanha</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          {isMaster
            ? 'Troque papéis, remova membros ou transfira a propriedade da campanha.'
            : 'Só o mestre pode alterar papéis, remover membros ou transferir a campanha.'}
        </p>

        <div className="space-y-2">
          {membrosCampanha.map((membro) => {
            const isDono = membro.id === campanhaAtiva.dono_id;
            const elegivelDono = membro.papel_plataforma === 'mestre' || membro.papel_plataforma === 'criador';
            const emProcesso = processando === membro.id;

            return (
              <div
                key={membro.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold truncate">{membro.nome_exibicao}</span>
                    {isDono && <Crown size={14} className="text-yellow-400 shrink-0" />}
                    {!membro.ativo && (
                      <span className="text-[10px] text-red-400 border border-red-500/30 px-1.5 rounded bg-red-500/10 shrink-0">
                        Conta desativada
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{membro.email}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isMaster && !isDono ? (
                    <Select
                      value={membro.papel}
                      onChange={(v) => handleTrocarPapel(membro.id, v)}
                      options={PAPEIS}
                      className="w-36"
                      disabled={emProcesso}
                    />
                  ) : (
                    <span className="text-xs uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
                      {isDono ? 'Dono / Mestre' : membro.papel}
                    </span>
                  )}

                  {isMaster && !isDono && elegivelDono && (
                    transferindoPara === membro.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTransferir(membro.id)}
                          disabled={emProcesso}
                          className="text-xs px-2 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30 disabled:opacity-50"
                        >
                          {emProcesso ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar'}
                        </button>
                        <button onClick={() => setTransferindoPara(null)} className="text-xs px-2 py-1.5 text-gray-400 hover:text-white">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setTransferindoPara(membro.id)}
                        title="Transferir propriedade da campanha"
                        className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                      >
                        <Repeat size={14} />
                      </button>
                    )
                  )}

                  {isMaster && !isDono && (
                    confirmandoRemover === membro.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRemover(membro.id)}
                          disabled={emProcesso}
                          className="text-xs px-2 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {emProcesso ? <Loader2 size={12} className="animate-spin" /> : 'Remover'}
                        </button>
                        <button onClick={() => setConfirmandoRemover(null)} className="text-xs px-2 py-1.5 text-gray-400 hover:text-white">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmandoRemover(membro.id)}
                        title="Remover da campanha"
                        className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <UserX size={14} />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
          {membrosCampanha.length === 0 && (
            <p className="text-sm text-gray-500 italic">Nenhum membro carregado.</p>
          )}
        </div>
      </section>

      <section>
        <button
          onClick={carregarAuditoria}
          className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-300 hover:text-white transition-colors"
        >
          <ScrollText size={18} className="text-primary" />
          Histórico de Auditoria
          {auditoriaAberta ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {auditoriaAberta && (
          <div className="bg-black/40 rounded-2xl border border-white/5 p-4 max-h-[320px] overflow-y-auto custom-scrollbar space-y-2">
            {carregandoAuditoria ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 size={14} className="animate-spin" /> Carregando...
              </div>
            ) : eventos.length === 0 ? (
              <p className="text-sm text-gray-600 italic">Nenhum evento registrado ainda.</p>
            ) : (
              eventos.map((ev) => (
                <div key={ev.id} className="text-xs border-b border-white/5 pb-2 last:border-0">
                  <div className="flex justify-between gap-3 text-gray-400">
                    <span>
                      <strong className="text-gray-300">{ev.ator_nome || ev.ator_servico || 'Sistema'}:</strong> {ev.acao}
                    </span>
                    <span className="shrink-0">{new Date(ev.criado_em).toLocaleString('pt-BR')}</span>
                  </div>
                  {ev.alvo_tipo && <span className="text-gray-600">{ev.alvo_tipo}: {ev.alvo_id}</span>}
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
};
