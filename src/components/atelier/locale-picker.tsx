"use client";

import { useMemo, useState } from "react";
import { LocaleBadge } from "@/components/atelier/locale-badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeLocaleCode, SUPPORTED_LOCALE_OPTIONS } from "@/lib/locales";
import { cn } from "@/lib/utils";

export function LocalePicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (locale: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = SUPPORTED_LOCALE_OPTIONS.find(
    (o) => o.localeCode === normalizeLocaleCode(value),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SUPPORTED_LOCALE_OPTIONS;
    return SUPPORTED_LOCALE_OPTIONS.filter(
      (o) =>
        o.localeCode.includes(q) ||
        o.englishName.toLowerCase().includes(q) ||
        o.nameInGame.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setSearch(""); }}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-3 rounded-md border border-[var(--atelier-border)] bg-[var(--atelier-surface)] text-sm transition-colors hover:bg-[var(--atelier-surface-soft)]",
          className,
        )}
      >
        <LocaleBadge locale={value} />
        <svg className="w-3 h-3 text-[var(--atelier-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden bg-[var(--atelier-bg)] border-[var(--atelier-border)] p-0 gap-0">
          <DialogHeader className="p-4 pb-3 border-b border-[var(--atelier-border)]">
            <DialogTitle className="text-base font-semibold">Choose locale</DialogTitle>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search locales…"
              className="mt-2"
              autoFocus
            />
          </DialogHeader>
          <div className="p-3 overflow-y-auto max-h-[60vh]">
            {filtered.length === 0 ? (
              <p className="text-sm text-[var(--atelier-muted)] text-center py-8">No matching locale.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {filtered.map((o) => {
                  const isActive = o.localeCode === normalizeLocaleCode(value);
                  return (
                    <button
                      key={o.localeCode}
                      type="button"
                      onClick={() => { onChange(o.localeCode); setOpen(false); }}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-sm transition-colors",
                        isActive
                          ? "bg-[var(--atelier-highlight)]/10 text-[var(--atelier-text)] ring-1 ring-[var(--atelier-highlight)]/30"
                          : "text-[var(--atelier-text)] hover:bg-[var(--atelier-surface-soft)]",
                      )}
                    >
                      <LocaleBadge locale={o.localeCode} className="shrink-0" />
                      <span className="truncate text-xs text-[var(--atelier-muted)]">{o.englishName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
