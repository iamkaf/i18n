export function SectionHeading({
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold tracking-tight text-[var(--atelier-text)]">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-[var(--atelier-muted)] max-w-xl">{description}</p>
      ) : null}
    </div>
  );
}
