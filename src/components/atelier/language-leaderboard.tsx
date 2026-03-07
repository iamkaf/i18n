import { LocaleBadge } from "@/components/atelier/locale-badge";

type LocaleStatsItem = {
  locale: string;
  approved_count: number;
  coverage: number;
};

export function LanguageLeaderboard({
  locales,
  totalSourceStrings,
}: {
  locales: LocaleStatsItem[];
  totalSourceStrings: number;
}) {
  if (locales.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[var(--atelier-muted)]">No translations yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-[var(--atelier-muted)] uppercase tracking-wider mb-6">
        Top Languages
      </h3>
      
      <div className="space-y-3">
        {locales.slice(0, 6).map((item, index) => {
          const percentage = (item.coverage * 100).toFixed(1);
          
          return (
            <div
              key={item.locale}
              className="flex items-center gap-4 py-3 border-b border-[var(--atelier-border)] last:border-0"
            >
              <span className="text-sm text-[var(--atelier-muted)] w-6">
                {index + 1}
              </span>
              
              <LocaleBadge locale={item.locale} />
              
              <div className="flex-1 h-1.5 bg-[var(--atelier-surface-soft)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--atelier-highlight)] rounded-full transition-all duration-500"
                  style={{ width: `${item.coverage * 100}%` }}
                />
              </div>
              
              <span className="text-sm text-[var(--atelier-text)] tabular-nums w-16 text-right">
                {percentage}%
              </span>
            </div>
          );
        })}
      </div>
      
      {locales.length > 6 && (
        <p className="text-xs text-[var(--atelier-muted)] mt-4 text-center">
          +{locales.length - 6} more
        </p>
      )}
    </div>
  );
}
