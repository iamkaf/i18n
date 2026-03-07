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
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] p-8 text-center">
          <p className="text-sm text-[var(--atelier-muted)]">No translations available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[var(--atelier-highlight)] via-indigo-500 to-[var(--atelier-highlight)] opacity-60" />
        
        <div className="p-4 md:p-6">
          <h3 className="text-lg font-semibold text-[var(--atelier-text)] mb-4">Language Leaderboard</h3>
          
          <div className="space-y-3">
            {locales.map((item, index) => {
              const percentage = (item.coverage * 100).toFixed(1);
              
              return (
                <div
                  key={item.locale}
                  className="group flex items-center gap-4 p-3 rounded-lg bg-[var(--atelier-surface-soft)]/50 border border-[var(--atelier-border)]/50 hover:border-[var(--atelier-highlight)]/30 transition-all duration-200"
                >
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-[var(--atelier-surface)] border border-[var(--atelier-border)] flex items-center justify-center text-sm font-semibold text-[var(--atelier-muted)]">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <LocaleBadge locale={item.locale} className="flex-shrink-0" />
                      <span className="text-xs text-[var(--atelier-muted)] font-mono">
                        {item.approved_count.toLocaleString()} / {totalSourceStrings.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--atelier-highlight)] to-indigo-500 transition-all duration-300"
                        style={{ width: `${item.coverage * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-[var(--atelier-text)]">
                      {percentage}%
                    </div>
                    <div className="text-xs text-[var(--atelier-muted)]">
                      coverage
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
