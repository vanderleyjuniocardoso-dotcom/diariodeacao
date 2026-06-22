import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({
  children,
  adminOnly = false,
  gglAdminOnly = false,
  allowGglAdmin = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
  gglAdminOnly?: boolean;
  /** If true, allow ggl_admin users to access this route too (otherwise they're redirected). */
  allowGglAdmin?: boolean;
}) => {
  const { user, loading, isAdmin, gglAdminGroupId } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/cpf-gate" replace />;

  // GGL admins só podem ver suas próprias rotas — bloqueia o resto.
  if (gglAdminGroupId && !isAdmin && !gglAdminOnly && !allowGglAdmin) {
    return <Navigate to="/ggl-admin" replace />;
  }

  if (gglAdminOnly && !gglAdminGroupId && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
