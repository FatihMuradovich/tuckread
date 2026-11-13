import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Privacy · Tuckread",
  description: "What Tuckread and its browser extension collect, why, and how to export or delete it.",
};

const UPDATED = "13 November 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-8 px-4 py-10 sm:px-6">
      <Link href="/" className="justify-self-start">
        <Logo />
      </Link>
      <article className="grid gap-6 leading-relaxed [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-1">
        <header className="grid gap-2">
          <h1 className="font-display text-3xl font-bold tracking-[-0.02em]">Privacy policy</h1>
          <p className="text-sm text-muted">Last updated {UPDATED}</p>
        </header>

        <p>
          Tuckread is a read-it-later app and a browser extension. This page explains what they store, why, and how you
          stay in control of it. The short version: we keep only what you save, we don&apos;t track you, and we never sell
          or share your data.
        </p>

        <section className="grid gap-2">
          <h2>What we store</h2>
          <ul>
            <li>Your email address and a hashed password, to sign you in.</li>
            <li>The articles you save: their link, title, site name, author, a short excerpt and the article text.</li>
            <li>What you add to them: tags, highlights, notes, reading progress and whether you archived them.</li>
          </ul>
          <p>We don&apos;t use analytics or advertising trackers, and we don&apos;t build a profile of your browsing.</p>
        </section>

        <section className="grid gap-2">
          <h2>The browser extension</h2>
          <ul>
            <li>It reads a page only when you click its button or press its shortcut.</li>
            <li>
              It then sends that one page&apos;s address, title and content to Tuckread so it can be saved to your library.
            </li>
            <li>It doesn&apos;t watch the sites you visit, run in the background or read any other tabs.</li>
            <li>It remembers one setting in your browser: which Tuckread address to save to.</li>
          </ul>
        </section>

        <section className="grid gap-2">
          <h2>Where your data lives</h2>
          <p>
            Your account and library are stored with Supabase (a managed Postgres database, hosted in the EU), and the app
            runs on Vercel. Each user&apos;s data is separated at the database level, so one account can never read
            another&apos;s. When you save a link, Tuckread&apos;s server fetches that page to extract the article text.
          </p>
        </section>

        <section className="grid gap-2">
          <h2>Your control</h2>
          <ul>
            <li>
              <strong>Export</strong> your whole library as Markdown, JSON or CSV at any time from{" "}
              <Link href="/settings#export" className="underline">
                Settings
              </Link>
              .
            </li>
            <li>
              <strong>Delete</strong> your account from{" "}
              <Link href="/settings#account" className="underline">
                Settings
              </Link>
              . This permanently removes your account and everything in it.
            </li>
          </ul>
        </section>

        <section className="grid gap-2">
          <h2>Contact</h2>
          <p>
            Questions or requests: open an issue on{" "}
            <a href="https://github.com/FatihMuradovich/tuckread/issues" className="underline">
              GitHub
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
