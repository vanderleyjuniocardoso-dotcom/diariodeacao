import { Home, PlusCircle, Users, TrendingUp, MapPin } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { icon: Users, label: "Voluntagram", path: "/volunteers" },
  { icon: Home, label: "Impacto", path: "/dashboard" },
  { icon: PlusCircle, label: "Diário de Ação", path: "/register-action" },
  { icon: TrendingUp, label: "Trilha", path: "/trilha" },
  { icon: MapPin, label: "Seu GGL", path: "/ggl" },
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
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5 transition-all", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium text-center leading-tight">{tab.label}</span>
              {active && <div className="w-4 h-0.5 rounded-full bg-primary mt-0.5" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
