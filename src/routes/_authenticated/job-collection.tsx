import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Search, RefreshCw, Download, ExternalLink, Trash2, Zap, Filter, Radio,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/job-collection")({
  component: JobCollectionPage,
  head: () => ({
    meta: [
      { title: "Job Collection Engine — TalentBridge AI" },
      {
        name: "description",
        content:
          "Automated intake of external job postings scraped from Indeed, LinkedIn, and company career pages via Apify and n8n.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type CollectedJob = {
  id: string;
  job_title: string;
  company_name: string;
  location: string | null;
  skills: string[];
  job_url: string | null;
  source: string | null;
  description: string | null;
  posted_date: string | null;
  status: "new" | "processed" | "shared";
  created_at: string;
};

const statusVariants: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  processed: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  shared: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

function JobCollectionPage() {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const isAdmin = roles.includes("super_admin");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [selected, setSelected] = useState<CollectedJob | null>(null);
  const [live, setLive] = useState(true);

  const { data: jobs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["collected_jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collected_jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CollectedJob[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!live) return;
    const channel = supabase
      .channel("collected_jobs_rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collected_jobs" },
        () => qc.invalidateQueries({ queryKey: ["collected_jobs"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [live, qc]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CollectedJob["status"] }) => {
      const { error } = await supabase.from("collected_jobs").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["collected_jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collected_jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job removed");
      qc.invalidateQueries({ queryKey: ["collected_jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearDuplicates = useMutation({
    mutationFn: async () => {
      const seen = new Map<string, string>();
      const toDelete: string[] = [];
      for (const j of jobs) {
        const key = (j.job_url ?? `${j.job_title}|${j.company_name}`).toLowerCase();
        if (seen.has(key)) toDelete.push(j.id);
        else seen.set(key, j.id);
      }
      if (toDelete.length === 0) return 0;
      const { error } = await supabase.from("collected_jobs").delete().in("id", toDelete);
      if (error) throw error;
      return toDelete.length;
    },
    onSuccess: (n) => {
      toast.success(n ? `Removed ${n} duplicate${n === 1 ? "" : "s"}` : "No duplicates found");
      qc.invalidateQueries({ queryKey: ["collected_jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const companies = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.company_name).filter(Boolean))).sort(),
    [jobs],
  );
  const locations = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.location).filter((x): x is string => !!x))).sort(),
    [jobs],
  );
  const sources = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.source).filter((x): x is string => !!x))).sort(),
    [jobs],
  );
  const allSkills = useMemo(
    () => Array.from(new Set(jobs.flatMap((j) => j.skills ?? []))).sort(),
    [jobs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (sourceFilter !== "all" && j.source !== sourceFilter) return false;
      if (companyFilter !== "all" && j.company_name !== companyFilter) return false;
      if (locationFilter !== "all" && j.location !== locationFilter) return false;
      if (skillFilter !== "all" && !(j.skills ?? []).includes(skillFilter)) return false;
      if (!q) return true;
      return (
        j.job_title.toLowerCase().includes(q) ||
        j.company_name.toLowerCase().includes(q) ||
        (j.location ?? "").toLowerCase().includes(q) ||
        (j.skills ?? []).some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [jobs, search, statusFilter, sourceFilter, companyFilter, locationFilter, skillFilter]);

  const counts = useMemo(() => {
    const c = { new: 0, processed: 0, shared: 0 };
    jobs.forEach((j) => { c[j.status]++; });
    return c;
  }, [jobs]);

  const exportCsv = () => {
    const header = ["job_title","company_name","location","skills","source","job_url","posted_date","status","created_at"];
    const lines = [header.join(",")];
    for (const j of filtered) {
      const row = [
        j.job_title, j.company_name, j.location ?? "", (j.skills ?? []).join("|"),
        j.source ?? "", j.job_url ?? "", j.posted_date ?? "", j.status, j.created_at,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collected-jobs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const triggerSync = async () => {
    toast.info("Triggering manual sync…");
    try {
      // Dev test: insert a synthetic job to validate the ingest path
      const { error } = await supabase.from("collected_jobs").insert({
        job_title: "Manual Sync Test Job",
        company_name: "Apify Test",
        location: "Remote",
        skills: ["test", "sync"],
        source: "manual",
        job_url: `https://example.com/job/${crypto.randomUUID()}`,
        posted_date: new Date().toISOString(),
        status: "new",
      });
      if (error) throw error;
      toast.success("Synthetic job inserted. In production, this triggers your Apify workflow.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Job Collection Engine"
        description="Automated intake of external job postings from Indeed, LinkedIn, and company career pages via Apify and n8n."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => clearDuplicates.mutate()}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear duplicates
                </Button>
                <Button size="sm" onClick={triggerSync}>
                  <Zap className="h-4 w-4 mr-2" />
                  Trigger sync
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="p-6 lg:p-10 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total collected", value: jobs.length, accent: "from-primary/20 to-primary/5" },
            { label: "New", value: counts.new, accent: "from-blue-500/20 to-blue-500/5" },
            { label: "Processed", value: counts.processed, accent: "from-amber-500/20 to-amber-500/5" },
            { label: "Shared", value: counts.shared, accent: "from-emerald-500/20 to-emerald-500/5" },
          ].map((s) => (
            <div key={s.label}
              className={`rounded-xl border border-border/60 bg-gradient-to-br ${s.accent} p-5 backdrop-blur transition-base hover:shadow-md`}>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
              <div className="text-3xl font-bold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title, company, skill, location…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <button
              onClick={() => setLive((v) => !v)}
              className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-base ${
                live ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10" : "border-border text-muted-foreground"
              }`}
              title="Toggle realtime updates"
            >
              <Radio className={`h-3.5 w-3.5 ${live ? "animate-pulse" : ""}`} />
              {live ? "Live" : "Paused"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <FilterSelect value={statusFilter} onChange={setStatusFilter} label="Status"
              options={[{ value: "all", label: "All status" }, { value: "new", label: "New" }, { value: "processed", label: "Processed" }, { value: "shared", label: "Shared" }]} />
            <FilterSelect value={sourceFilter} onChange={setSourceFilter} label="Source"
              options={[{ value: "all", label: "All sources" }, ...sources.map((s) => ({ value: s, label: s }))]} />
            <FilterSelect value={companyFilter} onChange={setCompanyFilter} label="Company"
              options={[{ value: "all", label: "All companies" }, ...companies.map((s) => ({ value: s, label: s }))]} />
            <FilterSelect value={locationFilter} onChange={setLocationFilter} label="Location"
              options={[{ value: "all", label: "All locations" }, ...locations.map((s) => ({ value: s, label: s }))]} />
            <FilterSelect value={skillFilter} onChange={setSkillFilter} label="Skill"
              options={[{ value: "all", label: "All skills" }, ...allSkills.slice(0, 200).map((s) => ({ value: s, label: s }))]} />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No jobs yet. Configure your Apify actor to POST to <code className="px-1.5 py-0.5 rounded bg-muted text-xs">/api/public/n8n/collected-jobs</code>.
                  </TableCell></TableRow>
                )}
                {filtered.map((j) => (
                  <TableRow key={j.id} className="cursor-pointer hover:bg-muted/30 transition-base" onClick={() => setSelected(j)}>
                    <TableCell className="font-medium max-w-[280px] truncate">{j.job_title}</TableCell>
                    <TableCell className="text-muted-foreground">{j.company_name}</TableCell>
                    <TableCell className="text-muted-foreground">{j.location ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {(j.skills ?? []).slice(0, 3).map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))}
                        {(j.skills ?? []).length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{j.skills.length - 3}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{j.source ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {j.posted_date ? new Date(j.posted_date).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`border ${statusVariants[j.status]}`} variant="outline">{j.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={j.status}
                        onValueChange={(v) => updateStatus.mutate({ id: j.id, status: v as CollectedJob["status"] })}
                      >
                        <SelectTrigger className="h-8 w-[130px] ml-auto"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Mark as New</SelectItem>
                          <SelectItem value="processed">Mark as Processed</SelectItem>
                          <SelectItem value="shared">Mark as Shared</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selected.job_title}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.company_name}{selected.location ? ` · ${selected.location}` : ""}
                </p>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  <Badge className={`border ${statusVariants[selected.status]}`} variant="outline">{selected.status}</Badge>
                  {selected.source && <Badge variant="secondary">{selected.source}</Badge>}
                  {selected.posted_date && (
                    <Badge variant="outline">Posted {new Date(selected.posted_date).toLocaleDateString()}</Badge>
                  )}
                </div>
                {(selected.skills?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1.5">Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                    </div>
                  </div>
                )}
                {selected.description && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1.5">Description</div>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{selected.description}</div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
                <div className="flex gap-2">
                  {isAdmin && (
                    <Button variant="destructive" size="sm" onClick={() => { del.mutate(selected.id); setSelected(null); }}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  )}
                </div>
                {selected.job_url && (
                  <a href={selected.job_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm">
                      View original <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </a>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilterSelect({
  value, onChange, label, options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[170px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
