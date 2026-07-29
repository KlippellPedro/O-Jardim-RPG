import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../services/adminApi';
import { ScrollText, Loader2, RefreshCw } from 'lucide-react';

interface IEventoAuditoria {
  id: string;
  acao: string;
  alvo_tipo: string | null;
  alvo_id: string | null;
  detalhes: any;
  criado_em: string;
  ator_servico: string | null;
  ator_nome: string | null;
  campanha_nome: string | null;
}

export const AdminAuditoria: React.FC = () => {
  const [eventos, setEventos] = useState<IEventoAuditoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [limite, setLimite] = useState(150);

  const carregar = useCallback(async (lim: number) => {
    setIsLoading(true);
    try {
      const resp: any = await adminApi.auditoria(lim);
      setEventos(resp?.eventos || []);
    } catch (e) {
      console.error('Erro ao carregar auditoria da plataforma', e);
      setEventos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar(limite);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-[#0b0a12]/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <ScrollText className="text-purple-400" size={20} />
          <h2 className="text-xl font-bold text-white">Auditoria da Plataforma</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limite}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLimite(v);
              carregar(v);
            }}
            className="bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white text-sm focus:border-purple-500/50 outline-none"
          >
            <option value={80}>Últimos 80</option>
            <option value={150}>Últimos 150</option>
            <option value={300}>Últimos 300</option>
          </select>
          <button
            onClick={() => carregar(limite)}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></div>
        ) : eventos.length === 0 ? (
          <p className="text-sm text-gray-600 italic text-center py-8">Nenhum evento registrado ainda.</p>
        ) : (
          <div className="max-h-[560px] overflow-y-auto custom-scrollbar space-y-2">
            {eventos.map((ev) => (
              <div key={ev.id} className="text-xs border-b border-white/5 pb-2 last:border-0">
                <div className="flex justify-between gap-3 text-gray-400 flex-wrap">
                  <span>
                    <strong className="text-gray-300">{ev.ator_nome || ev.ator_servico || 'Sistema'}:</strong> {ev.acao}
                    {ev.campanha_nome && <span className="text-gray-600"> · {ev.campanha_nome}</span>}
                  </span>
                  <span className="shrink-0 text-gray-500">{new Date(ev.criado_em).toLocaleString('pt-BR')}</span>
                </div>
                {ev.alvo_tipo && (
                  <span className="text-gray-600">{ev.alvo_tipo}: {ev.alvo_id}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
