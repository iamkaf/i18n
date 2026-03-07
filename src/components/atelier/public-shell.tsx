"use client";

import { ThemeSwitcher } from "@/components/theme-switcher";
import { AuthControls } from "@/components/atelier/auth-controls";

export function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--atelier-bg)] flex flex-col relative overflow-hidden">
      {/* Super minimal header, just Theme and Auth */}
      <header className="absolute top-0 right-0 p-6 z-50 flexItems-center gap-4 flex w-full justify-between pointer-events-none">
         <div className="pointer-events-auto opacity-0 translate-y-[-10px] animate-[fadeInDown_1s_ease-out_forwards_0.5s]">
            <div className="h-6 flex items-center gap-2 bg-[var(--atelier-surface-soft)]/50 backdrop-blur-xl border border-[var(--atelier-border)] px-3 rounded-full text-[11px] font-medium text-[var(--atelier-muted)] pb-[1px]">
               <div className="w-1.5 h-1.5 rounded-full bg-[var(--atelier-highlight)] shadow-[0_0_8px_var(--atelier-highlight)]" />
               Kaf Atelier
            </div>
         </div>
         <div className="pointer-events-auto flex items-center gap-4 bg-[var(--atelier-surface-soft)]/30 backdrop-blur-xl border border-[var(--atelier-border)] px-2 py-1.5 rounded-full shadow-sm opacity-0 translate-y-[-10px] animate-[fadeInDown_1s_ease-out_forwards_0.7s]">
            <ThemeSwitcher />
            <div className="w-[1px] h-4 bg-[var(--atelier-border)]" />
            <div className="scale-90 origin-right">
               <AuthControls showDashboardLink={true} />
            </div>
         </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative w-full flex flex-col">
        {children}
      </main>
    </div>
  );
}
