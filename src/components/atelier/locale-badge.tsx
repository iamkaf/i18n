import type { ComponentType, SVGProps } from "react";
import * as FlagIcons from "country-flag-icons/react/3x2";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

type FlagIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function localeToCountryCode(locale: string): string | null {
  const match = locale.trim().toLowerCase().match(/^[a-z]{2}[_-]([a-z]{2})$/);
  const country = match?.[1]?.toUpperCase();
  if (!country || country.length !== 2) return null;

  const [first, second] = country;
  if (!/[A-Z]/.test(first) || !/[A-Z]/.test(second)) return null;

  return country;
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
  const countryCode = localeToCountryCode(normalized);
  const FlagIcon = (countryCode
    ? (FlagIcons as Record<string, FlagIconComponent>)[countryCode]
    : undefined) as FlagIconComponent | undefined;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span aria-hidden="true" className="inline-flex items-center">
        {FlagIcon ? (
          <FlagIcon
            className={cn(
              "h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] border border-black/10 dark:border-white/20",
              flagClassName,
            )}
          />
        ) : (
          <Globe className={cn("h-3.5 w-3.5 text-[var(--atelier-muted)]", flagClassName)} />
        )}
      </span>
      <span className={codeClassName}>{normalized || locale}</span>
    </span>
  );
}
