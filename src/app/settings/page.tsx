import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/auth";
import { DeleteAccount } from "./DeleteAccount";
import { ImportForm } from "./ImportForm";

export const metadata: Metadata = { title: "Settings · Tuckread" };

export default function SettingsPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto grid w-full max-w-3xl gap-10 px-4 py-8 sm:px-6">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Settings</h1>

        <Section id="import" title="Import" lead="Bring your reading list from Pocket, Instapaper or your browser's bookmarks.">
          <ImportForm />
        </Section>

        <Section
          id="export"
          title="Export"
          lead="Your library is yours. Download everything, including tags, highlights and notes, whenever you like."
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <ExportLink format="markdown" label="Markdown" hint="Readable notes for Obsidian, Notion or any editor" />
            <ExportLink format="json" label="JSON" hint="Everything, for developers and backups" />
            <ExportLink format="csv" label="CSV" hint="Pocket-compatible, imports into other apps" />
          </div>
        </Section>

        <Section id="account" title="Account">
          <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
            <AccountEmail />
          </Suspense>
          <div className="flex flex-wrap gap-2">
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-primary">
                Sign out
              </button>
            </form>
          </div>
          <DeleteAccount />
          <p className="text-xs text-muted">
            Read how Tuckread handles your data in the{" "}
            <Link href="/privacy" className="underline">
              privacy policy
            </Link>
            .
          </p>
        </Section>
      </main>
    </>
  );
}

async function AccountEmail() {
  const { user } = await requireUser();
  return (
    <p className="text-sm">
      Signed in as <strong>{user.email}</strong>
    </p>
  );
}

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid gap-4 rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <div className="grid gap-1">
        <h2 id={`${id}-h`} className="font-display text-lg font-bold">
          {title}
        </h2>
        {lead && <p className="text-sm text-muted">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

function ExportLink({ format, label, hint }: { format: string; label: string; hint: string }) {
  return (
    <a
      href={`/api/export?format=${format}`}
      download
      className="grid gap-1 rounded-2xl border border-line bg-bg p-4 hover:border-primary"
    >
      <span className="font-semibold">↓ {label}</span>
      <span className="text-xs text-muted">{hint}</span>
    </a>
  );
}
