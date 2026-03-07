// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UsersPage from "@/app/users/page";

const mockUseSession = vi.fn();

vi.mock("sileo", () => ({
  sileo: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("@/components/atelier/app-shell", () => ({
  AppShell: ({ children }: any) => <div>{children}</div>,
}));

describe("UsersPage", () => {
  it("shows a lock state when signed out", () => {
    mockUseSession.mockReturnValue({
      user: null,
      god: false,
      trusted: false,
      role: "user",
      loading: false,
    });
    render(<UsersPage />);
    expect(screen.getByText("Sign in with Discord before opening user management.")).toBeTruthy();
  });

  it("renders managed users for the god account", async () => {
    mockUseSession.mockReturnValue({
      user: { sub: "517599684961894400", name: "Kaf", avatar: null },
      god: true,
      trusted: true,
      role: "god",
      loading: false,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              users: [
                {
                  discord_id: "517599684961894400",
                  display_name: "Kaf",
                  discord_handle: "kaf",
                  role: "god",
                  added_by_discord_id: "system",
                  added_at: "2026-03-07T00:00:00.000Z",
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ) as any,
    );

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("517599684961894400")).toBeTruthy();
      expect(screen.getByText("Kaf")).toBeTruthy();
      expect(screen.getByText("Handle: @kaf")).toBeTruthy();
    });
  });
});
