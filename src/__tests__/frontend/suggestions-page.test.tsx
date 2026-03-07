// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SuggestionsPage from "@/app/suggestions/page";

const mockApiJson = vi.fn();
const mockSuccess = vi.fn();
const sessionState = {
  user: { sub: "user1", name: "Tester", avatar: null },
  trusted: false,
  loading: false,
  refresh: vi.fn(),
};

vi.mock("@/lib/use-session", () => ({
  useSession: () => sessionState,
}));

vi.mock("@/components/atelier/app-shell", () => ({
  AppShell: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("sileo", () => ({
  sileo: {
    success: (...args: unknown[]) => mockSuccess(...args),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiJson: (...args: unknown[]) => mockApiJson(...args),
  };
});

describe("Suggestions page", () => {
  it("lets the author withdraw a pending suggestion", async () => {
    mockApiJson.mockImplementation((input: string, init?: RequestInit) => {
      if (typeof input === "string" && input.startsWith("/api/suggestions?")) {
        return Promise.resolve({
          suggestions: [
            {
              id: "sug1",
              locale: "fr_fr",
              text: "Bonjour",
              author_discord_id: "user1",
              author_name: "Tester",
              status: "pending",
              created_at: "2026-01-01T00:00:00.000Z",
              project_slug: "demo-mod",
              decision_note: null,
              decided_at: null,
              decided_by_discord_id: null,
              source_string: {
                id: "ss1",
                key: "key.test",
                source_text: "Hello",
                context: null,
                placeholder_sig: "",
              },
            },
          ],
          total: 1,
          page: 0,
        });
      }
      if (input === "/api/suggestions/sug1" && init?.method === "DELETE") {
        return Promise.resolve({ ok: true });
      }
      if (input === "/api/suggestions/sug1" && init?.method === "PATCH") {
        return Promise.resolve({ ok: true });
      }
      throw new Error(`Unexpected apiJson call: ${input}`);
    });

    render(<SuggestionsPage />);

    await screen.findByText("Hello");
    fireEvent.click(screen.getByText("Edit"));
    await screen.findByText("Withdraw suggestion");
    fireEvent.click(screen.getByText("Withdraw suggestion"));

    await waitFor(() => {
      expect(screen.getByText("No suggestions in this slice")).toBeTruthy();
    });
    expect(screen.queryByText(/^target:/i)).toBeNull();
    expect(mockSuccess).toHaveBeenCalled();
  });
});
