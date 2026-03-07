export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      {eyebrow ? (
        <p className="text-[13px] uppercase tracking-[0.18em] font-medium text-[var(--atelier-highlight)] mb-2">{eyebrow}</p>
      ) : null}
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--atelier-text)]">{title}</h2>
      {description ? (
        <p className="mt-3 text-[15px] text-[var(--atelier-muted)] max-w-2xl leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
