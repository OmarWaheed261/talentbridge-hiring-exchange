import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkPlus, Check, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type SavedView<P> = {
  id: string;
  name: string;
  params: P;
  is_default: boolean;
};

type Props<P extends Record<string, unknown>> = {
  pageKey: string;
  currentParams: P;
  /** Apply selected view's params to the page (typically navigate({ search })) */
  onApply: (params: P) => void;
  /** Optional: detect if current params equal a stored view */
  isEqual?: (a: P, b: P) => boolean;
};

const defaultEqual = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

export function SavedViewsBar<P extends Record<string, unknown>>({
  pageKey,
  currentParams,
  onApply,
  isEqual = defaultEqual,
}: Props<P>) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  const queryKey = ["saved_views", pageKey, user?.id ?? null];

  const { data: views = [] } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_views")
        .select("id, name, params, is_default")
        .eq("page_key", pageKey)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SavedView<P>[];
    },
  });

  const save = useMutation({
    mutationFn: async (input: { name: string; isDefault: boolean }) => {
      if (!user) throw new Error("Sign in required");
      if (input.isDefault) {
        await supabase
          .from("saved_views")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .eq("page_key", pageKey);
      }
      const { error } = await supabase.from("saved_views").upsert(
        {
          user_id: user.id,
          page_key: pageKey,
          name: input.name.trim(),
          params: currentParams as unknown as Record<string, unknown>,
          is_default: input.isDefault,
        },
        { onConflict: "user_id,page_key,name" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("View saved");
      qc.invalidateQueries({ queryKey });
      setSaveOpen(false);
      setName("");
      setMakeDefault(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_views").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("View removed");
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefault = useMutation({
    mutationFn: async (view: SavedView<P>) => {
      if (!user) throw new Error("Sign in required");
      await supabase
        .from("saved_views")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .eq("page_key", pageKey);
      const { error } = await supabase
        .from("saved_views")
        .update({ is_default: true })
        .eq("id", view.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Default view updated");
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeView = views.find((v) => isEqual(v.params, currentParams));

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Bookmark className="h-4 w-4" />
              {activeView ? activeView.name : "Views"}
              {views.length > 0 && (
                <span className="text-xs text-muted-foreground">({views.length})</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel>Saved views</DropdownMenuLabel>
            {views.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                No saved views yet. Configure filters and click “Save view”.
              </div>
            )}
            {views.map((v) => {
              const isActive = activeView?.id === v.id;
              return (
                <DropdownMenuItem
                  key={v.id}
                  className="flex items-center justify-between gap-2"
                  onSelect={(e) => {
                    e.preventDefault();
                    onApply(v.params);
                  }}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {isActive ? (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    ) : (
                      <span className="w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{v.name}</span>
                    {v.is_default && (
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    {!v.is_default && (
                      <button
                        type="button"
                        title="Set as default"
                        aria-label={`Set ${v.name} as default view`}
                        className="p-1 rounded hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefault.mutate(v);
                        }}
                      >
                        <Star className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Delete view"
                      aria-label={`Delete view ${v.name}`}
                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete view “${v.name}”?`)) remove.mutate(v.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setSaveOpen(true);
              }}
            >
              <BookmarkPlus className="h-4 w-4 mr-2" />
              Save current as view…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save view</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground" htmlFor="view-name">
                Name
              </label>
              <Input
                id="view-name"
                autoFocus
                value={name}
                placeholder="e.g. New jobs in Berlin"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) {
                    save.mutate({ name, isDefault: makeDefault });
                  }
                }}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Reusing an existing name overwrites that view.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
              />
              Make this my default view
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => save.mutate({ name, isDefault: makeDefault })}
              disabled={!name.trim() || save.isPending}
            >
              {save.isPending ? "Saving…" : "Save view"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
