import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Cofounder — Make something people actually want",
  description: "Research and build your product with AI. Your AI cofounder guides you from idea to launch.",
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
      <body className="bg-[#faf7f2] text-stone-900 antialiased">{children}</body>
    </html>
  );
}
