"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "@/lib/use-session";
import { useSessionStore } from "@/lib/store";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthControls() {
  const { user, loading } = useSession();
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
      <div className="h-8 w-8 rounded-full bg-[var(--atelier-surface-soft)]/50 animate-pulse shrink-0" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/api/auth/discord"
        className="flex items-center justify-center h-8 w-8 rounded-full text-[var(--atelier-text)]/60 hover:bg-[var(--atelier-bg)]/80 hover:text-[var(--atelier-text)] transition-colors"
        title="Sign in with Discord"
      >
        <LogIn className="w-4 h-4" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={busy}
      title={busy ? "Signing out…" : `Sign out (${user.name})`}
      className={cn(
        "group relative flex items-center justify-center h-8 w-8 rounded-full transition-colors overflow-hidden shrink-0",
        "hover:ring-2 hover:ring-destructive/50",
        busy && "opacity-50 cursor-not-allowed"
      )}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="h-8 w-8 rounded-full object-cover transition-opacity group-hover:opacity-30"
        />
      ) : (
        <UserIcon className="h-4 w-4 text-[var(--atelier-text)]/60 group-hover:opacity-30 transition-opacity" />
      )}
      <LogOut className="absolute h-3.5 w-3.5 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
