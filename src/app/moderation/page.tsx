"use client";

import { sileo } from "sileo";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/atelier/app-shell";
import { ErrorStateCard } from "@/components/atelier/error-state-card";
import { FilterToolbar } from "@/components/atelier/filter-toolbar";
import { Input } from "@/components/ui/input";
import { LocaleBadge } from "@/components/atelier/locale-badge";
import { LocaleCombobox } from "@/components/atelier/locale-combobox";
import { LockedStateCard } from "@/components/atelier/locked-state-card";
import { ModerationDecisionDrawer } from "@/components/atelier/moderation-decision-drawer";
import { PaginationControls } from "@/components/atelier/pagination-controls";
import { SectionHeading } from "@/components/atelier/section-heading";
import { Spinner } from "@/components/atelier/spinner";
import { StatusPill } from "@/components/atelier/status-pill";
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
      const params = new URLSearchParams({ status, page: String(page), limit: "20" });
      if (locale.trim() && isSupportedLocaleCode(locale)) params.set("locale", locale.trim().toLowerCase());
      if (project.trim()) params.set("project", project.trim());
      try {
        const data = await apiJson<{ suggestions: Suggestion[]; total: number; page: number }>(`/api/suggestions?${params.toString()}`);
        if (!alive) return;
        setSuggestions(data.suggestions ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? 0);
        setLimit(20);
      } catch (loadError) {
        if (!alive) return;
        if (loadError instanceof ApiError && loadError.status === 403) setError("Moderator access is required.");
        else setError(getErrorMessage(loadError));
      } finally {
        if (alive) setBusy(false);
      }
    }
    void loadSuggestions();
    return () => { alive = false; };
  }, [limit, locale, page, project, status, trusted, user]);

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
        <Spinner />
      ) : !user || !trusted ? (
        <LockedStateCard description="Moderator access is required to review suggestions." />
      ) : (
        <>
          <FilterToolbar>
            <div className="flex items-center gap-2">
              {(["pending", "accepted", "rejected", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatus(s); setPage(0); }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                    status === s
                      ? "bg-[var(--atelier-text)] text-[var(--atelier-bg)]"
                      : "text-[var(--atelier-muted)] hover:text-[var(--atelier-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <LocaleCombobox value={locale} onChange={(v) => { setLocale(v); setPage(0); }} placeholder="Locale" allowEmpty className="w-28" />
            <Input value={project} onChange={(e) => { setProject(e.target.value); setPage(0); }} placeholder="Project" className="max-w-[10rem]" />
          </FilterToolbar>

          {busy ? (
            <Spinner />
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
                  <div className="bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--atelier-border)] text-left text-xs uppercase tracking-wider text-[var(--atelier-muted)]">
                          <th className="px-4 py-2 font-medium">Key</th>
                          <th className="px-4 py-2 font-medium">Source</th>
                          <th className="px-4 py-2 font-medium">Translation</th>
                          <th className="px-4 py-2 font-medium">Author</th>
                          <th className="px-4 py-2 font-medium">Locale</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                          <th className="px-4 py-2 font-medium w-32" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((s) => (
                          <tr key={s.id} className="border-b border-[var(--atelier-border)] last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--atelier-highlight)] whitespace-nowrap">{s.source_string.key}</td>
                            <td className="px-4 py-2.5 text-[var(--atelier-text)] max-w-[14rem] truncate">{s.source_string.source_text}</td>
                            <td className="px-4 py-2.5 text-[var(--atelier-text)] max-w-[14rem] truncate">{s.text}</td>
                            <td className="px-4 py-2.5 text-xs text-[var(--atelier-muted)] whitespace-nowrap">{s.author_name || s.author_discord_id}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap"><LocaleBadge locale={s.locale} /></td>
                            <td className="px-4 py-2.5">
                              <StatusPill variant={s.status === "rejected" ? "rejected" : s.status === "accepted" ? "approved" : "pending"}>
                                {s.status}
                              </StatusPill>
                            </td>
                            <td className="px-4 py-2.5">
                              {s.status === "pending" && (
                                <div className="flex items-center gap-1">
                                  <button type="button" className="text-xs font-medium px-2 py-0.5 rounded text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors" onClick={() => setDecision({ mode: "approve", suggestion: s })}>
                                    Approve
                                  </button>
                                  <button type="button" className="text-xs font-medium px-2 py-0.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" onClick={() => setDecision({ mode: "reject", suggestion: s })}>
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
              const endpoint = decision.mode === "approve"
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
              setSuggestions((current) => current.filter((item) => item.id !== decision.suggestion.id));
            }}
          />
        </>
      )}
    </AppShell>
  );
}
