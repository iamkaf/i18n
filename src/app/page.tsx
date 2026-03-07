"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PublicShell } from "@/components/atelier/public-shell";
import { useSession } from "@/lib/use-session";
import { ChevronRight } from "lucide-react";
import { GlobalStatsCard } from "@/components/atelier/global-stats-card";
import { LanguageLeaderboard } from "@/components/atelier/language-leaderboard";
import { Spinner } from "@/components/atelier/spinner";
import { apiJson } from "@/lib/api";

type GlobalStats = {
  total_source_strings: number;
  total_approved_translations: number;
  locales: Array<{
    locale: string;
    approved_count: number;
    coverage: number;
  }>;
};

export default function Page() {
  const { user, loading } = useSession();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function fetchStats() {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const data = await apiJson<{ ok: boolean; stats: GlobalStats }>("/api/stats");
        if (alive) setStats(data.stats);
      } catch (err) {
        if (alive) setStatsError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        if (alive) setStatsLoading(false);
      }
    }
    void fetchStats();
    return () => { alive = false; };
  }, []);

  return (
    <PublicShell>
      <div className="flex-1 flex flex-col px-6 py-12 md:py-20">
        <div className="text-center w-full max-w-2xl mx-auto flex flex-col items-center justify-center mb-16 opacity-0 translate-y-4 animate-[fadeInUp_1.2s_ease-out_forwards]">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[var(--atelier-text)] mb-4" style={{ fontFamily: "var(--font-syne)" }}>
            Hello.
          </h1>
          <p className="text-lg md:text-xl text-[var(--atelier-muted)] max-w-lg mx-auto leading-relaxed font-medium">
            This is Kaf&apos;s Atelier.
            <br />
            A quiet space dedicated to translating Minecraft mods into your language.
          </p>

          <div className="mt-12 opacity-0 animate-[fadeIn_1s_ease-out_forwards_0.8s]">
            {loading ? null : user ? (
              <Link
                href="/projects"
                className="group flex items-center gap-2 text-[14px] text-[var(--atelier-highlight)] font-medium transition-opacity hover:opacity-80"
              >
                Browse projects
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <a
                href="/api/auth/discord"
                className="group flex flex-col items-center gap-3 transition-opacity hover:opacity-80"
              >
                <div className="w-14 h-14 rounded-full bg-[var(--atelier-surface-soft)] border border-[var(--atelier-border)] flex items-center justify-center shadow-sm">
                  <svg className="w-6 h-6 text-[var(--atelier-highlight)] group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                  </svg>
                </div>
                <span className="text-[14px] text-[var(--atelier-highlight)] font-medium">Help translate a mod</span>
              </a>
            )}
          </div>
        </div>

        <div className="w-full space-y-6 opacity-0 animate-[fadeIn_1s_ease-out_forwards_1s]">
          {statsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : statsError ? (
            <div className="w-full max-w-4xl mx-auto">
              <div className="bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] p-8 text-center">
                <p className="text-sm text-[var(--atelier-muted)]">Unable to load stats</p>
              </div>
            </div>
          ) : stats ? (
            <>
              <GlobalStatsCard
                totalSourceStrings={stats.total_source_strings}
                totalApprovedTranslations={stats.total_approved_translations}
              />
              <LanguageLeaderboard
                locales={stats.locales}
                totalSourceStrings={stats.total_source_strings}
              />
            </>
          ) : null}
        </div>
      </div>
    </PublicShell>
  );
}
