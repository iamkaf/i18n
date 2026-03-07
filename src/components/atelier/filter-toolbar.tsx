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
    <div
      className={cn(
        "mb-4",
        sticky && "sticky top-0 z-20 bg-[var(--atelier-bg)]/90 backdrop-blur-md py-2 -mt-2",
        className,
      )}
    >
      <div className={cn("flex flex-wrap items-end gap-3", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
