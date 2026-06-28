import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Plus, LayoutGrid, Rows3, Search, Filter, ArrowUp, ArrowDown, ArrowUpDown,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { dispatchN8nEvent } from "@/lib/n8n-dispatch.functions";

const STATUSES = ["submitted", "screening", "interview", "offer", "hired", "rejected"] as const;
type Status = typeof STATUSES[number];

const SORTABLE = ["created_at", "candidate_name", "email", "status"] as const;
type SortKey = (typeof SORTABLE)[number];

const PAGE_SIZE = 25;

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  status: fallback(z.enum(["all", ...STATUSES]), "all").default("all"),
  job: fallback(z.string(), "all").default("all"),
  sort: fallback(z.enum(SORTABLE), "created_at").default("created_at"),
  dir: fallback(z.enum(["asc", "desc"]), "desc").default("desc"),
  page: fallback(z.number().int().min(1), 1).default(1),
  view: fallback(z.enum(["kanban", "table"]), "table").default("table"),
});

export const Route = createFileRoute("/_authenticated/candidates")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Candidates — TalentBridge AI" },
      { name: "description", content: "Manage candidate submissions, screening status, interviews, and offers across all open recruitment pipelines." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CandidatesPage,
});

const statusStyles: Record<Status, string> = {
  submitted: "bg-info/10 text-info border-info/20",
  screening: "bg-warning/10 text-warning border-warning/20",
  interview: "bg-primary/10 text-primary border-primary/20",
  offer: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  hired: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

type Candidate = {
  id: string;
  candidate_name: string;
  email: string | null;
  phone: string | null;
  skills: string[];
  experience: string | null;
  linked_job_id: string | null;
  status: Status;
  notes: string | null;
  consultancy_id: string | null;
};

function CandidatesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const setParam = <K extends keyof typeof params>(key: K, value: (typeof params)[K]) => {
    navigate({
      search: (prev: typeof params) => ({
        ...prev,
        [key]: value,
        page: key === "page" ? (value as number) : 1,
      }),
    });
  };

  // Debounced free-text search
  const [searchDraft, setSearchDraft] = useState(params.q);
  useEffect(() => { setSearchDraft(params.q); }, [params.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchDraft !== params.q) setParam("q", searchDraft);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  // Jobs list for the linked-job filter and the create dialog
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, job_title")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Helper to apply filters/search to a query builder
  const applyFilters = <T extends ReturnType<typeof supabase.from>>(qb: T) => {
    let q = qb as ReturnType<typeof supabase.from>;
    if (params.status !== "all") q = q.eq("status", params.status);
    if (params.job !== "all") q = q.eq("linked_job_id", params.job);
    if (params.q.trim()) {
      const term = params.q.trim().replace(/[%,]/g, "");
      q = q.or(
        `candidate_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
      );
    }
    return q as T;
  };

  // Table view — paginated, sorted, with exact count
  const { data: tableResult, isLoading: tableLoading, isFetching: tableFetching } = useQuery({
    queryKey: ["candidates_table", params],
    queryFn: async () => {
      let q = supabase.from("candidates").select("*", { count: "exact" });
      q = applyFilters(q);
      q = q.order(params.sort, { ascending: params.dir === "asc", nullsFirst: false });
      if (params.sort !== "created_at") q = q.order("created_at", { ascending: false });
      const from = (params.page - 1) * PAGE_SIZE;
      q = q.range(from, from + PAGE_SIZE - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as Candidate[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
    enabled: params.view === "table",
  });

  // Kanban view — pulls all matching (capped) so columns aren't empty
  const KANBAN_CAP = 500;
  const { data: kanbanRows = [], isLoading: kanbanLoading } = useQuery({
    queryKey: ["candidates_kanban", params.q, params.status, params.job],
    queryFn: async () => {
      let q = supabase.from("candidates").select("*").order("created_at", { ascending: false });
      q = applyFilters(q);
      q = q.range(0, KANBAN_CAP - 1);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Candidate[];
    },
    enabled: params.view === "kanban",
  });

  // Status counts (filtered by job + q so badges reflect active scope)
  const { data: counts } = useQuery({
    queryKey: ["candidates_counts", params.q, params.job],
    queryFn: async () => {
      const out: Record<Status, number> = {
        submitted: 0, screening: 0, interview: 0, offer: 0, hired: 0, rejected: 0,
      };
      await Promise.all(
        STATUSES.map(async (s) => {
          let q = supabase.from("candidates").select("id", { count: "exact", head: true }).eq("status", s);
          if (params.job !== "all") q = q.eq("linked_job_id", params.job);
          if (params.q.trim()) {
            const term = params.q.trim().replace(/[%,]/g, "");
            q = q.or(`candidate_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
          }
          const { count } = await q;
          out[s] = count ?? 0;
        }),
      );
      return out;
    },
    staleTime: 30_000,
  });

  const rows = tableResult?.rows ?? [];
  const total = tableResult?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("candidates").update({ status }).eq("id", id);
      if (error) throw error;
      void dispatchN8nEvent({ data: { event: "candidate.status_changed", payload: { id, status } } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates_table"] });
      qc.invalidateQueries({ queryKey: ["candidates_kanban"] });
      qc.invalidateQueries({ queryKey: ["candidates_counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSort = (key: SortKey) => {
    if (params.sort === key) {
      navigate({ search: (prev: typeof params) => ({ ...prev, dir: prev.dir === "asc" ? "desc" : "asc", page: 1 }) });
    } else {
      navigate({ search: (prev: typeof params) => ({ ...prev, sort: key, dir: "asc", page: 1 }) });
    }
  };

  const sortIcon = (key: SortKey) => {
    if (params.sort !== key) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return params.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const SortableTh = ({ k, label }: { k: SortKey; label: string }) => {
    const active = params.sort === k;
    const ariaSort: "ascending" | "descending" | "none" = active
      ? params.dir === "asc" ? "ascending" : "descending"
      : "none";
    return (
      <th scope="col" aria-sort={ariaSort} className="p-3 font-semibold">
        <button
          type="button"
          onClick={() => toggleSort(k)}
          aria-label={`Sort by ${label}${
            active ? ` (currently ${ariaSort}, click to ${params.dir === "asc" ? "sort descending" : "sort ascending"})` : ", not sorted"
          }`}
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-base rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background px-1 -mx-1"
        >
          {label} {sortIcon(k)}
        </button>
      </th>
    );
  };

  return (
    <>
      <PageHeader
        title="Candidates"
        description="Track every candidate through your recruitment pipeline."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
                <Plus className="mr-1 h-4 w-4" /> Submit Candidate
              </Button>
            </DialogTrigger>
            <CandidateDialog jobs={jobs} onClose={() => setOpen(false)} onCreated={() => {
              qc.invalidateQueries({ queryKey: ["candidates_table"] });
              qc.invalidateQueries({ queryKey: ["candidates_kanban"] });
              qc.invalidateQueries({ queryKey: ["candidates_counts"] });
            }} />
          </Dialog>
        }
      />

      <div className="p-6 lg:p-10 space-y-6">
        {/* Filters */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, or phone…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={params.status} onValueChange={(v) => setParam("status", v as typeof params.status)}>
              <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={params.job} onValueChange={(v) => setParam("job", v)}>
              <SelectTrigger className="w-[220px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All jobs</SelectItem>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.job_title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ search: (prev: typeof params) => ({ ...prev, q: "", status: "all", job: "all", sort: "created_at", dir: "desc", page: 1 }) })}
            >
              Reset
            </Button>
          </div>
        </div>

        <Tabs
          value={params.view}
          onValueChange={(v) => navigate({ search: (prev: typeof params) => ({ ...prev, view: v as typeof params.view }) })}
        >
          <TabsList>
            <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4 mr-1.5" /> Kanban</TabsTrigger>
            <TabsTrigger value="table"><Rows3 className="h-4 w-4 mr-1.5" /> Table</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-6">
            {kanbanLoading ? <p className="text-muted-foreground text-sm">Loading…</p> : (
              <>
                {kanbanRows.length >= KANBAN_CAP && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Showing first {KANBAN_CAP} matching candidates. Narrow your filters for the full set.
                  </p>
                )}
                <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-4">
                  {STATUSES.map((s) => {
                    const items = kanbanRows.filter((c) => c.status === s);
                    return (
                      <div key={s} className="glass rounded-2xl p-3 min-h-[300px] shadow-card">
                        <div className="flex items-center justify-between mb-3 px-1">
                          <h4 className="text-xs font-semibold uppercase tracking-wider capitalize">{s}</h4>
                          <Badge variant="secondary" className="text-xs">{counts?.[s] ?? items.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {items.map((c) => (
                            <div key={c.id} className="bg-card border border-border/60 rounded-lg p-3 hover:shadow-md transition-base cursor-pointer">
                              <div className="font-medium text-sm">{c.candidate_name}</div>
                              <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {c.skills.slice(0, 2).map((sk) => (
                                  <Badge key={sk} variant="outline" className="text-[10px] px-1.5 py-0">{sk}</Badge>
                                ))}
                              </div>
                              <Select value={c.status} onValueChange={(v) => update.mutate({ id: c.id, status: v as Status })}>
                                <SelectTrigger className="mt-2 h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {STATUSES.map((st) => <SelectItem key={st} value={st} className="capitalize">{st}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="table" className="mt-6 space-y-4">
            <div className="glass rounded-2xl overflow-hidden shadow-card">
              <table
                className="w-full text-sm"
                aria-label="Candidates"
                aria-rowcount={total}
                aria-busy={tableLoading || tableFetching}
              >
                <caption className="sr-only">
                  Candidates list. Use sort buttons in column headers to reorder. Page {params.page} of {pageCount}.
                </caption>
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <SortableTh k="candidate_name" label="Name" />
                    <SortableTh k="email" label="Email" />
                    <th scope="col" className="p-3 font-semibold">Skills</th>
                    <SortableTh k="status" label="Status" />
                    <SortableTh k="created_at" label="Submitted" />
                  </tr>
                </thead>
                <tbody>
                  {tableLoading && rows.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
                  )}
                  {rows.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-border/60 hover:bg-muted/30 transition-base focus-within:bg-muted/30 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-inset"
                    >
                      <td className="p-3 font-medium">{c.candidate_name}</td>
                      <td className="p-3 text-muted-foreground">{c.email}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1" aria-label={c.skills.length ? `Skills: ${c.skills.join(", ")}` : "No skills listed"}>
                          {c.skills.slice(0, 3).map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                        </div>
                      </td>
                      <td className="p-3">
                        <Select value={c.status} onValueChange={(v) => update.mutate({ id: c.id, status: v as Status })}>
                          <SelectTrigger
                            aria-label={`Change status for ${c.candidate_name} (currently ${c.status})`}
                            className={`h-7 text-xs w-[130px] capitalize focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${statusStyles[c.status]}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((st) => <SelectItem key={st} value={st} className="capitalize">{st}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {(c as Candidate & { created_at?: string }).created_at
                          ? new Date((c as Candidate & { created_at: string }).created_at).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {!tableLoading && rows.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No candidates match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <nav aria-label="Candidates pagination" className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground" aria-live="polite" aria-atomic="true">
                {total === 0 ? "0 results" : (
                  <>
                    Showing <span className="font-medium text-foreground">{(params.page - 1) * PAGE_SIZE + 1}</span>–
                    <span className="font-medium text-foreground">{Math.min(params.page * PAGE_SIZE, total)}</span> of{" "}
                    <span className="font-medium text-foreground">{total}</span>
                    {tableFetching && <span className="ml-2 text-xs opacity-60">refreshing…</span>}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={params.page <= 1}
                  onClick={() => setParam("page", Math.max(1, params.page - 1))}
                  aria-label={`Go to previous page (currently page ${params.page} of ${pageCount})`}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Prev
                </Button>
                <span className="text-xs text-muted-foreground" aria-hidden="true">
                  Page {params.page} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={params.page >= pageCount}
                  onClick={() => setParam("page", Math.min(pageCount, params.page + 1))}
                  aria-label={`Go to next page (currently page ${params.page} of ${pageCount})`}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </nav>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function CandidateDialog({
  jobs,
  onClose,
  onCreated,
}: {
  jobs: { id: string; job_title: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    candidate_name: "", email: "", phone: "", experience: "",
    skills: "", notes: "", linked_job_id: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const consultancyId = profile?.consultancy_id;
      let resume_url: string | null = null;

      if (resumeFile) {
        if (!consultancyId) {
          throw new Error("You must belong to a consultancy to upload resumes.");
        }
        const ext = resumeFile.name.includes(".")
          ? resumeFile.name.slice(resumeFile.name.lastIndexOf("."))
          : "";
        const safeBase = resumeFile.name
          .replace(ext, "")
          .replace(/[^a-zA-Z0-9-_]+/g, "_")
          .slice(0, 60) || "resume";
        const path = `${consultancyId}/${crypto.randomUUID()}-${safeBase}${ext}`;
        const { error: upErr } = await supabase.storage
          .from("resumes")
          .upload(path, resumeFile, {
            contentType: resumeFile.type || "application/octet-stream",
            upsert: false,
          });
        if (upErr) throw upErr;
        resume_url = path;
      }

      const { data: inserted, error } = await supabase.from("candidates").insert({
        candidate_name: form.candidate_name,
        email: form.email || null,
        phone: form.phone || null,
        experience: form.experience || null,
        notes: form.notes || null,
        linked_job_id: form.linked_job_id || null,
        consultancy_id: consultancyId ?? null,
        resume_url,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      }).select("id, candidate_name, email, status, linked_job_id, consultancy_id").single();
      if (error) throw error;
      void dispatchN8nEvent({ data: { event: "candidate.submitted", payload: inserted ?? {} } });
    },
    onSuccess: () => { toast.success("Candidate submitted"); onCreated(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>Submit a candidate</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-2">
        <div className="col-span-2"><Label>Name</Label><Input value={form.candidate_name} onChange={(e) => setForm({ ...form, candidate_name: e.target.value })} className="mt-1.5" /></div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" /></div>
        <div className="col-span-2"><Label>Experience</Label><Input placeholder="5 years" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} className="mt-1.5" /></div>
        <div className="col-span-2"><Label>Skills (comma separated)</Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} className="mt-1.5" /></div>
        <div className="col-span-2">
          <Label>Linked job</Label>
          <Select value={form.linked_job_id} onValueChange={(v) => setForm({ ...form, linked_job_id: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a job" /></SelectTrigger>
            <SelectContent>{jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.job_title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Resume (PDF / DOC)</Label>
          <Input
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
            className="mt-1.5"
          />
          {!profile?.consultancy_id && (
            <p className="mt-1 text-xs text-muted-foreground">Join a consultancy to upload resumes.</p>
          )}
        </div>
        <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" /></div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={!form.candidate_name || create.isPending || (!!resumeFile && !profile?.consultancy_id)} onClick={() => create.mutate()} className="bg-gradient-primary text-primary-foreground">
          {create.isPending ? "Submitting…" : "Submit"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
