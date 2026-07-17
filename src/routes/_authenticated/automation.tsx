import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Workflow, Database, Radar, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAutomationOverview } from "@/lib/job-search.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/automation")({
  component: AutomationCenter,
  head: () => ({
    meta: [
      { title: "Automation Center — TalentBridge AI" },
      { name: "description", content: "Realtime status of your Apify, n8n, and Lovable Cloud job-collection pipeline." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AutomationCenter() {
  const fn = useServerFn(getAutomationOverview);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["automation-overview"], queryFn: () => fn(), refetchInterval: 30_000 });

  useEffect(() => {
    const ch = supabase
      .channel("automation-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "automation_logs" },
        () => qc.invalidateQueries({ queryKey: ["automation-overview"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const d = q.data;
  const lastSyncFresh = d?.lastSync ? (Date.now() - new Date(d.lastSync).getTime() < 6 * 3600_000) : false;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Automation Center"
        description="Realtime status of the Apify → n8n → Lovable Cloud pipeline."
        actions={
          <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["automation-overview"] })}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total jobs" value={(d?.totalJobs ?? 0).toLocaleString()} icon={Database} />
        <StatCard label="Imported today" value={(d?.jobsToday ?? 0).toLocaleString()} icon={Radar} />
        <StatCard label="Duplicates removed (24h)" value={(d?.duplicatesRemoved24h ?? 0).toLocaleString()} icon={CheckCircle2} />
        <StatCard label="Last sync"
          value={d?.lastSync ? formatDistanceToNow(new Date(d.lastSync), { addSuffix: true }) : "—"}
          icon={Clock} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusPill service="Apify" ok={lastSyncFresh} detail={d?.lastSyncSource ?? "no runs yet"} />
        <StatusPill service="n8n" ok={lastSyncFresh} detail={d?.lastSyncStatus ?? "no runs yet"} />
        <StatusPill service="Lovable Cloud" ok={true} detail="online" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent automation logs</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Imported</th>
                  <th className="px-3 py-2 text-right">Duplicates</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {(d?.logs ?? []).map((l: any) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-3 py-2 capitalize">{l.source}</td>
                    <td className="px-3 py-2">{l.event}</td>
                    <td className="px-3 py-2">
                      <Badge variant={l.status === "success" ? "default" : l.status === "failure" ? "destructive" : "secondary"}>
                        {l.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">{l.jobs_imported ?? 0}</td>
                    <td className="px-3 py-2 text-right">{l.duplicates_removed ?? 0}</td>
                    <td className="px-3 py-2 text-muted-foreground max-w-md truncate" title={l.message ?? ""}>{l.message ?? "—"}</td>
                  </tr>
                ))}
                {(d?.logs ?? []).length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No automation runs yet. Trigger your first n8n workflow.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ service, ok, detail }: { service: string; ok: boolean; detail: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${ok ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
          {ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
        </div>
        <div>
          <div className="font-medium">{service}</div>
          <div className="text-xs text-muted-foreground capitalize">{detail}</div>
        </div>
      </CardContent>
    </Card>
  );
}
