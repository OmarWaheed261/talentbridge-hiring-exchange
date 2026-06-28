import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase, Users, CheckCircle2, Calendar, Award, FolderOpen,
  ArrowUpRight,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Recruitment Pipeline Dashboard — TalentBridge AI" },
      {
        name: "description",
        content:
          "Live overview of your recruitment pipeline: open roles, candidate submissions, interview funnel, and placement metrics.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const monthly = [
  { m: "Jan", submissions: 32, hires: 4 },
  { m: "Feb", submissions: 48, hires: 7 },
  { m: "Mar", submissions: 65, hires: 10 },
  { m: "Apr", submissions: 71, hires: 12 },
  { m: "May", submissions: 92, hires: 18 },
  { m: "Jun", submissions: 110, hires: 22 },
];
const funnel = [
  { stage: "Submitted", v: 320 },
  { stage: "Screening", v: 210 },
  { stage: "Interview", v: 95 },
  { stage: "Offer", v: 42 },
  { stage: "Hired", v: 28 },
];
const categories = [
  { name: "Engineering", v: 45 },
  { name: "Data & AI", v: 25 },
  { name: "Cloud / DevOps", v: 18 },
  { name: "Product", v: 12 },
];
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [jobs, jobsOpen, cands, hired, interview] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("candidates").select("id", { count: "exact", head: true }),
        supabase.from("candidates").select("id", { count: "exact", head: true }).eq("status", "hired"),
        supabase.from("candidates").select("id", { count: "exact", head: true }).eq("status", "interview"),
      ]);
      return {
        totalJobs: jobs.count ?? 0,
        activeJobs: jobsOpen.count ?? 0,
        totalCandidates: cands.count ?? 0,
        hired: hired.count ?? 0,
        interviews: interview.count ?? 0,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const [{ data: rj }, { data: rc }] = await Promise.all([
        supabase.from("jobs").select("id, job_title, company_name, created_at").order("created_at", { ascending: false }).limit(4),
        supabase.from("candidates").select("id, candidate_name, status, created_at").order("created_at", { ascending: false }).limit(4),
      ]);
      return {
        jobs: rj ?? [],
        candidates: rc ?? [],
      };
    },
  });

  return (
    <>
      <PageHeader
        title="Recruitment Pipeline Overview"

        description="Here's what's happening across your recruitment pipeline."
        actions={
          <Link to="/jobs">
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
              View jobs <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <div className="p-6 lg:p-10 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard label="Total Jobs" value={stats?.totalJobs ?? "—"} icon={Briefcase} accent="primary" trend={{ value: 12 }} />
          <StatCard label="Active Jobs" value={stats?.activeJobs ?? "—"} icon={FolderOpen} accent="info" trend={{ value: 8 }} />
          <StatCard label="Total Candidates" value={stats?.totalCandidates ?? "—"} icon={Users} accent="primary" trend={{ value: 24 }} />
          <StatCard label="Submitted" value={stats?.totalCandidates ?? "—"} icon={CheckCircle2} accent="success" trend={{ value: 18 }} />
          <StatCard label="Interviews" value={stats?.interviews ?? "—"} icon={Calendar} accent="warning" trend={{ value: 6 }} />
          <StatCard label="Placements" value={stats?.hired ?? "—"} icon={Award} accent="success" trend={{ value: 32 }} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass rounded-2xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Monthly Candidate Submissions</h3>
                <p className="text-xs text-muted-foreground">Pipeline volume over the last 6 months</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="m" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="submissions" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#sg)" />
                <Area type="monotone" dataKey="hires" stroke="var(--chart-3)" strokeWidth={2.5} fill="url(#hg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-6 shadow-card">
            <h3 className="font-semibold mb-1">Job Categories</h3>
            <p className="text-xs text-muted-foreground mb-4">Distribution by domain</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categories} dataKey="v" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
              {categories.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
                    {c.name}
                  </div>
                  <span className="text-muted-foreground">{c.v}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass rounded-2xl p-6 shadow-card">
            <h3 className="font-semibold mb-4">Hiring Funnel</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funnel} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="stage" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="v" radius={[0, 8, 8, 0]} fill="var(--chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-6 shadow-card">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {(recent?.jobs ?? []).map((j) => (
                <div key={j.id} className="flex items-start gap-3 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">New job: {j.job_title}</div>
                    <div className="text-xs text-muted-foreground">{j.company_name}</div>
                  </div>
                </div>
              ))}
              {(recent?.candidates ?? []).map((c) => (
                <div key={c.id} className="flex items-start gap-3 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.candidate_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{c.status.replace("_", " ")}</div>
                  </div>
                </div>
              ))}
              {!recent?.jobs.length && !recent?.candidates.length && (
                <p className="text-sm text-muted-foreground">No activity yet — add a job to get started.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
