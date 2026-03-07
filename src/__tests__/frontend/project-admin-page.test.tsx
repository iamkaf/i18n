// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectAdminPage from "@/app/projects/[slug]/admin/page";

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
}));

vi.mock("sonner", () => ({
  toast: {
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

describe("Project admin page", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis.URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:mock-export"),
    });
    Object.defineProperty(globalThis.URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    mockApiJson.mockReset();
    mockUseSession.mockReset();
    mockReplace.mockReset();
    vi.restoreAllMocks();
  });

  it("downloads locale JSON from export controls", async () => {
    mockUseSession.mockReturnValue({ god: true, loading: false });

    mockApiJson.mockImplementation((input: string) => {
      if (input === "/api/projects/amber") {
        return Promise.resolve({
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
            source_string_count: 2,
            has_source_catalog: 1,
            updated_at: "2026-03-07T00:00:00.000Z",
          },
        });
      }

      if (input === "/api/projects/amber/imports/discovery") {
        return Promise.resolve({
          github_repo: {
            owner: "iamkaf",
            name: "amber",
            html_url: "https://github.com/iamkaf/amber",
          },
          locale_files: [
            { locale: "en_us", path: "assets/lang/en_us.json", source: "github", kind: "source" },
            { locale: "fr_fr", path: "assets/lang/fr_fr.json", source: "github", kind: "translation" },
          ],
          warnings: [],
        });
      }

      if (input === "/api/projects/amber/progress") {
        return Promise.resolve({
          ok: true,
          project: "amber",
          total_strings: 2,
          progress: [
            { locale: "en_us", approved_count: 2, total_strings: 2, coverage: 1 },
            { locale: "fr_fr", approved_count: 2, total_strings: 2, coverage: 1 },
          ],
        });
      }

      if (input === "/api/export/amber/fr_fr") {
        return Promise.resolve({
          "menu.title": "Bonjour",
        });
      }

      throw new Error(`Unexpected apiJson call: ${input}`);
    });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, "appendChild");

    const user = userEvent.setup();
    render(<ProjectAdminPage />);

    const exportSectionHeading = await screen.findByText("Translation Exports");
    const exportSection = exportSectionHeading.closest("section");
    if (!exportSection) throw new Error("Translation export section not found");

    const localeButton = within(exportSection).getByRole("button", { name: /fr_fr/i });
    await user.click(localeButton);

    await waitFor(() => {
      expect(mockApiJson).toHaveBeenCalledWith("/api/export/amber/fr_fr");
    });

    expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-export");
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const anchor = appendSpy.mock.calls
      .map(([node]) => node)
      .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);

    expect(anchor).toBeTruthy();
    expect(anchor?.download).toBe("amber.fr_fr.json");
  });
});
