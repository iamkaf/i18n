import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Suggestions",
  description: "Track your translation suggestions and review outcomes.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function SuggestionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
