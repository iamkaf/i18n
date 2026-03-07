"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DrawerPanel } from "@/components/atelier/drawer-panel";
import { getErrorMessage } from "@/lib/api";

export function ModerationDecisionDrawer({
  open,
  mode,
  sourceKey,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "approve" | "reject";
  sourceKey: string;
  onClose: () => void;
  onSubmit: (decisionNote: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNote("");
      setBusy(false);
      setError(null);
    }
  }, [open, mode, sourceKey]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "reject" && !note.trim()) {
      setError("A rejection note is required.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSubmit(note.trim());
      onClose();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DrawerPanel
      open={open}
      title={mode === "approve" ? "Approve suggestion" : "Reject suggestion"}
      description={`Decision for ${sourceKey}`}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
            {mode === "approve" ? "Decision note (optional)" : "Decision note"}
          </label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={7}
            className="atelier-ring min-h-40 w-full rounded-2xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] px-4 py-3 text-sm outline-none"
            placeholder={
              mode === "approve"
                ? "Optional context for the approval"
                : "Explain why the suggestion is being rejected"
            }
          />
        </div>
        {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving..." : mode === "approve" ? "Approve" : "Reject"}
          </Button>
        </div>
      </form>
    </DrawerPanel>
  );
}
