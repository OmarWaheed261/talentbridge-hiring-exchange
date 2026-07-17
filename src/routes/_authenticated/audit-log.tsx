import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ShieldCheck, Search, Filter } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAuditLogs } from "@/lib/audit-log.functions";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/audit-log")({
  head: () => ({
    meta: [
      { title: "Audit Log — TalentBridge AI" },
      { name: "description", content: "Review authentication events and role-based actions across the platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuditLogPage,
});

type EventType = "auth" | "role_action" | "data" | "system";

function AuditLogPage() {
  const { roles } = useAuth();
  const isSuper = roles.includes("super_admin");
  const listFn = useServerFn(listAuditLogs);

  const [eventType, setEventType] = useState<EventType | "all">("all");
  const [status, setStatus] = useState<"all" | "success" | "failure">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const query = useQuery({
    queryKey: ["audit-logs", { eventType, status, search, page }],
    enabled: isSuper,
    queryFn: () =>
      listFn({
        data: {
          event_type: eventType === "all" ? null : eventType,
          status: status === "all" ? null : status,
          search: search || null,
          page,
          pageSize,
        },
      }),
  });

  if (!isSuper) {
    return (
      <div className="p-6">
        <PageHeader title="Audit Log" description="Restricted area" />
        <Card className="mt-6">
          <CardContent className="p-8 text-center text-muted-foreground">
            You need the <Badge variant="outline">super_admin</Badge> role to view the audit log.
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Audit Log"
        description="Authentication events and role-based actions for troubleshooting."

        actions={
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${query.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search email, action, resource id…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={eventType} onValueChange={(v) => { setEventType(v as EventType | "all"); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Event type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event types</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
              <SelectItem value="role_action">Role action</SelectItem>
              <SelectItem value="data">Data</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v as "all" | "success" | "failure"); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">
            {query.isLoading ? "Loading…" : `${total.toLocaleString()} event${total === 1 ? "" : "s"}`}
          </CardTitle>
          <div className="text-sm text-muted-foreground" aria-live="polite">
            Page {page} of {totalPages}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && !query.isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No audit events match these filters.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.event_type}</Badge></TableCell>
                    <TableCell className="font-medium">{r.action}</TableCell>
                    <TableCell className="text-sm">{r.actor_email ?? r.actor_id ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.actor_role ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {r.resource_type ? `${r.resource_type}${r.resource_id ? `:${r.resource_id}` : ""}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "success" ? "secondary" : "destructive"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <details>
                        <summary className="cursor-pointer text-xs text-muted-foreground">view</summary>
                        <pre className="text-[10px] mt-1 whitespace-pre-wrap break-all">
                          {JSON.stringify(r.metadata, null, 2)}
                        </pre>
                      </details>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between p-3 border-t">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
