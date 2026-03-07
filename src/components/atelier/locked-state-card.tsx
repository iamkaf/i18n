import Link from "next/link";
import { Lock } from "lucide-react";

export function LockedStateCard({
  title = "This workshop view is private",
  description = "Sign in with Discord to inspect private projects and contributor-only routes.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="atelier-card border-dashed p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] p-3">
          <Lock className="h-5 w-5 text-[var(--atelier-highlight)]" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm text-[var(--atelier-muted)]">{description}</p>
          <div className="mt-4">
            <Link
              href="/api/auth/discord"
              className="atelier-ring inline-flex items-center rounded-xl bg-[var(--atelier-accent)] px-4 py-2 text-sm text-[var(--atelier-accent-foreground)] transition-colors hover:bg-[var(--atelier-accent-strong)]"
            >
              Sign in with Discord
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
