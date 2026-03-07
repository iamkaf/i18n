import { FileText, Languages } from "lucide-react";

export function GlobalStatsCard({
  totalSourceStrings,
  totalApprovedTranslations,
}: {
  totalSourceStrings: number;
  totalApprovedTranslations: number;
}) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 w-full max-w-4xl mx-auto">
      <div className="group relative bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] overflow-hidden transition-all duration-200 hover:border-[var(--atelier-highlight)]/40 hover:shadow-lg hover:shadow-[var(--atelier-highlight)]/5">
        <div className="h-1 w-full bg-gradient-to-r from-[var(--atelier-highlight)] to-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 shrink-0 rounded-lg bg-[var(--atelier-surface-soft)] border border-[var(--atelier-border)] flex items-center justify-center">
              <FileText className="w-5 h-5 text-[var(--atelier-highlight)]" />
            </div>
            <span className="text-sm font-medium text-[var(--atelier-muted)]">Total Source Strings</span>
          </div>
          <div className="text-4xl md:text-5xl font-semibold text-[var(--atelier-text)] tracking-tight">
            {totalSourceStrings.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="group relative bg-[var(--atelier-surface)] rounded-lg border border-[var(--atelier-border)] overflow-hidden transition-all duration-200 hover:border-[var(--atelier-highlight)]/40 hover:shadow-lg hover:shadow-[var(--atelier-highlight)]/5">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-[var(--atelier-highlight)] opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 shrink-0 rounded-lg bg-[var(--atelier-surface-soft)] border border-[var(--atelier-border)] flex items-center justify-center">
              <Languages className="w-5 h-5 text-[var(--atelier-highlight)]" />
            </div>
            <span className="text-sm font-medium text-[var(--atelier-muted)]">Total Translations</span>
          </div>
          <div className="text-4xl md:text-5xl font-semibold text-[var(--atelier-text)] tracking-tight">
            {totalApprovedTranslations.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
