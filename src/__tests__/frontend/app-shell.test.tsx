// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/atelier/app-shell";

const mockUseSession = vi.fn();
const mockUsePathname = vi.fn(() => "/");

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("@/lib/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("@/components/theme-switcher", () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher" />,
}));

vi.mock("@/components/atelier/auth-controls", () => ({
  AuthControls: () => <div data-testid="auth-controls" />,
}));

describe("AppShell navigation", () => {
  it("shows only public navigation when signed out", () => {
    mockUseSession.mockReturnValue({
      user: null,
      trusted: false,
      god: false,
      role: "user",
      loading: false,
    });
    render(
      <AppShell currentHref="/">
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Projects")).toBeTruthy();
    expect(screen.queryByText("Suggestions")).toBeNull();
    expect(screen.queryByText("Moderation")).toBeNull();
  });

  it("shows contributor and moderator navigation for trusted users", () => {
    mockUseSession.mockReturnValue({
      user: { sub: "1", name: "Trusted", avatar: null },
      trusted: true,
      god: false,
      role: "trusted",
      loading: false,
    });
    render(
      <AppShell currentHref="/moderation">
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByText("Suggestions")).toBeTruthy();
    expect(screen.getByText("Moderation")).toBeTruthy();
    expect(screen.queryByText("Users")).toBeNull();
  });

  it("shows user management navigation for the god user", () => {
    mockUseSession.mockReturnValue({
      user: { sub: "517599684961894400", name: "Kaf", avatar: null },
      trusted: true,
      god: true,
      role: "god",
      loading: false,
    });
    render(
      <AppShell currentHref="/users">
        <div>content</div>
      </AppShell>,
    );

    expect(screen.getByText("Users")).toBeTruthy();
  });
});
