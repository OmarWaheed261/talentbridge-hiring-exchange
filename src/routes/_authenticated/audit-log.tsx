import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Search, Filter, X, Radio, Download, FileText, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listAuditLogs, listAuditFacets, exportAuditLogsData } from "@/lib/audit-log.functions";
import { exportAuditRowsAsCSV, exportAuditRowsAsPDF, type AuditRow } from "@/lib/audit-log-export";
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

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function AuditLogPage() {
  const { roles } = useAuth();
  const isSuper = roles.includes("super_admin");
  const listFn = useServerFn(listAuditLogs);
  const facetsFn = useServerFn(listAuditFacets);
  const queryClient = useQueryClient();
  const [live, setLive] = useState<"connecting" | "live" | "off">("connecting");



  const [eventType, setEventType] = useState<EventType | "all">("all");
  const [status, setStatus] = useState<"all" | "success" | "failure">("all");
  const [action, setAction] = useState<string>("all");
  const [consultancyId, setConsultancyId] = useState<string>("all");
  const [actor, setActor] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const debouncedSearch = useDebounced(search, 300);
  const debouncedActor = useDebounced(actor, 300);

  useEffect(() => { setPage(1); }, [eventType, status, action, consultancyId, debouncedActor, debouncedSearch, dateFrom, dateTo]);

  const facets = useQuery({
    queryKey: ["audit-facets"],
    enabled: isSuper,
    queryFn: () => facetsFn({}),
    staleTime: 60_000,
  });

  const query = useQuery({
    queryKey: ["audit-logs", { eventType, status, action, consultancyId, debouncedActor, debouncedSearch, dateFrom, dateTo, page }],
    enabled: isSuper,
    queryFn: () =>
      listFn({
        data: {
          event_type: eventType === "all" ? null : eventType,
          status: status === "all" ? null : status,
          action: action === "all" ? null : action,
          consultancy_id: consultancyId === "all" ? null : consultancyId,
          actor: debouncedActor.trim() || null,
          search: debouncedSearch.trim() || null,
          from: dateFrom ? new Date(dateFrom).toISOString() : null,
          to: dateTo ? new Date(dateTo + "T23:59:59").toISOString() : null,
          page,
          pageSize,
        },
      }),
  });

  // Realtime: new audit events → refresh list + facets, and surface a toast
  useEffect(() => {
    if (!isSuper) return;
    setLive("connecting");
    const channel = supabase
      .channel("audit-logs-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        (payload) => {
          const row = payload.new as {
            event_type?: string;
            action?: string;
            actor_email?: string | null;
            status?: string;
          };
          queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
          queryClient.invalidateQueries({ queryKey: ["audit-facets"] });
          const who = row.actor_email ?? "system";
          toast(`New ${row.event_type ?? "event"}: ${row.action ?? ""}`, {
            description: `by ${who}${row.status === "failure" ? " · failed" : ""}`,
          });
        },
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setLive("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setLive("off");
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSuper, queryClient]);


  const activeCount = useMemo(() => {
    let n = 0;
    if (eventType !== "all") n++;
    if (status !== "all") n++;
    if (action !== "all") n++;
    if (consultancyId !== "all") n++;
    if (actor) n++;
    if (search) n++;
    if (dateFrom) n++;
    if (dateTo) n++;
    return n;
  }, [eventType, status, action, consultancyId, actor, search, dateFrom, dateTo]);

  const clearAll = () => {
    setEventType("all");
    setStatus("all");
    setAction("all");
    setConsultancyId("all");
    setActor("");
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

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
  const consultancies = facets.data?.consultancies ?? [];
  const actions = facets.data?.actions ?? [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Audit Log"
        description="Authentication events and role-based actions for troubleshooting."
        actions={
          <div className="flex items-center gap-2">
            <Badge
              variant={live === "live" ? "secondary" : "outline"}
              className="gap-1"
              aria-live="polite"
            >
              <Radio
                className={`h-3 w-3 ${live === "live" ? "text-emerald-500 animate-pulse" : "text-muted-foreground"}`}
              />
              {live === "live" ? "Live" : live === "connecting" ? "Connecting…" : "Offline"}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${query.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }

      />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
            {activeCount > 0 && <Badge variant="secondary">{activeCount} active</Badge>}
          </CardTitle>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Label htmlFor="audit-search" className="sr-only">Keyword</Label>
            <Search className="h-4 w-4 absolute left-3 top-[calc(50%+2px)] -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="audit-search"
              placeholder="Keyword: email, action, resource type or id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div>
            <Label htmlFor="audit-actor" className="sr-only">User</Label>
            <Input
              id="audit-actor"
              placeholder="User email or UUID"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
            />
          </div>

          <Select value={consultancyId} onValueChange={setConsultancyId}>
            <SelectTrigger aria-label="Consultancy"><SelectValue placeholder="Consultancy" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All consultancies</SelectItem>
              {consultancies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={eventType} onValueChange={(v) => setEventType(v as EventType | "all")}>
            <SelectTrigger aria-label="Event type"><SelectValue placeholder="Event type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event types</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
              <SelectItem value="role_action">Role action</SelectItem>
              <SelectItem value="data">Data</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>

          <Select value={action} onValueChange={setAction}>
            <SelectTrigger aria-label="Action"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => setStatus(v as "all" | "success" | "failure")}>
            <SelectTrigger aria-label="Status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
            </SelectContent>
          </Select>

          <div>
            <Label htmlFor="audit-from" className="text-xs text-muted-foreground">From</Label>
            <Input id="audit-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="audit-to" className="text-xs text-muted-foreground">To</Label>
            <Input id="audit-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
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
                    <TableCell className="text-sm">
                      <button
                        type="button"
                        className="hover:underline text-left"
                        onClick={() => setActor(r.actor_email ?? r.actor_id ?? "")}
                        title="Filter by this user"
                      >
                        {r.actor_email ?? r.actor_id ?? "—"}
                      </button>
                    </TableCell>
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
