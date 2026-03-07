// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjectPage from "@/app/projects/[slug]/page";
import { ApiError } from "@/lib/api";

const mockApiJson = vi.fn();
const mockUseSession = vi.fn();
const mockReplace = vi.fn();

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
  useSearchParams: () => new URLSearchParams(),
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

vi.mock("@/components/atelier/app-shell", () => ({
  AppShell: ({ children }: any) => <div>{children}</div>,
}));

describe("Project page", () => {
  afterEach(() => {
    cleanup();
    mockApiJson.mockReset();
    mockUseSession.mockReset();
    mockReplace.mockReset();
  });

  it("renders an inline lock state for private projects without a session", async () => {
    mockUseSession.mockReturnValue({ user: null, god: false });
    mockApiJson.mockRejectedValueOnce(new ApiError(401, "Unauthorized", { error: "Unauthorized" }));

    render(<ProjectPage />);

    await waitFor(() => {
      expect(screen.getByText("This workshop view is private")).toBeTruthy();
    });
  });

  it("shows the source import panel before a source catalog exists", async () => {
    mockUseSession.mockReturnValue({ user: { sub: "1", name: "Kaf" }, god: true });
    mockApiJson
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        github_repo: { owner: "iamkaf", name: "amber", html_url: "https://github.com/iamkaf/amber" },
        locale_files: [
          { locale: "en_us", path: "lang/en_us.json", source: "github", kind: "source" },
          { locale: "zh_cn", path: "lang/zh_cn.json", source: "github", kind: "translation" },
        ],
        warnings: [],
      });

    render(<ProjectPage />);

    await waitFor(() => {
      expect(screen.getByText("Import canonical source first")).toBeTruthy();
      expect(screen.getByText("Import en_us from GitHub")).toBeTruthy();
      expect(screen.getByText(/Translation uploads stay disabled in practice/)).toBeTruthy();
    });
  });

  it("imports a detected translation file into a source-ready project", async () => {
    mockUseSession.mockReturnValue({ user: { sub: "1", name: "Kaf" }, god: true });
    mockApiJson
      .mockResolvedValueOnce({
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
          source_string_count: 1,
          has_source_catalog: 1,
          updated_at: "2026-03-07T00:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        github_repo: { owner: "iamkaf", name: "amber", html_url: "https://github.com/iamkaf/amber" },
        locale_files: [
          { locale: "en_us", path: "lang/en_us.json", source: "github", kind: "source" },
          { locale: "zh_cn", path: "lang/zh_cn.json", source: "github", kind: "translation" },
        ],
        warnings: [],
      })
      .mockResolvedValueOnce({
        total_strings: 1,
        progress: [{ locale: "en_us", approved_count: 1, total_strings: 1, coverage: 1 }],
      })
      .mockResolvedValueOnce({
        page: 0,
        limit: 25,
        total: 1,
        locale: "en_us",
        strings: [
          {
            id: "ss1",
            string_key: "menu.title",
            source_text: "Hello",
            context: null,
            approved_translation: "Hello",
            my_suggestion: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        locale: "zh_cn",
        mode: "translation",
        imported: 1,
        updated: 0,
        deactivated: 0,
        ignored_non_string: 0,
        skipped_unmatched: [],
      })
      .mockResolvedValueOnce({
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
          source_string_count: 1,
          has_source_catalog: 1,
          updated_at: "2026-03-07T00:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        github_repo: { owner: "iamkaf", name: "amber", html_url: "https://github.com/iamkaf/amber" },
        locale_files: [
          { locale: "en_us", path: "lang/en_us.json", source: "github", kind: "source" },
          { locale: "zh_cn", path: "lang/zh_cn.json", source: "github", kind: "translation" },
        ],
        warnings: [],
      })
      .mockResolvedValueOnce({
        total_strings: 1,
        progress: [
          { locale: "en_us", approved_count: 1, total_strings: 1, coverage: 1 },
          { locale: "zh_cn", approved_count: 1, total_strings: 1, coverage: 1 },
        ],
      })
      .mockResolvedValueOnce({
        page: 0,
        limit: 25,
        total: 1,
        locale: "zh_cn",
        strings: [
          {
            id: "ss1",
            string_key: "menu.title",
            source_text: "Hello",
            context: null,
            approved_translation: "你好",
            my_suggestion: null,
          },
        ],
      });

    const user = userEvent.setup();
    render(<ProjectPage />);

    await waitFor(() => {
      expect(screen.getByText("Import zh_cn")).toBeTruthy();
    });

    await user.click(screen.getByText("Import zh_cn"));

    await waitFor(() => {
      expect(mockApiJson).toHaveBeenCalledWith("/api/projects/amber/imports", {
        method: "POST",
        body: JSON.stringify({
          locale: "zh_cn",
          source: { type: "github", path: "lang/zh_cn.json" },
        }),
      });
    });
  });
});
