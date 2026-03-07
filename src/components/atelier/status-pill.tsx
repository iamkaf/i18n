import { cn } from "@/lib/utils";

type StatusVariant = "public" | "private" | "trusted" | "god" | "approved" | "pending" | "rejected";

const variantStyles: Record<StatusVariant, string> = {
  public: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  private: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
  trusted: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  god: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
  approved: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
};

export function StatusPill({
  variant,
  children,
}: {
  variant: StatusVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variantStyles[variant],
      )}
    >
      {children}
    </span>
  );
}
