import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/consultancies")({
  component: ConsultanciesPage,
});

function ConsultanciesPage() {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const canManage = roles.includes("super_admin");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    company_name: "", contact_name: "", email: "", phone: "", subscription_plan: "starter",
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["consultancies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("consultancies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("consultancies").insert({
        ...form,
        subscription_plan: form.subscription_plan as "starter" | "professional" | "enterprise",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Consultancy added"); qc.invalidateQueries({ queryKey: ["consultancies"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Consultancies"
        description="Partner consultancy firms providing candidates."
        actions={canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
                <Plus className="mr-1 h-4 w-4" /> Add Consultancy
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add a consultancy partner</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="col-span-2"><Label>Company</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-1.5" /></div>
                <div><Label>Contact</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="mt-1.5" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" /></div>
                <div>
                  <Label>Plan</Label>
                  <Select value={form.subscription_plan} onValueChange={(v) => setForm({ ...form, subscription_plan: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button disabled={!form.company_name || create.isPending} onClick={() => create.mutate()} className="bg-gradient-primary text-primary-foreground">
                  {create.isPending ? "Saving…" : "Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="p-6 lg:p-10">
        {isLoading ? <p className="text-muted-foreground text-sm">Loading…</p> : items.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <h3 className="mt-3 font-semibold">No consultancies yet</h3>
            <p className="text-sm text-muted-foreground">Add your first consultancy partner.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((c) => (
              <div key={c.id} className="glass rounded-2xl p-5 shadow-card hover:shadow-elegant transition-spring">
                <div className="flex items-start justify-between">
                  <div className="h-11 w-11 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center font-bold">
                    {c.company_name.slice(0, 2).toUpperCase()}
                  </div>
                  <Badge variant="outline" className="capitalize">{c.subscription_plan}</Badge>
                </div>
                <h3 className="mt-3 font-semibold">{c.company_name}</h3>
                <p className="text-sm text-muted-foreground">{c.contact_name}</p>
                <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                  <div>{c.email}</div>
                  <div>{c.phone}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
