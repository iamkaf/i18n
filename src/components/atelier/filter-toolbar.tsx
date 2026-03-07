import { cn } from "@/lib/utils";

export function FilterToolbar({
  children,
  sticky = false,
  className,
}: {
  children: React.ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "atelier-card mb-6 p-4 md:p-5",
        sticky && "sticky top-[4.75rem] z-20 backdrop-blur",
        className,
      )}
    >
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </section>
  );
}
