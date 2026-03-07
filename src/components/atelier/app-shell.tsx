"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AuthControls } from "@/components/atelier/auth-controls";
import { useSession } from "@/lib/use-session";
import {
  Home,
  FolderDot,
  Inbox,
  ShieldCheck,
  Users
} from "lucide-react";

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
    { href: "/", label: "Home", icon: Home, visible: true },
    { href: "/projects", label: "Projects", icon: FolderDot, visible: true },
    { href: "/suggestions", label: "Suggestions", icon: Inbox, visible: Boolean(user) },
    { href: "/moderation", label: "Moderation", icon: ShieldCheck, visible: trusted },
    { href: "/users", label: "Users", icon: Users, visible: god },
  ].filter((item) => item.visible);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--atelier-bg)]">
      {/* macOS style Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)]/40 backdrop-blur-2xl flex flex-col supports-[backdrop-filter]:bg-opacity-50 transition-colors duration-300">
        <div className="p-5 pl-6 pt-8 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-[var(--atelier-highlight)] shadow-[0_0_12px_var(--atelier-highlight)]" />
          <span className="font-semibold text-[15px] tracking-tight text-[var(--atelier-text)]">
            Kaf Atelier
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const isActive = item.href === "/" 
              ? href === item.href 
              : href === item.href || href.startsWith(`${item.href}/`);
            
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-[var(--atelier-highlight)] text-white shadow-sm"
                    : "text-[var(--atelier-text)]/70 hover:bg-[var(--atelier-surface)] hover:text-[var(--atelier-text)]"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "opacity-100" : "opacity-70")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--atelier-border)] flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--atelier-muted)]">Theme</span>
            <ThemeSwitcher />
          </div>
          <div className="px-1">
            <AuthControls />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative bg-[var(--atelier-bg)]">
        <div className="max-w-5xl mx-auto w-full min-h-full px-6 md:px-10 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
