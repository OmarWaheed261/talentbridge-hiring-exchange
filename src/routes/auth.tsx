import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, Mail, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign In — TalentBridge AI" },
      {
        name: "description",
        content:
          "Sign in or create a TalentBridge AI account to manage jobs, candidates, and automated recruitment workflows for your consultancy or hiring team.",
      },
      { property: "og:title", content: "Sign In — TalentBridge AI" },
      {
        property: "og:description",
        content: "Access your TalentBridge AI workspace to manage jobs, candidates, and recruitment automations.",
      },
      { property: "og:url", content: "https://talentbridge-pro-hub.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://talentbridge-pro-hub.lovable.app/auth" }],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created — welcome aboard!");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">

      {/* Left: hero panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-hero text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 20% 30%, white 0%, transparent 40%), radial-gradient(circle at 80% 70%, white 0%, transparent 35%)" }} />
        <div className="relative z-10 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl glass flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-semibold text-lg">TalentBridge AI</span>
        </div>
        <div className="relative z-10 max-w-md animate-slide-up">
          <h1 className="text-4xl font-bold leading-tight">
            Connect US hiring demand<br />with qualified talent.
          </h1>
          <p className="mt-4 text-primary-foreground/80">
            Centralize jobs, candidate submissions, and recruitment workflows in one enterprise-grade platform.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              ["1,200+", "Active jobs"],
              ["350+", "Consultancies"],
              ["98%", "Match accuracy"],
            ].map(([v, l]) => (
              <div key={l} className="glass rounded-xl p-4">
                <div className="text-2xl font-bold">{v}</div>
                <div className="text-xs text-primary-foreground/70">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} TalentBridge AI
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">TalentBridge AI</span>
          </div>
          <h2 className="text-3xl font-bold">{mode === "signin" ? "Welcome back" : "Create account"}</h2>
          <p className="text-muted-foreground mt-1">{mode === "signin" ? "Sign in to your workspace" : "Get started in seconds"}</p>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")} className="mt-8">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value={mode} className="mt-6">
              <form onSubmit={onSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <Label>Full name</Label>
                    <div className="relative mt-1.5">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={name} onChange={(e) => setName(e.target.value)} className="pl-9" required placeholder="Jane Doe" />
                    </div>
                  </div>
                )}
                <div>
                  <Label>Email</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required placeholder="you@company.com" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Password</Label>
                    {mode === "signin" && (
                      <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
                    )}
                  </div>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" required minLength={6} placeholder="••••••••" />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95 transition-base">
                  {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );

}
