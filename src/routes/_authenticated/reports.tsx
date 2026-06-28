import { createFileRoute } from "@tanstack/react-router";
import { FileText, Download, Sparkles, Brain, Target, Zap, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — TalentBridge AI" },
      { name: "description", content: "Recruitment performance reports: hiring funnel, source effectiveness, time-to-hire, and consultancy leaderboards." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReportsPage,
});

const reports = [
  { title: "Job Report", desc: "All jobs, sources, and statuses." },
  { title: "Candidate Report", desc: "Pipeline-wide candidate breakdown." },
  { title: "Placement Report", desc: "Hires by month, role, and consultancy." },
  { title: "Consultancy Performance", desc: "Submissions, conversion, fill rate." },
];

const future = [
  { title: "AI Resume Matching", desc: "Score candidates against any job spec instantly.", icon: Brain },
  { title: "Candidate Ranking", desc: "Auto-rank submissions by fit, experience, and signal.", icon: Target },
  { title: "Automated Screening", desc: "Skip the first-round triage with AI-assisted screening.", icon: Zap },
  { title: "Job Recommendation Engine", desc: "Push the right openings to the right consultancies.", icon: Sparkles },
  { title: "AI Analytics Dashboard", desc: "Predictive insights on hiring velocity and quality.", icon: BarChart3 },
];

function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate, export, and share recruitment performance reports."
      />
      <div className="p-6 lg:p-10 space-y-8">
        <div className="grid md:grid-cols-2 gap-4">
          {reports.map((r) => (
            <div key={r.title} className="glass rounded-2xl p-5 shadow-card flex items-start gap-4 hover:shadow-elegant transition-spring">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{r.title}</h3>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["PDF", "Excel", "CSV"].map((f) => (
                    <Button key={f} size="sm" variant="outline">
                      <Download className="h-3.5 w-3.5 mr-1" /> {f}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Upcoming AI features</h2>
            <Badge className="bg-gradient-primary text-primary-foreground border-0">Premium</Badge>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {future.map((f) => (
              <div key={f.title} className="glass rounded-2xl p-5 shadow-card relative overflow-hidden">
                <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-primary opacity-10 blur-2xl" />
                <div className="h-11 w-11 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
                <Badge variant="outline" className="mt-3 text-xs">Coming soon</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
