"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DrawerPanel } from "@/components/atelier/drawer-panel";
import { getErrorMessage } from "@/lib/api";

export function SuggestionDrawer({
  open,
  title,
  description,
  initialLocale,
  initialText,
  submitLabel,
  withdrawLabel = "Withdraw suggestion",
  onClose,
  onSubmit,
  onWithdraw,
}: {
  open: boolean;
  title: string;
  description?: string;
  initialLocale: string;
  initialText: string;
  submitLabel: string;
  withdrawLabel?: string;
  onClose: () => void;
  onSubmit: (input: { locale: string; text: string }) => Promise<void>;
  onWithdraw?: () => Promise<void>;
}) {
  const [locale, setLocale] = useState(initialLocale);
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setLocale(initialLocale);
      setText(initialText);
      setError(null);
      setBusy(false);
    }
  }, [initialLocale, initialText, open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextLocale = locale.trim().toLowerCase();
    const nextText = text.trim();

    if (!/^[a-z]{2}_[a-z]{2}$/.test(nextLocale)) {
      setError("Locale must match xx_xx.");
      return;
    }
    if (!nextText.length) {
      setError("Translation text is required.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSubmit({ locale: nextLocale, text: nextText });
      onClose();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw() {
    if (!onWithdraw) return;
    setBusy(true);
    setError(null);
    try {
      await onWithdraw();
      onClose();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DrawerPanel open={open} title={title} description={description} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
            Locale
          </label>
          <Input
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
            placeholder="fr_fr"
            maxLength={12}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
            Translation
          </label>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            className="atelier-ring min-h-40 w-full rounded-2xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] px-4 py-3 text-sm outline-none"
            placeholder="Draft the translation here"
          />
        </div>
        {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {onWithdraw ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleWithdraw()}
              disabled={busy}
            >
              {withdrawLabel}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </DrawerPanel>
  );
}
