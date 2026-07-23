import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { avisosApi } from '../../services/avisosApi';
import { Bell, Loader2, CheckCheck, CheckCheck as MarkAllIcon } from 'lucide-react';

interface IAviso {
  id: string;
  campanha_id: string | null;
  campanha_nome: string | null;
  titulo: string;
  mensagem: string;
  lida_em: string | null;
  criado_em: string;
  categoria?: string;
}

export const AvisosPanel: React.FC = () => {
  const [avisos, setAvisos] = useState<IAviso[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // BUG-FIX: avisos são por usuário (GET /avisos), não por campanha — a rota
  // antiga (/campanhas/{id}/avisos) nunca existiu no backend e sempre 404ava.
  const fetchAvisos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await avisosApi.listar();
      setAvisos(data.avisos || []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Falha ao carregar avisos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvisos();
  }, [fetchAvisos]);

  const handleMarkAllRead = async () => {
    setIsMarking(true);
    try {
      const { nao_lidos } = await avisosApi.marcarLidos();
      setAvisos((prev) => prev.map((a) => (a.lida_em ? a : { ...a, lida_em: new Date().toISOString() })));
      useAuthStore.setState({ avisosNaoLidos: nao_lidos });
    } catch (err) {
      console.error('Falha ao marcar avisos como lidos:', err);
    } finally {
      setIsMarking(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const naoLidos = avisos.filter((a) => !a.lida_em).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 overflow-y-auto flex-1 space-y-4">

        <div className="flex items-center gap-2 mb-4">
          <Bell className="text-primary" size={20} />
          <h3 className="text-lg font-bold text-white">Avisos</h3>
          {isLoading && <Loader2 size={16} className="animate-spin text-gray-500 ml-auto" />}
          {!isLoading && naoLidos > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isMarking}
              className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              {isMarking ? <Loader2 size={12} className="animate-spin" /> : <MarkAllIcon size={12} />}
              Marcar tudo como lido
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
            {error}
          </div>
        )}

        {!isLoading && !error && avisos.length === 0 && (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
            <CheckCheck className="mx-auto text-green-400 mb-3" size={32} />
            <p className="text-gray-300 font-medium">Tudo em dia!</p>
            <p className="text-gray-500 text-sm mt-1">Você não tem avisos.</p>
          </div>
        )}

        <AnimatePresence>
          {avisos.map((aviso) => (
            <motion.div
              key={aviso.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-4 rounded-xl border transition-colors ${
                aviso.lida_em
                  ? 'bg-white/3 border-white/5 opacity-60'
                  : 'bg-primary/5 border-primary/20'
              }`}
            >
              <div className="flex items-start gap-3">
                {!aviso.lida_em && (
                  <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-white text-sm truncate">{aviso.titulo}</h4>
                    <span className="text-xs text-gray-500 shrink-0">{formatDate(aviso.criado_em)}</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{aviso.mensagem}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {aviso.campanha_nome && (
                      <span className="inline-block text-xs px-2 py-0.5 bg-white/10 rounded-full text-gray-400">
                        {aviso.campanha_nome}
                      </span>
                    )}
                    {aviso.categoria && (
                      <span className="inline-block text-xs px-2 py-0.5 bg-white/10 rounded-full text-gray-400 capitalize">
                        {aviso.categoria}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
