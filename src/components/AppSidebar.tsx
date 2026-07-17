import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Briefcase, Users, Building2, Workflow, Bell,
  BarChart3, Settings, Sparkles, LogOut, Search, Radar, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/job-search", label: "Job Search", icon: Search },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/job-collection", label: "Job Collection Engine", icon: Radar },
  { to: "/candidates", label: "Candidates", icon: Users },
  { to: "/consultancies", label: "Consultancies", icon: Building2 },
  { to: "/automation", label: "Automation Center", icon: Workflow },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/audit-log", label: "Audit Log", icon: ShieldCheck, requiresRole: "super_admin" as const },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, user, signOut, roles } = useAuth();
  const navigate = useNavigate();

  const initials = (profile?.full_name || user?.email || "U")
    .split(/[\s@]/)[0].slice(0, 2).toUpperCase();

  return (
    <aside className="hidden md:flex bg-gradient-sidebar text-sidebar-foreground w-64 shrink-0 flex-col h-screen sticky top-0 border-r border-sidebar-border">
      <div className="p-5 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-semibold leading-tight">TalentBridge</div>
          <div className="text-xs text-sidebar-foreground/60">AI Recruitment</div>
        </div>
      </div>

      <div className="px-4">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/40 text-sidebar-foreground/70 text-sm hover:bg-sidebar-accent transition-base">
          <Search className="h-4 w-4" />
          <span>Search…</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-sidebar-accent text-sidebar-foreground/60">⌘K</kbd>
        </button>
      </div>

      <nav className="px-3 mt-4 flex-1 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-base ${
                active
                  ? "bg-sidebar-primary/15 text-sidebar-primary border border-sidebar-primary/20 shadow-sm"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/30">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile?.full_name || user?.email}</div>
            <div className="text-[11px] text-sidebar-foreground/60 capitalize truncate">
              {(roles[0] ?? "user").replace("_", " ")}
            </div>
          </div>
          <button
            onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}
            className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-base"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
