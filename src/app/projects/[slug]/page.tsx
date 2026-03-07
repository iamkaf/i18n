"use client";

import Link from "next/link";
import { sileo } from "sileo";
import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PublicShell } from "@/components/atelier/public-shell";
import { EmptyStateCard } from "@/components/atelier/empty-state-card";
import { ErrorStateCard } from "@/components/atelier/error-state-card";
import { Input } from "@/components/ui/input";
import { LocaleBadge } from "@/components/atelier/locale-badge";
import { LocalePicker } from "@/components/atelier/locale-picker";
import { LockedStateCard } from "@/components/atelier/locked-state-card";
import { Spinner } from "@/components/atelier/spinner";
import { SuggestionDrawer } from "@/components/atelier/suggestion-drawer";
import { Button } from "@/components/ui/button";
import { ApiError, apiJson, getErrorMessage } from "@/lib/api";
import { isSupportedLocaleCode, normalizeLocaleCode } from "@/lib/locales";
import { useSession } from "@/lib/use-session";
import { cn } from "@/lib/utils";
import { Settings, ExternalLink, ChevronDown, Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

type ProgressItem = {
  locale: string;
  approved_count: number;
  total_strings: number;
  coverage: number;
};

type MySuggestion = {
  id: string;
  locale: string;
  text: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

type StringItem = {
  id: string;
  string_key: string;
  source_text: string;
  context: string | null;
  approved_translation: string | null;
  my_suggestion: MySuggestion | null;
};

type StringsResponse = {
  page: number;
  limit: number;
  total: number;
  locale: string;
  strings: StringItem[];
};

/* ------------------------------------------------------------------ */
/*  Status dot helper                                                  */
/* ------------------------------------------------------------------ */

function StatusDot({ item }: { item: StringItem }) {
  if (item.my_suggestion?.status === "pending") {
    // Half-filled: has draft
    return <span className="w-2 h-2 rounded-full border-2 border-amber-500 bg-amber-500/30 shrink-0" title="You have a pending draft" />;
  }
  if (item.approved_translation) {
    // Filled: approved translation exists
    return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Has approved translation" />;
  }
  // Empty: untranslated
  return <span className="w-2 h-2 rounded-full border-2 border-[var(--atelier-border)] shrink-0" title="Untranslated" />;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProjectPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const { user, god } = useSession();

  /* Project state */
  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Filters */
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const deferredQuery = useDeferredValue(query);
  const [locale, setLocale] = useState(() => {
    const initial = normalizeLocaleCode(searchParams.get("locale") || "en_us");
    return isSupportedLocaleCode(initial) ? initial : "en_us";
  });

  /* Strings — infinite scroll */
  const [strings, setStrings] = useState<StringItem[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loadingStrings, setLoadingStrings] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasMore = strings.length < total;

  /* Progress */
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [showProgress, setShowProgress] = useState(false);

  /* Selection + editor */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerText, setComposerText] = useState("");
  const [composerError, setComposerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<MySuggestion | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedString = strings.find((s) => s.id === selectedId) ?? null;
  const listRef = useRef<HTMLDivElement>(null);

  /* Active locale progress */
  const activeProgress = progress.find((p) => p.locale === locale);
  const coveragePct = activeProgress ? Math.round(activeProgress.coverage * 100) : 0;

  /* ---- Load project ---- */
  useEffect(() => {
    let alive = true;
    async function load() {
      setLoadingProject(true);
      setLocked(false);
      setError(null);
      try {
        const data = await apiJson<{ project: Project }>(`/api/projects/${slug}`);
        if (alive) setProject(data.project);
      } catch (e) {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 401) { setLocked(true); setProject(null); }
        else if (e instanceof ApiError && e.status === 404) { setError("Project not found."); setProject(null); }
        else setError(getErrorMessage(e));
      } finally {
        if (alive) setLoadingProject(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [slug, refreshKey]);

  /* ---- Load strings (reset on filter change) ---- */
  useEffect(() => {
    if (!project?.has_source_catalog) { setStrings([]); setProgress([]); return; }
    let alive = true;
    async function load() {
      setLoadingStrings(true);
      setPage(0);
      const normalizedLocale = normalizeLocaleCode(locale);
      if (!isSupportedLocaleCode(normalizedLocale)) { setLoadingStrings(false); return; }
      const p = new URLSearchParams({ locale: normalizedLocale, page: "0", limit: "50", include_mine: "1" });
      if (deferredQuery.trim()) p.set("q", deferredQuery.trim());
      try {
        const [prog, str] = await Promise.all([
          apiJson<{ progress: ProgressItem[]; total_strings: number }>(`/api/projects/${slug}/progress`),
          apiJson<StringsResponse>(`/api/projects/${slug}/strings?${p.toString()}`),
        ]);
        if (!alive) return;
        const totalStrings = prog.total_strings ?? 0;
        const nextProgress = prog.progress ?? [];
        const hasActive = nextProgress.some((i) => i.locale === str.locale);
        setProgress(hasActive ? nextProgress : [...nextProgress, { locale: str.locale, approved_count: str.locale === "en_us" ? totalStrings : 0, total_strings: totalStrings, coverage: str.locale === "en_us" && totalStrings > 0 ? 1 : 0 }]);
        setStrings(str.strings ?? []);
        setTotal(str.total);
        setPage(0);
      } catch (e) {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 401) { setLocked(true); setStrings([]); }
        else setError(getErrorMessage(e));
      } finally {
        if (alive) setLoadingStrings(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [deferredQuery, locale, project?.has_source_catalog, refreshKey, slug]);

  /* ---- Load more (append) ---- */
  const loadMore = useCallback(async () => {
    if (!project?.has_source_catalog || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const normalizedLocale = normalizeLocaleCode(locale);
    const p = new URLSearchParams({ locale: normalizedLocale, page: String(nextPage), limit: "50", include_mine: "1" });
    if (deferredQuery.trim()) p.set("q", deferredQuery.trim());
    try {
      const str = await apiJson<StringsResponse>(`/api/projects/${slug}/strings?${p.toString()}`);
      setStrings((prev) => [...prev, ...(str.strings ?? [])]);
      setTotal(str.total);
      setPage(nextPage);
    } catch {
      /* silently fail */
    } finally {
      setLoadingMore(false);
    }
  }, [deferredQuery, hasMore, loadingMore, locale, page, project?.has_source_catalog, slug]);

  /* ---- Sync composer text when selection changes ---- */
  useEffect(() => {
    if (selectedString) {
      setComposerText(selectedString.my_suggestion?.text ?? "");
      setComposerError(null);
    }
  }, [selectedString]);

  function refresh() { setRefreshKey((v) => v + 1); }

  /* ---- Submit suggestion ---- */
  async function handleSubmit() {
    if (!selectedString) return;
    const nextLocale = normalizeLocaleCode(locale);
    const text = composerText.trim();
    if (nextLocale === "en_us") { setComposerError("Pick a translation locale."); return; }
    if (!isSupportedLocaleCode(nextLocale)) { setComposerError("Invalid locale."); return; }
    if (!text) { setComposerError("Translation text is required."); return; }
    setSubmitting(true);
    setComposerError(null);
    try {
      await apiJson<{ ok: true; id: string }>("/api/suggestions", { method: "POST", body: JSON.stringify({ source_string_id: selectedString.id, locale: nextLocale, text }) });
      sileo.success({ title: "Submitted", description: selectedString.string_key });
      // Optimistic update — patch the local string to show the pending draft
      setStrings((prev) =>
        prev.map((s) =>
          s.id === selectedString.id
            ? { ...s, my_suggestion: { id: crypto.randomUUID(), locale: nextLocale, text, status: "pending" as const, created_at: new Date().toISOString() } }
            : s
        )
      );
      setComposerText("");
    } catch (e) {
      const msg = getErrorMessage(e);
      setComposerError(msg);
      sileo.error({ title: "Failed", description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  /* ================================================================== */
  /*  RENDER                                                             */
  /* ================================================================== */

  return (
    <PublicShell>
      <div className="max-w-6xl mx-auto w-full px-6 md:px-10 py-8">

        {/* ─── Loading / Error / Locked ─── */}
        {loadingProject ? <Spinner /> : locked ? (
          <LockedStateCard description="Private project. Sign in with Discord to access." />
        ) : error ? (
          <ErrorStateCard title={error === "Project not found." ? "Not found" : "Error"} description={error} />
        ) : project ? (
          <>
            {/* ═══════════════════════════════════════════════ */}
            {/*  HEADER BAR                                     */}
            {/* ═══════════════════════════════════════════════ */}
            <header className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden border border-[var(--atelier-border)]">
                {project.icon_url ? (
                  <img src={project.icon_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[var(--atelier-highlight)] to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                    {project.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-[var(--atelier-text)] truncate">{project.name}</h1>
                <p className="text-xs text-[var(--atelier-muted)] font-mono truncate">{project.slug} · {project.source_string_count.toLocaleString()} strings</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {project.modrinth_slug && (
                  <a href={`https://modrinth.com/mod/${project.modrinth_slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[var(--atelier-muted)] hover:text-[var(--atelier-highlight)] transition-colors" title="View on Modrinth">
                    <ExternalLink className="w-3 h-3" /> Modrinth
                  </a>
                )}
                {project.github_repo_url && (
                  <a href={project.github_repo_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[var(--atelier-muted)] hover:text-[var(--atelier-highlight)] transition-colors" title="View on GitHub">
                    <ExternalLink className="w-3 h-3" /> GitHub
                  </a>
                )}
                {god && (
                  <Link href={`/projects/${project.slug}/admin`} className="flex items-center gap-1 text-xs text-[var(--atelier-muted)] hover:text-[var(--atelier-text)] transition-colors ml-2" title="Admin">
                    <Settings className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </header>

            {/* ═══════════════════════════════════════════════ */}
            {/*  NO SOURCE CATALOG                              */}
            {/* ═══════════════════════════════════════════════ */}
            {!project.has_source_catalog ? (
              <EmptyStateCard title="No source catalog" description="A god user needs to import en_us first." />
            ) : (
              <>
                {/* ─── Toolbar ─── */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <LocalePicker
                    value={locale}
                    onChange={(v) => { setLocale(v); setSelectedId(null); }}
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search strings…"
                    className="flex-1 max-w-xs"
                  />
                  {activeProgress && (
                    <div className="flex items-center gap-2 ml-auto text-xs text-[var(--atelier-muted)]">
                      <div className="w-20 h-1.5 rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--atelier-highlight)] transition-all" style={{ width: `${coveragePct}%` }} />
                      </div>
                      <span>{coveragePct}%</span>
                      <button type="button" onClick={() => setShowProgress(!showProgress)} className="hover:text-[var(--atelier-text)] transition-colors">
                        <ChevronDown className={cn("w-3 h-3 transition-transform", showProgress && "rotate-180")} />
                      </button>
                    </div>
                  )}
                </div>

                {/* ─── Expandable locale progress ─── */}
                {showProgress && progress.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {progress.map((p) => (
                      <button key={p.locale} type="button"
                        onClick={() => { setLocale(normalizeLocaleCode(p.locale)); setSelectedId(null); }}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-colors",
                          p.locale === locale
                            ? "border-[var(--atelier-highlight)] bg-[var(--atelier-highlight)]/10 text-[var(--atelier-text)]"
                            : "border-[var(--atelier-border)] bg-[var(--atelier-surface)] text-[var(--atelier-muted)] hover:bg-[var(--atelier-surface-soft)]"
                        )}
                      >
                        <LocaleBadge locale={p.locale} />
                        <span className="font-medium">{Math.round(p.coverage * 100)}%</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* ═══════════════════════════════════════════════ */}
                {/*  TWO-COLUMN LAYOUT                              */}
                {/* ═══════════════════════════════════════════════ */}
                {loadingStrings ? <Spinner /> : (
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,1.1fr)] gap-4 items-start">
                    {/* ──────── LEFT: String list ──────── */}
                    <div ref={listRef} className="bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] overflow-hidden max-h-[calc(100vh-14rem)] overflow-y-auto">
                      {strings.length === 0 ? (
                        <div className="py-16 text-center text-sm text-[var(--atelier-muted)]">No strings match.</div>
                      ) : (
                        <>
                          {strings.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedId(s.id)}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-[var(--atelier-border)] last:border-0 transition-colors text-sm",
                                selectedId === s.id
                                  ? "bg-[var(--atelier-highlight)]/8"
                                  : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                              )}
                            >
                              <StatusDot item={s} />
                              <span className="font-mono text-[11px] text-[var(--atelier-highlight)] w-[10rem] truncate shrink-0">{s.string_key}</span>
                              <span className="text-[var(--atelier-text)] truncate flex-1">{s.source_text}</span>
                            </button>
                          ))}

                          {/* Load more */}
                          {hasMore && (
                            <div className="p-3 text-center border-t border-[var(--atelier-border)]">
                              <button
                                type="button"
                                onClick={() => void loadMore()}
                                disabled={loadingMore}
                                className="text-xs font-medium text-[var(--atelier-highlight)] hover:underline disabled:opacity-50 inline-flex items-center gap-1.5"
                              >
                                {loadingMore ? <><Loader2 className="w-3 h-3 animate-spin" /> Loading…</> : `Load more (${strings.length} of ${total})`}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* ──────── RIGHT: Editing panel ──────── */}
                    <div className="bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] p-5 lg:sticky lg:top-24 max-h-[calc(100vh-14rem)] overflow-y-auto">
                      {!selectedString ? (
                        /* Empty state */
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="text-sm text-[var(--atelier-muted)]">
                            {strings.length === 0 ? "No strings to display." : "Select a string to start translating."}
                          </div>
                        </div>
                      ) : (
                        /* Selected string */
                        <div className="space-y-5">
                          {/* Key */}
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-[var(--atelier-muted)] mb-1">Key</div>
                            <div className="font-mono text-sm text-[var(--atelier-highlight)] break-all">{selectedString.string_key}</div>
                          </div>

                          {/* Source text */}
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-[var(--atelier-muted)] mb-1">Source (en_us)</div>
                            <p className="text-sm text-[var(--atelier-text)] leading-relaxed">{selectedString.source_text}</p>
                          </div>

                          {/* Context */}
                          {selectedString.context && (
                            <div>
                              <div className="text-[11px] uppercase tracking-wider text-[var(--atelier-muted)] mb-1">Context</div>
                              <p className="text-xs text-[var(--atelier-muted)] leading-relaxed">{selectedString.context}</p>
                            </div>
                          )}

                          {/* Approved translation */}
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-[var(--atelier-muted)] mb-1">
                              Approved translation <span className="normal-case">({locale})</span>
                            </div>
                            {selectedString.approved_translation ? (
                              <p className="text-sm text-[var(--atelier-text)] leading-relaxed bg-emerald-500/5 border border-emerald-500/15 rounded-md px-3 py-2">{selectedString.approved_translation}</p>
                            ) : (
                              <p className="text-xs text-[var(--atelier-muted)] italic">No approved translation yet.</p>
                            )}
                          </div>

                          {/* Divider */}
                          <div className="border-t border-[var(--atelier-border)]" />

                          {/* Composer / auth states */}
                          {!user ? (
                            <p className="text-sm text-[var(--atelier-muted)]">
                              <a href="/api/auth/discord" className="text-[var(--atelier-highlight)] hover:underline font-medium">Sign in with Discord</a> to contribute translations.
                            </p>
                          ) : locale === "en_us" ? (
                            <p className="text-xs text-[var(--atelier-muted)]">Source locale is read-only. Pick a translation locale above.</p>
                          ) : selectedString.my_suggestion?.status === "pending" ? (
                            <div>
                              <div className="text-[11px] uppercase tracking-wider text-[var(--atelier-muted)] mb-1">Your pending draft</div>
                              <div className="bg-amber-500/5 border border-amber-500/15 rounded-md px-3 py-2 text-sm text-[var(--atelier-text)] mb-3">
                                {selectedString.my_suggestion.text}
                              </div>
                              <Button size="sm" variant="outline" onClick={() => setEditing(selectedString.my_suggestion)}>Edit draft</Button>
                            </div>
                          ) : (
                            <div>
                              <div className="text-[11px] uppercase tracking-wider text-[var(--atelier-muted)] mb-1.5">Your suggestion</div>
                              <textarea
                                value={composerText}
                                onChange={(e) => setComposerText(e.target.value)}
                                rows={4}
                                className="atelier-ring w-full rounded-md border border-[var(--atelier-border)] bg-[var(--atelier-bg)] px-3 py-2 text-sm outline-none resize-none"
                                placeholder={`Translation for ${locale}…`}
                              />
                              {composerError && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{composerError}</p>}
                              <div className="mt-2 flex justify-end">
                                <Button size="sm" onClick={() => void handleSubmit()} disabled={submitting}>
                                  {submitting ? "Submitting…" : "Submit suggestion"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Edit drawer */}
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
                    await apiJson(`/api/suggestions/${editing.id}`, { method: "PATCH", body: JSON.stringify({ locale: nextLocale, text }) });
                    sileo.success({ title: "Updated", description: selectedString?.string_key });
                    refresh();
                  }}
                  onWithdraw={editing ? async () => {
                    await apiJson(`/api/suggestions/${editing.id}`, { method: "DELETE" });
                    sileo.success({ title: "Withdrawn", description: selectedString?.string_key });
                    refresh();
                  } : undefined}
                />
              </>
            )}
          </>
        ) : null}
      </div>
    </PublicShell>
  );
}
