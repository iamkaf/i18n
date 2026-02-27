import Link from "next/link";

export function ActionRow({
  primary,
  secondary,
}: {
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href={primary.href}
        className="atelier-ring inline-flex items-center rounded-xl bg-[var(--atelier-accent)] px-4 py-2.5 text-sm text-[var(--atelier-accent-foreground)] hover:bg-[var(--atelier-accent-strong)] transition-colors"
      >
        {primary.label}
      </Link>
      {secondary ? (
        <Link
          href={secondary.href}
          className="atelier-ring inline-flex items-center rounded-xl border border-[var(--atelier-border)] bg-[var(--atelier-surface)] px-4 py-2.5 text-sm text-[var(--atelier-text)] hover:bg-[#f8f9ff] dark:hover:bg-white/10 transition-colors"
        >
          {secondary.label}
        </Link>
      ) : null}
    </div>
  );
}
