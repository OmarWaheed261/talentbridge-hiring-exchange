import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User as UserIcon, Bell, Shield, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Workspace Settings — TalentBridge AI" },
      { name: "description", content: "Manage your TalentBridge AI profile, notifications, security, and consultancy workspace settings." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, roles, refresh } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setName(profile?.full_name ?? ""); }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Profile updated"); refresh(); }
  };

  return (
    <>
      <PageHeader title="Settings" description="Manage your profile, company, and platform preferences." />
      <div className="p-6 lg:p-10 max-w-4xl">
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile"><UserIcon className="h-4 w-4 mr-1.5" /> Profile</TabsTrigger>
            <TabsTrigger value="company"><Building2 className="h-4 w-4 mr-1.5" /> Company</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1.5" /> Notifications</TabsTrigger>
            <TabsTrigger value="roles"><Shield className="h-4 w-4 mr-1.5" /> Roles</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <div className="glass rounded-2xl p-6 shadow-card space-y-4">
              <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
              <div><Label>Email</Label><Input value={user?.email ?? ""} disabled className="mt-1.5" /></div>
              <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground">
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="company" className="mt-6">
            <div className="glass rounded-2xl p-6 shadow-card">
              <p className="text-sm text-muted-foreground">Company settings will appear here once you join or create a consultancy. Super admins can manage all companies under Consultancies.</p>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <div className="glass rounded-2xl p-6 shadow-card space-y-4">
              {[
                ["New job available", true],
                ["Candidate submitted", true],
                ["Interview scheduled", true],
                ["Offer released", false],
                ["Candidate hired", true],
              ].map(([label, on]) => (
                <div key={label as string} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                  <Label>{label}</Label>
                  <Switch defaultChecked={on as boolean} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <div className="glass rounded-2xl p-6 shadow-card">
              <h3 className="font-semibold mb-2">Your roles</h3>
              <div className="flex flex-wrap gap-2">
                {roles.length === 0 ? <p className="text-sm text-muted-foreground">No roles assigned.</p> :
                  roles.map((r) => (
                    <span key={r} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm capitalize">
                      {r.replace("_", " ")}
                    </span>
                  ))
                }
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Role permissions are managed by your Super Admin.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
