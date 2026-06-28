import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

export function StatCard({
  label, value, icon: Icon, trend, accent = "primary",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; positive?: boolean };
  accent?: "primary" | "success" | "warning" | "info";
}) {
  const tones: Record<string, string> = {
    primary: "from-primary/15 to-primary/5 text-primary",
    success: "from-success/15 to-success/5 text-success",
    warning: "from-warning/15 to-warning/5 text-warning",
    info: "from-info/15 to-info/5 text-info",
  };
  return (
    <div className="glass rounded-2xl p-5 shadow-card transition-spring hover:shadow-elegant hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
        </div>
        <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${tones[accent]} flex items-center justify-center`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <div className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${trend.positive ?? trend.value > 0 ? "text-success" : "text-destructive"}`}>
          {(trend.positive ?? trend.value > 0) ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend.value)}% vs last month
        </div>
      )}
    </div>
  );
}
