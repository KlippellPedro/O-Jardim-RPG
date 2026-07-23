import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/authApi';
import { useAuthStore } from '../../store/useAuthStore';
import { Loader2, KeyRound, Mail, User, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Cadastro: React.FC = () => {
  const navigate = useNavigate();
  const { initContexto } = useAuthStore();
  
  const [modoCadastro, setModoCadastro] = useState<'aberto' | 'convite' | 'fechado' | 'loading'>('loading');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [codigoConvite, setCodigoConvite] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    const fetchModo = async () => {
      try {
        const res = await authApi.modoDeCadastro();
        setModoCadastro(res?.modo || 'convite');
      } catch (err) {
        console.error(err);
        setModoCadastro('convite'); // default seguro
      }
    };
    fetchModo();
  }, []);

  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmarSenha) {
      return showToast('As senhas não coincidem.', 'error');
    }

    if (modoCadastro === 'convite' && !codigoConvite.trim()) {
      return showToast('Um código de convite é obrigatório.', 'error');
    }

    setIsLoading(true);
    try {
      await authApi.registrar({
        email,
        nome_exibicao: nome,
        senha,
        convite: modoCadastro === 'convite' ? codigoConvite : undefined,
      });

      showToast('Conta forjada com sucesso!', 'success');
      
      // Atualiza o store global para buscar as infos do usuário logado
      await initContexto();
      
      // Aguarda o toast de sucesso aparecer
      setTimeout(() => {
        navigate('/campanhas');
      }, 1500);

    } catch (err: any) {
      showToast(err.message || 'Falha ao registrar conta.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
      
      {/* Toast Notification */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${
                toast.type === 'error' 
                  ? 'bg-red-500/10 border-red-500/20 text-red-200' 
                  : 'bg-green-500/10 border-green-500/20 text-green-200'
              }`}
            >
              {toast.type === 'error' ? <AlertCircle className="text-red-400" /> : <CheckCircle2 className="text-green-400" />}
              <span className="font-medium">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#0b0a12]/70 backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden"
      >
        {/* Glow de Fundo */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2" style={{fontFamily: 'Cinzel, serif'}}>Forjar Destino</h1>
          <p className="text-gray-400 text-sm">Crie sua conta e junte-se à mesa.</p>
        </div>

        {modoCadastro === 'loading' ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : modoCadastro === 'fechado' ? (
          <div className="text-center py-8">
            <Lock size={48} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Cadastros Fechados</h3>
            <p className="text-gray-500 mb-6 text-sm">O Mestre desta instância desativou a criação de novas contas no momento.</p>
            <Link to="/login" className="text-primary hover:text-primary-light font-medium transition-colors">Voltar para o Login</Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4 relative z-10">
            <div className="relative group">
              <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Como deseja ser chamado?"
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:border-primary/50 focus:bg-black/60 outline-none transition-all shadow-inner"
                required
              />
            </div>

            <div className="relative group">
              <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="E-mail"
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:border-primary/50 focus:bg-black/60 outline-none transition-all shadow-inner"
                required
              />
            </div>

            <div className="relative group">
              <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="password" 
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Senha (mínimo 8 caracteres)"
                minLength={8}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:border-primary/50 focus:bg-black/60 outline-none transition-all shadow-inner"
                required
              />
            </div>

            <div className="relative group">
              <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="password" 
                value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
                placeholder="Confirmar Senha"
                minLength={8}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:border-primary/50 focus:bg-black/60 outline-none transition-all shadow-inner"
                required
              />
            </div>

            <AnimatePresence>
              {modoCadastro === 'convite' && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="relative group overflow-hidden"
                >
                  <KeyRound size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors z-10" />
                  <input 
                    type="text" 
                    value={codigoConvite}
                    onChange={e => setCodigoConvite(e.target.value)}
                    placeholder="Código de Convite da Campanha"
                    className="w-full bg-primary/5 border border-primary/20 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:border-primary/50 focus:bg-black/60 outline-none transition-all shadow-[0_0_15px_rgba(var(--color-primary),0.05)] relative z-0"
                    required
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl py-3.5 font-bold hover:shadow-[0_0_20px_rgba(var(--color-primary),0.4)] transition-all flex items-center justify-center gap-2 mt-6 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Forjar Conta'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-gray-500 relative z-10">
          Já faz parte do Jardim? {' '}
          <Link to="/login" className="text-primary hover:text-white transition-colors font-medium">Faça seu Login</Link>
        </div>

      </motion.div>
    </div>
  );
};
