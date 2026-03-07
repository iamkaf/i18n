import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/atelier/status-pill";

type MySuggestion = {
  id: string;
  locale: string;
  text: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

export type StringRowCardItem = {
  id: string;
  string_key: string;
  source_text: string;
  context: string | null;
  approved_translation: string | null;
  my_suggestion: MySuggestion | null;
};

export function StringRowCard({
  item,
  active,
  onSelect,
  onEditSuggestion,
}: {
  item: StringRowCardItem;
  active: boolean;
  onSelect: () => void;
  onEditSuggestion?: (suggestion: MySuggestion) => void;
}) {
  return (
    <article
      className={`atelier-card p-5 transition-colors ${active ? "border-[var(--atelier-highlight)]" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button type="button" onClick={onSelect} className="text-left">
            <div className="font-mono text-sm text-[var(--atelier-highlight)]">
              {item.string_key}
            </div>
            <h3 className="mt-2 text-base font-semibold">{item.source_text}</h3>
          </button>
          {item.context ? (
            <p className="mt-2 text-sm text-[var(--atelier-muted)]">context: {item.context}</p>
          ) : null}
        </div>
        {item.my_suggestion ? (
          <div className="flex items-center gap-2">
            <StatusPill
              variant={
                item.my_suggestion.status === "rejected"
                  ? "rejected"
                  : item.my_suggestion.status === "accepted"
                    ? "approved"
                    : "pending"
              }
            >
              {item.my_suggestion.status}
            </StatusPill>
            {item.my_suggestion.status === "pending" && onEditSuggestion ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => item.my_suggestion && onEditSuggestion(item.my_suggestion)}
              >
                Edit
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--atelier-muted)]">
            Approved translation
          </div>
          <p className="mt-2 text-sm">
            {item.approved_translation || "No approved translation for this locale yet."}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)] p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--atelier-muted)]">
            Your latest suggestion
          </div>
          <p className="mt-2 text-sm">
            {item.my_suggestion?.text || "Select this string to draft a suggestion."}
          </p>
        </div>
      </div>
    </article>
  );
}
