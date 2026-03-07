import type { Metadata } from "next";
import { dbFirst } from "@/lib/db";

type ProjectMetadataRow = {
  slug: string;
  name: string;
  visibility: "public" | "private";
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const canonical = `/projects/${encodeURIComponent(slug)}`;
  const fallbackTitle = `${slug} translations`;
  const fallbackDescription = `Translation workspace for ${slug} on i18n.kaf.sh.`;

  try {
    const project = await dbFirst<ProjectMetadataRow>(
      `SELECT slug, name, visibility
       FROM projects
       WHERE slug = ?
       LIMIT 1`,
      [slug],
    );

    if (!project) {
      return {
        title: fallbackTitle,
        description: fallbackDescription,
        alternates: {
          canonical,
        },
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    const description = `Contribute locale translations for ${project.name} and track approved coverage.`;

    return {
      title: project.name,
      description,
      alternates: {
        canonical,
      },
      openGraph: {
        type: "website",
        title: project.name,
        description,
        url: canonical,
      },
      robots:
        project.visibility === "public"
          ? {
              index: true,
              follow: true,
            }
          : {
              index: false,
              follow: false,
            },
    };
  } catch {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      alternates: {
        canonical,
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
