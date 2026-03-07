"use client";

import Link from "next/link";
import { sileo } from "sileo";
import { useEffect, useState } from "react";
import { ApiError, apiJson, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyStateCard } from "@/components/atelier/empty-state-card";
import { StatusPill } from "@/components/atelier/status-pill";

type LookupMode = "author" | "project";
type Visibility = "public" | "private";

type LocaleFile = {
  locale: string;
  path: string;
  source: "github";
  kind: "source" | "translation";
};

type LookupProject = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string | null;
  project_type: "mod";
  updated: string;
  published: string;
  source_url: string | null;
  game_versions: string[];
  loaders: string[];
  local_project: {
    id: string;
    slug: string;
    name: string;
    visibility: Visibility;
    modrinth_project_id: string | null;
    github_repo_url: string | null;
  } | null;
  github_repo: {
    owner: string;
    name: string;
    html_url: string;
  } | null;
  locale_files: LocaleFile[];
  warning?: string | null;
};

type ImportResponse = {
  ok: true;
  action: "created" | "updated";
  project: {
    id: string;
    slug: string;
    name: string;
    visibility: Visibility;
    modrinth_project_id: string;
    modrinth_slug: string;
    icon_url: string | null;
    github_repo_url: string | null;
    updated_at: string;
  };
  github_repo: {
    owner: string;
    name: string;
    html_url: string;
  } | null;
  locale_files: LocaleFile[];
  warning?: string | null;
};

export function ModrinthImporter() {
  const [mode, setMode] = useState<LookupMode>("author");
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<LookupProject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [reviewSlug, setReviewSlug] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewVisibility, setReviewVisibility] = useState<Visibility>("private");
  const [reviewGithubRepoUrl, setReviewGithubRepoUrl] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarning, setImportWarning] = useState<string | null>(null);
  const [lastImported, setLastImported] = useState<ImportResponse["project"] | null>(null);

  const selectedProject = projects.find((project) => project.id === selectedId) ?? null;

  async function runLookup(retainId?: string | null) {
    const trimmed = query.trim();
    if (!trimmed) {
      setLookupError(mode === "author" ? "A Modrinth username is required." : "A Modrinth project reference is required.");
      return;
    }

    setLookupBusy(true);
    setLookupError(null);
    setImportError(null);
    setImportWarning(null);

    try {
      const params = new URLSearchParams(mode === "author" ? { username: trimmed } : { project: trimmed });
      const data = await apiJson<{ projects: LookupProject[] }>(`/api/modrinth/projects?${params.toString()}`);
      const nextProjects = data.projects ?? [];
      setProjects(nextProjects);
      const desiredId = retainId ?? selectedId;
      if (desiredId && nextProjects.some((project) => project.id === desiredId)) {
        setSelectedId(desiredId);
      } else {
        setSelectedId(nextProjects[0]?.id ?? null);
      }
    } catch (error) {
      setProjects([]);
      setSelectedId(null);
      setLookupError(getErrorMessage(error));
    } finally {
      setLookupBusy(false);
    }
  }

  useEffect(() => {
    if (!selectedProject) return;
    setReviewSlug(selectedProject.local_project?.slug || selectedProject.slug);
    setReviewName(selectedProject.local_project?.name || selectedProject.title);
    setReviewVisibility(selectedProject.local_project?.visibility || "private");
    setReviewGithubRepoUrl(
      selectedProject.local_project?.github_repo_url || selectedProject.github_repo?.html_url || "",
    );
    setImportError(null);
    setImportWarning(selectedProject.warning ?? null);
  }, [selectedProject]);

  return (
    <div className="grid gap-6">
      <section className="atelier-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--atelier-muted)]">
              Import from Modrinth
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-[var(--atelier-muted)]">
              Create or update a local project shell from Modrinth metadata. Source and translation files are imported later from the project page.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] px-3 py-2 text-xs text-[var(--atelier-muted)]">
            Import creates metadata only. No strings are written here.
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_120px]">
          <div className="inline-flex rounded-xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] p-1">
            {([
              ["author", "By author"],
              ["project", "By project"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  mode === value
                    ? "bg-[var(--atelier-accent)] text-[var(--atelier-accent-foreground)]"
                    : "text-[var(--atelier-muted)] hover:bg-[#f4f5ff] hover:text-[var(--atelier-text)] dark:hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
              {mode === "author" ? "Modrinth username" : "Project slug, ID, or URL"}
            </span>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={mode === "author" ? "iamkaf" : "amber or https://modrinth.com/mod/amber"}
            />
          </label>
          <div className="flex items-end">
            <Button className="w-full" disabled={lookupBusy} onClick={() => void runLookup()}>
              {lookupBusy ? "Looking up..." : "Look up"}
            </Button>
          </div>
        </div>

        {lookupError ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{lookupError}</p> : null}
      </section>

      {lookupBusy ? (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="atelier-card h-72 animate-pulse" />
          <div className="atelier-card h-72 animate-pulse" />
        </section>
      ) : projects.length === 0 ? (
        <EmptyStateCard
          title="No Modrinth projects loaded"
          description="Run a lookup to review import candidates and GitHub import readiness."
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="grid gap-4">
            {projects.map((project) => {
              const hasSourceFile = project.locale_files.some((file) => file.locale === "en_us");
              return (
                <article
                  key={project.id}
                  className={`atelier-card p-5 ${project.id === selectedId ? "border-[var(--atelier-highlight)]" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    {project.icon_url ? (
                      <img
                        src={project.icon_url}
                        alt=""
                        className="h-14 w-14 rounded-2xl border border-[var(--atelier-border)] object-cover"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold">{project.title}</h4>
                        {project.local_project ? (
                          <StatusPill variant="approved">linked</StatusPill>
                        ) : (
                          <StatusPill variant="pending">new</StatusPill>
                        )}
                        {hasSourceFile ? (
                          <StatusPill variant="approved">en_us found</StatusPill>
                        ) : (
                          <StatusPill variant="pending">no en_us</StatusPill>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-[var(--atelier-muted)]">{project.description}</div>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--atelier-muted)]">
                        <span>slug: {project.slug}</span>
                        <span>locale files: {project.locale_files.length}</span>
                        <span>updated: {new Date(project.updated).toLocaleDateString()}</span>
                      </div>
                      {project.github_repo ? (
                        <div className="mt-2 text-sm">
                          GitHub:{" "}
                          <a
                            href={project.github_repo.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--atelier-highlight)]"
                          >
                            {project.github_repo.owner}/{project.github_repo.name}
                          </a>
                        </div>
                      ) : null}
                      {project.local_project ? (
                        <div className="mt-2 text-sm text-[var(--atelier-muted)]">
                          Local project: {project.local_project.slug}
                        </div>
                      ) : null}
                      {project.warning ? (
                        <div className="mt-2 text-sm text-[var(--atelier-muted)]">{project.warning}</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={() => setSelectedId(project.id)}>
                      {project.local_project ? "Review update" : "Review import"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="atelier-card p-5">
            {!selectedProject ? (
              <EmptyStateCard
                title="Select a project"
                description="Pick a lookup result to review and import it."
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                    Review import
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{selectedProject.title}</h3>
                  <p className="mt-2 text-sm text-[var(--atelier-muted)]">
                    Import creates the project shell only. Source and translation files are imported from the project page.
                  </p>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                    Local slug
                  </span>
                  <Input value={reviewSlug} onChange={(event) => setReviewSlug(event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                    Local name
                  </span>
                  <Input value={reviewName} onChange={(event) => setReviewName(event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                    Visibility
                  </span>
                  <select
                    value={reviewVisibility}
                    onChange={(event) => setReviewVisibility(event.target.value as Visibility)}
                    className="atelier-ring h-9 w-full rounded-md border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] px-3 text-sm"
                  >
                    <option value="private">private</option>
                    <option value="public">public</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                    GitHub repo URL
                  </span>
                  <Input
                    value={reviewGithubRepoUrl}
                    onChange={(event) => setReviewGithubRepoUrl(event.target.value)}
                    placeholder="https://github.com/iamkaf/amber"
                  />
                </label>

                <div className="rounded-2xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] p-4 text-sm">
                  <div>Modrinth ID: {selectedProject.id}</div>
                  <div className="mt-1">Modrinth slug: {selectedProject.slug}</div>
                  <div className="mt-1">
                    GitHub:{" "}
                    {selectedProject.github_repo ? (
                      <a
                        href={selectedProject.github_repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--atelier-highlight)]"
                      >
                        {selectedProject.github_repo.owner}/{selectedProject.github_repo.name}
                      </a>
                    ) : (
                      "not detected"
                    )}
                  </div>
                  <div className="mt-1">locale files: {selectedProject.locale_files.length}</div>
                  <div className="mt-1">
                    canonical source: {selectedProject.locale_files.some((file) => file.locale === "en_us") ? "en_us detected" : "not detected"}
                  </div>
                </div>

                {importWarning ? <p className="text-sm text-[var(--atelier-muted)]">{importWarning}</p> : null}
                {importError ? <p className="text-sm text-rose-600 dark:text-rose-300">{importError}</p> : null}

                <Button
                  className="w-full"
                  disabled={importBusy}
                  onClick={async () => {
                    setImportBusy(true);
                    setImportError(null);
                    try {
                      const result = await apiJson<ImportResponse>("/api/modrinth/import", {
                        method: "POST",
                        body: JSON.stringify({
                          source: { id: selectedProject.id, slug: selectedProject.slug },
                          project: {
                            slug: reviewSlug,
                            name: reviewName,
                            visibility: reviewVisibility,
                            github_repo_url: reviewGithubRepoUrl,
                          },
                        }),
                      });
                      setLastImported(result.project);
                      setImportWarning(result.warning ?? null);
                      sileo.success({
                        title: result.action === "created" ? "Project imported" : "Project metadata updated",
                        description: "Source and translation files are imported from the project page.",
                      });
                      await runLookup(selectedProject.id);
                    } catch (error) {
                      const message = getErrorMessage(error);
                      setImportError(message);
                      if (error instanceof ApiError && error.status === 409) {
                        return;
                      }
                      sileo.error({ title: "Import failed", description: message });
                    } finally {
                      setImportBusy(false);
                    }
                  }}
                >
                  {importBusy
                    ? "Saving..."
                    : selectedProject.local_project
                      ? "Update local metadata"
                      : "Import project"}
                </Button>

                {lastImported ? (
                  <div className="rounded-2xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] p-4 text-sm">
                    <div className="font-semibold">Saved as {lastImported.slug}</div>
                    <div className="mt-2 text-[var(--atelier-muted)]">
                      Upload or sync locale files from the project page next.
                    </div>
                    <Link href={`/projects/${lastImported.slug}`} className="mt-3 inline-block text-[var(--atelier-highlight)]">
                      Open project
                    </Link>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
