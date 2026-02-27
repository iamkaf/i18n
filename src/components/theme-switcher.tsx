"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

const OPTIONS = [
  { mode: "light", label: "Light", icon: Sun },
  { mode: "dark", label: "Dark", icon: Moon },
  { mode: "system", label: "System", icon: Laptop },
] as const;

export function ThemeSwitcher() {
  const { mode, setMode, mounted } = useTheme();

  if (!mounted) {
    return <div className="h-8 w-[156px] rounded-lg border border-[var(--atelier-border)] bg-[var(--atelier-surface)]" />;
  }

  return (
    <div className="inline-flex rounded-lg border border-[var(--atelier-border)] bg-[var(--atelier-surface)] p-1">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = mode === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            onClick={() => setMode(option.mode)}
            className={cn(
              "atelier-ring inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
              active
                ? "bg-[var(--atelier-accent)] text-[var(--atelier-accent-foreground)]"
                : "text-[var(--atelier-muted)] hover:bg-[#f5f6ff] dark:hover:bg-white/10",
            )}
            aria-label={`Switch theme to ${option.label}`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
