import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, X, User, Crown, Bell, Swords, Gem, Shield, Volume2,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsPanelStore, SettingsPanelType } from '../../store/useSettingsPanelStore';
import { useNavigate } from 'react-router-dom';
import { useModalSfx } from '../../hooks/useSfx';
import { usePerformanceProfile } from '../../hooks/usePerformance';
import { useDialogAccessibility } from '../../hooks/useDialogAccessibility';

const ContaPanel = lazy(() => import('./ContaPanel').then((module) => ({ default: module.ContaPanel })));
const AvisosPanel = lazy(() => import('./AvisosPanel').then((module) => ({ default: module.AvisosPanel })));
const CampanhasPanel = lazy(() => import('./CampanhasPanel').then((module) => ({ default: module.CampanhasPanel })));
const PreferenciasPanel = lazy(() => import('./PreferenciasPanel').then((module) => ({ default: module.PreferenciasPanel })));

// ────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────
type PanelType = SettingsPanelType;

// ────────────────────────────────────────────────────────────
// Role Badge
// ────────────────────────────────────────────────────────────
const RoleBadge = ({ role }: { role?: string }) => {
  if (!role) return null;
  const r = role.toLowerCase();
  let colorClass = 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  if (r === 'admin' || r === 'criador') colorClass = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  else if (r === 'mestre' || r === 'assistente') colorClass = 'bg-red-500/20 text-red-400 border-red-500/30';
  else if (r === 'jogador' || r === 'player') colorClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize shrink-0 ${colorClass}`}>
      {role}
    </span>
  );
};

// ────────────────────────────────────────────────────────────
// Panel config: title, icon, component
// ────────────────────────────────────────────────────────────
const PANELS: Record<
  NonNullable<PanelType>,
  { title: string; icon: React.ReactNode; component: React.ComponentType }
> = {
  conta: {
    title: 'Minha Conta',
    icon: <User className="text-primary" size={20} />,
    component: ContaPanel,
  },
  avisos: {
    title: 'Avisos',
    icon: <Bell className="text-yellow-400" size={20} />,
    component: AvisosPanel,
  },
  campanhas: {
    title: 'Mesas e Campanhas',
    icon: <Swords className="text-blue-400" size={20} />,
    component: CampanhasPanel,
  },
  preferencias: {
    title: 'Preferências',
    icon: <Volume2 className="text-primary" size={20} />,
    component: PreferenciasPanel,
  },
};

// ────────────────────────────────────────────────────────────
// Dropdown Item
// ────────────────────────────────────────────────────────────
const DropdownItem = ({
  label,
  badge,
  onClick,
  danger = false,
}: {
  label: string;
  badge?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) => (
  <button
    onClick={onClick}
    data-sfx={danger ? 'cancel' : 'select'}
    className={`flex justify-between items-center w-full p-3 rounded-xl text-left text-sm transition-colors ${
      danger
        ? 'hover:bg-red-500/10 text-red-400 mt-1 border-t border-white/5'
        : 'hover:bg-white/5 text-white'
    }`}
  >
    <span>{label}</span>
    {badge}
  </button>
);

// ────────────────────────────────────────────────────────────
// SettingsMenu - componente principal
// ────────────────────────────────────────────────────────────
export const SettingsMenu: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const activePanel = useSettingsPanelStore((state) => state.activePanel);
  const openSettingsPanel = useSettingsPanelStore((state) => state.openPanel);
  const closeSettingsPanel = useSettingsPanelStore((state) => state.closePanel);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelBackdropRef = useRef<HTMLDivElement>(null);
  const panelCloseRef = useRef<HTMLButtonElement>(null);

  const usuario = useAuthStore((state) => state.usuario);
  const campanhaAtiva = useAuthStore((state) => state.campanhaAtiva);
  const avisosNaoLidos = useAuthStore((state) => state.avisosNaoLidos);
  const logout = useAuthStore((state) => state.logout);
  const { reduceMotion } = usePerformanceProfile();
  const navigate = useNavigate();

  // Dropdown e painel formam uma única superfície: trocar entre eles não deve
  // sobrepor os sons de fechar e abrir ao som de seleção do item.
  useModalSfx(isDropdownOpen || Boolean(activePanel));

  if (!usuario) return null;

  const canSeeMestre =
    campanhaAtiva &&
    (campanhaAtiva.papel === 'mestre' || campanhaAtiva.papel === 'assistente');

  const canSeeAdmin =
    usuario.papel_plataforma === 'admin' ||
    usuario.papel_plataforma === 'criador';

  const canSeeCreator = usuario.papel_plataforma === 'criador';

  const openPanel = (panel: PanelType) => {
    openSettingsPanel(panel);
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
  };

  const panelConfig = activePanel ? PANELS[activePanel] : null;
  const ActivePanelComponent = panelConfig?.component;

  useDialogAccessibility({
    open: Boolean(activePanel),
    dialogRef: panelRef,
    backdropRef: panelBackdropRef,
    initialFocusRef: panelCloseRef,
    onClose: () => closeSettingsPanel(),
  });

  useEffect(() => {
    if (!isDropdownOpen && !activePanel) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (activePanel) return;
      setIsDropdownOpen(false);
      window.requestAnimationFrame(() => document.getElementById('settings-btn')?.focus());
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (activePanel) {
        window.requestAnimationFrame(() => document.getElementById('settings-btn')?.focus());
      }
    };
  }, [activePanel, isDropdownOpen]);

  return (
    <div className="settings-anchor fixed z-50">

      {/* ── Botão de Engrenagem ─────────────────────────────── */}
      <button
        id="settings-btn"
        onClick={() => setIsDropdownOpen((v) => !v)}
        data-sfx="off"
        className="relative p-3 bg-[#0b0a12]/80 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition-colors shadow-lg group"
        aria-label="Configurações"
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <Settings size={22} className="text-gray-400 group-hover:text-primary transition-colors" />

        {/* Badge de avisos não lidos */}
        {avisosNaoLidos > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
            {avisosNaoLidos > 9 ? '9+' : avisosNaoLidos}
          </span>
        )}
      </button>

      {/* ── Dropdown Menu ─────────────────────────────────────── */}
      <AnimatePresence>
        {isDropdownOpen && (
          <>
            {/* Click-away */}
            <div
              className="fixed inset-0 z-[45]"
              onClick={() => setIsDropdownOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-14 z-[50] flex max-h-[calc(100dvh-4.5rem)] w-[min(18rem,calc(100vw-1.5rem))] flex-col gap-0.5 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b0a12]/95 p-2 shadow-2xl backdrop-blur-xl custom-scrollbar"
              role="group"
              aria-label="Menu da conta"
            >
              {/* Cabeçalho com nome */}
              <div className="px-3 py-2 border-b border-white/5 mb-1">
                <p className="text-xs text-gray-500 mb-0.5">Logado como</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white font-semibold text-sm truncate">{usuario.nome_exibicao}</p>
                  <RoleBadge role={usuario.papel_plataforma} />
                </div>
                {campanhaAtiva && (
                  <p className="text-xs text-primary/70 mt-1 truncate">⚔ {campanhaAtiva.nome}</p>
                )}
              </div>

              <DropdownItem label="Minha Conta" badge={<RoleBadge role={usuario.papel_plataforma} />} onClick={() => openPanel('conta')} />

              <DropdownItem
                label="Avisos"
                badge={
                  avisosNaoLidos > 0 ? (
                    <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                      {avisosNaoLidos}
                    </span>
                  ) : undefined
                }
                onClick={() => openPanel('avisos')}
              />

              <DropdownItem label="Mesas e Campanhas" onClick={() => openPanel('campanhas')} />

              <DropdownItem
                label="Cofre"
                badge={<Gem size={14} className="text-primary/60" />}
                onClick={() => {
                  setIsDropdownOpen(false);
                  navigate('/cofre');
                }}
              />

              {canSeeMestre && (
                <DropdownItem
                  label="Painel do Mestre"
                  badge={<RoleBadge role={campanhaAtiva?.papel} />}
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/mestre');
                  }}
                />
              )}

              {canSeeCreator && (
                <DropdownItem
                  label="Painel do Criador"
                  badge={<Crown size={14} className="text-primary/60" />}
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/criador');
                  }}
                />
              )}

              {canSeeAdmin && (
                <DropdownItem
                  label="Administração"
                  badge={<Shield size={14} className="text-purple-400" />}
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/admin');
                  }}
                />
              )}

              <DropdownItem label="Preferências" badge={<Volume2 size={14} className="text-primary/60" />} onClick={() => openPanel('preferencias')} />

              <DropdownItem label="Sair" onClick={handleLogout} danger />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Painel Lateral (offcanvas) ─────────────────────────── */}
      <AnimatePresence>
        {activePanel && panelConfig && ActivePanelComponent && (
          <>
            {/* Backdrop */}
            <motion.div
              ref={panelBackdropRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => closeSettingsPanel()}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />

            {/* Painel */}
            <motion.div
              ref={panelRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 28, stiffness: 220 }}
              className="settings-panel performance-expensive-effects fixed bottom-0 right-0 top-0 z-[70] flex w-full max-w-md flex-col border-l border-white/10 bg-[#0b0a12]/97 shadow-2xl backdrop-blur-2xl"
              role="dialog"
              aria-modal="true"
              aria-label={panelConfig.title}
            >
              {/* Header do painel */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  {panelConfig.icon}
                  <div>
                    {/* Branding pequena */}
                    <p className="text-[10px] uppercase tracking-widest text-primary/50 font-semibold mb-0.5">
                      O Jardim RPG
                    </p>
                    <h2
                      className="text-lg font-bold text-white leading-none"
                      style={{ fontFamily: 'Cinzel, serif' }}
                    >
                      {panelConfig.title}
                    </h2>
                    {campanhaAtiva && (
                      <p className="text-xs text-gray-500 mt-0.5">{campanhaAtiva.nome}</p>
                    )}
                  </div>
                </div>
                <button
                  ref={panelCloseRef}
                  onClick={() => closeSettingsPanel()}
                  data-sfx="off"
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                  aria-label="Fechar painel"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Corpo do painel */}
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-gray-500">Carregando preferências...</div>}>
                  <ActivePanelComponent />
                </Suspense>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
