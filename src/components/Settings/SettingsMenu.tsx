import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, X, User, Crown, Bell, Swords, Gem, ShieldCheck, Volume2, LayoutDashboard, ChevronRight, LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsPanelStore, SettingsPanelType } from '../../store/useSettingsPanelStore';
import { useNavigate } from 'react-router-dom';
import { useModalSfx } from '../../hooks/useSfx';
import { usePerformanceProfile } from '../../hooks/usePerformance';
import { useDialogAccessibility } from '../../hooks/useDialogAccessibility';
import {
  avisosEmOutrasMesas, montarMenuDaEngrenagem, rotuloDoPapelNaMesa, totalDaEngrenagem,
  type IconeDoMenu, type IItemDoMenu,
} from './menuDaEngrenagem';

const ContaPanel = lazy(() => import('./ContaPanel').then((module) => ({ default: module.ContaPanel })));
const AvisosPanel = lazy(() => import('./AvisosPanel').then((module) => ({ default: module.AvisosPanel })));
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
// Painéis laterais que a engrenagem abre: título, ícone e conteúdo
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
  preferencias: {
    title: 'Preferências',
    icon: <Volume2 className="text-primary" size={20} />,
    component: PreferenciasPanel,
  },
};

// Um ícone por destino; Mestre, Criador e Administração não repetem o escudo da Ficha nem a coroa da Campanha.
const ICONES_DO_MENU: Record<IconeDoMenu, LucideIcon> = {
  conta: User,
  avisos: Bell,
  cofre: Gem,
  preferencias: Volume2,
  mestre: LayoutDashboard,
  criador: Crown,
  admin: ShieldCheck,
};

// ────────────────────────────────────────────────────────────
// Contagem (o número vermelho de um item ou do botão)
// ────────────────────────────────────────────────────────────
const Contagem = ({ valor, rotulo }: { valor: number; rotulo: string }) => (
  <span
    className="min-w-5 shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white"
    role="img"
    aria-label={rotulo}
  >
    {valor > 99 ? '99+' : valor}
  </span>
);

const rotuloDeAvisosNovos = (item: IItemDoMenu): string => {
  const quantidade = item.contagem ?? 0;
  return `${quantidade} ${quantidade === 1 ? 'aviso novo' : 'avisos novos'}`;
};

// ────────────────────────────────────────────────────────────
// Item do dropdown
// ────────────────────────────────────────────────────────────
const DropdownItem = ({ item, aoEscolher }: { item: IItemDoMenu; aoEscolher: (item: IItemDoMenu) => void }) => {
  const Icone = ICONES_DO_MENU[item.icone];
  const contagem = item.contagem ?? 0;
  return (
    <button
      type="button"
      onClick={() => aoEscolher(item)}
      data-sfx="select"
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/5"
    >
      <Icone size={16} className="shrink-0 text-primary/70" />
      <span className="min-w-0 flex-1 truncate">{item.rotulo}</span>
      {contagem > 0 ? <Contagem valor={contagem} rotulo={rotuloDeAvisosNovos(item)} /> : null}
    </button>
  );
};

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
  const avisos = useAuthStore((state) => state.avisos);
  const logout = useAuthStore((state) => state.logout);
  const { reduceMotion } = usePerformanceProfile();
  const navigate = useNavigate();

  // Dropdown e painel formam uma única superfície: trocar entre eles não deve
  // sobrepor os sons de fechar e abrir ao som de seleção do item.
  useModalSfx(isDropdownOpen || Boolean(activePanel));

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

  const secoes = useMemo(
    () => (usuario ? montarMenuDaEngrenagem({ usuario, campanhaAtiva, avisos }) : []),
    [usuario, campanhaAtiva, avisos],
  );
  const totalDeAvisos = usuario ? totalDaEngrenagem({ usuario, campanhaAtiva, avisos }) : 0;
  const avisosDeOutrasMesas = avisosEmOutrasMesas({ campanhaAtiva, avisos });

  if (!usuario) return null;

  const escolherItem = (item: IItemDoMenu) => {
    setIsDropdownOpen(false);
    if (item.acao.tipo === 'painel') openSettingsPanel(item.acao.painel);
    else navigate(item.acao.caminho);
  };

  // A mesa em que a pessoa está é o contexto de quase tudo neste menu (Cofre, Painel do Mestre, avisos da mesa).
  // Trocar de mesa, entrar por convite e criar mesa moram na página da Campanha, não aqui.
  const irParaAMesa = () => {
    setIsDropdownOpen(false);
    navigate(campanhaAtiva ? '/campanha' : '/campanhas');
  };

  const irParaAsMesas = () => {
    setIsDropdownOpen(false);
    navigate('/campanhas');
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
  };

  const panelConfig = activePanel ? PANELS[activePanel] : null;
  const ActivePanelComponent = panelConfig?.component;

  return (
    <div className="settings-anchor fixed z-50">

      {/* ── Botão de Engrenagem ─────────────────────────────── */}
      <button
        id="settings-btn"
        onClick={() => setIsDropdownOpen((v) => !v)}
        data-sfx="off"
        className="relative p-3 bg-[#0b0a12]/80 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition-colors shadow-lg group"
        aria-label="Configurações"
        aria-describedby={totalDeAvisos > 0 ? 'settings-btn-avisos' : undefined}
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <Settings size={22} className="text-gray-400 group-hover:text-primary transition-colors" />

        {/* Tudo que espera a pessoa, em qualquer painel que ela alcança */}
        {totalDeAvisos > 0 && (
          <>
            <span aria-hidden="true" className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
              {totalDeAvisos > 9 ? '9+' : totalDeAvisos}
            </span>
            <span id="settings-btn-avisos" className="sr-only">
              {totalDeAvisos} {totalDeAvisos === 1 ? 'aviso novo' : 'avisos novos'}
            </span>
          </>
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
              className="absolute right-0 top-14 z-[50] flex max-h-[calc(100dvh-4.5rem)] w-[min(18.5rem,calc(100vw-1.5rem))] flex-col overflow-y-auto rounded-2xl border border-white/10 bg-[#0b0a12]/95 p-2 shadow-2xl backdrop-blur-xl custom-scrollbar"
              role="group"
              aria-label="Menu da conta"
            >
              {/* Quem está logado e em que mesa */}
              <div className="px-3 pb-3 pt-2">
                <p className="mb-0.5 text-xs text-gray-500">Logado como</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-white">{usuario.nome_exibicao}</p>
                  <RoleBadge role={usuario.papel_plataforma} />
                </div>
                <button
                  type="button"
                  onClick={irParaAMesa}
                  data-sfx="navigate"
                  className="mt-3 flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-white/[0.06]"
                >
                  <Swords size={15} className="shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {campanhaAtiva ? campanhaAtiva.nome : 'Nenhuma mesa ativa'}
                    </span>
                    <span className="block text-[11px] text-gray-500">
                      {campanhaAtiva ? `${rotuloDoPapelNaMesa(campanhaAtiva)} · abrir a página da campanha` : 'Escolher ou criar uma mesa'}
                    </span>
                  </span>
                  <ChevronRight size={14} className="shrink-0 text-gray-500" />
                </button>
                {avisosDeOutrasMesas > 0 ? (
                  <button
                    type="button"
                    onClick={irParaAsMesas}
                    data-sfx="navigate"
                    className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-xs text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <span>Avisos novos em outras mesas</span>
                    <Contagem valor={avisosDeOutrasMesas} rotulo={`${avisosDeOutrasMesas} ${avisosDeOutrasMesas === 1 ? 'aviso novo' : 'avisos novos'} em outras mesas`} />
                  </button>
                ) : null}
              </div>

              {secoes.map((secao) => (
                <div key={secao.id} className="border-t border-white/5 py-1.5">
                  <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">{secao.rotulo}</p>
                  {secao.itens.map((item) => (
                    <DropdownItem key={item.id} item={item} aoEscolher={escolherItem} />
                  ))}
                </div>
              ))}

              <div className="border-t border-white/5 pt-1.5">
                <button
                  type="button"
                  onClick={handleLogout}
                  data-sfx="cancel"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <LogOut size={16} className="shrink-0" />
                  Sair
                </button>
              </div>
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
                <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-gray-500">Carregando...</div>}>
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
