"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FloatingNav } from "@/components/atelier/floating-nav";

export function AppShell({
  currentHref,
  children,
}: {
  currentHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--atelier-bg)]">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative bg-[var(--atelier-bg)] lg:pl-[14rem]">
        <div className="max-w-6xl mx-auto w-full min-h-full px-6 md:px-10 pt-8 pb-32 lg:pb-8">
          {children}
        </div>
      </main>

      <FloatingNav />
    </div>
  );
}
