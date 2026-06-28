import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Briefcase, Users, Calendar, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — TalentBridge AI" },
      { name: "description", content: "Real-time updates on new candidates, interview scheduling, and recruitment workflow events." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotificationsPage,
});

const iconMap: Record<string, typeof Bell> = {
  job: Briefcase, candidate: Users, interview: Calendar, hire: Award, info: Bell,
};

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Stay on top of every job, candidate, and milestone."
      />
      <div className="p-6 lg:p-10 max-w-3xl">
        {items.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <h3 className="mt-3 font-semibold">All caught up</h3>
            <p className="text-sm text-muted-foreground">You'll see updates here as activity happens.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const Icon = iconMap[n.type] ?? Bell;
              return (
                <div key={n.id} className={`glass rounded-xl p-4 flex items-start gap-3 shadow-card transition-base ${n.read ? "opacity-60" : ""}`}>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{n.title}</div>
                    {n.message && <div className="text-sm text-muted-foreground">{n.message}</div>}
                    <div className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  {!n.read && (
                    <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
