import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moderation",
  description: "Suggestion moderation queue for trusted translators.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ModerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
