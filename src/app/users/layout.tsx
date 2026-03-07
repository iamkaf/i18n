import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users",
  description: "Manage elevated contributor roles.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
