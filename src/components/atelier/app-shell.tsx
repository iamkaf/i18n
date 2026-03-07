"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AuthControls } from "@/components/atelier/auth-controls";
import { useSession } from "@/lib/use-session";

export function AppShell({
  currentHref,
  children,
}: {
  currentHref?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, trusted, god } = useSession();
  const href = currentHref || pathname;
  const nav = [
    { href: "/", label: "Home", visible: true },
    { href: "/projects", label: "Projects", visible: true },
    { href: "/suggestions", label: "My Suggestions", visible: Boolean(user) },
    { href: "/moderation", label: "Moderation", visible: trusted },
    { href: "/users", label: "Users", visible: god },
  ].filter((item) => item.visible);

  return (
    <div className="atelier-page min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[#ececf7]/90 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f0f18]/80">
        <div className="atelier-shell py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-[#5865f2]" />
            <span className="text-sm tracking-[0.18em] uppercase text-[var(--atelier-muted)]">
              Kaf Atelier
            </span>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex flex-wrap gap-1 rounded-xl border border-[#ececf7] bg-white p-1 dark:border-white/15 dark:bg-white/5">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-lg transition-colors",
                    (
                      item.href === "/"
                        ? href === item.href
                        : href === item.href || href.startsWith(`${item.href}/`)
                    )
                      ? "bg-[var(--atelier-accent)] text-[var(--atelier-accent-foreground)]"
                      : "text-[var(--atelier-muted)] hover:bg-[#f5f6ff] hover:text-[var(--atelier-text)] dark:hover:bg-white/10",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <ThemeSwitcher />
            <AuthControls />
          </div>
        </div>
      </header>

      <div className="atelier-shell py-12 md:py-16">{children}</div>
    </div>
  );
}
