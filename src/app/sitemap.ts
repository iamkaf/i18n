import type { MetadataRoute } from "next";
import { dbAll } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

type PublicProjectRow = {
  slug: string;
  updated_at: string;
};

const STATIC_ROUTES = ["/", "/projects"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "weekly" : "daily",
    priority: route === "/" ? 1 : 0.8,
  }));

  try {
    const rows = await dbAll<PublicProjectRow>(
      `SELECT slug, updated_at
       FROM projects
       WHERE visibility = 'public'
       ORDER BY updated_at DESC`,
    );

    return [
      ...staticEntries,
      ...rows.map((row) => ({
        url: `${SITE_URL}/projects/${encodeURIComponent(row.slug)}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : now,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticEntries;
  }
}
