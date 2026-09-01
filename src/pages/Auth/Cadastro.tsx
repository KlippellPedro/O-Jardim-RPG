import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/authApi';
import { useAuthStore } from '../../store/useAuthStore';
import { Loader2, KeyRound, Mail, User, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthEmblem } from './components/AuthEmblem';
import { AuthFrame, AuthDivider } from './components/AuthChrome';
import { AuthField } from './components/AuthField';

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
    <main className="modal-viewport relative z-10 flex min-h-[100dvh] items-center justify-center px-4">

      {/* Toast Notification */}
      <div className="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[110] w-[min(34rem,calc(100vw-1.5rem))] -translate-x-1/2">
        <AnimatePresence>
          {toast && (
            <motion.div
              role={toast.type === 'error' ? 'alert' : 'status'}
              aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl sm:items-center sm:px-6 sm:py-4 ${
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

      <AuthFrame>
        <div className="mb-8 text-center">
          <AuthEmblem size={52} className="mx-auto mb-4 text-primary/80" />
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
            Novo Registro
          </span>
          <h1 className="text-[clamp(1.75rem,7vw,2.1rem)] font-bold leading-tight text-white" style={{ fontFamily: 'Cinzel, serif' }}>
            Forjar Destino
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Uma conta nova para guardar fichas, personagens e o que cada mestre liberar pra você.
          </p>
        </div>

        <AuthDivider />

        {modoCadastro === 'loading' ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : modoCadastro === 'fechado' ? (
          <div className="py-8 text-center">
            <Lock size={40} className="mx-auto mb-4 text-gray-600" />
            <h3 className="mb-2 text-xl font-bold text-white">Cadastros Fechados</h3>
            <p className="mb-6 text-sm text-gray-500">O Mestre desta instância desativou a criação de novas contas no momento.</p>
            <Link to="/login" className="inline-flex min-h-11 items-center font-medium text-primary transition-colors hover:text-primary-light">Voltar para o Login</Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-5">
            <AuthField
              id="register-name"
              label="Nome de exibição"
              icon={User}
              type="text"
              autoComplete="name"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Como deseja ser chamado?"
              required
            />

            <AuthField
              id="register-email"
              label="E-mail"
              icon={Mail}
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />

            <AuthField
              id="register-password"
              label="Senha"
              icon={Lock}
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
            />

            <AuthField
              id="register-password-confirmation"
              label="Confirmar senha"
              icon={Lock}
              type="password"
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={e => setConfirmarSenha(e.target.value)}
              placeholder="Repita a senha"
              minLength={8}
              required
            />

            <AnimatePresence>
              {modoCadastro === 'convite' && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <AuthField
                    id="register-invite"
                    label="Código de convite da campanha"
                    icon={KeyRound}
                    type="text"
                    autoComplete="off"
                    value={codigoConvite}
                    onChange={e => setCodigoConvite(e.target.value)}
                    placeholder="ABCD-1234"
                    accent
                    required
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary-dark py-4 font-bold uppercase tracking-widest text-white transition-all hover:shadow-[0_0_20px_rgba(var(--color-primary),0.4)]"
            >
              <div className="absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 group-hover:translate-y-0"></div>
              <span className="relative">{isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Forjar Conta'}</span>
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          Já faz parte do Jardim?{' '}
          <Link to="/login" className="inline-flex min-h-11 items-center font-medium text-primary transition-colors hover:text-white">Faça seu Login</Link>
        </div>
      </AuthFrame>
    </main>
  );
};
