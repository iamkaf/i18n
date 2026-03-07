// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProjectDetailPage from "@/app/projects/[slug]/page";
import { ApiError } from "@/lib/api";

const mockApiJson = vi.fn();

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: "private-mod" }),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiJson: (...args: unknown[]) => mockApiJson(...args),
  };
});

vi.mock("@/components/atelier/app-shell", () => ({
  AppShell: ({ children }: any) => <div>{children}</div>,
}));

describe("Project detail page", () => {
  it("renders an inline lock state for private projects without a session", async () => {
    mockApiJson.mockRejectedValueOnce(new ApiError(401, "Unauthorized", { error: "Unauthorized" }));

    render(<ProjectDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("This workshop view is private")).toBeTruthy();
    });
  });
});
