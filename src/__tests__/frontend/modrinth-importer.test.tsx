// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModrinthImporter } from "@/components/atelier/modrinth-importer";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const LOOKUP_RESPONSE = {
  projects: [
    {
      id: "vjGZJDu5",
      slug: "amber",
      title: "Amber",
      description: "Multiloader library",
      icon_url: null,
      project_type: "mod",
      updated: "2026-02-14T20:26:44Z",
      published: "2026-01-01T00:00:00Z",
      source_url: "https://github.com/iamkaf/amber",
      game_versions: ["1.21.10"],
      loaders: ["fabric"],
      local_project: null,
      github_repo: {
        owner: "iamkaf",
        name: "amber",
        html_url: "https://github.com/iamkaf/amber",
      },
      locale_files: [
        { locale: "en_us", path: "lang/en_us.json", source: "github", kind: "source" },
        { locale: "zh_cn", path: "lang/zh_cn.json", source: "github", kind: "translation" },
      ],
      warning: null,
    },
  ],
};

describe("ModrinthImporter", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders lookup results and import readiness", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes("/api/modrinth/projects?username=iamkaf")) {
          return new Response(JSON.stringify(LOOKUP_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }) as any,
    );

    const user = userEvent.setup();
    render(<ModrinthImporter />);

    await user.type(screen.getByPlaceholderText("iamkaf"), "iamkaf");
    await user.click(screen.getByText("Look up"));

    await waitFor(() => {
      expect(screen.getAllByText("Amber").length).toBeGreaterThan(0);
      expect(screen.getByText("en_us found")).toBeTruthy();
      expect(screen.getAllByText("locale files: 2").length).toBeGreaterThan(0);
      expect(screen.getByDisplayValue("amber")).toBeTruthy();
    });
  });

  it("shows a post-import CTA after saving", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/api/modrinth/projects?username=iamkaf")) {
        return new Response(JSON.stringify(LOOKUP_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "/api/modrinth/import" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            ok: true,
            action: "created",
            project: {
              id: "local1",
              slug: "amber",
              name: "Amber",
              visibility: "private",
              modrinth_project_id: "vjGZJDu5",
              modrinth_slug: "amber",
              icon_url: null,
              github_repo_url: "https://github.com/iamkaf/amber",
              updated_at: "2026-03-07T00:00:00.000Z",
            },
            github_repo: LOOKUP_RESPONSE.projects[0].github_repo,
            locale_files: LOOKUP_RESPONSE.projects[0].locale_files,
            warning: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as any);

    const user = userEvent.setup();
    render(<ModrinthImporter />);

    await user.type(screen.getByPlaceholderText("iamkaf"), "iamkaf");
    await user.click(screen.getByText("Look up"));
    await waitFor(() => expect(screen.getAllByText("Amber").length).toBeGreaterThan(0));
    await user.click(screen.getByText("Import project"));

    await waitFor(() => {
      expect(screen.getByText(/Saved as/i)).toBeTruthy();
      expect(screen.getByText("Open project")).toBeTruthy();
    });
  });

  it("renders an inline conflict error", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/api/modrinth/projects?username=iamkaf")) {
        return new Response(JSON.stringify(LOOKUP_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "/api/modrinth/import" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            error: "That local slug already belongs to a different linked project. Choose another slug.",
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as any);

    const user = userEvent.setup();
    render(<ModrinthImporter />);

    await user.type(screen.getByPlaceholderText("iamkaf"), "iamkaf");
    await user.click(screen.getByText("Look up"));
    await waitFor(() => expect(screen.getAllByText("Amber").length).toBeGreaterThan(0));
    await user.click(screen.getByText("Import project"));

    await waitFor(() => {
      expect(screen.getByText("That local slug already belongs to a different linked project. Choose another slug.")).toBeTruthy();
    });
  });
});
