import { Home, PlusCircle, Clock, User, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: PlusCircle, label: "Registrar", path: "/register-action" },
  { icon: Users, label: "Voluntários", path: "/volunteers" },
  { icon: Clock, label: "Histórico", path: "/history" },
  { icon: User, label: "Perfil", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[60px]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5 transition-all", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {active && <div className="w-4 h-0.5 rounded-full bg-primary mt-0.5" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
