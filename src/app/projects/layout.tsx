import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Browse translation projects and track locale coverage progress.",
  alternates: {
    canonical: "/projects",
  },
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
