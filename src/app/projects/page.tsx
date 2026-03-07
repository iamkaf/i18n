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
import { LocaleBadge } from "@/components/atelier/locale-badge";
import { ModrinthImporter } from "@/components/atelier/modrinth-importer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiJson } from "@/lib/api";
import { useSession } from "@/lib/use-session";

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
  const { god } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImporter, setShowImporter] = useState(false);

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
      <div className="max-w-4xl mx-auto w-full px-6 md:px-10 py-8">
        <SectionHeading title="Projects" />

        <FilterToolbar>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects…"
            className="max-w-xs"
          />
        </FilterToolbar>

        {god && (
          <div className="mb-8 flex justify-end -mt-6">
            <Dialog open={showImporter} onOpenChange={setShowImporter}>
              <DialogTrigger asChild>
                <Button className="bg-[var(--atelier-surface-soft)] text-[var(--atelier-text)] border border-[var(--atelier-border)] shadow-sm hover:bg-[var(--atelier-bg)]">
                  <svg className="w-4 h-4 mr-2 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Import from Modrinth
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-[var(--atelier-bg)]/95 backdrop-blur-2xl border-[var(--atelier-border)] shadow-2xl p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b border-[var(--atelier-border)]/50 bg-[var(--atelier-surface-soft)]/50 sticky top-0 z-10 backdrop-blur-xl">
                  <DialogTitle className="text-xl font-semibold tracking-tight">Import Modrinth Project</DialogTitle>
                  <DialogDescription className="text-[var(--atelier-muted)] text-[15px]">
                    Create a new local shell from Modrinth metadata. Source strings won't be modified here.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-6 bg-[var(--atelier-bg)] relative z-0">
                  <ModrinthImporter />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {loading ? (
          <div className="bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] overflow-hidden animate-pulse">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="px-4 py-3 border-b border-[var(--atelier-border)] last:border-0 flex items-center gap-3">
                 <div className="w-9 h-9 rounded-lg bg-black/5 dark:bg-white/5" />
                 <div className="flex-1 space-y-1.5">
                   <div className="h-3.5 w-28 bg-black/5 dark:bg-white/5 rounded" />
                   <div className="h-3 w-40 bg-black/5 dark:bg-white/5 rounded" />
                 </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorStateCard description={error} />
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <h3 className="text-sm font-medium text-[var(--atelier-text)] mb-1">No projects found</h3>
            <p className="text-sm text-[var(--atelier-muted)]">Try a broader search.</p>
          </div>
        ) : (
          <div className="bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] overflow-hidden">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.slug}`} className="block group border-b border-[var(--atelier-border)] last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                 <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                       <div className="w-9 h-9 shrink-0 bg-gradient-to-tr from-[var(--atelier-highlight)] to-indigo-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                         {project.icon_url ? (
                           <img src={project.icon_url} alt="" className="w-full h-full object-cover rounded-lg" />
                         ) : (
                           project.name.charAt(0)
                         )}
                       </div>
                       <div className="min-w-0">
                         <h3 className="text-sm font-medium text-[var(--atelier-text)] flex items-center gap-1.5 truncate">
                           {project.name}
                           {project.visibility === "private" && (
                              <svg className="w-3 h-3 text-[var(--atelier-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                           )}
                         </h3>
                         <p className="text-xs text-[var(--atelier-muted)]">
                           {project.source_string_count.toLocaleString()} strings · <LocaleBadge locale={project.default_locale} />
                         </p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                       <StatusPill variant={project.has_source_catalog ? "approved" : "pending"}>
                         {project.has_source_catalog ? "Ready" : "Metadata"}
                       </StatusPill>
                       <svg className="w-4 h-4 text-[var(--atelier-muted)] opacity-40 group-hover:opacity-80 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                       </svg>
                    </div>
                 </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
