import type { Metadata } from "next";
import "./globals.css";

const metadataBase = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
  title: "AI Cofounder — Score demand, prove customer pull, ship the next move",
  description:
    "Turn a founder idea into proof artifacts with AI: idea scoring, customer-feedback synthesis, and a concrete next-step plan.",
  applicationName: "AI Cofounder",
  keywords: [
    "AI Cofounder",
    "startup",
    "idea scoring",
    "customer feedback analysis",
    "founder workflow",
    "demand validation",
    "positioning",
  ],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "AI Cofounder — Score demand, prove customer pull, ship the next move",
    description:
      "Convert scattered founder inputs into concrete outputs: idea scorecards, customer evidence, and a prioritized next-step plan.",
    siteName: "AI Cofounder",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AI Cofounder workflow preview with idea scoring, customer proof, and next-step planning",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Cofounder — Score demand, prove customer pull, ship the next move",
    description:
      "Idea scorecard + customer feedback synthesis + next-step execution plan, grounded in your founder context.",
    images: ["/twitter-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className="bg-white text-stone-900 antialiased">{children}</body>
    </html>
  );
}
