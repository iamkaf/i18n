import { Button } from "@/components/ui/button";

export function PaginationControls({
  page,
  limit,
  total,
  onPageChange,
}: {
  page: number;
  limit: number;
  total: number;
  onPageChange: (nextPage: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 0;
  const canNext = page + 1 < pageCount;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--atelier-muted)]">
        Page {page + 1} of {pageCount}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
