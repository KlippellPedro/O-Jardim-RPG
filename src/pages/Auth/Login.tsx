import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Lock, Mail, Loader2, KeyRound } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, senha);
    if (success) {
      navigate('/campanhas'); // ou para o local desejado pós-login
    }
  };

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#0b0a12]/70 backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
          
          {/* Subtle glow effect behind the form */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2" style={{fontFamily: 'Cinzel, serif'}}>O Jardim RPG</h1>
            <p className="text-gray-400">Acesse sua conta para continuar</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-sm text-gray-400 font-medium pl-1">E-mail</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary transition-colors">
                  <Mail size={20} />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:bg-black/60 transition-all shadow-inner"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-400 font-medium pl-1">Senha</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary transition-colors">
                  <Lock size={20} />
                </div>
                <input 
                  type="password" 
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:bg-black/60 transition-all shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                <KeyRound size={14} />
                Esqueceu a senha?
              </button>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/80 hover:to-purple-500 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(var(--color-primary),0.3)] transition-all hover:shadow-[0_0_30px_rgba(var(--color-primary),0.5)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : 'Entrar'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-400">
            Ainda não forjou seu destino?{' '}
            <Link to="/cadastro" className="text-primary hover:text-primary-light font-medium transition-colors">
              Cadastre-se
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
