import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useGlobalSfx } from './hooks/useGlobalSfx';
import { PerformancePreferencesBridge } from './hooks/usePerformance';
import AtmosphericBackground from './AtmosphericBackground';

const GlassMenu = lazy(() => import('./components/GlassMenu'));
const Home = lazy(() => import('./pages/Home'));
const FichaList = lazy(() => import('./pages/Ficha/FichaList'));
const PreviewGallery = lazy(() => import('./redesign/PreviewGallery'));
const Login = lazy(() => import('./pages/Auth/Login').then((module) => ({ default: module.Login })));
const Cadastro = lazy(() => import('./pages/Auth/Cadastro').then((module) => ({ default: module.Cadastro })));
const CampanhasList = lazy(() => import('./pages/Campanhas/CampanhasList').then((module) => ({ default: module.CampanhasList })));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const PersonagemSheet = lazy(() => import('./pages/Ficha/PersonagemSheet').then((module) => ({ default: module.PersonagemSheet })));
const SettingsMenu = lazy(() => import('./components/Settings/SettingsMenu').then((module) => ({ default: module.SettingsMenu })));
const RegrasPage = lazy(() => import('./pages/Regras/RegrasPage').then((module) => ({ default: module.RegrasPage })));
const RegraDetalhesPage = lazy(() => import('./pages/Regras/RegraDetalhesPage').then((module) => ({ default: module.RegraDetalhesPage })));
const SessaoPage = lazy(() => import('./pages/Sessao/SessaoPage').then((module) => ({ default: module.SessaoPage })));
const MundoPage = lazy(() => import('./pages/Mundo/MundoPage').then((module) => ({ default: module.MundoPage })));
const LojaPage = lazy(() => import('./pages/Loja/LojaPage').then((module) => ({ default: module.LojaPage })));
const MateriaisPage = lazy(() => import('./pages/Materiais/MateriaisPage').then((module) => ({ default: module.MateriaisPage })));
const MasterPage = lazy(() => import('./pages/Mestre/MasterPage'));
const CofrePage = lazy(() => import('./pages/Cofre/CofrePage').then((module) => ({ default: module.CofrePage })));

const PageLoading = () => (
  <div className="flex min-h-[50vh] items-center justify-center text-white">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      <p className="text-sm text-gray-400">Carregando página...</p>
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────────────────────────
// ProtectedRoute - guarda de rota unificada
// Props:
//   requireCampaign: redireciona para /campanhas se não houver campanha ativa
//   requireAdmin:    redireciona para / se o usuário não for admin/criador
// ──────────────────────────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  children: JSX.Element;
  requireCampaign?: boolean;
  requireAdmin?: boolean; // BUG-01: nova prop para proteger rotas administrativas
  requireCampaignManager?: boolean;
}

const ProtectedRoute = ({
  children,
  requireCampaign = false,
  requireAdmin = false,
  requireCampaignManager = false,
}: ProtectedRouteProps) => {
  const usuario = useAuthStore((state) => state.usuario);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const campanhaAtiva = useAuthStore((state) => state.campanhaAtiva);

  // Aguarda a inicialização do contexto (rehidratação via API)
  if (!isInitialized) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  // Usuário não autenticado
  if (!usuario) return <Navigate to="/login" replace />;

  // BUG-01: verificação de papel para rotas administrativas
  if (requireAdmin) {
    const isAdmin =
      usuario.papel_plataforma === 'admin' ||
      usuario.papel_plataforma === 'criador';
    if (!isAdmin) return <Navigate to="/" replace />;
  }

  // Requer campanha ativa selecionada
  if (requireCampaign && !campanhaAtiva) return <Navigate to="/campanhas" replace />;

  if (requireCampaignManager) {
    const managesCampaign = campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente';
    if (!managesCampaign) return <Navigate to="/" replace />;
  }

  return children;
};

// ──────────────────────────────────────────────────────────────────────────────
// App
// ──────────────────────────────────────────────────────────────────────────────
function App() {
  const initContexto = useAuthStore((state) => state.initContexto);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const usuario = useAuthStore((state) => state.usuario);
  const logout = useAuthStore((state) => state.logout);
  const prevUsuarioRef = useRef(usuario);
  const didInitContextRef = useRef(false);

  useGlobalSfx();

  useEffect(() => {
    // O StrictMode repete efeitos no desenvolvimento. O contexto precisa ser
    // inicializado uma vez por montagem do App, independentemente da latência.
    if (didInitContextRef.current) return;
    didInitContextRef.current = true;
    void initContexto();
  }, [initContexto]);

  // C1 - Limpa dados de personagens quando o usuário faz logout
  // (evita que usuário B veja dados do usuário A na mesma sessão de browser)
  useEffect(() => {
    const prev = prevUsuarioRef.current;
    prevUsuarioRef.current = usuario;
    if (prev !== null && usuario === null) {
      // O store de ficha importa catálogos grandes. Ele só é carregado aqui se
      // houver um logout real, em vez de engrossar a tela inicial para todos.
      void import('./store/useCharacterStore').then(({ resetAllCharacterData }) => {
        resetAllCharacterData();
      });
    }
  }, [usuario]);

  // A1 - Escuta o evento de 401 disparado pelo apiClient (sem importar o store lá)
  // e força logout + redirecionamento para /login
  useEffect(() => {
    const handleUnauthorized = () => {
      // Se já está deslogado, nada a fazer
      if (!useAuthStore.getState().usuario) return;
      void logout().then(() => {
        // Força navegação hard para limpar qualquer estado de rota
        window.location.replace('/login');
      });
    };
    window.addEventListener('jardim:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('jardim:unauthorized', handleUnauthorized);
  }, [logout]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Carregando O Jardim...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <PerformancePreferencesBridge />
      <Router>
        <div className="relative min-h-[100dvh] w-full min-w-0 bg-background font-sans text-white selection:bg-primary/30">

          <AtmosphericBackground />

          {usuario && (
            <Suspense fallback={null}>
              <GlassMenu />
            </Suspense>
          )}

          {usuario && (
            <Suspense fallback={null}>
              <SettingsMenu />
            </Suspense>
          )}

          <Suspense fallback={<PageLoading />}>
            <Routes>
              {/* Rota de teste do redesign (desprotegida) */}
              <Route path="/redesign-preview" element={<PreviewGallery />} />
              
              {/* Rotas públicas - redirecionam se já logado */}
              <Route path="/login" element={!usuario ? <Login /> : <Navigate to="/" replace />} />
              <Route path="/cadastro" element={!usuario ? <Cadastro /> : <Navigate to="/" replace />} />

              {/* Rotas protegidas - apenas usuários autenticados */}
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/campanhas" element={<ProtectedRoute><CampanhasList /></ProtectedRoute>} />

              {/* BUG-01: rota /admin agora exige papel de admin/criador */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Rotas protegidas que requerem campanha ativa */}
              <Route
                path="/ficha"
                element={
                  <ProtectedRoute requireCampaign>
                    <FichaList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ficha/:id"
                element={
                  <ProtectedRoute requireCampaign>
                    <PersonagemSheet />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/mestre"
                element={
                  <ProtectedRoute requireCampaign requireCampaignManager>
                    <MasterPage />
                  </ProtectedRoute>
                }
              />

              {/* Páginas em construção */}
              <Route
                path="/mundo"
                element={
                  <ProtectedRoute>
                    <MundoPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mundo/arvores/:arvoreId"
                element={
                  <ProtectedRoute>
                    <MundoPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mundo/cronologia"
                element={
                  <ProtectedRoute>
                    <MundoPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/loja"
                element={
                  <ProtectedRoute requireCampaign>
                    <LojaPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/materiais"
                element={
                  <ProtectedRoute>
                    <MateriaisPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/regras"
                element={
                  <ProtectedRoute>
                    <RegrasPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/regras/:categoria/:itemId"
                element={
                  <ProtectedRoute>
                    <RegraDetalhesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sessao"
                element={
                  <ProtectedRoute>
                    <SessaoPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/cofre"
                element={
                  <ProtectedRoute requireCampaign>
                    <CofrePage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
