import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Admin",
  description: "Admin workspace for project imports and settings.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ProjectAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
