import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HeroSection({
  title,
  subtitle,
  kicker,
  primaryCta,
  secondaryCta,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
}) {
  return (
    <section className="mb-14 md:mb-20">
      <p className="text-xs tracking-[0.22em] uppercase text-[var(--atelier-muted)]">{kicker}</p>
      <h1 className="mt-4 text-[clamp(2.6rem,8vw,5.8rem)] leading-[0.9] tracking-tight font-bold" style={{ fontFamily: "var(--font-syne)" }}>
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-[var(--atelier-muted)]">{subtitle}</p>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link
          href={primaryCta.href}
          className="atelier-ring inline-flex items-center gap-2 rounded-xl bg-[var(--atelier-accent)] px-4 py-2.5 text-sm text-[var(--atelier-accent-foreground)] hover:bg-[var(--atelier-accent-strong)] transition-colors"
        >
          {primaryCta.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={secondaryCta.href}
          className="atelier-ring inline-flex items-center rounded-xl border border-[var(--atelier-border)] bg-[var(--atelier-surface)] px-4 py-2.5 text-sm text-[var(--atelier-text)] hover:bg-[#f8f9ff] dark:hover:bg-white/10 transition-colors"
        >
          {secondaryCta.label}
        </Link>
      </div>
    </section>
  );
}
