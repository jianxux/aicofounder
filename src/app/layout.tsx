import type { Metadata } from "next";
import "./globals.css";

const metadataBase = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
  title: "AI Cofounder — Make something people actually want",
  description: "Research and build your product with AI. Your AI cofounder guides you from idea to launch.",
  applicationName: "AI Cofounder",
  keywords: ["AI Cofounder", "startup", "product research", "founder tools", "AI product strategist"],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "AI Cofounder — Make something people actually want",
    description: "Research and build your product with AI. Your AI cofounder guides you from idea to launch.",
    siteName: "AI Cofounder",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "AI Cofounder preview card" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Cofounder — Make something people actually want",
    description: "Research and build your product with AI. Your AI cofounder guides you from idea to launch.",
    images: ["/twitter-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-stone-900 antialiased">{children}</body>
    </html>
  );
}
