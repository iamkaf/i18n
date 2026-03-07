"use client";

import Link from "next/link";
import { sileo } from "sileo";
import { useDeferredValue, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PublicShell } from "@/components/atelier/public-shell";
import { EmptyStateCard } from "@/components/atelier/empty-state-card";
import { ErrorStateCard } from "@/components/atelier/error-state-card";
import { FilterToolbar } from "@/components/atelier/filter-toolbar";
import { Input } from "@/components/ui/input";
import { LocaleProgressStrip } from "@/components/atelier/locale-progress-strip";
import { LockedStateCard } from "@/components/atelier/locked-state-card";
import { PaginationControls } from "@/components/atelier/pagination-controls";
import { SectionHeading } from "@/components/atelier/section-heading";
import { StatusPill } from "@/components/atelier/status-pill";
import { StringRowCard, type StringRowCardItem } from "@/components/atelier/string-row-card";
import { SuggestionDrawer } from "@/components/atelier/suggestion-drawer";
import { Button } from "@/components/ui/button";
import { ApiError, apiJson, getErrorMessage } from "@/lib/api";
import { useSession } from "@/lib/use-session";

type Project = {
  id: string;
  slug: string;
  name: string;
  visibility: "public" | "private";
  default_locale: string;
  icon_url: string | null;
  modrinth_project_id: string | null;
  modrinth_slug: string | null;
  github_repo_url: string | null;
  source_string_count: number;
  has_source_catalog: number;
  updated_at: string;
};

type DiscoveryFile = {
  locale: string;
  path: string;
  source: "github";
  kind: "source" | "translation";
};

type ProgressItem = {
  locale: string;
  approved_count: number;
  total_strings: number;
  coverage: number;
};

type ImportResult = {
  ok: true;
  locale: string;
  mode: "source" | "translation";
  imported: number;
  updated: number;
  deactivated: number;
  ignored_non_string: number;
  skipped_unmatched: Array<{ key: string }>;
  source_path?: string | null;
};

type StringsResponse = {
  page: number;
  limit: number;
  total: number;
  locale: string;
  strings: StringRowCardItem[];
};

function inferLocaleFromFilename(fileName: string): string {
  const match = fileName.trim().toLowerCase().match(/([a-z]{2}_[a-z]{2})\.json$/);
  return match?.[1] ?? "";
}

function summarizeImport(result: ImportResult): string {
  const bits = [`${result.imported} new`, `${result.updated} updated`];
  if (result.deactivated > 0) bits.push(`${result.deactivated} deactivated`);
  if (result.skipped_unmatched.length > 0) bits.push(`${result.skipped_unmatched.length} skipped`);
  if (result.ignored_non_string > 0) bits.push(`${result.ignored_non_string} ignored`);
  return bits.join(", ");
}

export default function ProjectPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const { user, god } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingStrings, setLoadingStrings] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const deferredQuery = useDeferredValue(query);
  const [locale, setLocale] = useState((searchParams.get("locale") || "en_us").toLowerCase());
  const [page, setPage] = useState(Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0));
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [strings, setStrings] = useState<StringRowCardItem[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerText, setComposerText] = useState("");
  const [composerError, setComposerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<StringRowCardItem["my_suggestion"] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [discoveryBusy, setDiscoveryBusy] = useState(false);
  const [discoveryFiles, setDiscoveryFiles] = useState<DiscoveryFile[]>([]);
  const [discoveryRepo, setDiscoveryRepo] = useState<{ owner: string; name: string; html_url: string } | null>(null);
  const [discoveryWarning, setDiscoveryWarning] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLocale, setUploadLocale] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editName, setEditName] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "private">("private");
  const [editGithubRepoUrl, setEditGithubRepoUrl] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  const selectedString = strings.find((item) => item.id === selectedId) ?? strings[0] ?? null;
  const sourceFiles = discoveryFiles.filter((file) => file.kind === "source");
  const translationFiles = discoveryFiles.filter((file) => file.kind === "translation");

  useEffect(() => {
    let alive = true;

    async function loadProject() {
      setLoadingProject(true);
      setLocked(false);
      setError(null);
      try {
        const data = await apiJson<{ project: Project }>(`/api/projects/${slug}`);
        if (!alive) return;
        setProject(data.project);
      } catch (loadError) {
        if (!alive) return;
        if (loadError instanceof ApiError && loadError.status === 401) {
          setLocked(true);
          setProject(null);
        } else if (loadError instanceof ApiError && loadError.status === 404) {
          setError("Project not found.");
          setProject(null);
        } else {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (alive) setLoadingProject(false);
      }
    }

    void loadProject();
    return () => {
      alive = false;
    };
  }, [slug, refreshKey]);

  useEffect(() => {
    if (!project) return;
    setEditSlug(project.slug);
    setEditName(project.name);
    setEditVisibility(project.visibility);
    setEditGithubRepoUrl(project.github_repo_url || "");
  }, [project]);

  useEffect(() => {
    if (!project || !god) {
      setDiscoveryFiles([]);
      setDiscoveryRepo(null);
      setDiscoveryWarning(null);
      return;
    }

    let alive = true;
    async function loadDiscovery() {
      setDiscoveryBusy(true);
      try {
        const data = await apiJson<{
          github_repo: { owner: string; name: string; html_url: string } | null;
          locale_files: DiscoveryFile[];
          warnings: string[];
        }>(`/api/projects/${slug}/imports/discovery`);
        if (!alive) return;
        setDiscoveryRepo(data.github_repo);
        setDiscoveryFiles(data.locale_files ?? []);
        setDiscoveryWarning(data.warnings?.[0] ?? null);
      } catch (loadError) {
        if (!alive) return;
        if (loadError instanceof ApiError && (loadError.status === 401 || loadError.status === 403)) {
          return;
        }
        setDiscoveryRepo(null);
        setDiscoveryFiles([]);
        setDiscoveryWarning(getErrorMessage(loadError));
      } finally {
        if (alive) setDiscoveryBusy(false);
      }
    }

    void loadDiscovery();
    return () => {
      alive = false;
    };
  }, [god, project, slug, refreshKey]);

  useEffect(() => {
    if (!project?.has_source_catalog) {
      setStrings([]);
      setProgress([]);
      setSelectedId(null);
      return;
    }

    let alive = true;
    async function loadWorkbench() {
      setLoadingStrings(true);
      setError(null);
      const params = new URLSearchParams({
        locale,
        page: String(page),
        limit: "25",
        include_mine: "1",
      });
      if (deferredQuery.trim()) params.set("q", deferredQuery.trim());

      try {
        const [progressData, stringsData] = await Promise.all([
          apiJson<{ progress: ProgressItem[]; total_strings: number }>(`/api/projects/${slug}/progress`),
          apiJson<StringsResponse>(`/api/projects/${slug}/strings?${params.toString()}`),
        ]);
        if (!alive) return;
        const totalStrings = progressData.total_strings ?? 0;
        const nextProgress = progressData.progress ?? [];
        const hasActiveLocale = nextProgress.some((item) => item.locale === stringsData.locale);
        setProgress(
          hasActiveLocale
            ? nextProgress
            : [
                ...nextProgress,
                {
                  locale: stringsData.locale,
                  approved_count: stringsData.locale === "en_us" ? totalStrings : 0,
                  total_strings: totalStrings,
                  coverage: stringsData.locale === "en_us" && totalStrings > 0 ? 1 : 0,
                },
              ],
        );
        setStrings(stringsData.strings ?? []);
        setPage(stringsData.page);
        setLimit(stringsData.limit);
        setTotal(stringsData.total);
        setSelectedId((current) => {
          if (current && (stringsData.strings ?? []).some((item) => item.id === current)) return current;
          return stringsData.strings?.[0]?.id ?? null;
        });
      } catch (loadError) {
        if (!alive) return;
        if (loadError instanceof ApiError && loadError.status === 401) {
          setLocked(true);
          setStrings([]);
        } else if (loadError instanceof ApiError && loadError.status === 404) {
          setError("Project not found.");
          setStrings([]);
        } else {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (alive) setLoadingStrings(false);
      }
    }

    void loadWorkbench();
    return () => {
      alive = false;
    };
  }, [deferredQuery, locale, page, project?.has_source_catalog, refreshKey, slug]);

  useEffect(() => {
    if (selectedString) {
      setComposerText(selectedString.my_suggestion?.text ?? "");
      setComposerError(null);
    }
  }, [selectedString]);

  async function refreshProjectState() {
    setRefreshKey((value) => value + 1);
  }

  async function handleProjectSave() {
    if (!project) return;
    setSavingProject(true);
    try {
      const data = await apiJson<{ project: Project }>(`/api/projects/${project.slug}`, {
        method: "PATCH",
        body: JSON.stringify({
          slug: editSlug,
          name: editName,
          visibility: editVisibility,
          github_repo_url: editGithubRepoUrl,
        }),
      });
      setProject(data.project);
      if (data.project.slug !== project.slug) {
        router.replace(`/projects/${data.project.slug}`);
      }
      sileo.success({ title: "Project updated", description: data.project.slug });
      await refreshProjectState();
    } catch (saveError) {
      sileo.error({ title: "Project update failed", description: getErrorMessage(saveError) });
    } finally {
      setSavingProject(false);
    }
  }

  async function runImport(payload: {
    locale: string;
    source:
      | {
          type: "github";
          path: string;
        }
      | {
          type: "upload";
          file_name: string;
          content: string;
        };
  }) {
    if (!project) return;
    setImportBusy(true);
    try {
      const result = await apiJson<ImportResult>(`/api/projects/${project.slug}/imports`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setLastImport(result);
      sileo.success({
        title: result.locale === "en_us" ? "Source catalog imported" : `Imported ${result.locale}`,
        description: summarizeImport(result),
      });
      if (payload.source.type === "upload") {
        setUploadFile(null);
        setUploadLocale("");
      }
      if (payload.locale !== locale && locale === "en_us" && payload.locale !== "en_us") {
        setLocale(payload.locale);
      }
      await refreshProjectState();
    } catch (importError) {
      sileo.error({ title: "Import failed", description: getErrorMessage(importError) });
    } finally {
      setImportBusy(false);
    }
  }

  async function handleManualUpload() {
    if (!uploadFile) {
      sileo.error({ title: "Choose a file", description: "Select a JSON file to import." });
      return;
    }
    const inferredLocale = inferLocaleFromFilename(uploadFile.name);
    const resolvedLocale = (uploadLocale || inferredLocale).trim().toLowerCase();
    if (!/^[a-z]{2}_[a-z]{2}$/.test(resolvedLocale)) {
      sileo.error({ title: "Locale required", description: "Use a filename like zh_cn.json or enter a locale manually." });
      return;
    }
    if (!project?.has_source_catalog && resolvedLocale !== "en_us") {
      sileo.error({ title: "Import en_us first", description: "Canonical source must exist before importing translations." });
      return;
    }

    await runImport({
      locale: resolvedLocale,
      source: {
        type: "upload",
        file_name: uploadFile.name,
        content: await uploadFile.text(),
      },
    });
  }

  async function handleSubmitSuggestion() {
    if (!selectedString) return;
    const nextLocale = locale.trim().toLowerCase();
    const nextText = composerText.trim();

    if (nextLocale === "en_us") {
      setComposerError("Canonical English is imported directly. Pick a translation locale.");
      return;
    }
    if (!/^[a-z]{2}_[a-z]{2}$/.test(nextLocale)) {
      setComposerError("Locale must match xx_xx.");
      return;
    }
    if (!nextText.length) {
      setComposerError("Translation text is required.");
      return;
    }

    setSubmitting(true);
    setComposerError(null);
    try {
      await apiJson<{ ok: true; id: string }>("/api/suggestions", {
        method: "POST",
        body: JSON.stringify({
          source_string_id: selectedString.id,
          locale: nextLocale,
          text: nextText,
        }),
      });
      sileo.success({ title: "Suggestion submitted", description: selectedString.string_key });
      await refreshProjectState();
    } catch (submitError) {
      const message = getErrorMessage(submitError);
      setComposerError(message);
      sileo.error({ title: "Could not submit suggestion", description: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicShell>
      <div className="max-w-5xl mx-auto w-full px-6 md:px-10 py-20 animate-[fadeInUp_0.8s_ease-out_forwards]">
        <SectionHeading
          eyebrow="Project workbench"
          title={project?.name || slug}
          description="Each project keeps one canonical en_us source catalog and approved locale translations layered on top."
        />

      {loadingProject ? (
        <section className="grid gap-4">
          <div className="atelier-card h-24 animate-pulse" />
          <div className="atelier-card h-80 animate-pulse" />
        </section>
      ) : locked ? (
        <LockedStateCard description="This project is private. Sign in with Discord to browse strings and translation history." />
      ) : error ? (
        <ErrorStateCard
          title={error === "Project not found." ? "Not found" : "Unable to load project"}
          description={error}
        />
      ) : project ? (
        <div className="grid gap-6">
          <section className="bg-[var(--atelier-surface)] rounded-2xl border border-[var(--atelier-border)] overflow-hidden shadow-sm backdrop-blur-xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                {project.icon_url ? (
                  <img
                    src={project.icon_url}
                    alt=""
                    className="h-20 w-20 rounded-2xl border border-[var(--atelier-border)] object-cover shadow-sm"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-[var(--atelier-highlight)] to-indigo-500 border border-[var(--atelier-border)] shadow-sm flex items-center justify-center text-white text-3xl font-bold font-syne">
                     {project.name.charAt(0)}
                  </div>
                )}
                <div className="pt-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusPill variant={project.visibility === "public" ? "public" : "private"}>
                      {project.visibility}
                    </StatusPill>
                    <StatusPill variant={project.has_source_catalog ? "approved" : "pending"}>
                      {project.has_source_catalog ? "Ready" : "Metadata"}
                    </StatusPill>
                    <span className="rounded-md bg-[var(--atelier-surface-soft)] border border-[var(--atelier-border)] px-2 py-0.5 text-xs font-mono text-[var(--atelier-muted)]">
                      en_us
                    </span>
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight text-[var(--atelier-text)]">{project.name}</h1>
                  <p className="mt-1 text-sm text-[var(--atelier-muted)] font-mono">{project.slug}</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1 text-sm text-[var(--atelier-muted)] pt-1">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  <span>{project.source_string_count.toLocaleString()} strings</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                </div>
                {project.modrinth_slug && (
                  <a href={`https://modrinth.com/mod/${project.modrinth_slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[var(--atelier-highlight)] hover:underline mt-1">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                     <span>Modrinth</span>
                  </a>
                )}
              </div>
            </div>
          </section>

          {god ? (
            <details className="group bg-[var(--atelier-surface)] rounded-2xl border border-[var(--atelier-border)] overflow-hidden shadow-sm backdrop-blur-xl">
              <summary className="p-4 md:p-5 flex items-center justify-between cursor-pointer list-none select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                 <div>
                    <h3 className="text-base font-semibold text-[var(--atelier-text)]">Project metadata</h3>
                    <p className="text-[13px] text-[var(--atelier-muted)] mt-0.5">Edit slug, visibility, and source connections.</p>
                 </div>
                 <div className="bg-[var(--atelier-surface-soft)] border border-[var(--atelier-border)] p-1.5 rounded-full text-[var(--atelier-muted)] group-open:rotate-90 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                 </div>
              </summary>
              <div className="p-5 pt-0 border-t border-[var(--atelier-border)]">
                 <div className="mt-5 grid gap-4 md:grid-cols-2">
                   <label className="block">
                     <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                       Local slug
                     </span>
                     <Input value={editSlug} onChange={(event) => setEditSlug(event.target.value)} />
                   </label>
                   <label className="block">
                     <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                       Local name
                     </span>
                     <Input value={editName} onChange={(event) => setEditName(event.target.value)} />
                   </label>
                   <label className="block">
                     <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                       Visibility
                     </span>
                     <select
                       value={editVisibility}
                       onChange={(event) => setEditVisibility(event.target.value as "public" | "private")}
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
                       value={editGithubRepoUrl}
                       onChange={(event) => setEditGithubRepoUrl(event.target.value)}
                       placeholder="https://github.com/iamkaf/amber"
                     />
                   </label>
                 </div>
                 <div className="mt-6 flex justify-end">
                   <Button onClick={() => void handleProjectSave()} disabled={savingProject}>
                     {savingProject ? "Saving..." : "Save changes"}
                   </Button>
                 </div>
              </div>
            </details>
          ) : null}

          {god ? (
            <details className="group bg-[var(--atelier-surface)] rounded-2xl border border-[var(--atelier-border)] overflow-hidden shadow-sm backdrop-blur-xl" open={!project.has_source_catalog}>
              <summary className="p-4 md:p-5 flex items-center justify-between cursor-pointer list-none select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                 <div>
                    <h3 className="text-base font-semibold text-[var(--atelier-text)]">Data Imports</h3>
                    <p className="text-[13px] text-[var(--atelier-muted)] mt-0.5">Sync source catalogs and translations.</p>
                 </div>
                 <div className="flex items-center gap-4">
                    {!project.has_source_catalog && (
                       <span className="text-[12px] font-medium text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-500/20">Action Required</span>
                    )}
                    <div className="bg-[var(--atelier-surface-soft)] border border-[var(--atelier-border)] p-1.5 rounded-full text-[var(--atelier-muted)] group-open:rotate-90 transition-transform">
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                 </div>
              </summary>
              <div className="p-5 pt-0 border-t border-[var(--atelier-border)]">
                <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[14px] text-[var(--atelier-text)]">
                      GitHub discovery looks for files named <code>xx_xx.json</code>. Importing <code>en_us</code> replaces the canonical source catalog immediately. Other locales land directly as approved translations.
                    </p>
                  </div>
                  {discoveryRepo ? (
                    <a
                      href={discoveryRepo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-[var(--atelier-highlight)] bg-[var(--atelier-highlight)]/10 px-3 py-1.5 rounded-lg font-medium hover:bg-[var(--atelier-highlight)]/20 transition-colors"
                    >
                      {discoveryRepo.owner}/{discoveryRepo.name}
                    </a>
                  ) : null}
                </div>

                {discoveryWarning ? (
                  <div className="mt-4 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 text-[13px] text-orange-700 dark:text-orange-300">
                     {discoveryWarning}
                  </div>
                ) : null}

                {discoveryBusy ? (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="h-32 rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
                    <div className="h-32 rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)]/50 p-4">
                      <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--atelier-muted)] mb-3">
                        Source
                      </div>
                      {sourceFiles.length === 0 ? (
                        <p className="text-[13px] text-[var(--atelier-muted)]">
                          No <code>en_us.json</code> files detected in the linked repository.
                        </p>
                      ) : (
                        <div className="grid gap-3">
                          {sourceFiles.map((file) => (
                            <div
                              key={file.path}
                              className="rounded-lg border border-[var(--atelier-border)] bg-[var(--atelier-surface)] p-3 flex flex-col gap-3"
                            >
                              <div className="font-mono text-[12px] text-[var(--atelier-text)] truncate" title={file.path}>{file.path}</div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full bg-[var(--atelier-surface-soft)]"
                                onClick={() =>
                                  void runImport({
                                    locale: "en_us",
                                    source: { type: "github", path: file.path },
                                  })
                                }
                                disabled={importBusy}
                              >
                                {project.has_source_catalog ? "Sync en_us from GitHub" : "Import en_us now"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)]/50 p-4">
                      <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--atelier-muted)] mb-3">
                        Translations
                      </div>
                      {!project.has_source_catalog ? (
                        <p className="text-[13px] text-[var(--atelier-muted)]">
                          Import <code>en_us</code> first.
                        </p>
                      ) : translationFiles.length === 0 ? (
                        <p className="text-[13px] text-[var(--atelier-muted)]">
                          No translation locale files were detected.
                        </p>
                      ) : (
                        <div className="grid gap-3">
                          {translationFiles.map((file) => (
                            <div
                              key={file.path}
                              className="rounded-lg border border-[var(--atelier-border)] bg-[var(--atelier-surface)] p-3 flex flex-col gap-3"
                            >
                              <div className="font-mono text-[12px] text-[var(--atelier-text)] truncate" title={file.path}>{file.path}</div>
                              <div className="text-[11px] text-[var(--atelier-muted)] uppercase tracking-wider">{file.locale}</div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full bg-[var(--atelier-surface-soft)]"
                                onClick={() =>
                                  void runImport({
                                    locale: file.locale,
                                    source: { type: "github", path: file.path },
                                  })
                                }
                                disabled={importBusy}
                              >
                                Import {file.locale}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6 rounded-xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)]/50 p-4">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--atelier-muted)] mb-4">
                    Manual upload
                  </div>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_160px_140px]">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--atelier-muted)]">
                        JSON file
                      </span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] ?? null;
                          setUploadFile(nextFile);
                          setUploadLocale(nextFile ? inferLocaleFromFilename(nextFile.name) : "");
                        }}
                        className="block w-full text-[13px] text-[var(--atelier-text)] file:mr-3 file:rounded-md file:border file:border-[var(--atelier-border)] file:bg-[var(--atelier-surface)] file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-[var(--atelier-text)] hover:file:bg-[var(--atelier-surface-soft)] transition-colors cursor-pointer"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-[var(--atelier-muted)]">
                        Locale
                      </span>
                      <Input
                        value={uploadLocale}
                        onChange={(event) => setUploadLocale(event.target.value.toLowerCase())}
                        placeholder="zh_cn"
                      />
                    </label>
                    <div className="flex items-end">
                      <Button className="w-full h-[38px]" onClick={() => void handleManualUpload()} disabled={importBusy}>
                        {importBusy ? "Importing..." : "Upload"}
                      </Button>
                    </div>
                  </div>
                  {!project.has_source_catalog ? (
                    <p className="mt-3 text-[12px] text-red-500 dark:text-red-400">
                      Uploads are disabled until the canonical <code>en_us</code> catalog exists.
                    </p>
                  ) : null}
                </div>

                {lastImport ? (
                  <div className="mt-4 rounded-xl bg-[var(--atelier-highlight)]/10 border border-[var(--atelier-highlight)]/20 p-4">
                    <div className="text-[13px] font-semibold text-[var(--atelier-text)]">
                      Last import: <span className="uppercase text-[var(--atelier-highlight)]">{lastImport.locale}</span> ({lastImport.mode})
                    </div>
                    <div className="mt-1 text-[13px] text-[var(--atelier-text)]/80">{summarizeImport(lastImport)}</div>
                    {lastImport.skipped_unmatched.length > 0 ? (
                      <div className="mt-3 p-2 rounded bg-black/5 dark:bg-white/5 text-[12px] font-mono text-[var(--atelier-muted)] max-h-24 overflow-y-auto">
                        Skipped unmatched keys: {lastImport.skipped_unmatched.map((item) => item.key).join(", ")}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </details>
          ) : null}

          {!project.has_source_catalog ? (
            god ? null : (
              <EmptyStateCard
                title="No source catalog yet"
                description="A god user needs to import en_us before contributors can browse and translate this project."
              />
            )
          ) : (
            <>
              <FilterToolbar sticky>
                <label className="block min-w-[180px] flex-1">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                    Locale
                  </span>
                  <Input
                    value={locale}
                    onChange={(event) => {
                      setLocale(event.target.value.toLowerCase());
                      setPage(0);
                    }}
                    placeholder="zh_cn"
                  />
                </label>
                <label className="block min-w-[260px] flex-[2]">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                    Search strings
                  </span>
                  <Input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(0);
                    }}
                    placeholder="Search by key or source text"
                  />
                </label>
              </FilterToolbar>

              <section>
                <LocaleProgressStrip
                  items={progress}
                  activeLocale={locale}
                  onSelect={(nextLocale) => {
                    setLocale(nextLocale);
                    setPage(0);
                  }}
                />
              </section>

              <section className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(22rem,0.9fr)]">
                <div>
                  {loadingStrings ? (
                    <div className="grid gap-4">
                      <div className="atelier-card h-44 animate-pulse" />
                      <div className="atelier-card h-44 animate-pulse" />
                    </div>
                  ) : strings.length === 0 ? (
                    <EmptyStateCard
                      title="No strings matched this view"
                      description="Try another locale or clear the search term."
                    />
                  ) : (
                    <div className="grid gap-4">
                      {strings.map((item) => (
                        <StringRowCard
                          key={item.id}
                          item={item}
                          active={selectedString?.id === item.id}
                          onSelect={() => setSelectedId(item.id)}
                          onEditSuggestion={(suggestion) => {
                            setSelectedId(item.id);
                            setEditing(suggestion);
                          }}
                        />
                      ))}
                      <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
                    </div>
                  )}
                </div>

                <aside className="atelier-card h-fit p-5 xl:sticky xl:top-32">
                  {!user ? (
                    <LockedStateCard
                      title="Contributor tools are sign-in only"
                      description="Browse the source freely here, then sign in with Discord before drafting or revising a suggestion."
                    />
                  ) : !selectedString ? (
                    <EmptyStateCard
                      title="Choose a string"
                      description="Select a row from the left column to draft or revise a suggestion."
                    />
                  ) : locale === "en_us" ? (
                    <EmptyStateCard
                      title="Canonical source is read-only here"
                      description="Import en_us directly from GitHub or upload it manually. Pick a translation locale to suggest translated text."
                    />
                  ) : selectedString.my_suggestion?.status === "pending" ? (
                    <div>
                      <h3 className="text-lg font-semibold">Pending suggestion</h3>
                      <p className="mt-2 text-sm text-[var(--atelier-muted)]">
                        You already have a pending suggestion for{" "}
                        <span className="font-mono">{selectedString.string_key}</span>.
                      </p>
                      <div className="mt-4 rounded-2xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] p-4 text-sm">
                        {selectedString.my_suggestion.text}
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Button variant="outline" onClick={() => setEditing(selectedString.my_suggestion)}>
                          Edit draft
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4">
                        <div className="text-sm text-[var(--atelier-muted)]">
                          <Link href="/projects" className="text-[var(--atelier-highlight)]">
                            Projects
                          </Link>{" "}
                          / {project.slug}
                        </div>
                        <div className="mt-3 font-mono text-sm text-[var(--atelier-highlight)]">
                          {selectedString.string_key}
                        </div>
                        <h3 className="mt-2 text-lg font-semibold">{selectedString.source_text}</h3>
                        {selectedString.context ? (
                          <p className="mt-2 text-sm text-[var(--atelier-muted)]">
                            context: {selectedString.context}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                            Locale
                          </label>
                          <Input
                            value={locale}
                            onChange={(event) => setLocale(event.target.value.toLowerCase())}
                            placeholder="zh_cn"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                            Suggestion
                          </label>
                          <textarea
                            value={composerText}
                            onChange={(event) => setComposerText(event.target.value)}
                            rows={10}
                            className="atelier-ring min-h-48 w-full rounded-2xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] px-4 py-3 text-sm outline-none"
                            placeholder="Write the translation for the active locale"
                          />
                        </div>
                        {composerError ? <p className="text-sm text-rose-600 dark:text-rose-300">{composerError}</p> : null}
                        <Button onClick={() => void handleSubmitSuggestion()} disabled={submitting}>
                          {submitting ? "Submitting..." : "Submit suggestion"}
                        </Button>
                      </div>
                    </div>
                  )}
                </aside>
              </section>
            </>
          )}

          <SuggestionDrawer
            open={Boolean(editing)}
            title="Edit pending suggestion"
            description={selectedString ? `Revise ${selectedString.string_key}` : undefined}
            initialLocale={editing?.locale ?? locale}
            initialText={editing?.text ?? ""}
            submitLabel="Save changes"
            onClose={() => setEditing(null)}
            onSubmit={async ({ locale: nextLocale, text }) => {
              if (!editing) return;
              await apiJson(`/api/suggestions/${editing.id}`, {
                method: "PATCH",
                body: JSON.stringify({ locale: nextLocale, text }),
              });
              sileo.success({ title: "Suggestion updated", description: selectedString?.string_key });
              await refreshProjectState();
            }}
            onWithdraw={
              editing
                ? async () => {
                    await apiJson(`/api/suggestions/${editing.id}`, { method: "DELETE" });
                    sileo.success({ title: "Suggestion withdrawn", description: selectedString?.string_key });
                    await refreshProjectState();
                  }
                : undefined
            }
          />
        </div>
      ) : null}
      </div>
    </PublicShell>
  );
}
