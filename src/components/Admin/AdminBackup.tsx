import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../services/adminApi';
import { HardDriveDownload, Loader2, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface IBackupStatus {
  ativo: boolean;
  executando: boolean;
  intervalo_horas: number;
  retencao: number;
  arquivos: number;
  ultimo_arquivo: string | null;
  ultimo_em: string | null;
  proximo_em: string | null;
  ultimo_erro: string | null;
  ultimo_resumo: { linhas?: number; bytes?: number } | null;
}

export const AdminBackup: React.FC = () => {
  const [status, setStatus] = useState<IBackupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [baixando, setBaixando] = useState(false);

  const carregar = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp: any = await adminApi.backupAutomatico();
      setStatus(resp);
    } catch (e) {
      console.error('Erro ao carregar status do backup automático', e);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const baixarBackup = () => {
    setBaixando(true);
    window.open('/api/v1/admin/backup', '_blank');
    setTimeout(() => setBaixando(false), 2000);
  };

  const formatarData = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR') : '-');

  return (
    <div className="space-y-6">
      <div className="bg-[#0b0a12]/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <HardDriveDownload className="text-blue-400" size={20} />
          <h2 className="text-xl font-bold text-white">Backup Manual</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Baixa uma cópia completa do banco em JSONL comprimido. O arquivo contém e-mails e hashes de senha -
          trate como material sensível e guarde fora do servidor.
        </p>
        <button
          onClick={baixarBackup}
          disabled={baixando}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
        >
          {baixando ? <Loader2 size={14} className="animate-spin" /> : <HardDriveDownload size={14} />}
          Baixar Backup Completo
        </button>
      </div>

      <div className="bg-[#0b0a12]/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="text-purple-400" size={20} />
            <h2 className="text-xl font-bold text-white">Backup Automático</h2>
          </div>
          <button
            onClick={carregar}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-purple-500" size={28} /></div>
        ) : !status ? (
          <p className="text-sm text-gray-500 italic">Não foi possível carregar o status.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {status.ativo ? (
                <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                  <CheckCircle2 size={12} /> Ativo
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border bg-gray-500/10 text-gray-400 border-gray-500/20">
                  <XCircle size={12} /> Inativo
                </span>
              )}
              {status.executando && (
                <span className="text-xs px-2 py-1 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">
                  Executando agora...
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Intervalo</p>
                <p className="text-white text-sm mt-0.5">{status.intervalo_horas}h</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Retenção</p>
                <p className="text-white text-sm mt-0.5">{status.retencao} arquivo(s)</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Arquivos salvos</p>
                <p className="text-white text-sm mt-0.5">{status.arquivos}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Último arquivo</p>
                <p className="text-white text-sm mt-0.5 truncate" title={status.ultimo_arquivo || ''}>
                  {status.ultimo_arquivo || '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Última execução</p>
                <p className="text-white text-sm mt-0.5">{formatarData(status.ultimo_em)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Próxima execução</p>
                <p className="text-white text-sm mt-0.5">{formatarData(status.proximo_em)}</p>
              </div>
              {status.ultimo_resumo?.linhas != null && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Linhas no último</p>
                  <p className="text-white text-sm mt-0.5">{status.ultimo_resumo.linhas}</p>
                </div>
              )}
              {status.ultimo_resumo?.bytes != null && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Tamanho</p>
                  <p className="text-white text-sm mt-0.5">{(status.ultimo_resumo.bytes / 1024).toFixed(1)} KB</p>
                </div>
              )}
            </div>

            {status.ultimo_erro && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg">
                Último erro: {status.ultimo_erro}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
