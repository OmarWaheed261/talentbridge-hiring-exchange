import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md glass rounded-2xl p-8 shadow-elegant animate-fade-in">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {sent ? "Check your email for the reset link." : "We'll email you a link to reset your password."}
        </p>
        {!sent && (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
        <Link to="/auth" className="mt-6 inline-block text-sm text-primary hover:underline">← Back to sign in</Link>
      </div>
    </div>
  );
}
