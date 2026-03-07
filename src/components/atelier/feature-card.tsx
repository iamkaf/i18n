import { cn } from "@/lib/utils";

export function FeatureCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("atelier-card flex flex-col p-5 md:p-6 h-full", className)}>
      <h3 className="text-lg font-semibold tracking-tight text-[var(--atelier-text)] mb-3">{title}</h3>
      <div className="mt-auto text-[15px] text-[var(--atelier-muted)] leading-relaxed">
        {children}
      </div>
    </article>
  );
}
