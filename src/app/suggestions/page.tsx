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
import { PaginationControls } from "@/components/atelier/pagination-controls";
import { SectionHeading } from "@/components/atelier/section-heading";
import { Spinner } from "@/components/atelier/spinner";
import { StatusPill } from "@/components/atelier/status-pill";
import { SuggestionDrawer } from "@/components/atelier/suggestion-drawer";
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
      const params = new URLSearchParams({ mine: "1", status, page: String(page), limit: "20" });
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
        if (loadError instanceof ApiError && loadError.status === 401) setSuggestions([]);
        else setError(getErrorMessage(loadError));
      } finally {
        if (alive) setBusy(false);
      }
    }
    void loadSuggestions();
    return () => { alive = false; };
  }, [limit, locale, page, project, status, user]);

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
    <AppShell currentHref="/suggestions">
      <SectionHeading title="My Suggestions" />

      {loading ? (
        <Spinner />
      ) : !user ? (
        <LockedStateCard description="Sign in with Discord to view your suggestions." />
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
              <p className="text-sm text-[var(--atelier-muted)]">No suggestions match.</p>
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
                          <th className="px-4 py-2 font-medium">Locale</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                          <th className="px-4 py-2 font-medium w-16" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((s) => (
                          <tr key={s.id} className="border-b border-[var(--atelier-border)] last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--atelier-highlight)] whitespace-nowrap">{s.source_string.key}</td>
                            <td className="px-4 py-2.5 text-[var(--atelier-text)] max-w-[16rem] truncate">{s.source_string.source_text}</td>
                            <td className="px-4 py-2.5 text-[var(--atelier-text)] max-w-[16rem] truncate">{s.text}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap"><LocaleBadge locale={s.locale} /></td>
                            <td className="px-4 py-2.5">
                              <StatusPill variant={s.status === "rejected" ? "rejected" : s.status === "accepted" ? "approved" : "pending"}>
                                {s.status}
                              </StatusPill>
                            </td>
                            <td className="px-4 py-2.5">
                              {s.status === "pending" && (
                                <button type="button" onClick={() => setEditing(s)} className="text-xs font-medium text-[var(--atelier-highlight)] hover:underline">
                                  Edit
                                </button>
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

          <SuggestionDrawer
            open={Boolean(editing)}
            title="Edit pending suggestion"
            description={editing ? `${editing.project_slug} / ${editing.source_string.key}` : undefined}
            initialLocale={editing?.locale ?? ""}
            initialText={editing?.text ?? ""}
            submitLabel="Save changes"
            onClose={() => setEditing(null)}
            onSubmit={async ({ locale: nextLocale, text }) => {
              if (!editing) return;
              await apiJson(`/api/suggestions/${editing.id}`, { method: "PATCH", body: JSON.stringify({ locale: nextLocale, text }) });
              sileo.success({ title: "Suggestion updated", description: editing.source_string.key });
              setSuggestions((c) => c.map((item) => item.id === editing.id ? { ...item, locale: nextLocale, text } : item));
            }}
            onWithdraw={editing ? async () => {
              await apiJson(`/api/suggestions/${editing.id}`, { method: "DELETE" });
              sileo.success({ title: "Suggestion withdrawn", description: editing.source_string.key });
              setSuggestions((c) => c.filter((item) => item.id !== editing.id));
            } : undefined}
          />
        </>
      )}
    </AppShell>
  );
}
