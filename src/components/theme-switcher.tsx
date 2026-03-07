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
    return (
      <div className="h-9 w-9 rounded-full bg-[var(--atelier-surface-soft)]/50" />
    );
  }

  const toggleTheme = () => {
    const next = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        "text-[var(--atelier-text)]/70 hover:bg-[var(--atelier-bg)] dark:hover:bg-white/10 hover:text-[var(--atelier-text)]"
      )}
      aria-label={`Switch theme (current: ${mode})`}
    >
      {mode === "light" ? <Sun className="h-[18px] w-[18px]" /> : mode === "dark" ? <Moon className="h-[18px] w-[18px]" /> : <Laptop className="h-[18px] w-[18px]" />}
    </button>
  );
}
