import { cn } from "@/lib/utils";

const REGIONAL_INDICATOR_OFFSET = 127397;
const FALLBACK_GLOBE = String.fromCodePoint(0x1f310);

function localeToFlag(locale: string): string | null {
  const match = locale.trim().toLowerCase().match(/^[a-z]{2}[_-]([a-z]{2})$/);
  const country = match?.[1]?.toUpperCase();
  if (!country || country.length !== 2) return null;

  const [first, second] = country;
  if (!/[A-Z]/.test(first) || !/[A-Z]/.test(second)) return null;

  return `${String.fromCodePoint(first.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET)}${String.fromCodePoint(
    second.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET,
  )}`;
}

export function LocaleBadge({
  locale,
  className,
  codeClassName,
  flagClassName,
}: {
  locale: string;
  className?: string;
  codeClassName?: string;
  flagClassName?: string;
}) {
  const normalized = locale.trim().toLowerCase();
  const flag = localeToFlag(normalized);

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span aria-hidden="true" className={cn("text-sm leading-none", flagClassName)}>
        {flag ?? FALLBACK_GLOBE}
      </span>
      <span className={codeClassName}>{normalized || locale}</span>
    </span>
  );
}
