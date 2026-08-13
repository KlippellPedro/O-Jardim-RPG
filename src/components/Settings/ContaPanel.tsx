import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../services/authApi';
import { discordApi, type IDiscordVinculo } from '../../services/discordApi';
import { User, Lock, Loader2, AlertCircle, CheckCircle2, MessageSquare, Link2, Unlink, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sfx } from '../../utils/audioSynth';

export const ContaPanel: React.FC = () => {
  const { usuario } = useAuthStore();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const [vinculo, setVinculo] = useState<IDiscordVinculo | null>(null);
  const [isLoadingDiscord, setIsLoadingDiscord] = useState(true);
  const [discordError, setDiscordError] = useState<string | null>(null);
  const [codigoGerado, setCodigoGerado] = useState<{ codigo: string; expira_em: string } | null>(null);
  const [isGerandoCodigo, setIsGerandoCodigo] = useState(false);
  const [isDesvinculando, setIsDesvinculando] = useState(false);
  const [codigoCopiado, setCodigoCopiado] = useState(false);

  // BUG-03: useEffect com cleanup garante que o timer seja cancelado se o componente for desmontado
  // antes dos 5 segundos, evitando setState em componente morto (memory leak).
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    let ativo = true;
    setIsLoadingDiscord(true);
    discordApi.obterVinculo()
      .then((resposta) => {
        if (ativo) setVinculo(resposta.vinculo);
      })
      .catch((err: unknown) => {
        const error = err as { message?: string };
        if (ativo) setDiscordError(error?.message || 'Erro ao consultar o vínculo com o Discord.');
      })
      .finally(() => {
        if (ativo) setIsLoadingDiscord(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const handleGerarCodigo = async () => {
    setIsGerandoCodigo(true);
    setDiscordError(null);
    setCodigoCopiado(false);
    try {
      const resposta = await discordApi.gerarCodigo();
      setCodigoGerado({ codigo: resposta.codigo, expira_em: resposta.expira_em });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setDiscordError(error?.message || 'Erro ao gerar o código de vínculo.');
    } finally {
      setIsGerandoCodigo(false);
    }
  };

  const handleCopiarCodigo = async () => {
    if (!codigoGerado) return;
    try {
      await navigator.clipboard.writeText(codigoGerado.codigo);
      setCodigoCopiado(true);
      setTimeout(() => setCodigoCopiado(false), 2000);
    } catch {
      // Clipboard indisponível (ex.: contexto não seguro) - o código já está visível para copiar manualmente.
    }
  };

  const handleDesvincular = async () => {
    if (!window.confirm('Desvincular o Discord desta conta?')) return;
    setIsDesvinculando(true);
    setDiscordError(null);
    try {
      await discordApi.desvincular();
      setVinculo(null);
      setCodigoGerado(null);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setDiscordError(error?.message || 'Erro ao desvincular o Discord.');
    } finally {
      setIsDesvinculando(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) {
      setMessage({ text: 'A nova senha e a confirmação não coincidem.', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      await authApi.alterarSenha(senhaAtual, novaSenha);
      setMessage({ text: 'Senha alterada com sucesso!', type: 'success' });
      sfx.play('confirm');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMessage({ text: error?.message || 'Erro ao alterar a senha.', type: 'error' });
      sfx.play('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!usuario) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 overflow-y-auto flex-1 space-y-8">

        {usuario.senha_provisoria && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-yellow-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-yellow-400 font-bold mb-1">Senha Provisória</h4>
              <p className="text-yellow-200/70 text-sm">
                Sua conta está usando uma senha provisória. Por favor, redefina sua senha agora por motivos de segurança.
              </p>
            </div>
          </div>
        )}

        {/* Perfil Header */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/50 shadow-[0_0_15px_rgba(var(--color-primary),0.3)]">
            <User size={40} className="text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>
            {usuario.nome_exibicao}
          </h3>
          <p className="text-gray-400 text-sm">{usuario.email}</p>

          <div className="mt-4 inline-block px-3 py-1 bg-black/40 rounded-full border border-white/10 text-xs font-medium text-gray-300 capitalize">
            Papel Global: {usuario.papel_plataforma}
          </div>
        </section>

        {/* Discord e recompensas */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="text-primary" size={20} />
            <h3 className="text-lg font-bold text-white">Discord e recompensas</h3>
          </div>

          {discordError && (
            <div className="p-3 rounded-lg text-sm border flex items-center gap-2 bg-red-500/10 border-red-500/20 text-red-400 mb-4">
              <AlertCircle size={16} />
              {discordError}
            </div>
          )}

          {isLoadingDiscord ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Consultando vínculo…
            </div>
          ) : vinculo ? (
            <div className="space-y-3">
              <p className="text-gray-300 text-sm">
                Vinculado a <span className="text-white font-medium">{vinculo.discord_nome || vinculo.discord_user_id}</span>.
                O loot do bot entra no cofre desta conta.
              </p>
              <button
                type="button"
                onClick={handleDesvincular}
                disabled={isDesvinculando}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium"
              >
                {isDesvinculando ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={16} />}
                Desvincular Discord
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {codigoGerado ? (
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">
                    Copie só o código abaixo e envie <span className="text-white font-mono">/vincular</span> no Discord com ele - não copie esta frase inteira.
                  </p>
                  <div className="flex items-center gap-2 bg-black/40 border border-primary/40 rounded-xl pl-4 pr-2 py-2">
                    <span className="flex-1 text-white font-mono font-bold tracking-widest text-lg select-all">
                      {codigoGerado.codigo}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopiarCodigo}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium"
                    >
                      {codigoCopiado ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      {codigoCopiado ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs">O código expira em 10 minutos.</p>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  Ainda não vinculado. Gere um código e envie ao comando /vincular do Banqueiro.
                </p>
              )}
              <button
                type="button"
                onClick={handleGerarCodigo}
                disabled={isGerandoCodigo}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-white transition-colors text-sm font-medium"
              >
                {isGerandoCodigo ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                Gerar código de vínculo
              </button>
            </div>
          )}
        </section>

        {/* Alterar Senha */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="text-primary" size={20} />
            <h3 className="text-lg font-bold text-white">Segurança</h3>
          </div>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className={`p-3 rounded-lg text-sm border flex items-center gap-2 ${
                  message.type === 'error'
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-green-500/10 border-green-500/20 text-green-400'
                }`}
              >
                {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-medium pl-1 mb-1 block">Senha Atual</label>
              <input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:border-primary/50 outline-none text-sm shadow-inner"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium pl-1 mb-1 block">Nova Senha</label>
              <input
                type="password"
                minLength={8}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:border-primary/50 outline-none text-sm shadow-inner"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium pl-1 mb-1 block">Confirmar Nova Senha</label>
              <input
                type="password"
                minLength={8}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:border-primary/50 outline-none text-sm shadow-inner"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-white transition-colors rounded-xl py-3 font-medium flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Atualizar Senha'}
            </button>
          </form>
        </section>

      </div>
    </div>
  );
};
