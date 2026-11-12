import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, Literata } from "next/font/google";
import { PREFS_SCRIPT } from "@/lib/reader-prefs";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Tuckread — Tuck it away. Read it later.",
  description:
    "A calm, free home for the articles you want to read. No ads, no clutter, and your library is always yours to export.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${figtree.variable} ${literata.variable} h-full antialiased`}
      // The inline script below sets theme and reader-size attributes before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      </head>
      {/* Browser extensions often add attributes to <body>; don't treat that as a hydration error. */}
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
