import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  placeholder,
  hint,
  error,
}: {
  label: string;
  placeholder: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--atelier-text)]">{label}</span>
      <Input
        placeholder={placeholder}
        className={cn(
          "atelier-ring border-[var(--atelier-border)] bg-[var(--atelier-surface-soft)]",
          error ? "border-[var(--atelier-danger)]" : "",
        )}
      />
      <span className="mt-1.5 block min-h-[1.1rem] text-xs text-[var(--atelier-muted)]">
        {error ?? hint}
      </span>
    </label>
  );
}
