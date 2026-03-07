"use client";

import Link from "next/link";
import { sileo } from "sileo";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/atelier/app-shell";
import { EmptyStateCard } from "@/components/atelier/empty-state-card";
import { ErrorStateCard } from "@/components/atelier/error-state-card";
import { FilterToolbar } from "@/components/atelier/filter-toolbar";
import { Input } from "@/components/ui/input";
import { LockedStateCard } from "@/components/atelier/locked-state-card";
import { LocaleProgressStrip } from "@/components/atelier/locale-progress-strip";
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
  modrinth_slug: string | null;
  updated_at: string;
};

type ProgressItem = {
  locale: string;
  approved_count: number;
  total_strings: number;
  coverage: number;
};

type StringsResponse = {
  page: number;
  limit: number;
  total: number;
  locale: string;
  strings: StringRowCardItem[];
};

export default function TargetWorkbenchPage() {
  const params = useParams<{ slug: string; target: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const target = params.target;
  const { user } = useSession();

  const [project, setProject] = useState<Project | null>(null);
  const [locale, setLocale] = useState(searchParams.get("locale")?.toLowerCase() || "");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const deferredQuery = useDeferredValue(query);
  const [page, setPage] = useState(Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0));
  const [strings, setStrings] = useState<StringRowCardItem[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(25);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingStrings, setLoadingStrings] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerText, setComposerText] = useState("");
  const [composerError, setComposerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<StringRowCardItem["my_suggestion"] | null>(null);

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
        setLocale((current) => current || data.project.default_locale);
      } catch (loadError) {
        if (!alive) return;
        if (loadError instanceof ApiError && loadError.status === 401) {
          setLocked(true);
          setProject(null);
        } else if (loadError instanceof ApiError && loadError.status === 404) {
          setError("Project or target not found.");
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
  }, [slug]);

  useEffect(() => {
    if (!project || !locale) return;

    let alive = true;
    async function loadTargetData() {
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
          apiJson<{ progress: ProgressItem[]; total_strings: number }>(
            `/api/projects/${slug}/${target}/progress`,
          ),
          apiJson<StringsResponse>(`/api/projects/${slug}/${target}/strings?${params.toString()}`),
        ]);

        if (!alive) return;
        const nextStrings = stringsData.strings ?? [];
        setStrings(nextStrings);
        setPage(stringsData.page);
        setLimit(stringsData.limit);
        setTotal(stringsData.total);

        const hasActiveLocale = progressData.progress.some(
          (item) => item.locale === stringsData.locale,
        );
        setProgress(
          hasActiveLocale
            ? progressData.progress
            : [
                ...progressData.progress,
                {
                  locale: stringsData.locale,
                  approved_count: 0,
                  total_strings: progressData.total_strings,
                  coverage: 0,
                },
              ],
        );

        setSelectedId((current) => {
          if (current && nextStrings.some((item) => item.id === current)) return current;
          return nextStrings[0]?.id ?? null;
        });
      } catch (loadError) {
        if (!alive) return;
        if (loadError instanceof ApiError && loadError.status === 401) {
          setLocked(true);
          setStrings([]);
        } else if (loadError instanceof ApiError && loadError.status === 404) {
          setError("Project or target not found.");
          setStrings([]);
        } else {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (alive) setLoadingStrings(false);
      }
    }

    void loadTargetData();
    return () => {
      alive = false;
    };
  }, [deferredQuery, locale, page, project, refreshKey, slug, target]);

  const selectedString = useMemo(
    () => strings.find((item) => item.id === selectedId) ?? strings[0] ?? null,
    [selectedId, strings],
  );

  useEffect(() => {
    if (selectedString) {
      setComposerText(selectedString.my_suggestion?.text ?? "");
      setComposerError(null);
    }
  }, [selectedString]);

  async function refreshStrings() {
    setRefreshKey((value) => value + 1);
  }

  async function handleSubmitSuggestion() {
    if (!selectedString) return;
    const nextLocale = locale.trim().toLowerCase();
    const nextText = composerText.trim();

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
      setComposerText("");
      await refreshStrings();
    } catch (submitError) {
      const message = getErrorMessage(submitError);
      setComposerError(message);
      sileo.error({ title: "Could not submit suggestion", description: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell currentHref="/projects">
      <SectionHeading
        eyebrow="Target workbench"
        title={project ? `${project.name} / ${target}` : `${slug} / ${target}`}
        description="Browse strings, inspect approved text for the active locale, and draft contributor suggestions."
      />

      {loadingProject ? (
        <section className="grid gap-4">
          <div className="atelier-card h-24 animate-pulse" />
          <div className="atelier-card h-80 animate-pulse" />
        </section>
      ) : locked ? (
        <LockedStateCard description="This target belongs to a private project. Sign in with Discord to browse strings and draft suggestions." />
      ) : error ? (
        <ErrorStateCard
          title={error === "Project or target not found." ? "Not found" : "Unable to load target"}
          description={error}
        />
      ) : project ? (
        <>
          <section className="atelier-card mb-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm text-[var(--atelier-muted)]">
                  <Link href="/projects" className="text-[var(--atelier-highlight)]">
                    Projects
                  </Link>{" "}
                  /{" "}
                  <Link
                    href={`/projects/${project.slug}`}
                    className="text-[var(--atelier-highlight)]"
                  >
                    {project.slug}
                  </Link>{" "}
                  / {target}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusPill variant={project.visibility === "public" ? "public" : "private"}>
                    {project.visibility}
                  </StatusPill>
                  <span className="rounded-full bg-[#f3f4ff] px-2.5 py-1 text-xs text-[#4d4d6a] dark:bg-white/10 dark:text-white/70">
                    default: {project.default_locale}
                  </span>
                  <span className="rounded-full bg-[#f3f4ff] px-2.5 py-1 text-xs text-[#4d4d6a] dark:bg-white/10 dark:text-white/70">
                    active locale: {locale}
                  </span>
                </div>
              </div>
              <div className="text-sm text-[var(--atelier-muted)]">
                updated: {new Date(project.updated_at).toLocaleString()}
              </div>
            </div>
          </section>

          <FilterToolbar sticky>
            <label className="block min-w-[180px] flex-1">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                Locale
              </span>
              <Input
                value={locale}
                onChange={(event) => setLocale(event.target.value.toLowerCase())}
                placeholder="fr_fr"
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

          <section className="mb-6">
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
                  description="Try another locale, clear the search term, or move to a different target."
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
                  <PaginationControls
                    page={page}
                    limit={limit}
                    total={total}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>

            <aside className="atelier-card h-fit p-5 xl:sticky xl:top-32">
              {!user ? (
                <LockedStateCard
                  title="Contributor tools are sign-in only"
                  description="Browse the source strings freely here, then sign in with Discord before drafting or revising a suggestion."
                />
              ) : !selectedString ? (
                <EmptyStateCard
                  title="Choose a string"
                  description="Select a row from the left column to draft or revise a suggestion."
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
                    <Button
                      variant="outline"
                      onClick={() => setEditing(selectedString.my_suggestion)}
                    >
                      Edit draft
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <div className="font-mono text-sm text-[var(--atelier-highlight)]">
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
                        placeholder="fr_fr"
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
                    {composerError ? (
                      <p className="text-sm text-rose-600 dark:text-rose-300">{composerError}</p>
                    ) : null}
                    <Button onClick={() => void handleSubmitSuggestion()} disabled={submitting}>
                      {submitting ? "Submitting..." : "Submit suggestion"}
                    </Button>
                  </div>
                </div>
              )}
            </aside>
          </section>

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
              sileo.success({
                title: "Suggestion updated",
                description: selectedString?.string_key,
              });
              await refreshStrings();
            }}
            onWithdraw={
              editing
                ? async () => {
                    await apiJson(`/api/suggestions/${editing.id}`, { method: "DELETE" });
                    sileo.success({
                      title: "Suggestion withdrawn",
                      description: selectedString?.string_key,
                    });
                    await refreshStrings();
                  }
                : undefined
            }
          />
        </>
      ) : null}
    </AppShell>
  );
}
