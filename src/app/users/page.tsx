"use client";

import { sileo } from "sileo";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/atelier/app-shell";
import { EmptyStateCard } from "@/components/atelier/empty-state-card";
import { ErrorStateCard } from "@/components/atelier/error-state-card";
import { FilterToolbar } from "@/components/atelier/filter-toolbar";
import { Input } from "@/components/ui/input";
import { LockedStateCard } from "@/components/atelier/locked-state-card";
import { SectionHeading } from "@/components/atelier/section-heading";
import { StatusPill } from "@/components/atelier/status-pill";
import { Button } from "@/components/ui/button";
import { ApiError, apiJson, getErrorMessage } from "@/lib/api";
import { GOD_DISCORD_ID } from "@/lib/auth-constants";
import { useSession } from "@/lib/use-session";
import { cn } from "@/lib/utils";

type UserRole = "trusted" | "god";

type ManagedUser = {
  discord_id: string;
  display_name: string | null;
  discord_handle: string | null;
  avatar_url: string | null;
  role: UserRole;
  added_by_discord_id: string | null;
  added_at: string;
};

export default function UsersPage() {
  const { user, god, loading } = useSession();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discordId, setDiscordId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [discordHandle, setDiscordHandle] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("trusted");
  
  const [showGrantRole, setShowGrantRole] = useState(false);

  async function loadUsers() {
    if (!user || !god) return;
    setBusy(true);
    setError(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (roleFilter !== "all") params.set("role", roleFilter);
    try {
      const data = await apiJson<{ users: ManagedUser[] }>(`/api/users?${params.toString()}`);
      setUsers(data.users ?? []);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 403) {
        setError("God access is required.");
      } else {
        setError(getErrorMessage(loadError));
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [god, roleFilter, search, user]);

  return (
    <AppShell currentHref="/users">
      <SectionHeading title="Users" />

      {loading ? (
        <div className="atelier-card h-40 animate-pulse" />
      ) : !user ? (
        <LockedStateCard description="Sign in with Discord before opening user management." />
      ) : !god ? (
        <ErrorStateCard
          title="God access required"
          description="Only the configured god account can manage elevated users."
        />
      ) : (
        <div className="grid gap-6">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setShowGrantRole(!showGrantRole)} className="bg-[var(--atelier-surface-soft)]">
              {showGrantRole ? "Hide Grant Role" : "Grant Role"}
            </Button>
          </div>

          {showGrantRole && (
            <section className="bg-[var(--atelier-surface-soft)]/50 rounded-lg p-4 border border-[var(--atelier-border)]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--atelier-muted)] mb-3">
                Grant role
              </h3>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.15fr)_minmax(0,1fr)_160px_120px]">
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                  Discord ID
                </span>
                <Input
                  value={discordId}
                  onChange={(event) => setDiscordId(event.target.value)}
                  placeholder="517599684961894400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                  Display name
                </span>
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Optional label"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                  Handle
                </span>
                <Input
                  value={discordHandle}
                  onChange={(event) => setDiscordHandle(event.target.value)}
                  placeholder="kaf"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                  Role
                </span>
                <select
                  value={newRole}
                  onChange={(event) => setNewRole(event.target.value as UserRole)}
                  className="atelier-ring h-9 w-full rounded-md border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] px-3 text-sm"
                >
                  <option value="trusted">trusted</option>
                  <option value="god">god</option>
                </select>
              </label>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  onClick={async () => {
                    setSavingId("new");
                    try {
                      await apiJson("/api/users", {
                        method: "POST",
                        body: JSON.stringify({
                          discord_id: discordId.trim(),
                          display_name: displayName.trim() || null,
                          discord_handle: discordHandle.trim().replace(/^@+/, "") || null,
                          role: newRole,
                        }),
                      });
                      sileo.success({ title: "Role updated", description: discordId.trim() });
                      setDiscordId("");
                      setDisplayName("");
                      setDiscordHandle("");
                      setNewRole("trusted");
                      await loadUsers();
                    } catch (saveError) {
                      sileo.error({
                        title: "Update failed",
                        description: getErrorMessage(saveError),
                      });
                    } finally {
                      setSavingId(null);
                    }
                  }}
                  disabled={savingId === "new"}
                >
                  {savingId === "new" ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </section>
          )}

          <FilterToolbar>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search…"
              className="max-w-xs"
            />
            <div className="flex items-center gap-2">
              {(["all", "god", "trusted"] as const).map((roleOption) => (
                <button
                  key={roleOption}
                  type="button"
                  onClick={() => setRoleFilter(roleOption)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                    roleFilter === roleOption
                      ? "bg-[var(--atelier-text)] text-[var(--atelier-bg)]"
                      : "text-[var(--atelier-muted)] hover:text-[var(--atelier-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  )}
                >
                  {roleOption}
                </button>
              ))}
            </div>
          </FilterToolbar>

          {busy ? (
            <div className="bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] overflow-hidden animate-pulse">
               {Array.from({ length: 3 }, (_, i) => (
                 <div key={i} className="px-4 py-3 border-b border-[var(--atelier-border)] last:border-0 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5" />
                    <div className="flex-1 space-y-1.5">
                       <div className="h-3.5 w-28 bg-black/5 dark:bg-white/5 rounded" />
                       <div className="h-3 w-40 bg-black/5 dark:bg-white/5 rounded" />
                    </div>
                 </div>
               ))}
            </div>
          ) : error ? (
            <ErrorStateCard description={error} />
          ) : users.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[var(--atelier-muted)]">No elevated users found.</p>
            </div>
          ) : (
            <div className="bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] overflow-hidden">
              {users.map((entry) => {
                const isConfiguredGod = entry.discord_id === GOD_DISCORD_ID;
                const isCurrentUser = user?.sub === entry.discord_id;
                const displayName =
                  entry.display_name ||
                  (isCurrentUser ? user.name : null) ||
                  (isConfiguredGod ? "Configured god account" : "Unnamed user");
                const handle = entry.discord_handle || (isCurrentUser ? user.handle : null);
                const avatarUrl = entry.avatar_url || (isCurrentUser ? user.avatar : null);
                const handleText = handle ? `@${handle}` : "not set";

                return (
                  <article key={entry.discord_id} className="px-4 py-3 border-b border-[var(--atelier-border)] last:border-0 flex items-center justify-between gap-3">
                     <div className="flex items-center gap-3 flex-1 min-w-0">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={`${displayName}`}
                            className="h-9 w-9 rounded-full border border-[var(--atelier-border)] object-cover shrink-0"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] text-sm font-semibold text-[var(--atelier-muted)] shrink-0">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                           <h3 className="text-sm font-medium text-[var(--atelier-text)] flex items-center gap-1.5 truncate">
                             {displayName}
                           </h3>
                           <p className="text-xs text-[var(--atelier-muted)] truncate">
                             {handleText} · <span className="font-mono text-[11px]">{entry.discord_id}</span>
                           </p>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-2 shrink-0">
                        <StatusPill variant={entry.role === "god" ? "god" : "trusted"}>
                          {entry.role}
                        </StatusPill>
                        
                        {!isConfiguredGod && (
                          <div className="flex items-center gap-2 mt-1">
                            <select
                              aria-label={`Role for ${entry.discord_id}`}
                              value={entry.role}
                              onChange={(event) => {
                                const nextRole = event.target.value as UserRole;
                                setUsers((current) =>
                                  current.map((currentEntry) =>
                                    currentEntry.discord_id === entry.discord_id
                                      ? { ...currentEntry, role: nextRole }
                                      : currentEntry,
                                  ),
                                );
                              }}
                              className="bg-[var(--atelier-surface-soft)] text-[12px] font-medium text-[var(--atelier-text)] border border-[var(--atelier-border)] rounded-md px-2 py-1 outline-none focus:border-[var(--atelier-highlight)]"
                            >
                              <option value="trusted">trusted</option>
                              <option value="god">god</option>
                            </select>
                            
                            <button
                               title="Save updates"
                               onClick={async () => {
                                 const current = users.find(
                                   (currentEntry) => currentEntry.discord_id === entry.discord_id,
                                 );
                                 if (!current) return;
                                 setSavingId(entry.discord_id);
                                 try {
                                   await apiJson(`/api/users/${entry.discord_id}`, {
                                     method: "PATCH",
                                     body: JSON.stringify({
                                       display_name: current.display_name,
                                       discord_handle: current.discord_handle,
                                       role: current.role,
                                     }),
                                   });
                                   sileo.success({ title: "Updated", description: entry.discord_id });
                                   await loadUsers();
                                 } catch (saveError) {
                                   sileo.error({
                                     title: "Update failed",
                                     description: getErrorMessage(saveError),
                                   });
                                 } finally {
                                   setSavingId(null);
                                 }
                               }}
                               disabled={savingId === entry.discord_id}
                               className="w-7 h-7 flex items-center justify-center rounded-md bg-[var(--atelier-surface-soft)] border border-[var(--atelier-border)] text-[var(--atelier-muted)] hover:text-[var(--atelier-highlight)] transition-colors disabled:opacity-50"
                            >
                               {savingId === entry.discord_id ? (
                                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75" /></svg>
                               ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                               )}
                            </button>
                            
                            <button
                               title="Demote User"
                               onClick={async () => {
                                 setSavingId(entry.discord_id);
                                 try {
                                   await apiJson(`/api/users/${entry.discord_id}`, { method: "DELETE" });
                                   sileo.success({ title: "Removed", description: entry.discord_id });
                                   await loadUsers();
                                 } catch (saveError) {
                                   sileo.error({
                                     title: "Demotion failed",
                                     description: getErrorMessage(saveError),
                                   });
                                 } finally {
                                   setSavingId(null);
                                 }
                               }}
                               disabled={savingId === entry.discord_id}
                               className="w-7 h-7 flex items-center justify-center rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        )}
                     </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
