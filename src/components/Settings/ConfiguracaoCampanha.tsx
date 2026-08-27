import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { campanhasApi } from '../../services/campanhasApi';
import { PenSquare, AlertTriangle, Archive, Save, Loader2 } from 'lucide-react';

export const ConfiguracaoCampanha: React.FC = () => {
  const navigate = useNavigate();
  const { campanhaAtiva, atualizarIdentidade } = useAuthStore();
  const isMaster = campanhaAtiva?.papel === 'mestre';

  // Identidade (nome/descrição)
  const [nome, setNome] = useState(campanhaAtiva?.nome || '');
  const [descricao, setDescricao] = useState(campanhaAtiva?.descricao || '');
  const [salvandoIdentidade, setSalvandoIdentidade] = useState(false);
  const [identidadeSalva, setIdentidadeSalva] = useState(false);
  const [erroIdentidade, setErroIdentidade] = useState<string | null>(null);

  // Zona de perigo (arquivar)
  const [confirmandoArquivar, setConfirmandoArquivar] = useState(false);
  const [textoConfirmacao, setTextoConfirmacao] = useState('');
  const [arquivando, setArquivando] = useState(false);
  const [erroArquivar, setErroArquivar] = useState<string | null>(null);

  useEffect(() => {
    setNome(campanhaAtiva?.nome || '');
    setDescricao(campanhaAtiva?.descricao || '');
  }, [campanhaAtiva?.id]);

  if (!campanhaAtiva) return null;

  const handleSalvarIdentidade = async () => {
    if (!nome.trim()) return;
    setSalvandoIdentidade(true);
    setErroIdentidade(null);
    try {
      await atualizarIdentidade({ nome: nome.trim(), descricao });
      setIdentidadeSalva(true);
      setTimeout(() => setIdentidadeSalva(false), 2000);
    } catch (e: any) {
      setErroIdentidade(e?.message || 'Erro ao salvar nome/descrição.');
    } finally {
      setSalvandoIdentidade(false);
    }
  };

  const handleArquivar = async () => {
    if (textoConfirmacao.trim() !== campanhaAtiva.nome) return;
    setArquivando(true);
    setErroArquivar(null);
    try {
      await campanhasApi.arquivar(campanhaAtiva.id);
      useAuthStore.setState({ campanhaAtiva: null, membrosCampanha: [] });
      navigate('/');
    } catch (e: any) {
      setErroArquivar(e?.message || 'Erro ao arquivar a campanha.');
      setArquivando(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* SEÇÃO IDENTIDADE */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <PenSquare className="text-gray-300" size={20} />
          <h3 className="text-lg font-bold text-white">Identidade da Campanha</h3>
        </div>

        {!isMaster ? (
          <p className="text-xs text-gray-500 italic">Só o mestre pode editar nome e descrição da campanha.</p>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-primary/50 outline-none text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Descrição</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-primary/50 outline-none text-sm resize-none"
              />
            </div>
            {erroIdentidade && <p className="text-xs text-red-400">{erroIdentidade}</p>}
            <div className="flex justify-end">
              <button
                onClick={handleSalvarIdentidade}
                disabled={salvandoIdentidade || !nome.trim()}
                className="bg-white/10 text-white font-bold tracking-widest uppercase text-xs px-5 py-2 rounded-xl hover:bg-white/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {salvandoIdentidade ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {identidadeSalva ? 'Salvo!' : 'Salvar Nome/Descrição'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ZONA DE PERIGO */}
      {isMaster && (
        <section className="border border-red-500/20 rounded-2xl p-5 bg-red-500/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-red-400" size={20} />
            <h3 className="text-lg font-bold text-red-400">Zona de Perigo</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Arquivar a campanha a torna inacessível para todos os membros. Para reverter essa ação, fale com um administrador da plataforma.
          </p>

          {!confirmandoArquivar ? (
            <button
              onClick={() => setConfirmandoArquivar(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
            >
              <Archive size={14} /> Arquivar Campanha
            </button>
          ) : (
            <div className="bg-black/40 border border-red-500/20 rounded-xl p-4 space-y-3">
              <p className="text-sm text-gray-300">
                Digite <span className="font-bold text-white">{campanhaAtiva.nome}</span> para confirmar.
              </p>
              <input
                type="text"
                value={textoConfirmacao}
                onChange={(e) => setTextoConfirmacao(e.target.value)}
                placeholder={campanhaAtiva.nome}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-red-500/50 transition-colors"
              />
              {erroArquivar && <p className="text-xs text-red-400">{erroArquivar}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleArquivar}
                  disabled={arquivando || textoConfirmacao.trim() !== campanhaAtiva.nome}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {arquivando ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                  Confirmar Arquivamento
                </button>
                <button
                  onClick={() => { setConfirmandoArquivar(false); setTextoConfirmacao(''); setErroArquivar(null); }}
                  disabled={arquivando}
                  className="text-xs px-3 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      )}

    </div>
  );
};
