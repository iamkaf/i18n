"use client";

import Link from "next/link";
import { sileo } from "sileo";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PublicShell } from "@/components/atelier/public-shell";
import { ErrorStateCard } from "@/components/atelier/error-state-card";
import { LocaleBadge } from "@/components/atelier/locale-badge";
import { LocalePicker } from "@/components/atelier/locale-picker";
import { LockedStateCard } from "@/components/atelier/locked-state-card";
import { SectionHeading } from "@/components/atelier/section-heading";
import { Spinner } from "@/components/atelier/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiJson, getErrorMessage } from "@/lib/api";
import { isSupportedLocaleCode, normalizeLocaleCode } from "@/lib/locales";
import { useSession } from "@/lib/use-session";
import { ArrowLeft } from "lucide-react";

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

export default function ProjectAdminPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const { god, loading: sessionLoading } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editName, setEditName] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "private">("private");
  const [editGithubRepoUrl, setEditGithubRepoUrl] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [discoveryBusy, setDiscoveryBusy] = useState(false);
  const [discoveryFiles, setDiscoveryFiles] = useState<DiscoveryFile[]>([]);
  const [discoveryRepo, setDiscoveryRepo] = useState<{ owner: string; name: string; html_url: string } | null>(null);
  const [discoveryWarning, setDiscoveryWarning] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLocale, setUploadLocale] = useState("");

  const sourceFiles = discoveryFiles.filter((f) => f.kind === "source");
  const translationFiles = discoveryFiles.filter((f) => f.kind === "translation");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoadingProject(true);
      try {
        const data = await apiJson<{ project: Project }>(`/api/projects/${slug}`);
        if (alive) setProject(data.project);
      } catch (e) {
        if (alive) setError(getErrorMessage(e));
      } finally {
        if (alive) setLoadingProject(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    if (!project) return;
    setEditSlug(project.slug);
    setEditName(project.name);
    setEditVisibility(project.visibility);
    setEditGithubRepoUrl(project.github_repo_url || "");
  }, [project]);

  useEffect(() => {
    if (!project || !god) return;
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
      } catch (e) {
        if (!alive) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return;
        setDiscoveryWarning(getErrorMessage(e));
      } finally {
        if (alive) setDiscoveryBusy(false);
      }
    }
    void loadDiscovery();
    return () => { alive = false; };
  }, [god, project, slug]);

  async function handleProjectSave() {
    if (!project) return;
    setSavingProject(true);
    try {
      const data = await apiJson<{ project: Project }>(`/api/projects/${project.slug}`, {
        method: "PATCH",
        body: JSON.stringify({ slug: editSlug, name: editName, visibility: editVisibility, github_repo_url: editGithubRepoUrl }),
      });
      setProject(data.project);
      if (data.project.slug !== project.slug) router.replace(`/projects/${data.project.slug}/admin`);
      sileo.success({ title: "Project updated", description: data.project.slug });
    } catch (e) {
      sileo.error({ title: "Failed", description: getErrorMessage(e) });
    } finally {
      setSavingProject(false);
    }
  }

  async function runImport(payload: { locale: string; source: { type: "github"; path: string } | { type: "upload"; file_name: string; content: string } }) {
    if (!project) return;
    setImportBusy(true);
    try {
      const result = await apiJson<ImportResult>(`/api/projects/${project.slug}/imports`, { method: "POST", body: JSON.stringify(payload) });
      setLastImport(result);
      sileo.success({ title: result.locale === "en_us" ? "Source catalog imported" : `Imported ${result.locale}`, description: summarizeImport(result) });
      if (payload.source.type === "upload") { setUploadFile(null); setUploadLocale(""); }
    } catch (e) {
      sileo.error({ title: "Import failed", description: getErrorMessage(e) });
    } finally {
      setImportBusy(false);
    }
  }

  async function handleManualUpload() {
    if (!uploadFile) { sileo.error({ title: "Choose a file" }); return; }
    const inferredLocale = inferLocaleFromFilename(uploadFile.name);
    const resolvedLocale = normalizeLocaleCode(uploadLocale || inferredLocale);
    if (!isSupportedLocaleCode(resolvedLocale)) { sileo.error({ title: "Locale required" }); return; }
    if (!project?.has_source_catalog && resolvedLocale !== "en_us") { sileo.error({ title: "Import en_us first" }); return; }
    await runImport({ locale: resolvedLocale, source: { type: "upload", file_name: uploadFile.name, content: await uploadFile.text() } });
  }

  if (sessionLoading || loadingProject) return <PublicShell><div className="max-w-6xl mx-auto w-full px-6 md:px-10 py-8"><Spinner /></div></PublicShell>;
  if (!god) return <PublicShell><div className="max-w-6xl mx-auto w-full px-6 md:px-10 py-8"><LockedStateCard description="Admin access required." /></div></PublicShell>;
  if (error || !project) return <PublicShell><div className="max-w-6xl mx-auto w-full px-6 md:px-10 py-8"><ErrorStateCard description={error ?? "Project not found."} /></div></PublicShell>;

  return (
    <PublicShell>
      <div className="max-w-6xl mx-auto w-full px-6 md:px-10 py-8">
        <div className="mb-4">
          <Link href={`/projects/${project.slug}`} className="inline-flex items-center gap-1.5 text-xs text-[var(--atelier-muted)] hover:text-[var(--atelier-text)] transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Back to project
          </Link>
        </div>
        <SectionHeading title={`${project.name} — Admin`} />

        <div className="space-y-6">
          {/* Metadata */}
          <section className="bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--atelier-muted)] mb-3">Project Metadata</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--atelier-muted)]">Slug</span>
                <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--atelier-muted)]">Name</span>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--atelier-muted)]">Visibility</span>
                <select value={editVisibility} onChange={(e) => setEditVisibility(e.target.value as "public" | "private")} className="atelier-ring h-9 w-full rounded-md border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] px-3 text-sm">
                  <option value="private">private</option>
                  <option value="public">public</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--atelier-muted)]">GitHub Repo URL</span>
                <Input value={editGithubRepoUrl} onChange={(e) => setEditGithubRepoUrl(e.target.value)} placeholder="https://github.com/…" />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={() => void handleProjectSave()} disabled={savingProject}>{savingProject ? "Saving…" : "Save"}</Button>
            </div>
          </section>

          {/* Imports */}
          <section className="bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--atelier-muted)]">Data Imports</h3>
              {!project.has_source_catalog && <span className="text-[11px] font-medium text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded border border-red-200 dark:border-red-500/20">Needs en_us</span>}
            </div>

            {discoveryRepo && (
              <p className="text-xs text-[var(--atelier-muted)] mb-3">
                Linked: <a href={discoveryRepo.html_url} target="_blank" rel="noreferrer" className="text-[var(--atelier-highlight)] hover:underline">{discoveryRepo.owner}/{discoveryRepo.name}</a>
              </p>
            )}

            {discoveryWarning && (
              <div className="mb-3 p-2.5 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 text-xs text-orange-700 dark:text-orange-300">
                {discoveryWarning}
              </div>
            )}

            {discoveryBusy ? <Spinner /> : (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)]/50 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--atelier-muted)] mb-2">Source</div>
                  {sourceFiles.length === 0 ? <p className="text-xs text-[var(--atelier-muted)]">No en_us.json found.</p> : sourceFiles.map((f) => (
                    <div key={f.path} className="mb-2 last:mb-0">
                      <div className="font-mono text-[11px] text-[var(--atelier-text)] truncate mb-1">{f.path}</div>
                      <Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={() => void runImport({ locale: "en_us", source: { type: "github", path: f.path } })} disabled={importBusy}>
                        {project.has_source_catalog ? "Sync en_us" : "Import en_us"}
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)]/50 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--atelier-muted)] mb-2">Translations</div>
                  {!project.has_source_catalog ? <p className="text-xs text-[var(--atelier-muted)]">Import en_us first.</p>
                  : translationFiles.length === 0 ? <p className="text-xs text-[var(--atelier-muted)]">None detected.</p>
                  : translationFiles.map((f) => (
                    <div key={f.path} className="mb-2 last:mb-0">
                      <div className="font-mono text-[11px] text-[var(--atelier-text)] truncate mb-1"><LocaleBadge locale={f.locale} /> {f.path}</div>
                      <Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={() => void runImport({ locale: f.locale, source: { type: "github", path: f.path } })} disabled={importBusy}>
                        Import {f.locale}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual upload */}
            <div className="mt-4 pt-4 border-t border-[var(--atelier-border)]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--atelier-muted)] mb-2">Manual Upload</div>
              <div className="grid gap-3 md:grid-cols-[1fr_140px_100px]">
                <input type="file" accept=".json" onChange={(e) => { const f = e.target.files?.[0] ?? null; setUploadFile(f); setUploadLocale(f ? inferLocaleFromFilename(f.name) : ""); }}
                  className="block w-full text-xs file:mr-2 file:rounded file:border file:border-[var(--atelier-border)] file:bg-[var(--atelier-surface)] file:px-2 file:py-1 file:text-xs cursor-pointer" />
                <LocalePicker value={uploadLocale} onChange={setUploadLocale} placeholder="Locale" allowEmpty className="w-full justify-between" />
                <Button size="sm" type="button" onClick={() => void handleManualUpload()} disabled={importBusy}>{importBusy ? "…" : "Upload"}</Button>
              </div>
            </div>

            {lastImport && (
              <div className="mt-3 p-2.5 rounded-md bg-[var(--atelier-highlight)]/10 border border-[var(--atelier-highlight)]/20 text-xs">
                <strong><LocaleBadge locale={lastImport.locale} /></strong> ({lastImport.mode}): {summarizeImport(lastImport)}
              </div>
            )}
          </section>
        </div>
      </div>
    </PublicShell>
  );
}
