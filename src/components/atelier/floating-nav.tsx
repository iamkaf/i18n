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

export function FloatingNav() {
  const pathname = usePathname();
  const { user, trusted, god } = useSession();
  
  const nav = [
    { href: "/", label: "Home", icon: Home, visible: true },
    { href: "/projects", label: "Projects", icon: FolderDot, visible: true },
    { href: "/suggestions", label: "Suggestions", icon: Inbox, visible: Boolean(user) },
    { href: "/moderation", label: "Moderation", icon: ShieldCheck, visible: trusted },
    { href: "/users", label: "Users", icon: Users, visible: god },
  ].filter((item) => item.visible);

  return (
    <div className="fixed bottom-6 lg:bottom-auto lg:top-1/2 left-1/2 lg:left-6 lg:-translate-y-1/2 -translate-x-1/2 lg:translate-x-0 z-50 animate-[fadeInUp_0.8s_ease-out_forwards] lg:animate-[fadeInLeft_0.8s_ease-out_forwards]">
      <nav className="flex flex-row lg:flex-col items-center gap-1 p-1.5 bg-[var(--atelier-surface-soft)]/60 backdrop-blur-2xl border border-[var(--atelier-border)]/50 rounded-[1.5rem] shadow-2xl">
        {/* Navigation links */}
        <ul className="flex flex-row lg:flex-col items-stretch w-full gap-0.5">
          {nav.map((item) => {
            const isActive = item.href === "/" 
              ? pathname === item.href 
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl transition-all duration-200 ease-out h-9 px-3 w-full",
                    isActive
                      ? "bg-[var(--atelier-text)] text-[var(--atelier-bg)] shadow-sm"
                      : "text-[var(--atelier-text)]/60 hover:bg-[var(--atelier-bg)]/80 hover:text-[var(--atelier-text)]"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden lg:block text-[13px] font-medium tracking-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Thin divider */}
        <div className="w-5 lg:w-[calc(100%-16px)] h-[1px] bg-[var(--atelier-border)]/40 my-0.5" />

        {/* Compact utility row — icon-only, centered */}
        <div className="flex flex-row items-center justify-center gap-1 lg:w-full lg:px-1">
          <ThemeSwitcher />
          <AuthControls />
        </div>
      </nav>
    </div>
  );
}
