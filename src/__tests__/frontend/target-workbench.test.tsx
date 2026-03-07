// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TargetWorkbenchPage from "@/app/projects/[slug]/[target]/page";

const mockApiJson = vi.fn();
const mockSuccess = vi.fn();
const sessionState = {
  user: { sub: "user1", name: "Tester", avatar: null },
  trusted: false,
  loading: false,
  refresh: vi.fn(),
};

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: "demo-mod", target: "latest" }),
  useSearchParams: () => new URLSearchParams(),
}));

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

function installWorkbenchMocks() {
  mockApiJson.mockImplementation((input: string, init?: RequestInit) => {
    if (input === "/api/projects/demo-mod") {
      return Promise.resolve({
        project: {
          id: "proj1",
          slug: "demo-mod",
          name: "Demo Mod",
          visibility: "public",
          default_locale: "fr_fr",
          icon_url: null,
          modrinth_slug: null,
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      });
    }

    if (input === "/api/projects/demo-mod/latest/progress") {
      return Promise.resolve({
        total_strings: 1,
        progress: [{ locale: "fr_fr", approved_count: 0, total_strings: 1, coverage: 0 }],
      });
    }

    if (typeof input === "string" && input.startsWith("/api/projects/demo-mod/latest/strings?")) {
      return Promise.resolve({
        page: 0,
        limit: 25,
        total: 1,
        locale: "fr_fr",
        strings: [
          {
            id: "ss1",
            string_key: "key.test",
            source_text: "Hello world",
            context: "Greeting",
            placeholder_sig: "",
            approved_translation: null,
            my_suggestion: null,
          },
        ],
      });
    }

    if (input === "/api/suggestions" && init?.method === "POST") {
      return Promise.resolve({ ok: true, id: "sug1" });
    }

    throw new Error(`Unexpected apiJson call: ${input}`);
  });
}

describe("Target workbench page", () => {
  it("submits a suggestion and calls the create endpoint", async () => {
    installWorkbenchMocks();

    render(<TargetWorkbenchPage />);

    await screen.findByPlaceholderText("Write the translation for the active locale");
    fireEvent.change(screen.getByPlaceholderText("Write the translation for the active locale"), {
      target: { value: "Bonjour le monde" },
    });
    fireEvent.click(screen.getByText("Submit suggestion"));

    await waitFor(() => {
      expect(mockApiJson).toHaveBeenCalledWith(
        "/api/suggestions",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(mockSuccess).toHaveBeenCalled();
  });
});
