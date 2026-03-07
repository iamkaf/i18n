"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { AppShell } from "@/components/atelier/app-shell";
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
  target_count: number;
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
    <AppShell currentHref="/projects">
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
        <section className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="atelier-card p-5 animate-pulse">
              <div className="h-5 w-2/3 rounded bg-[#ececf7] dark:bg-white/10 mb-3" />
              <div className="h-4 w-full rounded bg-[#ececf7] dark:bg-white/10 mb-2" />
              <div className="h-4 w-5/6 rounded bg-[#ececf7] dark:bg-white/10" />
            </div>
          ))}
        </section>
      ) : error ? (
        <ErrorStateCard description={error} />
      ) : projects.length === 0 ? (
        <EmptyStateCard
          title="No projects found"
          description="Try a broader search or import a catalog to seed the atelier."
        />
      ) : (
        <section className="grid md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.slug}`} className="block">
              <FeatureCard
                title={project.name}
                className="h-full transition-transform hover:-translate-y-0.5"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <StatusPill variant={project.visibility === "public" ? "public" : "private"}>
                    {project.visibility}
                  </StatusPill>
                  <span className="rounded-full bg-[#f3f4ff] px-2.5 py-1 text-xs text-[#4d4d6a] dark:bg-white/10 dark:text-white/70">
                    default: {project.default_locale}
                  </span>
                  <span className="rounded-full bg-[#f3f4ff] px-2.5 py-1 text-xs text-[#4d4d6a] dark:bg-white/10 dark:text-white/70">
                    targets: {project.target_count}
                  </span>
                </div>
                <div className="text-sm">
                  <div className="mb-1">
                    <span className="text-[var(--atelier-muted)]">slug:</span> {project.slug}
                  </div>
                  {project.modrinth_slug ? (
                    <div className="mb-1">
                      <span className="text-[var(--atelier-muted)]">modrinth:</span>{" "}
                      {project.modrinth_slug}
                    </div>
                  ) : null}
                  <div>
                    <span className="text-[var(--atelier-muted)]">updated:</span>{" "}
                    {new Date(project.updated_at).toLocaleString()}
                  </div>
                </div>
              </FeatureCard>
            </Link>
          ))}
        </section>
      )}
    </AppShell>
  );
}
