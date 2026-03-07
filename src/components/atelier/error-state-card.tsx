export function ErrorStateCard({
  title = "Something went wrong",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <section className="atelier-card border-rose-200 bg-rose-50/70 p-6 text-sm dark:border-rose-500/20 dark:bg-rose-500/10">
      <h3 className="text-lg font-semibold text-rose-700 dark:text-rose-200">{title}</h3>
      <p className="mt-2 max-w-2xl text-rose-700/80 dark:text-rose-200/80">{description}</p>
    </section>
  );
}
