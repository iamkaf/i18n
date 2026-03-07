import { cn } from "@/lib/utils";

export function FilterToolbar({
  children,
  sticky = false,
  className,
  contentClassName,
}: {
  children: React.ReactNode;
  sticky?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      className={cn(
        "bg-[var(--atelier-surface-soft)]/50 backdrop-blur-xl border-y border-[var(--atelier-border)] px-6 py-4 -mx-6 md:-mx-10 mb-8",
        sticky && "sticky top-0 z-20",
        className,
      )}
    >
      <div className={cn("flex flex-wrap items-end gap-3 max-w-5xl mx-auto", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
