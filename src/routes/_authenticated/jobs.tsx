import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, MapPin, Building2, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/jobs")({
  component: JobsPage,
  head: () => ({
    meta: [
      { title: "Open Jobs — TalentBridge AI" },
      {
        name: "description",
        content:
          "Browse and manage all open positions across client companies, with filters for employment type, experience level, and skills.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type Job = {
  id: string;
  job_title: string;
  company_name: string;
  location: string | null;
  employment_type: string;
  experience_level: string;
  required_skills: string[];
  salary_range: string | null;
  status: string;
  posted_date: string;
};

const employmentTypes = ["full_time", "part_time", "contract", "contract_to_hire", "internship"];
const expLevels = ["entry", "mid", "senior", "lead", "principal"];

function JobsPage() {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canManage = roles.includes("super_admin");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Job[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Job deleted"); qc.invalidateQueries({ queryKey: ["jobs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = jobs.filter((j) => {
    const s = search.toLowerCase();
    const matches = !s || j.job_title.toLowerCase().includes(s) || j.company_name.toLowerCase().includes(s) || (j.location?.toLowerCase().includes(s) ?? false);
    const matchesType = typeFilter === "all" || j.employment_type === typeFilter;
    return matches && matchesType;
  });

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Browse and manage all open positions across client companies."
        actions={
          canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
                  <Plus className="mr-1 h-4 w-4" /> Add Job
                </Button>
              </DialogTrigger>
              <JobDialog onClose={() => setOpen(false)} />
            </Dialog>
          )
        }
      />

      <div className="p-6 lg:p-10 space-y-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs, skills, locations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 glass border-border/60"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48 glass border-border/60">
              <SelectValue placeholder="Employment type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {employmentTypes.map((t) => (
                <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <h3 className="mt-3 font-semibold">No jobs yet</h3>
            <p className="text-sm text-muted-foreground">Get started by adding your first job opening.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((j) => (
              <Link
                key={j.id}
                to="/jobs/$jobId"
                params={{ jobId: j.id }}
                className="glass rounded-2xl p-5 shadow-card hover:shadow-elegant hover:-translate-y-0.5 transition-spring group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge variant="secondary" className="capitalize bg-primary/10 text-primary border-0">
                      {j.status}
                    </Badge>
                    <h3 className="mt-2 font-semibold text-lg leading-tight group-hover:text-primary transition-base truncate">
                      {j.job_title}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Building2 className="h-3.5 w-3.5" /> {j.company_name}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      aria-label={`Delete job: ${j.job_title}`}
                      onClick={(e) => { e.preventDefault(); if (confirm("Delete this job?")) del.mutate(j.id); }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-base p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {j.required_skills.slice(0, 4).map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.location || "Remote"}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(j.posted_date).toLocaleDateString()}</span>
                  <span className="capitalize">{j.employment_type.replace(/_/g, " ")}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function JobDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    job_title: "", company_name: "", location: "", salary_range: "",
    employment_type: "full_time", experience_level: "mid",
    job_description: "", required_skills: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("jobs").insert({
        job_title: form.job_title,
        company_name: form.company_name,
        location: form.location || null,
        salary_range: form.salary_range || null,
        employment_type: form.employment_type as "full_time" | "part_time" | "contract" | "contract_to_hire" | "internship",
        experience_level: form.experience_level as "entry" | "mid" | "senior" | "lead" | "principal",
        job_description: form.job_description || null,
        required_skills: form.required_skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Job created"); qc.invalidateQueries({ queryKey: ["jobs"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Add a new job</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-2">
        <div className="col-span-2">
          <Label>Job title</Label>
          <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} className="mt-1.5" />
        </div>
        <div><Label>Company</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-1.5" /></div>
        <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1.5" /></div>
        <div>
          <Label>Employment type</Label>
          <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>{employmentTypes.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Experience</Label>
          <Select value={form.experience_level} onValueChange={(v) => setForm({ ...form, experience_level: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>{expLevels.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Salary range</Label><Input placeholder="$120k – $160k" value={form.salary_range} onChange={(e) => setForm({ ...form, salary_range: e.target.value })} className="mt-1.5" /></div>
        <div className="col-span-2"><Label>Required skills (comma separated)</Label><Input placeholder="React, TypeScript, Node.js" value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} className="mt-1.5" /></div>
        <div className="col-span-2"><Label>Description</Label><Textarea rows={4} value={form.job_description} onChange={(e) => setForm({ ...form, job_description: e.target.value })} className="mt-1.5" /></div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={!form.job_title || !form.company_name || create.isPending} onClick={() => create.mutate()} className="bg-gradient-primary text-primary-foreground">
          {create.isPending ? "Saving…" : "Create job"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
