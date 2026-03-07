"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/atelier/app-shell";
import { EmptyStateCard } from "@/components/atelier/empty-state-card";
import { ErrorStateCard } from "@/components/atelier/error-state-card";
import { FeatureCard } from "@/components/atelier/feature-card";
import { LockedStateCard } from "@/components/atelier/locked-state-card";
import { SectionHeading } from "@/components/atelier/section-heading";
import { StatusPill } from "@/components/atelier/status-pill";
import { ApiError, apiJson } from "@/lib/api";

type Project = {
  id: string;
  slug: string;
  name: string;
  visibility: "public" | "private";
  default_locale: string;
  icon_url: string | null;
  modrinth_slug: string | null;
  updated_at: string;
};

type Target = {
  id: string;
  key: string;
  label: string | null;
  source_revision: string | null;
  source_hash: string | null;
  active_strings: number;
  updated_at: string;
};

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [project, setProject] = useState<Project | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setLocked(false);
      setError(null);

      try {
        const projectData = await apiJson<{ project: Project }>(`/api/projects/${slug}`);
        if (!alive) return;
        setProject(projectData.project);

        const targetData = await apiJson<{ targets: Target[] }>(`/api/projects/${slug}/targets`);
        if (alive) {
          setTargets(targetData.targets ?? []);
        }
      } catch (loadError) {
        if (!alive) return;
        if (loadError instanceof ApiError && loadError.status === 401) {
          setLocked(true);
          setProject(null);
          setTargets([]);
        } else if (loadError instanceof ApiError && loadError.status === 404) {
          setError("Project not found.");
          setProject(null);
          setTargets([]);
        } else {
          setError(loadError instanceof Error ? loadError.message : "Failed to load project.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <AppShell currentHref="/projects">
      <SectionHeading
        eyebrow="Project"
        title={project?.name || slug}
        description="Targets represent import snapshots for releases or moving channels like latest."
      />

      {loading ? (
        <section className="grid gap-4">
          <div className="atelier-card h-32 animate-pulse" />
          <div className="atelier-card h-48 animate-pulse" />
        </section>
      ) : locked ? (
        <LockedStateCard description="This project is private. Sign in with Discord to inspect targets and browse source strings." />
      ) : error ? (
        <ErrorStateCard
          title={error === "Project not found." ? "Not found" : "Unable to load project"}
          description={error}
        />
      ) : project ? (
        <>
          <section className="atelier-card mb-6 p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                {project.icon_url ? (
                  <img
                    src={project.icon_url}
                    alt=""
                    className="h-16 w-16 rounded-2xl border border-[var(--atelier-border)] object-cover"
                  />
                ) : null}
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusPill variant={project.visibility === "public" ? "public" : "private"}>
                      {project.visibility}
                    </StatusPill>
                    <span className="rounded-full bg-[#f3f4ff] px-2.5 py-1 text-xs text-[#4d4d6a] dark:bg-white/10 dark:text-white/70">
                      default: {project.default_locale}
                    </span>
                  </div>
                  <h1 className="text-3xl font-semibold">{project.name}</h1>
                  <p className="mt-2 text-sm text-[var(--atelier-muted)]">slug: {project.slug}</p>
                  {project.modrinth_slug ? (
                    <p className="mt-1 text-sm text-[var(--atelier-muted)]">
                      Modrinth:{" "}
                      <a
                        href={`https://modrinth.com/mod/${project.modrinth_slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--atelier-highlight)]"
                      >
                        {project.modrinth_slug}
                      </a>
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="text-sm text-[var(--atelier-muted)]">
                updated: {new Date(project.updated_at).toLocaleString()}
              </div>
            </div>
          </section>

          {targets.length === 0 ? (
            <EmptyStateCard
              title="No targets yet"
              description="Push a source catalog to create the first translation target for this project."
            />
          ) : (
            <section className="grid gap-4 md:grid-cols-2">
              {targets.map((target) => (
                <Link
                  key={target.id}
                  href={`/projects/${project.slug}/${target.key}`}
                  className="block"
                >
                  <FeatureCard
                    title={target.label || target.key}
                    className="h-full transition-transform hover:-translate-y-0.5"
                  >
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-[var(--atelier-muted)]">key:</span> {target.key}
                      </div>
                      <div>
                        <span className="text-[var(--atelier-muted)]">active strings:</span>{" "}
                        {target.active_strings}
                      </div>
                      {target.source_revision ? (
                        <div>
                          <span className="text-[var(--atelier-muted)]">revision:</span>{" "}
                          {target.source_revision}
                        </div>
                      ) : null}
                      {target.source_hash ? (
                        <div className="font-mono text-xs">
                          <span className="text-[var(--atelier-muted)]">hash:</span>{" "}
                          {target.source_hash}
                        </div>
                      ) : null}
                    </div>
                  </FeatureCard>
                </Link>
              ))}
            </section>
          )}
        </>
      ) : null}
    </AppShell>
  );
}
