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
    <div className="mb-5">
      {eyebrow ? <p className="text-xs uppercase tracking-[0.18em] text-[var(--atelier-muted)]">{eyebrow}</p> : null}
      <h2 className="mt-2 text-2xl md:text-3xl leading-tight font-semibold">{title}</h2>
      {description ? <p className="mt-2 text-[var(--atelier-muted)] max-w-2xl">{description}</p> : null}
    </div>
  );
}
