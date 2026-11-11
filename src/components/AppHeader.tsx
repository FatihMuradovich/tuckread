import Link from "next/link";
import { Logo } from "@/components/Logo";

export function AppHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/library" aria-label="Tuckread library">
          <Logo />
        </Link>
        <form action="/auth/signout" method="post">
          <button type="submit" className="rounded-full px-3 py-1.5 text-sm text-muted transition hover:bg-surface hover:text-ink">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
