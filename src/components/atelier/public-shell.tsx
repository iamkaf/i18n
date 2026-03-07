"use client";

import { FloatingNav } from "@/components/atelier/floating-nav";

export function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--atelier-bg)] flex flex-col relative overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative w-full flex flex-col pb-32 lg:pb-0 lg:pl-[14rem]">
        {children}
      </main>
      
      <FloatingNav />
    </div>
  );
}
