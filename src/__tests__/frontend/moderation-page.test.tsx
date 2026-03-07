// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ModerationPage from "@/app/moderation/page";

const mockApiJson = vi.fn();
const mockSuccess = vi.fn();
const sessionState = {
  user: { sub: "trusted1", name: "Trusted", avatar: null },
  trusted: true,
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

describe("Moderation page", () => {
  it("requires a rejection note before posting", async () => {
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

      if (input === "/api/suggestions/sug1/reject" && init?.method === "POST") {
        return Promise.resolve({ ok: true });
      }

      throw new Error(`Unexpected apiJson call: ${input}`);
    });

    render(<ModerationPage />);

    await screen.findByText("Hello");
    fireEvent.click(screen.getAllByRole("button", { name: "Reject" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Reject" })[1]);

    await waitFor(() => {
      expect(screen.getByText("A rejection note is required.")).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText("Explain why the suggestion is being rejected"), {
      target: { value: "Placeholder mismatch" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Reject" })[1]);

    await waitFor(() => {
      expect(screen.getByText("No suggestions in this queue")).toBeTruthy();
    });
    expect(screen.queryByText(/^target:/i)).toBeNull();
    expect(mockSuccess).toHaveBeenCalled();
  });
});
