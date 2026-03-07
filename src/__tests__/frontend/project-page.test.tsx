// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjectPage from "@/app/projects/[slug]/page";
import { ApiError } from "@/lib/api";

const mockApiJson = vi.fn();
const mockUseSession = vi.fn();
const mockReplace = vi.fn();
let searchParamsValue = "";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: "amber" }),
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}));

vi.mock("sileo", () => ({
  sileo: {
    success: vi.fn(),
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

vi.mock("@/lib/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("@/components/atelier/public-shell", () => ({
  PublicShell: ({ children }: any) => <div>{children}</div>,
}));

describe("Project page", () => {
  afterEach(() => {
    cleanup();
    mockApiJson.mockReset();
    mockUseSession.mockReset();
    mockReplace.mockReset();
    searchParamsValue = "";
    window.sessionStorage.clear();
  });

  it("renders the lock state for private projects without a session", async () => {
    mockUseSession.mockReturnValue({ user: null, god: false });
    mockApiJson.mockRejectedValueOnce(new ApiError(401, "Unauthorized", { error: "Unauthorized" }));

    render(<ProjectPage />);

    await waitFor(() => {
      expect(screen.getByText("Private project. Sign in with Discord to access.")).toBeTruthy();
    });
  });

  it("shows the no-source-catalog state", async () => {
    mockUseSession.mockReturnValue({ user: { sub: "1", name: "Kaf" }, god: true });
    mockApiJson.mockResolvedValueOnce({
      project: {
        id: "p1",
        slug: "amber",
        name: "Amber",
        visibility: "private",
        default_locale: "en_us",
        icon_url: null,
        modrinth_project_id: "m1",
        modrinth_slug: "amber",
        github_repo_url: "https://github.com/iamkaf/amber",
        source_string_count: 0,
        has_source_catalog: 0,
        updated_at: "2026-03-07T00:00:00.000Z",
      },
    });

    render(<ProjectPage />);

    await waitFor(() => {
      expect(screen.getByText("No source catalog")).toBeTruthy();
      expect(screen.getByText("A god user needs to import en_us first.")).toBeTruthy();
    });
  });

  it("submits a suggestion without navigating away from the page", async () => {
    searchParamsValue = "locale=fr_fr";
    mockUseSession.mockReturnValue({ user: { sub: "1", name: "Kaf" }, god: false });
    mockApiJson.mockImplementation((input: string, init?: RequestInit) => {
      if (input === "/api/projects/amber") {
        return Promise.resolve({
          project: {
            id: "p1",
            slug: "amber",
            name: "Amber",
            visibility: "public",
            default_locale: "en_us",
            icon_url: null,
            modrinth_project_id: "m1",
            modrinth_slug: "amber",
            github_repo_url: "https://github.com/iamkaf/amber",
            source_string_count: 1,
            has_source_catalog: 1,
            updated_at: "2026-03-07T00:00:00.000Z",
          },
        });
      }
      if (input === "/api/projects/amber/progress") {
        return Promise.resolve({
          total_strings: 1,
          progress: [{ locale: "fr_fr", approved_count: 0, total_strings: 1, coverage: 0 }],
        });
      }
      if (typeof input === "string" && input.startsWith("/api/projects/amber/strings?")) {
        return Promise.resolve({
          page: 0,
          limit: 50,
          total: 1,
          locale: "fr_fr",
          strings: [
            {
              id: "ss1",
              string_key: "menu.title",
              source_text: "Hello",
              context: null,
              approved_translation: null,
              has_approved_translation: false,
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

    const user = userEvent.setup();
    render(<ProjectPage />);

    await screen.findByText("menu.title");
    await user.click(screen.getByText("menu.title"));
    await user.type(screen.getByPlaceholderText("Translation for fr_fr…"), "Bonjour");
    await user.click(screen.getByRole("button", { name: "Submit suggestion" }));

    await waitFor(() => {
      expect(mockApiJson).toHaveBeenCalledWith("/api/suggestions", {
        method: "POST",
        body: JSON.stringify({
          source_string_id: "ss1",
          locale: "fr_fr",
          text: "Bonjour",
        }),
      });
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(await screen.findByText("Your pending draft")).toBeTruthy();
    expect(screen.getByText("Bonjour")).toBeTruthy();
  });

  it("marks accepted suggestions and renders empty approved translations as translated", async () => {
    searchParamsValue = "locale=fr_fr";
    mockUseSession.mockReturnValue({ user: { sub: "1", name: "Kaf" }, god: false });
    mockApiJson.mockImplementation((input: string) => {
      if (input === "/api/projects/amber") {
        return Promise.resolve({
          project: {
            id: "p1",
            slug: "amber",
            name: "Amber",
            visibility: "public",
            default_locale: "en_us",
            icon_url: null,
            modrinth_project_id: "m1",
            modrinth_slug: "amber",
            github_repo_url: "https://github.com/iamkaf/amber",
            source_string_count: 2,
            has_source_catalog: 1,
            updated_at: "2026-03-07T00:00:00.000Z",
          },
        });
      }
      if (input === "/api/projects/amber/progress") {
        return Promise.resolve({
          total_strings: 2,
          progress: [{ locale: "fr_fr", approved_count: 1, total_strings: 2, coverage: 0.5 }],
        });
      }
      if (typeof input === "string" && input.startsWith("/api/projects/amber/strings?")) {
        return Promise.resolve({
          page: 0,
          limit: 50,
          total: 2,
          locale: "fr_fr",
          strings: [
            {
              id: "ss1",
              string_key: "menu.title",
              source_text: "Hello",
              context: null,
              approved_translation: "",
              has_approved_translation: true,
              my_suggestion: {
                id: "s1",
                locale: "fr_fr",
                text: "",
                status: "accepted",
                created_at: "2026-03-07T00:00:00.000Z",
              },
            },
            {
              id: "ss2",
              string_key: "menu.subtitle",
              source_text: "World",
              context: null,
              approved_translation: null,
              has_approved_translation: false,
              my_suggestion: {
                id: "s2",
                locale: "fr_fr",
                text: "Refuse",
                status: "rejected",
                created_at: "2026-03-07T00:00:00.000Z",
              },
            },
          ],
        });
      }
      throw new Error(`Unexpected apiJson call: ${input}`);
    });

    const user = userEvent.setup();
    render(<ProjectPage />);

    await screen.findByTitle("Your suggestion was accepted");
    await screen.findByTitle("Your suggestion was rejected");
    await user.click(screen.getByText("menu.title"));

    expect(screen.queryByText("No approved translation yet.")).toBeNull();
    expect(screen.getByText("Empty string")).toBeTruthy();
  });

  it("filters strings in memory without refetching on each keystroke", async () => {
    searchParamsValue = "locale=fr_fr";
    mockUseSession.mockReturnValue({ user: { sub: "1", name: "Kaf" }, god: false });
    mockApiJson.mockImplementation((input: string) => {
      if (input === "/api/projects/amber") {
        return Promise.resolve({
          project: {
            id: "p1",
            slug: "amber",
            name: "Amber",
            visibility: "public",
            default_locale: "en_us",
            icon_url: null,
            modrinth_project_id: "m1",
            modrinth_slug: "amber",
            github_repo_url: "https://github.com/iamkaf/amber",
            source_string_count: 2,
            has_source_catalog: 1,
            updated_at: "2026-03-07T00:00:00.000Z",
          },
        });
      }
      if (input === "/api/projects/amber/progress") {
        return Promise.resolve({
          total_strings: 2,
          progress: [{ locale: "fr_fr", approved_count: 1, total_strings: 2, coverage: 0.5 }],
        });
      }
      if (typeof input === "string" && input.startsWith("/api/projects/amber/strings?")) {
        return Promise.resolve({
          page: 0,
          limit: 250,
          total: 2,
          locale: "fr_fr",
          strings: [
            {
              id: "ss1",
              string_key: "menu.title",
              source_text: "Hello",
              context: null,
              approved_translation: null,
              has_approved_translation: false,
              my_suggestion: null,
            },
            {
              id: "ss2",
              string_key: "menu.subtitle",
              source_text: "World",
              context: null,
              approved_translation: null,
              has_approved_translation: false,
              my_suggestion: null,
            },
          ],
        });
      }
      throw new Error(`Unexpected apiJson call: ${input}`);
    });

    const user = userEvent.setup();
    render(<ProjectPage />);

    await screen.findByText("menu.title");
    await user.type(screen.getByPlaceholderText("Search strings…"), "subtitle");

    await waitFor(() => {
      expect(screen.queryByText("menu.title")).toBeNull();
      expect(screen.getByText("menu.subtitle")).toBeTruthy();
    });

    expect(
      mockApiJson.mock.calls.filter(
        ([input]) => typeof input === "string" && input.startsWith("/api/projects/amber/strings?"),
      ),
    ).toHaveLength(1);
  });

  it("keeps the selected string when switching locale from the translation-panel CTA picker", async () => {
    mockUseSession.mockReturnValue({ user: { sub: "1", name: "Kaf" }, god: false });
    mockApiJson.mockImplementation((input: string) => {
      if (input === "/api/projects/amber") {
        return Promise.resolve({
          project: {
            id: "p1",
            slug: "amber",
            name: "Amber",
            visibility: "public",
            default_locale: "en_us",
            icon_url: null,
            modrinth_project_id: "m1",
            modrinth_slug: "amber",
            github_repo_url: "https://github.com/iamkaf/amber",
            source_string_count: 1,
            has_source_catalog: 1,
            updated_at: "2026-03-07T00:00:00.000Z",
          },
        });
      }
      if (input === "/api/projects/amber/progress") {
        return Promise.resolve({
          total_strings: 1,
          progress: [{ locale: "fr_fr", approved_count: 0, total_strings: 1, coverage: 0 }],
        });
      }
      if (input === "/api/projects/amber/strings?locale=en_us&page=0&limit=250&include_mine=1") {
        return Promise.resolve({
          page: 0,
          limit: 250,
          total: 1,
          locale: "en_us",
          strings: [
            {
              id: "ss1",
              string_key: "menu.title",
              source_text: "Hello",
              context: null,
              approved_translation: null,
              has_approved_translation: false,
              my_suggestion: null,
            },
          ],
        });
      }
      if (input === "/api/projects/amber/strings?locale=fr_fr&page=0&limit=250&include_mine=1") {
        return Promise.resolve({
          page: 0,
          limit: 250,
          total: 1,
          locale: "fr_fr",
          strings: [
            {
              id: "ss1",
              string_key: "menu.title",
              source_text: "Hello",
              context: null,
              approved_translation: null,
              has_approved_translation: false,
              my_suggestion: null,
            },
          ],
        });
      }
      throw new Error(`Unexpected apiJson call: ${input}`);
    });

    const user = userEvent.setup();
    render(<ProjectPage />);

    await screen.findByText("menu.title");
    await user.click(screen.getByText("menu.title"));

    const ctaSection = screen.getByLabelText("Translation locale picker");
    await user.click(within(ctaSection).getByRole("button"));

    const localeDialog = await screen.findByRole("dialog");
    await user.click(within(localeDialog).getByRole("button", { name: /fr_fr/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Translation for fr_fr…")).toBeTruthy();
    });
    expect(screen.getByText("menu.title")).toBeTruthy();
    expect(screen.queryByText("Select a string to start translating.")).toBeNull();
    expect(
      mockApiJson.mock.calls.filter(
        ([input]) =>
          typeof input === "string" &&
          input === "/api/projects/amber/strings?locale=fr_fr&page=0&limit=250&include_mine=1",
      ),
    ).toHaveLength(1);
  });

  it("restores saved navigation state for locale, query, and selection", async () => {
    window.sessionStorage.setItem(
      "project-page-nav:amber",
      JSON.stringify({
        locale: "fr_fr",
        query: "subtitle",
        selectedId: "ss2",
        showProgress: true,
      }),
    );
    mockUseSession.mockReturnValue({ user: { sub: "1", name: "Kaf" }, god: false });
    mockApiJson.mockImplementation((input: string) => {
      if (input === "/api/projects/amber") {
        return Promise.resolve({
          project: {
            id: "p1",
            slug: "amber",
            name: "Amber",
            visibility: "public",
            default_locale: "en_us",
            icon_url: null,
            modrinth_project_id: "m1",
            modrinth_slug: "amber",
            github_repo_url: "https://github.com/iamkaf/amber",
            source_string_count: 2,
            has_source_catalog: 1,
            updated_at: "2026-03-07T00:00:00.000Z",
          },
        });
      }
      if (input === "/api/projects/amber/progress") {
        return Promise.resolve({
          total_strings: 2,
          progress: [{ locale: "fr_fr", approved_count: 1, total_strings: 2, coverage: 0.5 }],
        });
      }
      if (typeof input === "string" && input.startsWith("/api/projects/amber/strings?")) {
        return Promise.resolve({
          page: 0,
          limit: 250,
          total: 2,
          locale: "fr_fr",
          strings: [
            {
              id: "ss1",
              string_key: "menu.title",
              source_text: "Hello",
              context: null,
              approved_translation: null,
              has_approved_translation: false,
              my_suggestion: null,
            },
            {
              id: "ss2",
              string_key: "menu.subtitle",
              source_text: "World",
              context: null,
              approved_translation: "Mundo",
              has_approved_translation: true,
              my_suggestion: null,
            },
          ],
        });
      }
      throw new Error(`Unexpected apiJson call: ${input}`);
    });

    render(<ProjectPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("subtitle")).toBeTruthy();
    });
    expect(await screen.findByText("menu.subtitle")).toBeTruthy();
    expect(screen.getByText("Mundo")).toBeTruthy();
    expect(
      mockApiJson.mock.calls.filter(
        ([input]) =>
          typeof input === "string" &&
          input === "/api/projects/amber/strings?locale=fr_fr&page=0&limit=250&include_mine=1",
      ),
    ).toHaveLength(1);
  });
});
