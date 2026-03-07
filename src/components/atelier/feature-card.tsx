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
    <article className={cn("atelier-card p-5 md:p-6", className)}>
      <h3 className="text-base md:text-lg font-semibold mb-2">{title}</h3>
      <div className="text-sm md:text-base text-[var(--atelier-muted)] leading-relaxed">
        {children}
      </div>
    </article>
  );
}
