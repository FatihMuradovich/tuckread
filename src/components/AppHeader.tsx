import Link from "next/link";
import { Logo } from "@/components/Logo";

export function AppHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/library" aria-label="Tuckread library">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-sm" aria-label="Main">
          <Link href="/library" className="rounded-full px-3 py-1.5 text-muted transition hover:bg-surface hover:text-ink">
            Library
          </Link>
          <Link href="/highlights" className="rounded-full px-3 py-1.5 text-muted transition hover:bg-surface hover:text-ink">
            Highlights
          </Link>
          <Link href="/settings" className="rounded-full px-3 py-1.5 text-muted transition hover:bg-surface hover:text-ink">
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
