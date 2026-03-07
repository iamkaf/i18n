"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocaleBadge } from "@/components/atelier/locale-badge";
import { Input } from "@/components/ui/input";
import {
  isSupportedLocaleCode,
  normalizeLocaleCode,
  SUPPORTED_LOCALE_OPTIONS,
} from "@/lib/locales";
import { cn } from "@/lib/utils";

export function LocaleCombobox({
  value,
  onChange,
  placeholder = "en_us",
  allowEmpty = false,
  disabled = false,
  className,
  inputClassName,
  onValidityChange,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  onValidityChange?: (valid: boolean) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const normalized = normalizeLocaleCode(value);
  const isValid = allowEmpty
    ? normalized.length === 0 || isSupportedLocaleCode(normalized)
    : isSupportedLocaleCode(normalized);

  const filteredOptions = useMemo(() => {
    const query = normalizeLocaleCode(value);
    const matches = SUPPORTED_LOCALE_OPTIONS.filter((option) => {
      if (!query.length) return true;
      return (
        option.localeCode.includes(query) ||
        option.englishName.toLowerCase().includes(query) ||
        option.nameInGame.toLowerCase().includes(query)
      );
    });
    return matches.slice(0, 80);
  }, [value]);

  useEffect(() => {
    if (activeIndex >= filteredOptions.length) {
      setActiveIndex(filteredOptions.length > 0 ? filteredOptions.length - 1 : 0);
    }
  }, [activeIndex, filteredOptions]);

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const selected = isSupportedLocaleCode(normalized)
    ? SUPPORTED_LOCALE_OPTIONS.find((item) => item.localeCode === normalized) ?? null
    : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Input
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => setTouched(true)}
        onChange={(event) => {
          onChange(normalizeLocaleCode(event.target.value));
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) =>
              filteredOptions.length ? Math.min(current + 1, filteredOptions.length - 1) : 0,
            );
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.max(current - 1, 0));
            return;
          }
          if (event.key === "Enter" && open && filteredOptions.length) {
            event.preventDefault();
            const match = filteredOptions[activeIndex] ?? filteredOptions[0];
            onChange(match.localeCode);
            setOpen(false);
            return;
          }
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={touched && !isValid}
        className={cn("font-mono lowercase", inputClassName)}
      />
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--atelier-muted)]">
        ▼
      </div>

      {open ? (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-[var(--atelier-border)] bg-[var(--atelier-surface)] p-1 shadow-xl">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[var(--atelier-muted)]">No matching locale.</div>
          ) : (
            filteredOptions.map((option, index) => {
              const active = index === activeIndex;
              const selectedOption = selected?.localeCode === option.localeCode;
              return (
                <button
                  key={option.localeCode}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors",
                    active || selectedOption
                      ? "bg-[var(--atelier-surface-soft)]"
                      : "hover:bg-[var(--atelier-surface-soft)]/70",
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onChange(option.localeCode);
                    setTouched(true);
                    setOpen(false);
                  }}
                >
                  <LocaleBadge locale={option.localeCode} className="min-w-[74px]" />
                  <div className="min-w-0">
                    <div className="truncate text-sm text-[var(--atelier-text)]">{option.englishName}</div>
                    <div className="truncate text-xs text-[var(--atelier-muted)]">{option.nameInGame}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : null}

      {touched && !isValid ? (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">
          Pick a valid Minecraft locale from the list.
        </p>
      ) : null}
    </div>
  );
}
