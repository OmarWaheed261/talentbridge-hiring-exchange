import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Database, ShieldCheck, KeyRound, UserCog } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { runRlsHealthcheck, type CheckResult } from "@/lib/rls-healthcheck.functions";

export const Route = createFileRoute("/_authenticated/health")({
  head: () => ({
    meta: [
      { title: "Backend Health — TalentBridge AI" },
      { name: "description", content: "Verify database connection, auth, role resolution and row-level security policies." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HealthPage,
});

const CATEGORY_ICON: Record<CheckResult["category"], typeof Database> = {
  connection: Database,
  auth: KeyRound,
  role: UserCog,
  rls: ShieldCheck,
};

function HealthPage() {
  const runFn = useServerFn(runRlsHealthcheck);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => runFn({}),
    onSuccess: (r) => setLastRun(r.ranAt),
  });

  const data = mutation.data;
  const failing = data?.results.filter((r) => !r.ok) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backend Health Check"
        description="Verifies Supabase connection, auth session, role helpers and RLS policies. Shows the exact failing policy on error."
        actions={
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {data ? "Re-run checks" : "Run checks"}
          </Button>
        }
      />

      {!data && !mutation.isPending && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Click "Run checks" to test your backend connection and RLS policies.</CardContent></Card>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Passed</div><div className="text-2xl font-semibold text-green-600">{data.summary.passed}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Failed</div><div className="text-2xl font-semibold text-destructive">{data.summary.failed}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Consultancy</div><div className="truncate text-sm font-mono">{data.consultancyId ?? "—"}</div></CardContent></Card>
          </div>

          {failing.length > 0 && (
            <Card className="border-destructive/40">
              <CardHeader><CardTitle className="text-destructive">Failing checks ({failing.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {failing.map((r, i) => (
                  <div key={i} className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <div className="font-medium">{r.name}</div>
                    {r.error && (
                      <div className="mt-2 space-y-1 text-sm">
                        {r.error.code && <div><span className="text-muted-foreground">Code:</span> <code className="font-mono">{r.error.code}</code></div>}
                        <div><span className="text-muted-foreground">Message:</span> {r.error.message}</div>
                        {r.error.hint && <div><span className="text-muted-foreground">Hint:</span> {r.error.hint}</div>}
                        {r.error.details && <div><span className="text-muted-foreground">Details:</span> {r.error.details}</div>}
                        {r.error.policyHint && (
                          <div className="mt-2 rounded bg-background p-2 font-mono text-xs">
                            <div className="mb-1 text-muted-foreground">Suggested fix:</div>
                            {r.error.policyHint}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>All checks</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {data.results.map((r, i) => {
                const Icon = CATEGORY_ICON[r.category];
                return (
                  <div key={i} className="flex items-start gap-3 py-3">
                    <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.name}</span>
                        <Badge variant="outline" className="text-xs">{r.category}</Badge>
                      </div>
                      {r.detail && <div className="text-sm text-muted-foreground">{r.detail}</div>}
                      {!r.ok && r.error?.message && <div className="text-sm text-destructive">{r.error.message}</div>}
                    </div>
                    {r.ok ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-destructive" />}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {lastRun && <p className="text-xs text-muted-foreground">Last run: {new Date(lastRun).toLocaleString()}</p>}
        </>
      )}
    </div>
  );
}
