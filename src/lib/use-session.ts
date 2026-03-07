"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/lib/store";

export function useSession() {
  const user = useSessionStore((state) => state.user);
  const role = useSessionStore((state) => state.role);
  const trusted = useSessionStore((state) => state.trusted);
  const god = useSessionStore((state) => state.god);
  const loading = useSessionStore((state) => state.loading || !state.loaded);
  const loaded = useSessionStore((state) => state.loaded);
  const fetchSession = useSessionStore((state) => state.fetchSession);

  useEffect(() => {
    if (!loaded) {
      void fetchSession();
    }
  }, [fetchSession, loaded]);

  return { user, role, trusted, god, loading, refresh: (force = true) => fetchSession(force) };
}
