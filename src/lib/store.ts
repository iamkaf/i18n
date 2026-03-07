import { create } from "zustand";
import { apiJson } from "@/lib/api";
import type { SessionPayload, UserRole } from "@/lib/session";

type SessionStore = {
  user: SessionPayload | null;
  role: UserRole;
  trusted: boolean;
  god: boolean;
  loading: boolean;
  loaded: boolean;
  setSession: (input: {
    user: SessionPayload | null;
    role: UserRole;
    trusted: boolean;
    god: boolean;
  }) => void;
  clearSession: () => void;
  fetchSession: (force?: boolean) => Promise<void>;
};

let inflight: Promise<void> | null = null;

export const useSessionStore = create<SessionStore>((set, get) => ({
  user: null,
  role: "user",
  trusted: false,
  god: false,
  loading: false,
  loaded: false,
  setSession: ({ user, role, trusted, god }) =>
    set({ user, role, trusted, god, loading: false, loaded: true }),
  clearSession: () =>
    set({ user: null, role: "user", trusted: false, god: false, loading: false, loaded: true }),
  fetchSession: async (force = false) => {
    if (get().loaded && !force) return;
    if (inflight && !force) return inflight;

    set({ loading: true });
    inflight = (async () => {
      try {
        const data = await apiJson<{
          user: SessionPayload | null;
          role: UserRole;
          trusted: boolean;
          god: boolean;
        }>("/api/auth/me", {
          headers: {},
        });
        set({
          user: data.user,
          role: data.role,
          trusted: data.trusted,
          god: data.god,
          loading: false,
          loaded: true,
        });
      } catch {
        set({ user: null, role: "user", trusted: false, god: false, loading: false, loaded: true });
      } finally {
        inflight = null;
      }
    })();

    await inflight;
  },
}));
