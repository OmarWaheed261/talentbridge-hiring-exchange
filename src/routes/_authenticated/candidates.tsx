import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, LayoutGrid, Rows3 } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/candidates")({
  head: () => ({
    meta: [
      { title: "Candidates — TalentBridge AI" },
      { name: "description", content: "Manage candidate submissions, screening status, interviews, and offers across all open recruitment pipelines." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CandidatesPage,
});

const STATUSES = ["submitted", "screening", "interview", "offer", "hired", "rejected"] as const;
type Status = typeof STATUSES[number];

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

  const { data: cands = [], isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Candidate[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("candidates").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["candidates"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

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
            <CandidateDialog onClose={() => setOpen(false)} />
          </Dialog>
        }
      />

      <div className="p-6 lg:p-10">
        <Tabs defaultValue="kanban">
          <TabsList>
            <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4 mr-1.5" /> Kanban</TabsTrigger>
            <TabsTrigger value="table"><Rows3 className="h-4 w-4 mr-1.5" /> Table</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-6">
            {isLoading ? <p className="text-muted-foreground text-sm">Loading…</p> : (
              <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-4">
                {STATUSES.map((s) => {
                  const items = cands.filter((c) => c.status === s);
                  return (
                    <div key={s} className="glass rounded-2xl p-3 min-h-[300px] shadow-card">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h4 className="text-xs font-semibold uppercase tracking-wider capitalize">{s}</h4>
                        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
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
            )}
          </TabsContent>

          <TabsContent value="table" className="mt-6">
            <div className="glass rounded-2xl overflow-hidden shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="p-3 font-semibold">Name</th>
                    <th className="p-3 font-semibold">Email</th>
                    <th className="p-3 font-semibold">Skills</th>
                    <th className="p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cands.map((c) => (
                    <tr key={c.id} className="border-t border-border/60 hover:bg-muted/30 transition-base">
                      <td className="p-3 font-medium">{c.candidate_name}</td>
                      <td className="p-3 text-muted-foreground">{c.email}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {c.skills.slice(0, 3).map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={`capitalize border ${statusStyles[c.status]}`}>{c.status}</Badge>
                      </td>
                    </tr>
                  ))}
                  {cands.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No candidates yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function CandidateDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [form, setForm] = useState({
    candidate_name: "", email: "", phone: "", experience: "",
    skills: "", notes: "", linked_job_id: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs-list"],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("id, job_title").eq("status", "open").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

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
        // RLS requires the first path segment to equal the uploader's consultancy id.
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

      const { error } = await supabase.from("candidates").insert({
        candidate_name: form.candidate_name,
        email: form.email || null,
        phone: form.phone || null,
        experience: form.experience || null,
        notes: form.notes || null,
        linked_job_id: form.linked_job_id || null,
        consultancy_id: consultancyId ?? null,
        resume_url,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Candidate submitted"); qc.invalidateQueries({ queryKey: ["candidates"] }); onClose(); },
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

