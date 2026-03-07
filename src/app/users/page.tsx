"use client";

import { sileo } from "sileo";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/atelier/app-shell";
import { EmptyStateCard } from "@/components/atelier/empty-state-card";
import { ErrorStateCard } from "@/components/atelier/error-state-card";
import { FilterToolbar } from "@/components/atelier/filter-toolbar";
import { Input } from "@/components/ui/input";
import { LockedStateCard } from "@/components/atelier/locked-state-card";
import { ModrinthImporter } from "@/components/atelier/modrinth-importer";
import { SectionHeading } from "@/components/atelier/section-heading";
import { StatusPill } from "@/components/atelier/status-pill";
import { Button } from "@/components/ui/button";
import { ApiError, apiJson, getErrorMessage } from "@/lib/api";
import { GOD_DISCORD_ID } from "@/lib/auth-constants";
import { useSession } from "@/lib/use-session";

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
      <SectionHeading
        eyebrow="Identity"
        title="Users"
        description="Manage elevated roles by Discord ID. The god role is permanently reserved for one configured account."
      />

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
          <ModrinthImporter />

          <section className="atelier-card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--atelier-muted)]">
              Grant role
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.15fr)_minmax(0,1fr)_160px_120px]">
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

          <FilterToolbar>
            <label className="block min-w-[220px] flex-1">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                Search
              </span>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Discord ID, display name, or handle"
              />
            </label>
            <label className="block min-w-[160px]">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-[var(--atelier-muted)]">
                Role
              </span>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as "all" | UserRole)}
                className="atelier-ring h-9 w-full rounded-md border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] px-3 text-sm"
              >
                <option value="all">all</option>
                <option value="god">god</option>
                <option value="trusted">trusted</option>
              </select>
            </label>
          </FilterToolbar>

          {busy ? (
            <div className="atelier-card h-40 animate-pulse" />
          ) : error ? (
            <ErrorStateCard description={error} />
          ) : users.length === 0 ? (
            <EmptyStateCard
              title="No elevated users"
              description="No trusted or god users matched the current filters."
            />
          ) : (
            <div className="grid gap-4">
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
                  <article key={entry.discord_id} className="atelier-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={`${displayName} avatar`}
                            className="mt-0.5 h-14 w-14 rounded-2xl border border-[var(--atelier-border)] object-cover"
                          />
                        ) : (
                          <div className="mt-0.5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] text-lg font-semibold text-[var(--atelier-muted)]">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                        <div className="font-mono text-sm text-[var(--atelier-highlight)]">
                          {entry.discord_id}
                        </div>
                        <h3 className="mt-2 text-base font-semibold">{displayName}</h3>
                        <div className="mt-1 text-sm text-[var(--atelier-muted)]">
                          Handle: {handleText}
                        </div>
                        <div className="mt-2 text-sm text-[var(--atelier-muted)]">
                          {isConfiguredGod
                            ? "Role is reserved in code for the configured Discord account."
                            : `added by ${entry.added_by_discord_id || "system"}${entry.added_at ? ` on ${new Date(entry.added_at).toLocaleString()}` : ""}`}
                        </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill variant={entry.role === "god" ? "god" : "trusted"}>
                          {entry.role}
                        </StatusPill>
                      </div>
                    </div>
                    {isConfiguredGod ? (
                      <div className="mt-4 rounded-xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] px-4 py-3 text-sm text-[var(--atelier-muted)]">
                        This account is bound to the hardcoded god Discord ID and cannot be edited
                        or demoted here.
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap items-center gap-3">
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
                          className="atelier-ring h-9 min-w-[140px] rounded-md border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] px-3 text-sm"
                        >
                          <option value="trusted">trusted</option>
                          <option value="god">god</option>
                        </select>
                        <Button
                          variant="outline"
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
                              sileo.success({ title: "Role updated", description: entry.discord_id });
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
                        >
                          {savingId === entry.discord_id ? "Saving..." : "Update"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={async () => {
                            setSavingId(entry.discord_id);
                            try {
                              await apiJson(`/api/users/${entry.discord_id}`, { method: "DELETE" });
                              sileo.success({ title: "User demoted", description: entry.discord_id });
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
                        >
                          Demote
                        </Button>
                      </div>
                    )}
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
