"use client";

import { sileo } from "sileo";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/atelier/app-shell";
import { EmptyStateCard } from "@/components/atelier/empty-state-card";
import { ErrorStateCard } from "@/components/atelier/error-state-card";
import { FilterToolbar } from "@/components/atelier/filter-toolbar";
import { Input } from "@/components/ui/input";
import { LocaleBadge } from "@/components/atelier/locale-badge";
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
            <div className="bg-[var(--atelier-surface)] rounded-2xl border border-[var(--atelier-border)] overflow-hidden shadow-sm backdrop-blur-xl animate-pulse">
               {Array.from({ length: 4 }, (_, i) => (
                 <div key={i} className="p-4 border-b border-[var(--atelier-border)] last:border-0 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                       <div className="h-4 w-24 bg-black/5 dark:bg-white/5 rounded" />
                       <div className="h-6 w-16 bg-black/5 dark:bg-white/5 rounded-full" />
                    </div>
                    <div className="h-5 w-3/4 bg-black/5 dark:bg-white/5 rounded" />
                    <div className="h-10 w-full bg-black/5 dark:bg-white/5 rounded-xl" />
                 </div>
               ))}
            </div>
          ) : error ? (
            <ErrorStateCard description={error} />
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-[var(--atelier-surface)] border border-[var(--atelier-border)] flex items-center justify-center text-[var(--atelier-muted)] opacity-50">
                 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                 </svg>
              </div>
              <h3 className="text-lg font-medium text-[var(--atelier-text)] mb-2">No suggestions in this slice</h3>
              <p className="text-[15px] text-[var(--atelier-muted)] max-w-sm">Try another status or filter combination.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="bg-[var(--atelier-surface)] rounded-2xl border border-[var(--atelier-border)] overflow-hidden shadow-sm backdrop-blur-xl">
                 {suggestions.map((suggestion) => (
                   <article key={suggestion.id} className="p-5 border-b border-[var(--atelier-border)] last:border-0 relative">
                     <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                       <div className="flex-1">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--atelier-highlight)] bg-[var(--atelier-highlight)]/10 px-2 py-0.5 rounded-md">
                              {suggestion.source_string.key}
                            </span>
                            <span className="text-[12px] text-[var(--atelier-muted)]">
                              <LocaleBadge locale={suggestion.locale} /> • {suggestion.project_slug}
                            </span>
                         </div>
                         <h3 className="text-[16px] font-medium text-[var(--atelier-text)] leading-snug">
                           {suggestion.source_string.source_text}
                         </h3>
                         {suggestion.source_string.context ? (
                           <p className="mt-1 text-[13px] text-[var(--atelier-muted)]">
                             {suggestion.source_string.context}
                           </p>
                         ) : null}
                       </div>
                       <div className="flex flex-col items-end gap-2 shrink-0">
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
                             className="text-[13px] font-medium text-[var(--atelier-highlight)] hover:underline"
                           >
                             Edit
                           </button>
                         ) : (
                           <span className="text-[11px] text-[var(--atelier-muted)] uppercase tracking-wider">
                             {new Date(suggestion.created_at).toLocaleDateString()}
                           </span>
                         )}
                       </div>
                     </div>
                     
                     <div className="bg-[var(--atelier-surface-soft)]/50 rounded-xl p-3 border border-[var(--atelier-border)]/50">
                        <div className="flex gap-3 items-start">
                           <div className="w-1.5 h-1.5 rounded-full bg-[var(--atelier-highlight)] mt-2 shrink-0 opacity-50" />
                           <div className="text-[15px] text-[var(--atelier-text)] leading-relaxed">
                             {suggestion.text}
                           </div>
                        </div>
                        {suggestion.decision_note ? (
                          <div className="mt-3 pt-3 border-t border-[var(--atelier-border)]/50 flex gap-2 text-[13px]">
                             <strong className="text-[var(--atelier-text)] font-medium">Note:</strong>
                             <span className="text-[var(--atelier-muted)]">{suggestion.decision_note}</span>
                          </div>
                        ) : null}
                     </div>
                   </article>
                 ))}
              </div>
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
