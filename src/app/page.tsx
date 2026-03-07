"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PublicShell } from "@/components/atelier/public-shell";
import { useSession } from "@/lib/use-session";
import { GlobalStatsCard } from "@/components/atelier/global-stats-card";
import { LanguageLeaderboard } from "@/components/atelier/language-leaderboard";
import { ProjectIconGrid } from "@/components/atelier/project-icon-grid";
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

type Project = {
  id: string;
  slug: string;
  name: string;
  icon_url: string | null;
};

export default function Page() {
  const { user, loading } = useSession();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

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

  useEffect(() => {
    let alive = true;
    async function fetchProjects() {
      setProjectsLoading(true);
      try {
        const data = await apiJson<{ projects: Project[] }>("/api/projects");
        if (alive) setProjects(data.projects ?? []);
      } catch {
        // Silently fail - projects grid is secondary
      } finally {
        if (alive) setProjectsLoading(false);
      }
    }
    void fetchProjects();
    return () => { alive = false; };
  }, []);

  return (
    <PublicShell>
      <div className="flex-1 flex flex-col relative">
        {/* Subtle paper texture */}
        <div 
          className="fixed inset-0 opacity-[0.02] pointer-events-none z-0 mix-blend-multiply"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <main className="relative z-10 px-6 sm:px-8 lg:px-12 pt-16 sm:pt-24 pb-32">
          <div className="max-w-3xl mx-auto">
            
            {/* Handwritten-style header */}
            <header className="mb-20">
              <p className="text-sm text-[var(--atelier-muted)] mb-2" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                i18n.kaf.sh
              </p>
              <div className="w-12 h-px bg-[var(--atelier-text)]/30 mb-8" />
            </header>

            {/* The Invitation */}
            <article className="mb-20">
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-normal text-[var(--atelier-text)] mb-8 leading-tight"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                Help translate my mods.
              </h1>

              <div className="prose prose-lg max-w-none">
                <p className="text-lg sm:text-xl text-[var(--atelier-muted)] leading-relaxed mb-6">
                  I build Minecraft mods in English. This site lets people translate them into other languages.
                </p>

                <p className="text-base text-[var(--atelier-muted)]/80 leading-relaxed mb-8">
                  It&apos;s not a platform or a startup. Just a tool I built because I needed it. If you want to help translate blocks, items, or random UI text, sign in and pick a project.
                </p>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
                {loading ? (
                  <div className="h-10 w-32 bg-[var(--atelier-surface)] rounded animate-pulse" />
                ) : user ? (
                  <Link
                    href="/projects"
                    className="inline-flex items-center gap-2 text-[var(--atelier-text)] border-b-2 border-[var(--atelier-text)] pb-1 hover:text-[var(--atelier-highlight)] hover:border-[var(--atelier-highlight)] transition-colors"
                    style={{ fontFamily: 'var(--font-syne)' }}
                  >
                    <span>See the projects</span>
                    <span className="text-lg">→</span>
                  </Link>
                ) : (
                  <a
                    href="/api/auth/discord"
                    className="group inline-flex items-center gap-3 px-5 py-2.5 rounded-lg border border-[var(--atelier-border)] bg-[var(--atelier-surface)] hover:border-[var(--atelier-highlight)]/50 hover:bg-[var(--atelier-surface-soft)] transition-all"
                  >
                    <svg className="w-5 h-5 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.376-.444.865-.608 1.25a18.3 18.3 0 00-5.487 0c-.163-.394-.405-.875-.617-1.25a.077.077 0 00-.079-.037A19.74 19.74 0 003.62 4.37a.07.07 0 00-.032.028C.533 9.046-.32 13.58.098 18.058a.082.082 0 00.031.056 20.03 20.03 0 005.993 3.03.078.078 0 00.084-.028 18.1 18.1 0 001.226-1.994.076.076 0 00-.042-.106 11.8 11.8 0 01-1.872-.892.077.077 0 01-.008-.128l.372-.291a.074.074 0 01.078-.011c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 01.079.01c.12.1.246.198.373.293a.077.077 0 01-.007.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 00.084.029 20.03 20.03 0 006.002-3.03.077.077 0 00.031-.055 19.7 19.7 0 00-3.549-13.66.06.06 0 00-.031-.029zM8.02 15.33c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.211 0 2.176 1.095 2.157 2.419 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.095 2.157 2.419 0 1.333-.946 2.419-2.157 2.419z"/>
                    </svg>
                    <span className="text-sm font-medium text-[var(--atelier-text)]">Sign in with Discord</span>
                  </a>
                )}
              </div>
            </article>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-16">
              <div className="flex-1 h-px bg-[var(--atelier-border)]" />
              <span className="text-xs text-[var(--atelier-muted)] uppercase tracking-widest">At a glance</span>
              <div className="flex-1 h-px bg-[var(--atelier-border)]" />
            </div>

            {/* Stats */}
            <section className="mb-16">
              {statsLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner className="w-6 h-6" />
                </div>
              ) : statsError ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[var(--atelier-muted)]">Unable to load stats</p>
                </div>
              ) : stats ? (
                <div className="space-y-12">
                  <GlobalStatsCard
                    totalSourceStrings={stats.total_source_strings}
                    totalApprovedTranslations={stats.total_approved_translations}
                    localeCount={stats.locales.length}
                  />
                  <LanguageLeaderboard
                    locales={stats.locales}
                    totalSourceStrings={stats.total_source_strings}
                  />
                  {!projectsLoading && projects.length > 0 && (
                    <ProjectIconGrid projects={projects} />
                  )}
                </div>
              ) : null}
            </section>

            {/* Footer */}
            <footer className="pt-12 border-t border-[var(--atelier-border)]">
              <p className="text-sm text-[var(--atelier-muted)]">
                Built with care for the Minecraft modding community.
              </p>
            </footer>

          </div>
        </main>
      </div>
    </PublicShell>
  );
}
