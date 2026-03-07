export function GlobalStatsCard({
  totalSourceStrings,
  totalApprovedTranslations,
  localeCount,
}: {
  totalSourceStrings: number;
  totalApprovedTranslations: number;
  localeCount: number;
}) {
  const coverage = totalSourceStrings > 0 && localeCount > 0
    ? Math.round((totalApprovedTranslations / (totalSourceStrings * localeCount)) * 100)
    : 0;

  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-light text-[var(--atelier-text)] tabular-nums mb-1">
          {totalSourceStrings.toLocaleString()}
        </div>
        <div className="text-xs text-[var(--atelier-muted)] uppercase tracking-wider">
          Source Strings
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-light text-[var(--atelier-text)] tabular-nums mb-1">
          {totalApprovedTranslations.toLocaleString()}
        </div>
        <div className="text-xs text-[var(--atelier-muted)] uppercase tracking-wider">
          Translations
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-light text-[var(--atelier-highlight)] tabular-nums mb-1">
          {coverage}%
        </div>
        <div className="text-xs text-[var(--atelier-muted)] uppercase tracking-wider">
          Avg Coverage
        </div>
      </div>
    </div>
  );
}
