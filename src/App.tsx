import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AtmosphericBackground from './AtmosphericBackground';
import GlassMenu from './components/GlassMenu';
import Home from './pages/Home';
import FichaList from './pages/Ficha/FichaList';
import { Login } from './pages/Auth/Login';
import { Cadastro } from './pages/Auth/Cadastro';
import { CampanhasList } from './pages/Campanhas/CampanhasList';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { PersonagemSheet } from './pages/Ficha/PersonagemSheet';
import { SettingsMenu } from './components/Settings/SettingsMenu';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store/useAuthStore';
import { RegrasPage } from './pages/Regras/RegrasPage';
import { RegraDetalhesPage } from './pages/Regras/RegraDetalhesPage';
import { SessaoPage } from './pages/Sessao/SessaoPage';
import { MundoPage } from './pages/Mundo/MundoPage';
import { LojaPage } from './pages/Loja/LojaPage';
import { MasterPage } from './pages/Mestre/MasterPage';
import { CofrePage } from './pages/Cofre/CofrePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { resetAllCharacterData } from './store/useCharacterStore';

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
}

const ProtectedRoute = ({
  children,
  requireCampaign = false,
  requireAdmin = false,
}: ProtectedRouteProps) => {
  const { usuario, isInitialized, campanhaAtiva } = useAuthStore();

  // Aguarda a inicialização do contexto (rehidratação via API)
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-white">
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
      usuario.papel_plataforma === 'criador' ||
      usuario.admin_plataforma === true;
    if (!isAdmin) return <Navigate to="/" replace />;
  }

  // Requer campanha ativa selecionada
  if (requireCampaign && !campanhaAtiva) return <Navigate to="/campanhas" replace />;

  return children;
};

// ──────────────────────────────────────────────────────────────────────────────
// App
// ──────────────────────────────────────────────────────────────────────────────
function App() {
  const { initContexto, isInitialized, usuario, logout } = useAuthStore();
  const prevUsuarioRef = useRef(usuario);

  useEffect(() => {
    initContexto();
  }, [initContexto]);

  // C1 - Limpa dados de personagens quando o usuário faz logout
  // (evita que usuário B veja dados do usuário A na mesma sessão de browser)
  useEffect(() => {
    const prev = prevUsuarioRef.current;
    prevUsuarioRef.current = usuario;
    if (prev !== null && usuario === null) {
      resetAllCharacterData();
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
      <div className="min-h-screen bg-background flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Carregando O Jardim...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="relative min-h-screen w-full bg-background text-white font-sans selection:bg-primary/30">

          <AtmosphericBackground />

          {usuario && <GlassMenu />}

          {usuario && <SettingsMenu />}

          <AnimatePresence mode="wait">
            <Routes>
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
                  <ProtectedRoute requireCampaign>
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
                path="/loja"
                element={
                  <ProtectedRoute requireCampaign>
                    <LojaPage />
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
          </AnimatePresence>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
