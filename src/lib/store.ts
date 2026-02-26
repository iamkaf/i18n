import { create } from "zustand";

type User = {
  sub: string;
  name: string;
  avatar: string | null;
};

type SessionStore = {
  user: User | null;
  loaded: boolean;
  setUser: (user: User | null) => void;
  fetchUser: () => Promise<void>;
};

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  loaded: false,
  setUser: (user) => set({ user, loaded: true }),
  fetchUser: async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as { user: User | null };
      set({ user: data.user, loaded: true });
    } catch {
      set({ user: null, loaded: true });
    }
  },
}));
