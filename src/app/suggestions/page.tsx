"use client";

import { sileo } from "sileo";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/atelier/app-shell";
import { EmptyStateCard } from "@/components/atelier/empty-state-card";
import { ErrorStateCard } from "@/components/atelier/error-state-card";
import { FilterToolbar } from "@/components/atelier/filter-toolbar";
import { Input } from "@/components/ui/input";
import { LockedStateCard } from "@/components/atelier/locked-state-card";
import { PaginationControls } from "@/components/atelier/pagination-controls";
import { SectionHeading } from "@/components/atelier/section-heading";
import { StatusPill } from "@/components/atelier/status-pill";
import { SuggestionDrawer } from "@/components/atelier/suggestion-drawer";
import { ApiError, apiJson, getErrorMessage } from "@/lib/api";
import { useSession } from "@/lib/use-session";

type Suggestion = {
  id: string;
  locale: string;
  text: string;
  author_discord_id: string;
  author_name: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  project_slug: string;
  decision_note: string | null;
  decided_at: string | null;
  decided_by_discord_id: string | null;
  source_string: {
    id: string;
    key: string;
    source_text: string;
    context: string | null;
    placeholder_sig: string;
  };
};

export default function SuggestionsPage() {
  const { user, loading } = useSession();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("pending");
  const [locale, setLocale] = useState("");
  const [project, setProject] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Suggestion | null>(null);

  useEffect(() => {
    if (!user) return;

    let alive = true;
    async function loadSuggestions() {
      setBusy(true);
      setError(null);
      const params = new URLSearchParams({
        mine: "1",
        status,
        page: String(page),
        limit: "20",
      });
      if (locale.trim()) params.set("locale", locale.trim().toLowerCase());
      if (project.trim()) params.set("project", project.trim());

      try {
        const data = await apiJson<{ suggestions: Suggestion[]; total: number; page: number }>(
          `/api/suggestions?${params.toString()}`,
        );
        if (!alive) return;
        setSuggestions(data.suggestions ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? 0);
        setLimit(20);
      } catch (loadError) {
        if (!alive) return;
        if (loadError instanceof ApiError && loadError.status === 401) {
          setSuggestions([]);
        } else {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (alive) setBusy(false);
      }
    }

    void loadSuggestions();
    return () => {
      alive = false;
    };
  }, [limit, locale, page, project, status, user]);

  return (
    <AppShell currentHref="/suggestions">
      <SectionHeading
        eyebrow="Contributor history"
        title="My suggestions"
        description="Track pending drafts, accepted translations, and rejection notes without leaving the atelier."
      />

      {loading ? (
        <div className="atelier-card h-40 animate-pulse" />
      ) : !user ? (
        <LockedStateCard description="Sign in with Discord to review, edit, or withdraw your own suggestions." />
      ) : (
        <>
          <FilterToolbar>
            <label className="block min-w-[150px]">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                Status
              </span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(0);
                }}
                className="atelier-ring h-9 w-full rounded-md border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] px-3 text-sm"
              >
                <option value="pending">pending</option>
                <option value="accepted">accepted</option>
                <option value="rejected">rejected</option>
                <option value="all">all</option>
              </select>
            </label>
            <label className="block min-w-[140px]">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                Locale
              </span>
              <Input
                value={locale}
                onChange={(event) => {
                  setLocale(event.target.value);
                  setPage(0);
                }}
                placeholder="fr_fr"
              />
            </label>
            <label className="block min-w-[180px] flex-1">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                Project
              </span>
              <Input
                value={project}
                onChange={(event) => {
                  setProject(event.target.value);
                  setPage(0);
                }}
                placeholder="demo-mod"
              />
            </label>
          </FilterToolbar>

          {busy ? (
            <div className="grid gap-4">
              <div className="atelier-card h-40 animate-pulse" />
              <div className="atelier-card h-40 animate-pulse" />
            </div>
          ) : error ? (
            <ErrorStateCard description={error} />
          ) : suggestions.length === 0 ? (
            <EmptyStateCard
              title="No suggestions in this slice"
              description="Try another status or filter combination."
            />
          ) : (
            <div className="grid gap-4">
              {suggestions.map((suggestion) => (
                <article key={suggestion.id} className="atelier-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="font-mono text-sm text-[var(--atelier-highlight)]">
                        {suggestion.source_string.key}
                      </div>
                      <h3 className="mt-2 text-base font-semibold">
                        {suggestion.source_string.source_text}
                      </h3>
                      {suggestion.source_string.context ? (
                        <p className="mt-2 text-sm text-[var(--atelier-muted)]">
                          context: {suggestion.source_string.context}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill
                        variant={
                          suggestion.status === "rejected"
                            ? "rejected"
                            : suggestion.status === "accepted"
                              ? "approved"
                              : "pending"
                        }
                      >
                        {suggestion.status}
                      </StatusPill>
                      {suggestion.status === "pending" ? (
                        <button
                          type="button"
                          onClick={() => setEditing(suggestion)}
                          className="atelier-ring rounded-lg border border-[var(--atelier-border)] px-3 py-1.5 text-sm"
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
                    <div className="rounded-2xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] p-4 text-sm">
                      {suggestion.text}
                    </div>
                    <div className="rounded-2xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] p-4 text-sm text-[var(--atelier-muted)]">
                      <div>locale: {suggestion.locale}</div>
                      <div className="mt-1">project: {suggestion.project_slug}</div>
                      <div className="mt-1">
                        submitted: {new Date(suggestion.created_at).toLocaleString()}
                      </div>
                      {suggestion.decision_note ? (
                        <div className="mt-3 text-[var(--atelier-text)]">
                          decision: {suggestion.decision_note}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
              <PaginationControls page={page} limit={limit} total={total} onPageChange={setPage} />
            </div>
          )}

          <SuggestionDrawer
            open={Boolean(editing)}
            title="Edit pending suggestion"
            description={
              editing
                ? `${editing.project_slug} / ${editing.source_string.key}`
                : undefined
            }
            initialLocale={editing?.locale ?? ""}
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
                description: editing.source_string.key,
              });
              setSuggestions((current) =>
                current.map((item) =>
                  item.id === editing.id ? { ...item, locale: nextLocale, text } : item,
                ),
              );
            }}
            onWithdraw={
              editing
                ? async () => {
                    await apiJson(`/api/suggestions/${editing.id}`, { method: "DELETE" });
                    sileo.success({
                      title: "Suggestion withdrawn",
                      description: editing.source_string.key,
                    });
                    setSuggestions((current) => current.filter((item) => item.id !== editing.id));
                  }
                : undefined
            }
          />
        </>
      )}
    </AppShell>
  );
}
