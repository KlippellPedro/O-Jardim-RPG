import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Lock, Mail, Loader2, KeyRound } from 'lucide-react';
import { sfx } from '../../utils/audioSynth';
import { AuthEmblem } from './components/AuthEmblem';
import { AuthFrame, AuthDivider } from './components/AuthChrome';
import { AuthField } from './components/AuthField';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) sfx.play('error');
  }, [error]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, senha);
    if (success) {
      sfx.play('confirm');
      navigate('/');
    }
  };

  return (
    <main className="modal-viewport relative z-10 flex min-h-[100dvh] items-center justify-center px-4">
      <AuthFrame>
        <div className="mb-8 text-center">
          <AuthEmblem size={52} className="mx-auto mb-4 text-primary/80" />
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
            Entrada
          </span>
          <h1 className="text-[clamp(1.75rem,7vw,2.1rem)] font-bold leading-tight text-white" style={{ fontFamily: 'Cinzel, serif' }}>
            O Jardim RPG
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Entre para retomar suas fichas e as mesas em que você já está.
          </p>
        </div>

        <AuthDivider />

        {error && (
          <motion.div
            id="login-error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <AuthField
            id="login-email"
            label="E-mail"
            icon={Mail}
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />

          <AuthField
            id="login-password"
            label="Senha"
            icon={Lock}
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
          />

          <div className="flex justify-end">
            <button type="button" className="flex min-h-11 items-center gap-1 text-sm text-gray-400 transition-colors hover:text-white">
              <KeyRound size={14} />
              Esqueceu a senha?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary-dark py-4 font-bold uppercase tracking-widest text-white transition-all hover:shadow-[0_0_20px_rgba(var(--color-primary),0.4)] disabled:opacity-50"
          >
            <div className="absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 group-hover:translate-y-0"></div>
            <span className="relative">{isLoading ? <Loader2 className="animate-spin" size={24} /> : 'Entrar'}</span>
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          Ainda não forjou seu destino?{' '}
          <Link to="/cadastro" className="inline-flex min-h-11 items-center text-primary hover:text-primary-light font-medium transition-colors">
            Cadastre-se
          </Link>
        </div>
      </AuthFrame>
    </main>
  );
};
