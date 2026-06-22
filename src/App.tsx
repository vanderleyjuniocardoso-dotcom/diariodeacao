import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import RegisterAction from "./pages/RegisterAction";
import History from "./pages/History";

import Admin from "./pages/Admin";
import Volunteers from "./pages/Volunteers";
import VolunteerProfile from "./pages/VolunteerProfile";
import PostDetail from "./pages/PostDetail";
import Trilha from "./pages/Trilha";
import Ggl from "./pages/Ggl";
import CpfGate from "./pages/CpfGate";
import CadastroCompleto from "./pages/CadastroCompleto";
import AguardandoAprovacao from "./pages/AguardandoAprovacao";
import AgendarBoasVindas from "./pages/AgendarBoasVindas";
import MinhaJornada from "./pages/MinhaJornada";
import GglAdminSignup from "./pages/GglAdminSignup";
import GglAdminHome from "./pages/GglAdminHome";
import NotFound from "./pages/NotFound";
import WelcomeOverlay from "./components/WelcomeOverlay";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WelcomeOverlay />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cpf-gate" element={<CpfGate />} />
            <Route path="/cadastro-completo" element={<CadastroCompleto />} />
            <Route path="/aguardando-aprovacao" element={<AguardandoAprovacao />} />
            <Route path="/boas-vindas/agendar" element={<AgendarBoasVindas />} />
            <Route path="/minha-jornada" element={<MinhaJornada />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/register-action" element={<ProtectedRoute><RegisterAction /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            
            <Route path="/volunteers" element={<ProtectedRoute><Volunteers /></ProtectedRoute>} />
            <Route path="/voluntario/:id" element={<ProtectedRoute><VolunteerProfile /></ProtectedRoute>} />
            <Route path="/post/:id" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
            <Route path="/trilha" element={<ProtectedRoute><Trilha /></ProtectedRoute>} />
            <Route path="/ggl" element={<ProtectedRoute><Ggl /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
