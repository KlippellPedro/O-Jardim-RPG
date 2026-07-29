import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, X, User, Crown, Bell, Swords, Gem, Shield,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ContaPanel } from './ContaPanel';
import { MestrePanel } from './MestrePanel';
import { AvisosPanel } from './AvisosPanel';
import { CampanhasPanel } from './CampanhasPanel';
import { useNavigate } from 'react-router-dom';

// ────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────
type PanelType = 'conta' | 'avisos' | 'campanhas' | 'mestre' | null;

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
  { title: string; icon: React.ReactNode; component: React.ReactNode }
> = {
  conta: {
    title: 'Minha Conta',
    icon: <User className="text-primary" size={20} />,
    component: <ContaPanel />,
  },
  avisos: {
    title: 'Avisos',
    icon: <Bell className="text-yellow-400" size={20} />,
    component: <AvisosPanel />,
  },
  campanhas: {
    title: 'Mesas e Campanhas',
    icon: <Swords className="text-blue-400" size={20} />,
    component: <CampanhasPanel />,
  },
  mestre: {
    title: 'Painel do Mestre',
    icon: <Crown className="text-red-400" size={20} />,
    component: <MestrePanel />,
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
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  const { usuario, campanhaAtiva, avisosNaoLidos, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!usuario) return null;

  const canSeeMestre =
    campanhaAtiva &&
    (campanhaAtiva.papel === 'mestre' || campanhaAtiva.papel === 'assistente');

  const canSeeAdmin =
    usuario.admin_plataforma ||
    usuario.papel_plataforma === 'admin' ||
    usuario.papel_plataforma === 'criador';

  const openPanel = (panel: PanelType) => {
    setActivePanel(panel);
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
  };

  const panelConfig = activePanel ? PANELS[activePanel] : null;

  return (
    <div className="fixed top-6 right-6 z-50">

      {/* ── Botão de Engrenagem ─────────────────────────────── */}
      <button
        id="settings-btn"
        onClick={() => setIsDropdownOpen((v) => !v)}
        className="relative p-3 bg-surface/50 backdrop-blur-md rounded-full border border-white/5 hover:bg-white/10 transition-colors shadow-lg group"
        aria-label="Configurações"
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <Settings size={22} className="text-gray-400 group-hover:text-primary transition-colors" />

        {/* Badge de avisos não lidos */}
        {avisosNaoLidos > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
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
              className="absolute top-16 right-0 w-72 bg-[#0b0a12]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 flex flex-col gap-0.5 z-[50]"
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
                    <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
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

              <DropdownItem label="Sair" onClick={handleLogout} danger />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Painel Lateral (offcanvas) ─────────────────────────── */}
      <AnimatePresence>
        {activePanel && panelConfig && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePanel(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />

            {/* Painel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#0b0a12]/97 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-[70] flex flex-col"
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
                  onClick={() => setActivePanel(null)}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                  aria-label="Fechar painel"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Corpo do painel */}
              <div className="flex-1 overflow-hidden">
                {panelConfig.component}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
