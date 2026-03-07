export function EmptyStateCard({ title, description }: { title: string; description: string }) {
  return (
    <section className="atelier-card p-6 text-sm">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-2xl text-[var(--atelier-muted)]">{description}</p>
    </section>
  );
}
