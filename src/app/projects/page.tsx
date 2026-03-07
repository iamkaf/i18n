"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { PublicShell } from "@/components/atelier/public-shell";
import { SectionHeading } from "@/components/atelier/section-heading";
import { FeatureCard } from "@/components/atelier/feature-card";
import { StatusPill } from "@/components/atelier/status-pill";
import { EmptyStateCard } from "@/components/atelier/empty-state-card";
import { ErrorStateCard } from "@/components/atelier/error-state-card";
import { FilterToolbar } from "@/components/atelier/filter-toolbar";
import { Input } from "@/components/ui/input";
import { apiJson } from "@/lib/api";

type Project = {
  id: string;
  slug: string;
  name: string;
  visibility: "public" | "private";
  default_locale: string;
  icon_url: string | null;
  modrinth_slug: string | null;
  github_repo_url: string | null;
  source_string_count: number;
  has_source_catalog: number;
  updated_at: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (deferredQuery.trim()) params.set("q", deferredQuery.trim());
        const endpoint = params.size ? `/api/projects?${params.toString()}` : "/api/projects";
        const data = await apiJson<{ projects: Project[] }>(endpoint);
        if (alive) setProjects(data.projects ?? []);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Failed to load projects");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void run();
    return () => {
      alive = false;
    };
  }, [deferredQuery]);

  return (
    <PublicShell>
      <div className="max-w-4xl mx-auto w-full px-6 md:px-10 py-20 animate-[fadeInUp_0.8s_ease-out_forwards]">
        <SectionHeading
          eyebrow="Project browser"
          title="Projects in the atelier"
          description="Browse mods and visibility at a glance. Private entries are only visible to signed-in users."
        />

        <FilterToolbar>
          <label className="block min-w-[260px] flex-1">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
              Search projects
            </span>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by slug or name"
            />
          </label>
        </FilterToolbar>

        {loading ? (
          <section className="bg-[var(--atelier-surface)] rounded-2xl border border-[var(--atelier-border)] overflow-hidden shadow-sm backdrop-blur-xl animate-pulse">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="p-4 border-b border-[var(--atelier-border)] last:border-0 flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5" />
                 <div className="flex-1 space-y-2">
                   <div className="h-4 w-32 bg-black/5 dark:bg-white/5 rounded" />
                   <div className="h-3 w-48 bg-black/5 dark:bg-white/5 rounded" />
                 </div>
              </div>
            ))}
          </section>
        ) : error ? (
          <ErrorStateCard description={error} />
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-[var(--atelier-surface)] border border-[var(--atelier-border)] flex items-center justify-center" />
            <h3 className="text-lg font-medium text-[var(--atelier-text)] mb-2">No projects found</h3>
            <p className="text-[15px] text-[var(--atelier-muted)] max-w-sm">Try a broader search or import a project shell to seed the atelier.</p>
          </div>
        ) : (
          <section className="bg-[var(--atelier-surface)] rounded-2xl border border-[var(--atelier-border)] overflow-hidden shadow-sm backdrop-blur-xl">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.slug}`} className="block group border-b border-[var(--atelier-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                 <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                       <div className="w-12 h-12 bg-gradient-to-tr from-[var(--atelier-highlight)] to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm" style={{ fontFamily: "var(--font-syne)" }}>
                         {project.icon_url ? (
                           <img src={project.icon_url} alt="" className="w-full h-full object-cover rounded-xl" />
                         ) : (
                           project.name.charAt(0)
                         )}
                       </div>
                       <div>
                         <h3 className="text-[17px] font-medium text-[var(--atelier-text)] flex items-center gap-2">
                           {project.name}
                           {project.visibility === "private" && (
                              <svg className="w-3.5 h-3.5 text-[var(--atelier-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                           )}
                         </h3>
                         <p className="text-[13px] text-[var(--atelier-muted)] mt-0.5">
                           {project.source_string_count.toLocaleString()} strings • {project.default_locale}
                         </p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-3 md:gap-6 self-stretch md:self-auto w-full md:w-auto mt-2 md:mt-0 pt-3 border-t md:border-0 border-[var(--atelier-border)]">
                       <div className="hidden md:flex flex-col items-end">
                         <StatusPill variant={project.has_source_catalog ? "approved" : "pending"}>
                           {project.has_source_catalog ? "Ready" : "Metadata"}
                         </StatusPill>
                         <span className="text-[11px] text-[var(--atelier-muted)] uppercase tracking-wider mt-1">
                           {new Date(project.updated_at).toLocaleDateString()}
                         </span>
                       </div>
                       <div className="flex-1 md:hidden" />
                       <svg className="w-5 h-5 text-[var(--atelier-muted)] group-hover:text-[var(--atelier-text)] transition-colors opacity-50 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                       </svg>
                    </div>
                 </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </PublicShell>
  );
}
