"use client";

import { sileo } from "sileo";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/atelier/app-shell";
import { EmptyStateCard } from "@/components/atelier/empty-state-card";
import { ErrorStateCard } from "@/components/atelier/error-state-card";
import { FilterToolbar } from "@/components/atelier/filter-toolbar";
import { Input } from "@/components/ui/input";
import { LockedStateCard } from "@/components/atelier/locked-state-card";
import { ModerationDecisionDrawer } from "@/components/atelier/moderation-decision-drawer";
import { PaginationControls } from "@/components/atelier/pagination-controls";
import { SectionHeading } from "@/components/atelier/section-heading";
import { StatusPill } from "@/components/atelier/status-pill";
import { Button } from "@/components/ui/button";
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
  source_string: {
    id: string;
    key: string;
    source_text: string;
    context: string | null;
    placeholder_sig: string;
  };
};

export default function ModerationPage() {
  const { user, trusted, loading } = useSession();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("pending");
  const [locale, setLocale] = useState("");
  const [project, setProject] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<{
    mode: "approve" | "reject";
    suggestion: Suggestion;
  } | null>(null);

  useEffect(() => {
    if (!user || !trusted) return;

    let alive = true;
    async function loadSuggestions() {
      setBusy(true);
      setError(null);
      const params = new URLSearchParams({
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
        if (loadError instanceof ApiError && loadError.status === 403) {
          setError("Moderator access is required.");
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
  }, [limit, locale, page, project, status, trusted, user]);

  return (
    <AppShell currentHref="/moderation">
      <SectionHeading
        eyebrow="Moderator queue"
        title="Moderation"
        description="Review pending suggestions, add decision notes, and keep the exportable translations clean."
      />

      {loading ? (
        <div className="atelier-card h-40 animate-pulse" />
      ) : !user ? (
        <LockedStateCard description="Sign in with Discord before opening the moderation workbench." />
      ) : !trusted ? (
        <ErrorStateCard
          title="Moderator access required"
          description="This queue is only available to trusted translators."
        />
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
                       <div className="h-6 w-32 bg-black/5 dark:bg-white/5 rounded-full" />
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
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                 </svg>
              </div>
              <h3 className="text-lg font-medium text-[var(--atelier-text)] mb-2">Queue is empty</h3>
              <p className="text-[15px] text-[var(--atelier-muted)] max-w-sm">No suggestions match the current filters.</p>
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
                           <span className="text-[12px] text-[var(--atelier-muted)] flex items-center gap-1.5">
                             <span>{suggestion.locale}</span>
                             <span>•</span>
                             <span>{suggestion.project_slug}</span>
                             <span>•</span>
                             <span className="font-medium text-[var(--atelier-text)]">
                               {suggestion.author_name || suggestion.author_discord_id}
                             </span>
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
                          <div className="flex items-center gap-1.5 mt-1">
                            <button
                              type="button"
                              className="text-[13px] font-medium px-3 py-1 rounded-md bg-[var(--atelier-bg)] border border-[var(--atelier-border)] text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                              onClick={() => setDecision({ mode: "approve", suggestion })}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="text-[13px] font-medium px-3 py-1 rounded-md bg-[var(--atelier-bg)] border border-[var(--atelier-border)] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              onClick={() => setDecision({ mode: "reject", suggestion })}
                            >
                              Reject
                            </button>
                          </div>
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

          <ModerationDecisionDrawer
            open={Boolean(decision)}
            mode={decision?.mode ?? "approve"}
            sourceKey={decision?.suggestion.source_string.key ?? ""}
            onClose={() => setDecision(null)}
            onSubmit={async (decisionNote) => {
              if (!decision) return;
              const endpoint =
                decision.mode === "approve"
                  ? `/api/suggestions/${decision.suggestion.id}/approve`
                  : `/api/suggestions/${decision.suggestion.id}/reject`;
              await apiJson(endpoint, {
                method: "POST",
                body: JSON.stringify(
                  decision.mode === "approve"
                    ? { decision_note: decisionNote || undefined }
                    : { decision_note: decisionNote },
                ),
              });
              sileo.success({
                title: decision.mode === "approve" ? "Suggestion approved" : "Suggestion rejected",
                description: decision.suggestion.source_string.key,
              });
              setSuggestions((current) =>
                current.filter((item) => item.id !== decision.suggestion.id),
              );
            }}
          />
        </>
      )}
    </AppShell>
  );
}
