"use client";

import { useMemo, useState } from "react";
import { Globe } from "lucide-react";
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
  placeholder = "Choose locale",
  allowEmpty = false,
  disabled = false,
}: {
  value: string;
  onChange: (locale: string) => void;
  className?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const normalizedValue = normalizeLocaleCode(value);

  const selected = SUPPORTED_LOCALE_OPTIONS.find(
    (option) => option.localeCode === normalizedValue,
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return SUPPORTED_LOCALE_OPTIONS;
    return SUPPORTED_LOCALE_OPTIONS.filter(
      (option) =>
        option.localeCode.includes(query) ||
        option.englishName.toLowerCase().includes(query) ||
        option.nameInGame.toLowerCase().includes(query),
    );
  }, [search]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          setSearch("");
        }}
        disabled={disabled}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md border border-[var(--atelier-border)] bg-[var(--atelier-surface)] px-3 text-sm transition-colors hover:bg-[var(--atelier-surface-soft)] disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        {selected ? (
          <>
            <LocaleBadge locale={selected.localeCode} />
            <span className="max-w-[11rem] truncate text-xs text-[var(--atelier-muted)]">
              {selected.englishName}
            </span>
          </>
        ) : (
          <>
            <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--atelier-muted)]" />
            <span className="text-xs text-[var(--atelier-muted)]">
              {allowEmpty && !normalizedValue ? placeholder : normalizedValue || placeholder}
            </span>
          </>
        )}
        <svg className="h-3 w-3 shrink-0 text-[var(--atelier-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl gap-0 overflow-hidden border-[var(--atelier-border)] bg-[var(--atelier-bg)] p-0">
          <DialogHeader className="border-b border-[var(--atelier-border)] p-4 pb-3">
            <DialogTitle className="text-base font-semibold">Choose locale</DialogTitle>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search locales..."
              className="mt-2"
              autoFocus
            />
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-3">
            {allowEmpty ? (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className={cn(
                  "mb-2 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  !normalizedValue
                    ? "bg-[var(--atelier-highlight)]/10 text-[var(--atelier-text)] ring-1 ring-[var(--atelier-highlight)]/30"
                    : "text-[var(--atelier-text)] hover:bg-[var(--atelier-surface-soft)]",
                )}
              >
                <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--atelier-muted)]" />
                <span className="truncate text-xs text-[var(--atelier-muted)]">{placeholder}</span>
              </button>
            ) : null}
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--atelier-muted)]">No matching locale.</p>
            ) : (
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((option) => {
                  const isActive = option.localeCode === normalizedValue;
                  return (
                    <button
                      key={option.localeCode}
                      type="button"
                      onClick={() => {
                        onChange(option.localeCode);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                        isActive
                          ? "bg-[var(--atelier-highlight)]/10 text-[var(--atelier-text)] ring-1 ring-[var(--atelier-highlight)]/30"
                          : "text-[var(--atelier-text)] hover:bg-[var(--atelier-surface-soft)]",
                      )}
                    >
                      <LocaleBadge locale={option.localeCode} className="shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate text-xs text-[var(--atelier-text)]">{option.englishName}</div>
                        <div className="truncate text-[11px] text-[var(--atelier-muted)]">{option.nameInGame}</div>
                      </div>
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
