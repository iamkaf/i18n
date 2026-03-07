"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { PublicShell } from "@/components/atelier/public-shell";
import { SectionHeading } from "@/components/atelier/section-heading";
import { StatusPill } from "@/components/atelier/status-pill";
import { EmptyStateCard } from "@/components/atelier/empty-state-card";
import { ErrorStateCard } from "@/components/atelier/error-state-card";
import { FilterToolbar } from "@/components/atelier/filter-toolbar";
import { LocaleBadge } from "@/components/atelier/locale-badge";
import { ModrinthImporter } from "@/components/atelier/modrinth-importer";
import { Spinner } from "@/components/atelier/spinner";
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
  const [refreshKey, setRefreshKey] = useState(0);

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
    return () => { alive = false; };
  }, [deferredQuery, refreshKey]);

  return (
    <PublicShell>
      <div className="max-w-6xl mx-auto w-full px-6 md:px-10 py-8">
        <SectionHeading title="Projects" />

        <FilterToolbar>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects…"
            className="max-w-xs"
          />
          {god && (
            <Dialog open={showImporter} onOpenChange={setShowImporter}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="shrink-0">
                  + Import from Modrinth
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-[var(--atelier-bg)]/95 backdrop-blur-2xl border-[var(--atelier-border)] shadow-2xl p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b border-[var(--atelier-border)]/50 bg-[var(--atelier-surface-soft)]/50 sticky top-0 z-10 backdrop-blur-xl">
                  <DialogTitle className="text-xl font-semibold tracking-tight">Import Modrinth Project</DialogTitle>
                  <DialogDescription className="text-[var(--atelier-muted)] text-[15px]">
                    Create a new local shell from Modrinth metadata.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-6 bg-[var(--atelier-bg)] relative z-0">
                  <ModrinthImporter onImportSuccess={() => setRefreshKey((k) => k + 1)} />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </FilterToolbar>

        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorStateCard description={error} />
        ) : projects.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--atelier-muted)]">No projects found.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="group relative bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] overflow-hidden transition-all duration-200 hover:border-[var(--atelier-highlight)]/40 hover:shadow-lg hover:shadow-[var(--atelier-highlight)]/5 hover:-translate-y-0.5"
              >
                {/* Gradient accent top edge */}
                <div className="h-1 w-full bg-gradient-to-r from-[var(--atelier-highlight)] to-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />

                <div className="p-4">
                  {/* Icon + Name */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-11 h-11 shrink-0 rounded-lg overflow-hidden border border-[var(--atelier-border)]">
                      {project.icon_url ? (
                        <img src={project.icon_url} alt={`${project.name} icon`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-[var(--atelier-highlight)] to-indigo-500 flex items-center justify-center text-white font-bold text-base">
                          {project.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-[var(--atelier-text)] truncate group-hover:text-[var(--atelier-highlight)] transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-xs text-[var(--atelier-muted)] font-mono truncate">{project.slug}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-[var(--atelier-muted)]">
                      <span className="font-medium text-[var(--atelier-text)]">{project.source_string_count.toLocaleString()}</span>
                      <span>strings</span>
                      <span className="opacity-40">·</span>
                      <LocaleBadge locale={project.default_locale} />
                    </div>
                    <StatusPill variant={project.has_source_catalog ? "approved" : "pending"}>
                      {project.has_source_catalog ? "Ready" : "Setup"}
                    </StatusPill>
                  </div>

                  {/* External links row */}
                  {(project.modrinth_slug || project.github_repo_url) && (
                    <div className="mt-3 pt-3 border-t border-[var(--atelier-border)]/50 flex items-center gap-3 text-xs text-[var(--atelier-muted)]">
                      {project.modrinth_slug && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12.252.004a11.78 11.768 0 0 0-8.92 3.73 11 11 0 0 0-2.17 3.11 11.37 11.37 0 0 0-1.16 5.169c0 1.42.17 2.48.6 3.8l.02.06a11.83 11.83 0 0 0 5.19 6.35 10.97 10.97 0 0 0 5.17 1.67l.02-.01c.18.01.36.01.54.01 3.09 0 5.89-1.19 7.99-3.14a11.75 11.75 0 0 0 3.28-5.49 11.4 11.4 0 0 0 .5-2.88v-.08c.01-1.06-.08-2.06-.32-3.09A11.94 11.94 0 0 0 12.252.004z" /><path d="m14.877 16.46-3.028-8.04 7.507 5.71-4.48 2.33z" fill="var(--atelier-bg)" /><path d="m6.59 7.16 3.85 10.22 6.94-3.61-3.03-8.04-3.78 1.47L6.59 7.16z" fill="var(--atelier-bg)" /></svg>
                          Modrinth
                        </span>
                      )}
                      {project.github_repo_url && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
                          GitHub
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
