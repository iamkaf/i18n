"use client";

import * as React from "react";
import Link from "next/link";
import { StatusPill } from "@/components/atelier/status-pill";
import { useSession } from "@/lib/use-session";
import { useSessionStore } from "@/lib/store";

export function AuthControls() {
  const { user, trusted, god, loading } = useSession();
  const clearSession = useSessionStore((state) => state.clearSession);
  const [busy, setBusy] = React.useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      clearSession();
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="h-8 w-[140px] rounded-lg border border-[var(--atelier-border)] bg-[var(--atelier-surface)]" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/api/auth/discord"
        className="atelier-ring inline-flex items-center rounded-lg bg-[var(--atelier-accent)] px-3 py-1.5 text-xs text-[var(--atelier-accent-foreground)] hover:bg-[var(--atelier-accent-strong)] transition-colors"
      >
        Sign in with Discord
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--atelier-border)] bg-[var(--atelier-surface)] px-2.5 py-1.5 text-xs text-[var(--atelier-muted)]">
        <span>{user.name}</span>
        {god ? (
          <StatusPill variant="god">god</StatusPill>
        ) : trusted ? (
          <StatusPill variant="trusted">trusted</StatusPill>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        disabled={busy}
        className="atelier-ring rounded-lg border border-[var(--atelier-border)] bg-[var(--atelier-surface)] px-2.5 py-1.5 text-xs text-[var(--atelier-text)] hover:bg-[#f8f9ff] dark:hover:bg-white/10 transition-colors disabled:opacity-60"
      >
        {busy ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
