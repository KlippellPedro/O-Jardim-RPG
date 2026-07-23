import { useEffect } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store/useAuthStore';
import { RegrasPage } from './pages/Regras/RegrasPage';
import { SessaoPage } from './pages/Sessao/SessaoPage';
import { MundoPage } from './pages/Mundo/MundoPage';
import { LojaPage } from './pages/Loja/LojaPage';

// ──────────────────────────────────────────────────────────────────────────────
// ProtectedRoute — guarda de rota unificada
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
  const { initContexto, isInitialized, usuario } = useAuthStore();

  useEffect(() => {
    initContexto();
  }, [initContexto]);

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
    <Router>
      <div className="relative min-h-screen w-full bg-background overflow-hidden text-white font-sans selection:bg-primary/30">

        <AtmosphericBackground />

        {usuario && <GlassMenu />}

        {usuario && <SettingsMenu />}

        <AnimatePresence mode="wait">
          <Routes>
            {/* Rotas públicas — redirecionam se já logado */}
            <Route path="/login" element={!usuario ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/cadastro" element={!usuario ? <Cadastro /> : <Navigate to="/" replace />} />

            {/* Rotas protegidas — apenas usuários autenticados */}
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
              path="/sessao"
              element={
                <ProtectedRoute>
                  <SessaoPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AnimatePresence>
      </div>
    </Router>
  );
}

export default App;
