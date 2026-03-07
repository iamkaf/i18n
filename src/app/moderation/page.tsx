"use client";

import { sileo } from "sileo";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/atelier/app-shell";
import { EmptyStateCard } from "@/components/atelier/empty-state-card";
import { ErrorStateCard } from "@/components/atelier/error-state-card";
import { FilterToolbar } from "@/components/atelier/filter-toolbar";
import { Input } from "@/components/ui/input";
import { LocaleBadge } from "@/components/atelier/locale-badge";
import { LocaleCombobox } from "@/components/atelier/locale-combobox";
import { LockedStateCard } from "@/components/atelier/locked-state-card";
import { ModerationDecisionDrawer } from "@/components/atelier/moderation-decision-drawer";
import { PaginationControls } from "@/components/atelier/pagination-controls";
import { SectionHeading } from "@/components/atelier/section-heading";
import { StatusPill } from "@/components/atelier/status-pill";
import { Button } from "@/components/ui/button";
import { ApiError, apiJson, getErrorMessage } from "@/lib/api";
import { isSupportedLocaleCode } from "@/lib/locales";
import { useSession } from "@/lib/use-session";
import { cn } from "@/lib/utils";

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
      if (locale.trim() && isSupportedLocaleCode(locale)) {
        params.set("locale", locale.trim().toLowerCase());
      }
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

  // Group suggestions by project_slug
  const grouped = useMemo(() => {
    const map = new Map<string, Suggestion[]>();
    for (const s of suggestions) {
      const arr = map.get(s.project_slug) ?? [];
      arr.push(s);
      map.set(s.project_slug, arr);
    }
    return map;
  }, [suggestions]);

  return (
    <AppShell currentHref="/moderation">
      <SectionHeading title="Moderation" />

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
            <div className="flex items-center gap-2">
              {(["pending", "accepted", "rejected", "all"] as const).map((statusOption) => (
                <button
                  key={statusOption}
                  type="button"
                  onClick={() => { setStatus(statusOption); setPage(0); }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                    status === statusOption
                      ? "bg-[var(--atelier-text)] text-[var(--atelier-bg)]"
                      : "text-[var(--atelier-muted)] hover:text-[var(--atelier-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  )}
                >
                  {statusOption}
                </button>
              ))}
            </div>
            
            <LocaleCombobox
              value={locale}
              onChange={(v) => { setLocale(v); setPage(0); }}
              placeholder="Locale"
              allowEmpty
              className="w-28"
            />
            <Input
              value={project}
              onChange={(e) => { setProject(e.target.value); setPage(0); }}
              placeholder="Project"
              className="max-w-[10rem]"
            />
          </FilterToolbar>

          {busy ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] p-3 animate-pulse h-20" />
              ))}
            </div>
          ) : error ? (
            <ErrorStateCard description={error} />
          ) : suggestions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[var(--atelier-muted)]">Queue is empty.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(grouped.entries()).map(([slug, items]) => (
                <section key={slug}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--atelier-muted)] mb-2">{slug}</h3>
                  <div className="bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] overflow-hidden">
                    {items.map((suggestion) => (
                      <article key={suggestion.id} className="px-4 py-3 border-b border-[var(--atelier-border)] last:border-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-mono text-[11px] text-[var(--atelier-highlight)] bg-[var(--atelier-highlight)]/10 px-1.5 py-0.5 rounded">
                                {suggestion.source_string.key}
                              </span>
                              <span className="text-[11px] text-[var(--atelier-muted)]">
                                <LocaleBadge locale={suggestion.locale} /> · {suggestion.author_name || suggestion.author_discord_id}
                              </span>
                            </div>
                            <p className="text-sm text-[var(--atelier-text)] leading-snug">
                              {suggestion.source_string.source_text}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <StatusPill
                              variant={
                                suggestion.status === "rejected" ? "rejected"
                                : suggestion.status === "accepted" ? "approved"
                                : "pending"
                              }
                            >
                              {suggestion.status}
                            </StatusPill>
                            {suggestion.status === "pending" && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <button
                                  type="button"
                                  className="text-xs font-medium px-2 py-0.5 rounded text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                                  onClick={() => setDecision({ mode: "approve", suggestion })}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-medium px-2 py-0.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                  onClick={() => setDecision({ mode: "reject", suggestion })}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 bg-[var(--atelier-surface-soft)]/50 rounded-md p-2.5 border border-[var(--atelier-border)]/30 text-sm text-[var(--atelier-text)]">
                          {suggestion.text}
                        </div>
                        {suggestion.decision_note && (
                          <div className="mt-1.5 text-xs text-[var(--atelier-muted)]">
                            <strong className="font-medium text-[var(--atelier-text)]">Note:</strong> {suggestion.decision_note}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
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
