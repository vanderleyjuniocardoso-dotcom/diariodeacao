import { Clock, Activity, Users } from "lucide-react";

interface ReportLike {
  hours: number | null;
  beneficiaries_count?: number | null;
}

interface Props {
  reports: ReportLike[];
  volunteersCount: number;
}

const COLORS = {
  hours: "hsl(var(--primary))",
  actions: "#10B981",
  volunteers: "#8B5CF6",
};

// Donut showing how close to a target the value is (visual only — full when value >= target)
const Donut = ({ value, max, color, icon: Icon }: { value: number; max: number; color: string; icon: any }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="relative h-16 w-16 flex-shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} stroke={`${color}33`} strokeWidth="7" fill="none" />
        <circle
          cx="32" cy="32" r={r} stroke={color} strokeWidth="7" fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
    </div>
  );
};

const Card = ({ label, value, color, icon, max }: { label: string; value: number; color: string; icon: any; max: number }) => (
  <div className="glass-card rounded-xl p-3 flex items-center gap-3">
    <Donut value={value} max={max} color={color} icon={icon} />
    <div className="min-w-0">
      <p className="text-[10px] uppercase font-bold text-muted-foreground leading-tight">{label}</p>
      <p className="text-2xl font-bold text-foreground leading-tight">{value.toLocaleString("pt-BR")}</p>
    </div>
  </div>
);

const GglStatsDashboard = ({ reports, volunteersCount }: Props) => {
  const totalHours = reports.reduce((s, r) => s + (Number(r.hours) || 0), 0);
  const totalActions = reports.length;

  // dynamic "target" so the donut always shows meaningful progress
  const maxHours = Math.max(10, Math.ceil(totalHours * 1.25));
  const maxActions = Math.max(5, Math.ceil(totalActions * 1.25));
  const maxVols = Math.max(5, Math.ceil(volunteersCount * 1.25));

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase text-foreground">DASHBOARD DA UNIDADE</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Card label="Horas Totais" value={Math.round(totalHours * 10) / 10} color={COLORS.hours} icon={Clock} max={maxHours} />
        <Card label="Ações Totais" value={totalActions} color={COLORS.actions} icon={Activity} max={maxActions} />
        <Card label="Voluntários" value={volunteersCount} color={COLORS.volunteers} icon={Users} max={maxVols} />
      </div>
    </div>
  );
};

export default GglStatsDashboard;
