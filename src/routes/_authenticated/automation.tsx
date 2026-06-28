import { createFileRoute } from "@tanstack/react-router";
import { Workflow, Database, Bell, Calendar, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/automation")({
  component: AutomationPage,
});

const flows = [
  {
    title: "Job Discovery Workflow",
    description: "Automatically pulls fresh job openings from external sources into your database.",
    status: "active",
    steps: [
      { label: "Job Sources", icon: Database, tone: "info" },
      { label: "n8n", icon: Workflow, tone: "primary" },
      { label: "Lovable Cloud", icon: Database, tone: "primary" },
      { label: "Dashboard", icon: Sparkles, tone: "success" },
    ],
  },
  {
    title: "Candidate Submission Workflow",
    description: "When a consultancy submits a candidate, notifications are sent and the database is updated.",
    status: "active",
    steps: [
      { label: "Candidate Submission", icon: CheckCircle2, tone: "info" },
      { label: "Notification", icon: Bell, tone: "warning" },
      { label: "Database Update", icon: Database, tone: "success" },
    ],
  },
  {
    title: "Interview Workflow",
    description: "Coordinates interview scheduling with email notifications and status tracking.",
    status: "draft",
    steps: [
      { label: "Interview Scheduled", icon: Calendar, tone: "primary" },
      { label: "Email Notification", icon: Bell, tone: "warning" },
      { label: "Status Update", icon: CheckCircle2, tone: "success" },
    ],
  },
] as const;

const toneClasses: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

function AutomationPage() {
  return (
    <>
      <PageHeader
        title="Automation Center"
        description="Visual workflows powered by n8n that keep your recruitment pipeline humming."
      />
      <div className="p-6 lg:p-10 space-y-6">
        {flows.map((flow) => (
          <div key={flow.title} className="glass rounded-2xl p-6 shadow-card">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{flow.title}</h3>
                  <Badge className={flow.status === "active" ? "bg-success/15 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                    {flow.status === "active" ? "● Active" : "○ Draft"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{flow.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 overflow-x-auto">
              {flow.steps.map((s, i) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="flex items-center gap-3 bg-card border border-border/60 rounded-xl px-4 py-3 shadow-sm min-w-44">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneClasses[s.tone]}`}>
                      <s.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Step {i + 1}</div>
                      <div className="font-medium text-sm">{s.label}</div>
                    </div>
                  </div>
                  {i < flow.steps.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="glass rounded-2xl p-6 shadow-card bg-gradient-to-br from-primary/5 to-transparent border border-primary/20">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Build your own workflow</h3>
              <p className="text-sm text-muted-foreground mt-1">Connect any n8n workflow to TalentBridge AI to automate notifications, integrations, and recruiter actions.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
