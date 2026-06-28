import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getN8nSettings,
  saveN8nSettings,
  testN8nConnection,
} from "@/lib/n8n-settings.functions";

type TestResult =
  | { ok: true; status: number }
  | { ok: false; status: number; statusText: string }
  | null;

export function N8nIntegrationCard() {
  const getFn = useServerFn(getN8nSettings);
  const testFn = useServerFn(testN8nConnection);
  const saveFn = useServerFn(saveN8nSettings);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [secretMasked, setSecretMasked] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<TestResult>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await getFn();
        setUrl(s.url ?? "");
        setSecretMasked(s.secretMasked);
        setConfigured(s.configured);
        setUpdatedAt(s.updatedAt ?? null);
      } catch (e) {
        const msg = (e as Error).message ?? "";
        if (msg.toLowerCase().includes("forbidden")) setAllowed(false);
        else toast.error(msg || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, [getFn]);

  const runTest = async (): Promise<boolean> => {
    if (!url || !secret) {
      toast.error("Enter both webhook URL and secret to test");
      return false;
    }
    setTesting(true);
    setTest(null);
    try {
      const result = await testFn({ data: { url, secret } });
      setTest(result);
      if (result.ok) toast.success(`Connection OK (HTTP ${result.status})`);
      else toast.error(`Connection failed: ${result.statusText || result.status}`);
      return result.ok;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!url || !secret) {
      toast.error("Webhook URL and secret are required");
      return;
    }
    setSaving(true);
    try {
      await saveFn({ data: { url, secret } });
      toast.success("Integration saved");
      setConfigured(true);
      setSecretMasked(
        secret.length <= 8
          ? "••••••••"
          : `${secret.slice(0, 4)}••••${secret.slice(-4)}`,
      );
      setSecret("");
      setUpdatedAt(new Date().toISOString());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 shadow-card flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="glass rounded-2xl p-6 shadow-card">
        <p className="text-sm text-muted-foreground">
          Only consultancy admins can manage integration settings.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-card space-y-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Plug className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">n8n Webhook</h3>
          <p className="text-sm text-muted-foreground">
            Outbound events (candidate &amp; job changes) are POSTed to this URL with
            an <code className="text-xs">x-n8n-secret</code> header. Saved values are
            stored encrypted-at-rest and never exposed to the browser.
          </p>
          {configured && (
            <p className="mt-1 text-xs text-emerald-600">
              Configured{updatedAt ? ` · updated ${new Date(updatedAt).toLocaleString()}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="n8n-url">Webhook URL</Label>
          <Input
            id="n8n-url"
            type="url"
            placeholder="https://your-instance.n8n.cloud/webhook/..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setTest(null);
            }}
            className="mt-1.5"
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="n8n-secret">
            Shared secret{" "}
            {secretMasked && (
              <span className="text-xs text-muted-foreground font-normal">
                (current: {secretMasked})
              </span>
            )}
          </Label>
          <Input
            id="n8n-secret"
            type="password"
            placeholder={configured ? "Enter a new secret to rotate" : "Min 8 characters"}
            value={secret}
            onChange={(e) => {
              setSecret(e.target.value);
              setTest(null);
            }}
            className="mt-1.5"
            autoComplete="new-password"
          />
        </div>
      </div>

      {test && (
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            test.ok
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {test.ok ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {test.ok
            ? `Connection OK (HTTP ${test.status})`
            : `Failed (${test.status || "network"}): ${
                "statusText" in test ? test.statusText : ""
              }`}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={runTest}
          disabled={testing || saving || !url || !secret}
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
          Test connection
        </Button>
        <Button
          onClick={save}
          disabled={saving || testing || !url || !secret}
          className="bg-gradient-primary text-primary-foreground"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
          Validate &amp; save
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Saving runs a live connection test first; if n8n doesn't respond with 2xx,
        the settings aren't written.
      </p>
    </div>
  );
}
