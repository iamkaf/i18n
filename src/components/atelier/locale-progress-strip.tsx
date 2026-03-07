import { LocaleBadge } from "@/components/atelier/locale-badge";

type ProgressItem = {
  locale: string;
  approved_count: number;
  total_strings: number;
  coverage: number;
};

export function LocaleProgressStrip({
  items,
  activeLocale,
  onSelect,
}: {
  items: ProgressItem[];
  activeLocale: string;
  onSelect: (locale: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = item.locale === activeLocale;
        return (
          <button
            key={item.locale}
            type="button"
            onClick={() => onSelect(item.locale)}
            className={`atelier-ring rounded-2xl border px-3 py-2 text-left transition-colors ${
              isActive
                ? "border-[var(--atelier-highlight)] bg-[color-mix(in_srgb,var(--atelier-highlight)_12%,white)] dark:bg-[color-mix(in_srgb,var(--atelier-highlight)_18%,transparent)]"
                : "border-[var(--atelier-border)] bg-[var(--atelier-surface)] hover:bg-[var(--atelier-surface-soft)]"
            }`}
          >
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--atelier-muted)]">
              <LocaleBadge locale={item.locale} flagClassName="text-base" codeClassName="normal-case" />
            </div>
            <div className="mt-1 text-sm font-medium">
              {item.approved_count}/{item.total_strings}
            </div>
            <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-[var(--atelier-highlight)]"
                style={{ width: `${item.coverage * 100}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
