import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  className?: string;
  gradient?: boolean;
}

const StatCard = ({ icon: Icon, label, value, className, gradient }: StatCardProps) => (
  <div className={cn(
    "rounded-2xl p-4 flex items-center gap-3 animate-scale-in",
    gradient ? "gradient-hero text-primary-foreground" : "glass-card",
    className
  )}>
    <div className={cn(
      "rounded-xl p-2.5",
      gradient ? "bg-primary-foreground/20" : "bg-primary/10"
    )}>
      <Icon className={cn("h-5 w-5", gradient ? "text-primary-foreground" : "text-primary")} />
    </div>
    <div>
      <p className={cn("text-2xl font-bold font-heading", !gradient && "text-foreground")}>{value}</p>
      <p className={cn("text-xs", gradient ? "text-primary-foreground/80" : "text-muted-foreground")}>{label}</p>
    </div>
  </div>
);

export default StatCard;
